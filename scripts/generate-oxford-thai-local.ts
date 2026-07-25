import 'dotenv-flow/config'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../instances/prisma'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SOURCE_NAME = 'oxford-3000-american'
const OUTPUT_PATH = resolve(__dirname, '../data/oxford-3000-th.generated.json')
const BASE_URL = (process.env.LOCAL_LLM_BASE_URL || 'http://127.0.0.1:1234/v1').replace(/\/$/, '')
const MODEL = process.env.LOCAL_LLM_MODEL || 'auto'
const BATCH_SIZE = Number(process.env.OXFORD_THAI_BATCH_SIZE || 10)

type VocabInput = {
    sourceKey: string
    word: string
    displayWord: string
    sense: string | null
    partOfSpeech: string
    level: string
}

type GeneratedValue = {
    sourceKey: string
    meaningTh: string
    pronunciationTh: string
}

type GeneratedMap = Record<string, {
    meaningTh: string
    pronunciationTh: string
}>

type ModelListResponse = {
    data?: Array<{ id?: string }>
}

type ChatCompletionResponse = {
    choices?: Array<{
        message?: {
            content?: string
        }
    }>
}

const chunk = <T>(items: T[], size: number): T[][] => {
    const result: T[][] = []

    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size))
    }

    return result
}

const readGeneratedMap = (): GeneratedMap => {
    if (!existsSync(OUTPUT_PATH)) return {}

    const raw = readFileSync(OUTPUT_PATH, 'utf8')
    if (!raw.trim()) return {}

    return JSON.parse(raw) as GeneratedMap
}

const writeGeneratedMap = (data: GeneratedMap): void => {
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

const getModel = async (): Promise<string> => {
    if (MODEL !== 'auto') return MODEL

    const res = await fetch(`${BASE_URL}/models`)

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Local model list error ${res.status}: ${text}`)
    }

    const json = await res.json() as ModelListResponse
    const model = json.data?.find(item => item.id)?.id

    if (!model) {
        throw new Error('No loaded model found in LM Studio. Load a model and start the local server first.')
    }

    return model
}

const extractJson = (text: string): string => {
    const cleaned = text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim()

    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')

    if (start === -1 || end === -1 || end <= start) {
        throw new Error(`Model did not return JSON: ${text}`)
    }

    return cleaned.slice(start, end + 1)
}

const parseGeneratedItems = (text: string): GeneratedValue[] => {
    const jsonText = extractJson(text)
    const parsed = JSON.parse(jsonText) as { items?: GeneratedValue[] }

    if (!Array.isArray(parsed.items)) {
        throw new Error(`JSON missing items array: ${jsonText}`)
    }

    return parsed.items
        .map(item => ({
            sourceKey: String(item.sourceKey || '').trim(),
            meaningTh: String(item.meaningTh || '').trim(),
            pronunciationTh: String(item.pronunciationTh || '').trim(),
        }))
        .filter(item =>
            item.sourceKey.length > 0 &&
            item.meaningTh.length > 0 &&
            item.pronunciationTh.length > 0
        )
}

const generateBatch = async (model: string, items: VocabInput[]): Promise<GeneratedValue[]> => {
    const prompt = {
        task: 'Create Thai seed data for Thai learners of American English.',
        rules: [
            'Return JSON only.',
            'Do not use markdown.',
            'Do not add explanation.',
            'Use the given partOfSpeech and sense when present.',
            'meaningTh must be concise Thai, 1 to 3 common meanings separated by comma.',
            'pronunciationTh must be Thai phonetic reading of the American English word.',
            'Do not include IPA.',
            'Do not add examples.',
            'Return exactly one output item for each input item.',
        ],
        inputItems: items,
        outputShape: {
            items: [
                {
                    sourceKey: 'same sourceKey from input',
                    meaningTh: 'Thai meaning',
                    pronunciationTh: 'Thai phonetic pronunciation',
                },
            ],
        },
    }

    const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            temperature: 0.1,
            messages: [
                {
                    role: 'system',
                    content: 'You generate valid JSON only for Thai vocabulary seed data.',
                },
                {
                    role: 'user',
                    content: JSON.stringify(prompt),
                },
            ],
        }),
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Local LLM API error ${res.status}: ${text}`)
    }

    const json = await res.json() as ChatCompletionResponse
    const content = json.choices?.[0]?.message?.content

    if (!content) {
        throw new Error('Local LLM returned empty content')
    }

    return parseGeneratedItems(content)
}

const updateBatch = async (items: GeneratedValue[]): Promise<number> => {
    let updated = 0

    for (const item of items) {
        const result = await prisma.vocabWord.updateMany({
            where: { sourceKey: item.sourceKey },
            data: {
                meaningTh: item.meaningTh,
                pronunciationTh: item.pronunciationTh,
            },
        })

        updated += result.count
    }

    return updated
}

const main = async (): Promise<void> => {
    const model = await getModel()
    const existing = readGeneratedMap()

    const words = await prisma.vocabWord.findMany({
        where: {
            sourceName: SOURCE_NAME,
            OR: [
                { meaningTh: '' },
                { pronunciationTh: '' },
            ],
        },
        orderBy: [
            { sourceOrder: 'asc' },
            { sourceKey: 'asc' },
        ],
        select: {
            sourceKey: true,
            word: true,
            displayWord: true,
            sense: true,
            partOfSpeech: true,
            level: true,
        },
    })

    const pending = words.filter(word => !existing[word.sourceKey])

    console.log(`Local LLM base URL: ${BASE_URL}`)
    console.log(`Model: ${model}`)
    console.log(`Words missing Thai data in DB: ${words.length}`)
    console.log(`Words not generated yet: ${pending.length}`)

    let generated = 0
    let updated = 0

    for (const batch of chunk(pending, BATCH_SIZE)) {
        const result = await generateBatch(model, batch)
        const validKeys = new Set(batch.map(item => item.sourceKey))
        const validResult = result.filter(item => validKeys.has(item.sourceKey))

        for (const item of validResult) {
            existing[item.sourceKey] = {
                meaningTh: item.meaningTh,
                pronunciationTh: item.pronunciationTh,
            }
        }

        writeGeneratedMap(existing)

        updated += await updateBatch(validResult)
        generated += validResult.length

        console.log(`Generated ${generated}/${pending.length}`)
        console.log(`Updated ${updated} vocab words`)
    }

    console.log(`Saved generated data to ${OUTPUT_PATH}`)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
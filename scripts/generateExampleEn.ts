import { prisma } from '../instances/prisma'

const OLLAMA_API_URL = process.env.OLLAMA_API_URL ?? 'http://localhost:11434/api/chat'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:3b'
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 5)
const LIMIT = Number(process.env.LIMIT ?? 0)
const OVERWRITE = process.env.OVERWRITE_EXAMPLE_EN === '1'

type VocabInput = {
    id: string
    word: string
    displayWord: string
    level: string
    partOfSpeech: string
    meaningTh: string
    sense: string | null
}

type GeneratedExample = {
    id: string
    exampleEn: string
}

type OllamaResponse = {
    message?: {
        content?: string
    }
}

const stripCodeFence = (value: string): string =>
    value
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

const parseGeneratedExamples = (value: string): GeneratedExample[] => {
    const parsed = JSON.parse(stripCodeFence(value))

    if (!Array.isArray(parsed)) {
        throw new Error('AI response must be a JSON array')
    }

    return parsed.flatMap(item => {
        if (!item || typeof item !== 'object') return []

        const row = item as Record<string, unknown>
        const id = typeof row.id === 'string' ? row.id.trim() : ''
        const exampleEn = typeof row.exampleEn === 'string' ? row.exampleEn.trim() : ''

        if (!id || !exampleEn) return []

        return [{ id, exampleEn }]
    })
}

const buildPrompt = (rows: VocabInput[]): string => {
    const input = rows.map(row => ({
        id: row.id,
        word: row.word,
        displayWord: row.displayWord,
        level: row.level,
        partOfSpeech: row.partOfSpeech,
        meaningTh: row.meaningTh,
        sense: row.sense,
    }))

    return [
        'Create one simple English example sentence for each vocabulary item.',
        '',
        'Rules:',
        '- Return a JSON array only.',
        '- Return exactly one output item for each input item.',
        '- Do not create duplicate ids.',
        '- Do not use markdown.',
        '- Do not use code fences.',
        '- Each output item must contain id and exampleEn.',
        '- Use the target word naturally.',
        '- Match the part of speech.',
        '- Match the CEFR level strictly.',
        '- For A1, use very simple words and short sentences.',
        '- For A2, use simple daily-life sentences.',
        '- For B1, use clear everyday sentences with a little more detail.',
        '- For B2, use natural but still learner-friendly sentences.',
        '- Keep A1 sentences under 8 words when possible.',
        '- Keep A2 sentences under 10 words when possible.',
        '- Use common daily-life context.',
        '- Do not use names, brands, politics, religion, violence, romance, alcohol, smoking, drugs, or adult topics.',
        '- Do not include Thai.',
        '- Do not explain anything.',
        '- Do not change ids.',
        '',
        'Input:',
        JSON.stringify(input, null, 2),
        '',
        'Output example:',
        JSON.stringify([{ id: 'same-id', exampleEn: 'Simple sentence here.' }], null, 2),
    ].join('\n')
}

const callOllama = async (rows: VocabInput[]): Promise<GeneratedExample[]> => {
    console.log({
        event: 'ollama_request_start',
        words: rows.map(row => row.word),
    })

    const res = await fetch(OLLAMA_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            stream: false,
            messages: [
                {
                    role: 'system',
                    content: 'You generate safe, simple English example sentences for a vocabulary learning app. Return JSON only.',
                },
                {
                    role: 'user',
                    content: buildPrompt(rows),
                },
            ],
            options: {
                temperature: 0.2,
                num_predict: 600,
            },
        }),
    })

    const json = await res.json().catch(() => null) as OllamaResponse | null

    if (!res.ok) {
        throw new Error(JSON.stringify(json, null, 2))
    }

    const content = json?.message?.content

    if (typeof content !== 'string') {
        throw new Error('Ollama response has no message.content')
    }

    console.log({
        event: 'ollama_response_received',
        chars: content.length,
    })

    return parseGeneratedExamples(content)
}

const chunk = <T>(items: T[], size: number): T[][] => {
    const chunks: T[][] = []

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size))
    }

    return chunks
}

const main = async (): Promise<void> => {
    const rows = await prisma.vocabWord.findMany({
        where: OVERWRITE
            ? undefined
            : {
                exampleEn: '',
            },
        orderBy: [
            { sourceOrder: 'asc' },
            { word: 'asc' },
            { partOfSpeech: 'asc' },
        ],
        take: LIMIT > 0 ? LIMIT : undefined,
        select: {
            id: true,
            word: true,
            displayWord: true,
            level: true,
            partOfSpeech: true,
            meaningTh: true,
            sense: true,
        },
    })

    const batches = chunk(rows, BATCH_SIZE)

    let updated = 0
    let failed = 0

    console.log({
        rows: rows.length,
        batches: batches.length,
        batchSize: BATCH_SIZE,
        overwrite: OVERWRITE,
        apiUrl: OLLAMA_API_URL,
        model: OLLAMA_MODEL,
    })

    for (let index = 0; index < batches.length; index++) {
        const batch = batches[index]

        try {
            const generated = await callOllama(batch)
            const allowedIds = new Set(batch.map(row => row.id))
            const generatedById = new Map<string, GeneratedExample>()

            for (const item of generated) {
                if (!allowedIds.has(item.id)) continue
                if (generatedById.has(item.id)) continue

                generatedById.set(item.id, item)
            }

            for (const item of generatedById.values()) {
                await prisma.vocabWord.update({
                    where: { id: item.id },
                    data: {
                        exampleEn: item.exampleEn,
                    },
                })

                updated++
            }

            console.log({
                batch: index + 1,
                totalBatches: batches.length,
                input: batch.length,
                generated: generated.length,
                uniqueGenerated: generatedById.size,
                updated,
            })
        } catch (error) {
            failed += batch.length

            console.error({
                batch: index + 1,
                totalBatches: batches.length,
                failedRows: batch.map(row => row.word),
                error,
            })
        }
    }

    console.log({
        rows: rows.length,
        updated,
        failed,
    })
}

main()
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })


// BATCH_SIZE=5 pnpm tsx scripts/generateExampleEn.ts
// หา VocabWord ที่ exampleEn = ''
// แบ่งทีละ 5 คำ
// ส่งให้ Ollama
// update DB
// วนต่อจนหมด
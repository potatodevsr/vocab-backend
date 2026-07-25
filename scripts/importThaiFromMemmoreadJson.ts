import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../instances/prisma'

const __dirname = dirname(fileURLToPath(import.meta.url))

const JSON_PATH = resolve(__dirname, '../data/memmoread_oxford_3000_thai_vocab_slim.json')

type ThaiRow = {
    vocab: string
    meaningTh: string
    pronunciationTh: string
}

type UpdateData = {
    meaningTh?: string
    pronunciationTh?: string
}

const WORD_ALIASES: Record<string, string> = {
    afterwards: 'afterward',
    analyse: 'analyze',
    behaviour: 'behavior',
    centre: 'center',
    colour: 'color',
    coloured: 'colored',
    defence: 'defense',
    downwards: 'downward',
    enquiry: 'inquiry',
    favour: 'favor',
    grey: 'gray',
    honour: 'honor',
    humour: 'humor',
    jewellery: 'jewelry',
    judgement: 'judgment',
    kilometre: 'kilometer',
    labour: 'labor',
    licence: 'license',
    metre: 'meter',
    mum: 'mom',
    neighbour: 'neighbor',
    neighbourhood: 'neighborhood',
    offence: 'offense',
    theatre: 'theater',
    towards: 'toward',
    traveller: 'traveler',
    tyre: 'tire',
    upwards: 'upward',
    maths: 'math',
    bil: 'bill',
    wam: 'warm',
    'use to': 'used to',
}

const normalizeWord = (value: string): string => {
    const normalized = value
        .toLowerCase()
        .replace(/[’]/g, "'")
        .replace(/'/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/(\D)\d+$/g, '$1')

    return WORD_ALIASES[normalized] ?? normalized
}

const isThaiRow = (value: unknown): value is ThaiRow => {
    if (!value || typeof value !== 'object') return false

    const row = value as Record<string, unknown>

    return (
        typeof row.vocab === 'string' &&
        typeof row.meaningTh === 'string' &&
        typeof row.pronunciationTh === 'string'
    )
}

const buildUpdateData = (row: ThaiRow): UpdateData => {
    const data: UpdateData = {}
    const meaningTh = row.meaningTh.trim()
    const pronunciationTh = row.pronunciationTh.trim()

    if (meaningTh) data.meaningTh = meaningTh
    if (pronunciationTh) data.pronunciationTh = pronunciationTh

    return data
}

const main = async (): Promise<void> => {
    const raw = JSON.parse(readFileSync(JSON_PATH, 'utf8'))

    if (!Array.isArray(raw)) {
        throw new Error('Thai vocab JSON must be an array')
    }

    const rows = raw.filter(isThaiRow)
    const words = await prisma.vocabWord.findMany({
        select: {
            id: true,
            word: true,
        },
    })

    const idsByWord = new Map<string, string[]>()

    for (const word of words) {
        const key = normalizeWord(word.word)
        const ids = idsByWord.get(key) ?? []

        ids.push(word.id)
        idsByWord.set(key, ids)
    }

    let matchedRows = 0
    let updatedRecords = 0
    let skippedEmptyRows = 0
    const missing: string[] = []

    for (const row of rows) {
        const key = normalizeWord(row.vocab)
        const ids = idsByWord.get(key)

        if (!ids?.length) {
            missing.push(row.vocab)
            continue
        }

        const data = buildUpdateData(row)

        if (Object.keys(data).length === 0) {
            skippedEmptyRows++
            continue
        }

        matchedRows++

        const result = await prisma.vocabWord.updateMany({
            where: {
                id: {
                    in: ids,
                },
            },
            data,
        })

        updatedRecords += result.count
    }

    console.log({
        jsonRows: rows.length,
        matchedRows,
        updatedRecords,
        skippedEmptyRows,
        missingRows: missing.length,
        missing: missing.slice(0, 100),
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
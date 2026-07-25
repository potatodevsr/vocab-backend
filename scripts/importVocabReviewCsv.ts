import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../instances/prisma'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_PATH = resolve(__dirname, '../data/vocab_review.csv')

type CsvRow = Record<string, string>

const parseCsv = (text: string): string[][] => {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let quoted = false

    for (let i = 0; i < text.length; i++) {
        const char = text[i]
        const next = text[i + 1]

        if (quoted && char === '"' && next === '"') {
            cell += '"'
            i++
            continue
        }

        if (char === '"') {
            quoted = !quoted
            continue
        }

        if (!quoted && char === ',') {
            row.push(cell)
            cell = ''
            continue
        }

        if (!quoted && char === '\n') {
            row.push(cell)
            rows.push(row)
            row = []
            cell = ''
            continue
        }

        if (char !== '\r') {
            cell += char
        }
    }

    row.push(cell)
    rows.push(row)

    return rows.filter(items => items.some(item => item.trim()))
}

const normalizeHeader = (value: string): string =>
    value.replace(/^\uFEFF/, '').trim()

const toRows = (text: string): CsvRow[] => {
    const parsed = parseCsv(text)
    const headers = parsed[0]?.map(normalizeHeader)

    if (!headers?.length) {
        throw new Error('CSV has no header row')
    }

    return parsed.slice(1).map(row =>
        Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
    )
}

const valueOrFallback = (primary: string | undefined, fallback: string | undefined): string => {
    const value = primary?.trim()

    if (value) return value

    return fallback?.trim() ?? ''
}

const main = async (): Promise<void> => {
    const rows = toRows(readFileSync(CSV_PATH, 'utf8'))

    let updated = 0
    let skipped = 0
    const missingIds: string[] = []

    for (const row of rows) {
        const id = row.id?.trim()

        if (!id) {
            skipped++
            continue
        }

        const result = await prisma.vocabWord.updateMany({
            where: { id },
            data: {
                meaningTh: valueOrFallback(row.meaningThClean, row.meaningTh),
                pronunciationTh: valueOrFallback(row.pronunciationThClean, row.pronunciationTh),
            },
        })

        if (result.count === 0) {
            missingIds.push(id)
            continue
        }

        updated += result.count
    }

    console.log({
        csvRows: rows.length,
        updated,
        skipped,
        missingIds: missingIds.length,
        missingIdSamples: missingIds.slice(0, 20),
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
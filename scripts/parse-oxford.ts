import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFParse } from 'pdf-parse'
import { prisma } from '../instances/prisma'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PDF_PATH = resolve(__dirname, '../data/American_Oxford_3000.pdf')
const SOURCE_NAME = 'oxford-3000-american'
const SOURCE_TITLE = 'The Oxford 3000™ (American English)'

const LEVEL_REGEX = /\b(A1|A2|B1|B2)\b/g
const POS_FIRST_REGEX = /\b(modal v\.|auxiliary v\.|definite article|indefinite article|infinitive marker|number\b|n\.|v\.|adj\.|adv\.|prep\.|pron\.|conj\.|det\.|exclam\.)/

type Row = {
    sourceOrder: number
    word: string
    displayWord: string
    slug: string
    homograph: number | null
    sense: string | null
    partOfSpeech: string
    level: string
}

const slugify = (s: string): string =>
    s.toLowerCase()
        .replace(/[^\w\s/-]/g, '')
        .trim()
        .replace(/[\s/]+/g, '-')
        .replace(/-+/g, '-')

const posCode = (p: string): string =>
    p.toLowerCase()
        .replace(/\./g, '')
        .replace(/[\s/]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

const parseEntry = (line: string, order: number): Row[] => {
    const levelMatches = Array.from(line.matchAll(LEVEL_REGEX))
    if (levelMatches.length === 0) return []

    const segments: { text: string; level: string }[] = []
    let cursor = 0
    for (const m of levelMatches) {
        segments.push({ text: line.slice(cursor, m.index).trim(), level: m[1] })
        cursor = m.index! + m[0].length
    }

    const first = segments[0]
    let wordPart: string
    let sense: string | null = null
    let firstPosText: string

    const parenMatch = first.text.match(/^(.+?)\s*\(([^)]+)\)\s*(.*)$/)
    if (parenMatch) {
        wordPart = parenMatch[1].trim()
        sense = parenMatch[2].trim()
        firstPosText = parenMatch[3].trim()
    } else {
        const posMatch = first.text.match(POS_FIRST_REGEX)
        if (!posMatch || posMatch.index === undefined) return []
        wordPart = first.text.slice(0, posMatch.index).trim()
        firstPosText = first.text.slice(posMatch.index).trim()
    }

    if (!wordPart) return []

    let homograph: number | null = null
    const hMatch = wordPart.match(/^(.+?)(\d+)$/)
    if (hMatch) {
        wordPart = hMatch[1]
        homograph = parseInt(hMatch[2], 10)
    }

    const word = wordPart
    const displayWord = wordPart
    let slug = slugify(word)
    if (homograph !== null) slug += `-${homograph}`
    if (sense) slug += `-${slugify(sense)}`

    const groups: { posText: string; level: string }[] = [
        { posText: firstPosText, level: first.level },
        ...segments.slice(1).map(s => ({
            posText: s.text.replace(/^\s*,\s*/, ''),
            level: s.level,
        })),
    ]

    const rows: Row[] = []
    for (const g of groups) {
        const poses = g.posText.split(',').map(p => p.trim()).filter(Boolean)
        for (const pos of poses) {
            rows.push({
                sourceOrder: order,
                word,
                displayWord,
                slug,
                homograph,
                sense,
                partOfSpeech: pos,
                level: g.level,
            })
        }
    }
    return rows
}

const extractLines = (text: string): string[] =>
    text.split('\n')
        .map(l => l.trim())
        .filter(l =>
            l.length > 0 &&
            !l.startsWith('©') &&
            !l.includes('Oxford University Press') &&
            !/^The Oxford 3000/.test(l) &&
            !/^\d+\s*\/\s*\d+$/.test(l)
        )

const parseAll = (text: string): Row[] => {
    const lines = extractLines(text)
    const rows: Row[] = []
    let order = 0
    for (const line of lines) {
        const parsed = parseEntry(line, order)
        if (parsed.length > 0) {
            rows.push(...parsed)
            order++
        }
    }
    return rows
}

const main = async (): Promise<void> => {
    const buf = readFileSync(PDF_PATH)
    const parser = new PDFParse({ data: buf })
    let rows: Row[]
    try {
        const result = await parser.getText()
        rows = parseAll(result.text)
    } finally {
        await parser.destroy()
    }


    try {
        let count = 0
        for (const r of rows) {
            const sourceKey = `${SOURCE_NAME}::${r.slug}::${posCode(r.partOfSpeech)}::${r.level}`
            const data = {
                sourceOrder: r.sourceOrder,
                sourceName: SOURCE_NAME,
                sourceTitle: SOURCE_TITLE,
                level: r.level,
                word: r.word,
                displayWord: r.displayWord,
                slug: r.slug,
                homograph: r.homograph,
                sense: r.sense,
                partOfSpeech: r.partOfSpeech,
            }
            await prisma.vocabWord.upsert({
                where: { sourceKey },
                create: { id: sourceKey, sourceKey, ...data },
                update: data,
            })
            count++
        }
        console.log(`Upserted ${count} rows from ${rows.length} parsed entries (${new Set(rows.map(r => r.slug)).size} unique word entries)`)
    } finally {
    }
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
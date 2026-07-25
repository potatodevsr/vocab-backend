import { execFile as execFileCallback } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)
const __dirname = dirname(fileURLToPath(import.meta.url))

const PDF_PATH = resolve(__dirname, '../data/memmoread-oxford-3000.pdf')
const TMP_DIR = resolve(__dirname, '../data/tmp/memmoread-pages')
const OUT_JSON_PATH = resolve(__dirname, '../data/memmoread_oxford_3000_thai_vocab_slim.json')
const OUT_FULL_JSON_PATH = resolve(__dirname, '../data/memmoread_oxford_3000_thai_vocab_rows.json')
const REPORT_PATH = resolve(__dirname, '../data/memmoread_oxford_3000_thai_vocab_report.json')

type Token = {
    text: string
    left: number
    top: number
    width: number
    height: number
    conf: number
}

type RowToken = Token & {
    column: 'vocab' | 'meaningTh' | 'pronunciationTh'
    centerY: number
}

type ExtractedRow = {
    page: number
    vocab: string
    meaningTh: string
    pronunciationTh: string
}

const run = async (file: string, args: string[]): Promise<string> => {
    const result = await execFile(file, args, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 50,
    })

    return String(result.stdout)
}

const readPngSize = (path: string): { width: number; height: number } => {
    const buffer = readFileSync(path)

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    }
}

const cleanCell = (value: string): string =>
    value
        .replace(/[|]/g, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, ' ')
        .trim()

const cleanVocab = (value: string): string =>
    cleanCell(value)
        .replace(/[^A-Za-z0-9'’.\-\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()

const isValidVocab = (value: string): boolean => {
    const text = value.toLowerCase()

    if (!text) return false
    if (['vocab', 'part', 'speech', 'meaning', 'ipa', 'a1', 'a2', 'b1', 'b2'].includes(text)) return false
    if (/^\d+$/.test(text)) return false

    return /^[a-z][a-z0-9'’.\-]*(?:\s+[a-z][a-z0-9'’.\-]*){0,5}$/i.test(value)
}

const parseTsv = (tsv: string): Token[] => {
    const lines = tsv.split(/\r?\n/).filter(Boolean)
    const header = lines[0]?.split('\t') ?? []
    const index = Object.fromEntries(header.map((name, i) => [name, i]))

    return lines.slice(1).flatMap(line => {
        const parts = line.split('\t')
        const text = cleanCell(parts.slice(index.text).join('\t'))
        const conf = Number(parts[index.conf])

        if (!text) return []
        if (!Number.isFinite(conf) || conf < 15) return []

        return [{
            text,
            left: Number(parts[index.left]),
            top: Number(parts[index.top]),
            width: Number(parts[index.width]),
            height: Number(parts[index.height]),
            conf,
        }]
    })
}

const getColumn = (token: Token, pageWidth: number): RowToken['column'] | null => {
    const centerX = token.left + token.width / 2
    const ratio = centerX / pageWidth

    if (ratio >= 0.04 && ratio < 0.23) return 'vocab'
    if (ratio >= 0.36 && ratio < 0.585) return 'meaningTh'
    if (ratio >= 0.585 && ratio < 0.77) return 'pronunciationTh'

    return null
}

const groupByRows = (tokens: RowToken[], pageHeight: number): RowToken[][] => {
    const tolerance = Math.max(10, pageHeight * 0.006)
    const rows: { y: number; tokens: RowToken[] }[] = []

    for (const token of tokens.sort((a, b) => a.centerY - b.centerY)) {
        const row = rows.find(item => Math.abs(item.y - token.centerY) <= tolerance)

        if (row) {
            row.tokens.push(token)
            row.y = (row.y + token.centerY) / 2
        } else {
            rows.push({ y: token.centerY, tokens: [token] })
        }
    }

    return rows.map(row => row.tokens)
}

const cellText = (tokens: RowToken[], column: RowToken['column']): string =>
    cleanCell(
        tokens
            .filter(token => token.column === column)
            .sort((a, b) => a.left - b.left)
            .map(token => token.text)
            .join(' ')
    )

const extractRowsFromPage = async (imagePath: string, page: number): Promise<ExtractedRow[]> => {
    const { width, height } = readPngSize(imagePath)
    const tsv = await run('tesseract', [imagePath, 'stdout', '-l', 'eng+tha', '--psm', '6', 'tsv'])
    const tokens = parseTsv(tsv)

    const rowTokens = tokens.flatMap(token => {
        const column = getColumn(token, width)

        if (!column) return []

        return [{
            ...token,
            column,
            centerY: token.top + token.height / 2,
        }]
    })

    const rows = groupByRows(rowTokens, height)

    return rows.flatMap(tokens => {
        const vocab = cleanVocab(cellText(tokens, 'vocab'))
        const meaningTh = cleanCell(cellText(tokens, 'meaningTh'))
        const pronunciationTh = cleanCell(cellText(tokens, 'pronunciationTh'))

        if (!isValidVocab(vocab)) return []
        if (!meaningTh && !pronunciationTh) return []

        return [{ page, vocab, meaningTh, pronunciationTh }]
    })
}

const renderPdfPages = async (): Promise<string[]> => {
    rmSync(TMP_DIR, { recursive: true, force: true })
    mkdirSync(TMP_DIR, { recursive: true })

    await run('pdftoppm', ['-r', '300', '-png', PDF_PATH, join(TMP_DIR, 'page')])

    return readdirSync(TMP_DIR)
        .filter(name => name.endsWith('.png'))
        .sort((a, b) => {
            const pageA = Number(a.match(/-(\d+)\.png$/)?.[1] ?? 0)
            const pageB = Number(b.match(/-(\d+)\.png$/)?.[1] ?? 0)

            return pageA - pageB
        })
        .map(name => join(TMP_DIR, name))
}

const mergeRows = (rows: ExtractedRow[]): ExtractedRow[] => {
    const map = new Map<string, ExtractedRow>()

    for (const row of rows) {
        const key = row.vocab.toLowerCase()
        const current = map.get(key)

        if (!current) {
            map.set(key, row)
            continue
        }

        map.set(key, {
            page: current.page,
            vocab: current.vocab,
            meaningTh: current.meaningTh || row.meaningTh,
            pronunciationTh: current.pronunciationTh || row.pronunciationTh,
        })
    }

    return Array.from(map.values()).sort((a, b) => a.vocab.localeCompare(b.vocab))
}

const main = async (): Promise<void> => {
    const imagePaths = await renderPdfPages()
    const allRows: ExtractedRow[] = []
    const pageStats: { page: number; rows: number }[] = []

    for (let index = 0; index < imagePaths.length; index++) {
        const page = index + 1
        const rows = await extractRowsFromPage(imagePaths[index], page)

        allRows.push(...rows)
        pageStats.push({ page, rows: rows.length })

        console.log({ page, rows: rows.length })
    }

    const mergedRows = mergeRows(allRows)
    const slimRows = mergedRows.map(row => ({
        vocab: row.vocab,
        meaningTh: row.meaningTh,
        pronunciationTh: row.pronunciationTh,
    }))

    mkdirSync(dirname(OUT_JSON_PATH), { recursive: true })

    writeFileSync(OUT_JSON_PATH, JSON.stringify(slimRows, null, 2), 'utf8')
    writeFileSync(OUT_FULL_JSON_PATH, JSON.stringify(allRows, null, 2), 'utf8')

    writeFileSync(REPORT_PATH, JSON.stringify({
        pages: imagePaths.length,
        rawRows: allRows.length,
        exportedRows: slimRows.length,
        emptyMeaningTh: slimRows.filter(row => !row.meaningTh).length,
        emptyPronunciationTh: slimRows.filter(row => !row.pronunciationTh).length,
        pageStats,
        output: OUT_JSON_PATH,
        fullOutput: OUT_FULL_JSON_PATH,
    }, null, 2), 'utf8')

    console.log({
        rawRows: allRows.length,
        exportedRows: slimRows.length,
        output: OUT_JSON_PATH,
        report: REPORT_PATH,
    })
}

main().catch(error => {
    console.error(error)
    process.exit(1)
})
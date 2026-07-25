import 'dotenv-flow/config'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../instances/prisma'

const __dirname = dirname(fileURLToPath(import.meta.url))

const THAI_PATH = resolve(__dirname, '../data/oxford-3000-th.json')

type ThaiSeedValue = {
    meaningTh?: string
    pronunciationTh?: string
}

type ThaiSeedMap = Record<string, ThaiSeedValue>

const readThaiSeedMap = (): ThaiSeedMap => {
    const raw = readFileSync(THAI_PATH, 'utf8')
    return JSON.parse(raw) as ThaiSeedMap
}

const cleanValue = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined

    const cleaned = value.trim()
    return cleaned.length > 0 ? cleaned : undefined
}

const main = async (): Promise<void> => {
    const thaiSeedMap = readThaiSeedMap()

    let updated = 0
    let skippedEmpty = 0
    let missingInDb = 0

    for (const [sourceKey, value] of Object.entries(thaiSeedMap)) {
        const meaningTh = cleanValue(value.meaningTh)
        const pronunciationTh = cleanValue(value.pronunciationTh)

        const data: {
            meaningTh?: string
            pronunciationTh?: string
        } = {}

        if (meaningTh) data.meaningTh = meaningTh
        if (pronunciationTh) data.pronunciationTh = pronunciationTh

        if (Object.keys(data).length === 0) {
            skippedEmpty++
            continue
        }

        const result = await prisma.vocabWord.updateMany({
            where: { sourceKey },
            data,
        })

        if (result.count === 0) {
            missingInDb++
            continue
        }

        updated += result.count
    }

    console.log(`Updated ${updated} vocab words`)
    console.log(`Skipped empty entries: ${skippedEmpty}`)
    console.log(`Missing in database: ${missingInDb}`)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
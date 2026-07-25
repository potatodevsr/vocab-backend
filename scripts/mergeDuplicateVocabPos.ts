import { prisma } from '../instances/prisma'

type VocabRow = {
    id: string
    sourceKey: string
    sourceOrder: number
    sourceName: string
    sourceTitle: string
    level: string
    word: string
    displayWord: string
    slug: string
    homograph: number | null
    sense: string | null
    partOfSpeech: string
    meaningTh: string
    pronunciationTh: string
    ipa: string
    exampleEn: string
    exampleTh: string
    notes: string
    status: string
}

const POS_ORDER = [
    'definite article',
    'indefinite article',
    'modal v.',
    'auxiliary v.',
    'v.',
    'n.',
    'adj.',
    'adv.',
    'prep.',
    'pron.',
    'det.',
    'conj.',
    'exclam.',
    'number',
    'infinitive marker',
]

const groupKey = (row: VocabRow): string =>
    JSON.stringify({
        sourceName: row.sourceName,
        sourceOrder: row.sourceOrder,
        level: row.level,
        word: row.word,
        displayWord: row.displayWord,
        slug: row.slug,
        homograph: row.homograph,
        sense: row.sense,
    })

const normalizePos = (value: string): string =>
    value
        .trim()
        .replace(/\s+/g, ' ')

const posRank = (value: string): number => {
    const index = POS_ORDER.indexOf(value)

    return index === -1 ? POS_ORDER.length : index
}

const splitPartOfSpeech = (value: string): string[] =>
    value
        .split(',')
        .map(normalizePos)
        .filter(Boolean)

const combinePartOfSpeech = (rows: VocabRow[]): string => {
    const parts: string[] = []

    for (const row of rows) {
        for (const part of splitPartOfSpeech(row.partOfSpeech)) {
            if (!parts.includes(part)) {
                parts.push(part)
            }
        }
    }

    return parts
        .sort((a, b) => posRank(a) - posRank(b) || a.localeCompare(b))
        .join(', ')
}

const keeperRank = (row: VocabRow): number => {
    const firstPos = splitPartOfSpeech(row.partOfSpeech)[0] ?? ''

    return posRank(firstPos)
}

const chooseKeeper = (rows: VocabRow[]): VocabRow =>
    [...rows].sort((a, b) => keeperRank(a) - keeperRank(b) || a.id.localeCompare(b.id))[0]

const firstFilled = (rows: VocabRow[], key: keyof VocabRow): string => {
    for (const row of rows) {
        const value = row[key]

        if (typeof value === 'string' && value.trim()) {
            return value.trim()
        }
    }

    return ''
}

const main = async (): Promise<void> => {
    const rows = await prisma.vocabWord.findMany({
        orderBy: [
            { sourceOrder: 'asc' },
            { word: 'asc' },
            { partOfSpeech: 'asc' },
        ],
    })

    const groups = new Map<string, VocabRow[]>()

    for (const row of rows) {
        const key = groupKey(row)
        const items = groups.get(key) ?? []

        items.push(row)
        groups.set(key, items)
    }

    let mergedGroups = 0
    let deletedRows = 0
    let movedSessions = 0

    for (const items of groups.values()) {
        if (items.length <= 1) continue

        const keeper = chooseKeeper(items)
        const duplicates = items.filter(row => row.id !== keeper.id)
        const duplicateIds = duplicates.map(row => row.id)
        const partOfSpeech = combinePartOfSpeech(items)

        const sortedItems = [
            keeper,
            ...items.filter(row => row.id !== keeper.id),
        ]

        const result = await prisma.$transaction(async tx => {
            const sessionResult = await tx.learningSession.updateMany({
                where: {
                    wordId: {
                        in: duplicateIds,
                    },
                },
                data: {
                    wordId: keeper.id,
                },
            })

            await tx.vocabWord.deleteMany({
                where: {
                    id: {
                        in: duplicateIds,
                    },
                },
            })

            await tx.vocabWord.update({
                where: {
                    id: keeper.id,
                },
                data: {
                    partOfSpeech,
                    meaningTh: firstFilled(sortedItems, 'meaningTh'),
                    pronunciationTh: firstFilled(sortedItems, 'pronunciationTh'),
                    ipa: firstFilled(sortedItems, 'ipa'),
                    exampleEn: firstFilled(sortedItems, 'exampleEn'),
                    exampleTh: firstFilled(sortedItems, 'exampleTh'),
                    notes: firstFilled(sortedItems, 'notes'),
                },
            })

            return {
                movedSessions: sessionResult.count,
                deletedRows: duplicateIds.length,
            }
        })

        mergedGroups++
        deletedRows += result.deletedRows
        movedSessions += result.movedSessions
    }

    console.log({
        originalRows: rows.length,
        mergedGroups,
        deletedRows,
        movedSessions,
        finalRows: rows.length - deletedRows,
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
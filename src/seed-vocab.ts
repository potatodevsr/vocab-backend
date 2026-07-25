import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./helpers/instances.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.resolve(
    moduleDir,
    "..",
    "..",
    "data",
    "oxford-3000-seed.json",
);

type SeedWord = {
    id: string;
    sourceKey: string;
    sourceOrder: number;
    sourceName: string;
    sourceTitle: string;
    level: string;
    word: string;
    displayWord: string;
    slug: string;
    homograph: number | null;
    sense: string | null;
    partOfSpeech: string;
    meaningTh: string;
    pronunciationTh: string;
    ipa: string;
    exampleEn: string;
    exampleTh: string;
    notes: string;
    status: string;
};

type SeedFile = {
    words: SeedWord[];
};

const chunk = <T>(items: T[], size: number) => {
    const groups: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        groups.push(items.slice(index, index + size));
    }
    return groups;
};

const main = async () => {
    const raw = await fs.readFile(seedPath, "utf8");
    const data = JSON.parse(raw) as SeedFile;
    const words = data.words;

    console.log(`Loaded ${words.length} words from ${seedPath}`);

    const deleted = await prisma.vocabWord.deleteMany({});
    console.log(`Cleared ${deleted.count} existing rows`);

    let inserted = 0;
    for (const batch of chunk(words, 500)) {
        const result = await prisma.vocabWord.createMany({ data: batch });
        inserted += result.count;
    }

    console.log(`Inserted ${inserted} rows`);
};

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
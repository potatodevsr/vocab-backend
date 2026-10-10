// One `codex exec` call that answers in JSON matching a schema, plus a small worker pool.
// Used by ai-generate-word-content.mjs. (ai-extract-memmoread.mjs predates it and keeps its
// own copy of the same runner.)

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// stdin must be closed: `codex exec` reads a piped stdin to EOF and appends it to the
// prompt, so an open pipe (execFile's default) waits forever.
const runCodex = (args, timeoutMs) =>
    new Promise((resolvePromise, reject) => {
        const child = spawn("codex", args, { stdio: ["ignore", "ignore", "pipe"] });
        let stderr = "";
        child.stderr.on("data", (chunk) => {
            stderr = (stderr + chunk).slice(-4000);
        });
        const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
        child.on("error", reject);
        child.on("close", (code, signal) => {
            clearTimeout(timer);
            if (code === 0) resolvePromise();
            else reject(new Error(`codex exited ${code ?? signal}: ${stderr.trim().split("\n").at(-1) ?? ""}`));
        });
    });

/**
 * Ask codex once. `cwd` is an empty scratch directory so the model has nothing to read or
 * edit; `schema` is written next to it. Returns the parsed final message.
 */
export const askCodex = async ({ prompt, schema, cwd, model, effort, image = null, timeoutMs = 10 * 60 * 1000 }) => {
    mkdirSync(cwd, { recursive: true });
    const schemaPath = join(dirname(cwd), `${cwd.split("/").at(-1)}.schema.json`);
    writeFileSync(schemaPath, JSON.stringify(schema));
    const out = join(dirname(cwd), `${cwd.split("/").at(-1)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.json`);

    await runCodex(
        [
            "exec",
            "--ignore-user-config",
            "--ephemeral",
            "--skip-git-repo-check",
            "-s", "read-only",
            "-C", cwd,
            "-m", model,
            "-c", `model_reasoning_effort="${effort}"`,
            ...(image ? ["-i", image] : []),
            "--output-schema", schemaPath,
            "-o", out,
            prompt,
        ],
        timeoutMs,
    );
    const parsed = JSON.parse(readFileSync(out, "utf8"));
    rmSync(out);
    return parsed;
};

/** Run `task` over `jobs` with `concurrency` workers. Failures are counted, not thrown. */
export const pool = async (jobs, concurrency, task) => {
    const queue = [...jobs];
    let done = 0;
    let failed = 0;
    const worker = async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
            try {
                await task(job);
                done++;
            } catch (error) {
                failed++;
                console.error(`  ${job.name ?? ""}  FAILED: ${String(error.message ?? error).split("\n")[0]}`);
            }
        }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    return { done, failed };
};

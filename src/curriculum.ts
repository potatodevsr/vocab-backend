import { Hono } from "hono";

import type { Bindings, Variables } from "./index.js";
import { DEFAULT_WORDLIST } from "./wordlists.js";
import { readInventory } from "./curriculum-inventory.js";

type Env = { Bindings: Bindings; Variables: Variables };

/**
 * The public curriculum inventory route. The grouping itself lives in
 * `curriculum-inventory.ts`, which imports nothing from the Worker so that tests — and the
 * web repo's build type check — can load it on its own.
 */
export const curriculum = new Hono<Env>();

curriculum.get("/curriculum", async (c) => {
    const requested = c.req.query("wordlistId");
    const wordlistId = requested && requested.trim() ? requested.trim() : DEFAULT_WORDLIST;

    return c.json(await readInventory(c.get("prisma"), wordlistId));
});

/**
 * The JSON body of a request that may not have sent one.
 *
 * Four handlers wrote this by hand as
 * `await c.req.json<{ level?: unknown }>().catch(() => ({}))`, and every one of them was a
 * type error under the Workers runtime types: `Promise<T>.catch(() => ({}))` resolves to
 * `T | {}`, and `{}` has no `level`, so `body.level` does not typecheck — eleven errors
 * across `checkpoint.ts`, `practice.ts`, `progress.ts` and `session.ts`. The tempting
 * repairs all lose something real: `any` throws the shape away, `as T` on an empty object
 * asserts a body that is not there, and typing the parse as non-optional would let a
 * handler read `body.level` as a `string` when no body arrived at all.
 *
 * So the absence is expressed in the return type instead. Every field of an unvalidated
 * body is optional by definition — the caller is an untrusted client that may omit,
 * misspell or mistype anything — and `Partial<T>` says exactly that, which is also what
 * the handlers below already assume when they run each field through a `typeof` check
 * before using it. Nothing is asserted and no response type is weakened; the only change
 * is that the "no body" case now has a name.
 */
/**
 * The one capability this needs, named structurally rather than as Hono's `Context`.
 *
 * Same reason as `RawReader` in `curriculum-inventory.ts`: `hono` is not a dependency of
 * the web repo, and `e2e/unit/json-body.spec.ts` lives there. A type-only import would
 * still have to resolve, so the parameter describes the shape it uses instead. Any Hono
 * `Context` satisfies it.
 */
export type JsonRequest = { req: { json: <T>() => Promise<T> } };

export const readJsonBody = async <T extends object>(
    c: JsonRequest,
): Promise<Partial<T>> => {
    try {
        return await c.req.json<Partial<T>>();
    } catch {
        // No body, a truncated body, or something that is not JSON. Every caller treats
        // that identically to a body with none of the fields it wanted.
        return {};
    }
};

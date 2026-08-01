import type { Context } from "hono";
import * as core from "./MagicLinkTokenCore.js";
import type { OperationContext } from "../operationRuntime.js";

type HonoVariables = {
  prisma: unknown;
  postgres?: unknown;
  sqlite?: unknown;
  parsedQuery?: Record<string, unknown>;
  body?: unknown;
  routeConfig?: { pagination?: OperationContext["paginationConfig"] };
  guardShape?: Record<string, unknown>;
  guardCaller?: string;
  resultData?: unknown;
  resultStatus?: number;
};

type HonoEnv = { Variables: HonoVariables };

function buildContext(c: Context<HonoEnv>): OperationContext {
  return {
    prisma: c.get("prisma"),
    postgres: c.get("postgres"),
    sqlite: c.get("sqlite"),
    parsedQuery: c.get("parsedQuery"),
    body: c.get("body"),
    guardShape: c.get("guardShape"),
    guardCaller: c.get("guardCaller"),
    paginationConfig: c.get("routeConfig")?.pagination,
  };
}

export async function MagicLinkTokenFindMany(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.findMany(buildContext(c));
  c.set("resultData", data);
}

export async function MagicLinkTokenFindFirst(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.findFirst(buildContext(c));
  c.set("resultData", data);
}

export async function MagicLinkTokenFindFirstOrThrow(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.findFirstOrThrow(buildContext(c));
  c.set("resultData", data);
}

export async function MagicLinkTokenFindUnique(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.findUnique(buildContext(c));
  c.set("resultData", data);
}

export async function MagicLinkTokenFindUniqueOrThrow(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.findUniqueOrThrow(buildContext(c));
  c.set("resultData", data);
}

export async function MagicLinkTokenFindManyPaginated(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.findManyPaginated(buildContext(c));
  c.set("resultData", data);
}

export async function MagicLinkTokenAggregate(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.aggregate(buildContext(c));
  c.set("resultData", data);
}

export async function MagicLinkTokenCount(c: Context<HonoEnv>): Promise<void> {
  const data = await core.count(buildContext(c));
  c.set("resultData", data);
}

export async function MagicLinkTokenGroupBy(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.groupBy(buildContext(c));
  c.set("resultData", data);
}

export async function MagicLinkTokenCreate(c: Context<HonoEnv>): Promise<void> {
  const data = await core.create(buildContext(c));
  c.set("resultData", data);
  c.set("resultStatus", 201);
}

export async function MagicLinkTokenCreateMany(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.createMany(buildContext(c));
  c.set("resultData", data);
  c.set("resultStatus", 201);
}

export async function MagicLinkTokenCreateManyAndReturn(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.createManyAndReturn(buildContext(c));
  c.set("resultData", data);
  c.set("resultStatus", 201);
}

export async function MagicLinkTokenUpdate(c: Context<HonoEnv>): Promise<void> {
  const data = await core.update(buildContext(c));
  c.set("resultData", data);
  c.set("resultStatus", 200);
}

export async function MagicLinkTokenUpdateMany(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.updateMany(buildContext(c));
  c.set("resultData", data);
  c.set("resultStatus", 200);
}

export async function MagicLinkTokenUpdateManyAndReturn(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.updateManyAndReturn(buildContext(c));
  c.set("resultData", data);
  c.set("resultStatus", 200);
}

export async function MagicLinkTokenUpsert(c: Context<HonoEnv>): Promise<void> {
  const data = await core.upsert(buildContext(c));
  c.set("resultData", data);
  c.set("resultStatus", 200);
}

export async function MagicLinkTokenDelete(c: Context<HonoEnv>): Promise<void> {
  const data = await core.deleteUnique(buildContext(c));
  c.set("resultData", data);
  c.set("resultStatus", 200);
}

export async function MagicLinkTokenDeleteMany(
  c: Context<HonoEnv>,
): Promise<void> {
  const data = await core.deleteMany(buildContext(c));
  c.set("resultData", data);
  c.set("resultStatus", 200);
}

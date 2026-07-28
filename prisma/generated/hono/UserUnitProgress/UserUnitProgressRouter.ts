import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";
import { startQueryBuilder } from "../queryBuilder.js";
import {
  UserUnitProgressFindUnique,
  UserUnitProgressFindUniqueOrThrow,
  UserUnitProgressFindFirst,
  UserUnitProgressFindFirstOrThrow,
  UserUnitProgressFindMany,
  UserUnitProgressFindManyPaginated,
  UserUnitProgressCreate,
  UserUnitProgressCreateMany,
  UserUnitProgressCreateManyAndReturn,
  UserUnitProgressUpdate,
  UserUnitProgressUpdateMany,
  UserUnitProgressUpdateManyAndReturn,
  UserUnitProgressUpsert,
  UserUnitProgressDelete,
  UserUnitProgressDeleteMany,
  UserUnitProgressAggregate,
  UserUnitProgressCount,
  UserUnitProgressGroupBy,
} from "./UserUnitProgressHandlers.js";
import type {
  RouteConfig,
  HonoHookHandler,
  HonoEnvBase,
  HonoInternalVariables,
  GeneratedHonoEnv,
} from "../routeConfig.target.js";
import { parseQueryParams } from "../parseQueryParams.js";
import { sanitizeKeys, normalizePrefix, getEnv } from "../misc.js";
import { buildModelOpenApi } from "../buildModelOpenApi.js";
import {
  mapError,
  transformResult,
  type OperationContext,
} from "../operationRuntime.js";

import type {
  UserUnitProgressFindUniqueShapeInput,
  UserUnitProgressFindUniqueOrThrowShapeInput,
  UserUnitProgressFindFirstShapeInput,
  UserUnitProgressFindFirstOrThrowShapeInput,
  UserUnitProgressFindManyShapeInput,
  UserUnitProgressFindManyPaginatedShapeInput,
  UserUnitProgressCountShapeInput,
  UserUnitProgressAggregateShapeInput,
  UserUnitProgressGroupByShapeInput,
  UserUnitProgressCreateShapeInput,
  UserUnitProgressCreateManyShapeInput,
  UserUnitProgressCreateManyAndReturnShapeInput,
  UserUnitProgressUpdateShapeInput,
  UserUnitProgressUpdateManyShapeInput,
  UserUnitProgressUpdateManyAndReturnShapeInput,
  UserUnitProgressUpsertShapeInput,
  UserUnitProgressDeleteShapeInput,
  UserUnitProgressDeleteManyShapeInput,
} from "../../guard/shapes.js";

export type UserUnitProgressRouteConfig<
  TCtx = unknown,
  TPrisma = any,
  TEnv extends { Variables: Record<string, unknown> } = {
    Variables: Record<string, unknown>;
  },
> = Omit<
  RouteConfig<Record<string, unknown>, TCtx, TEnv>,
  | "findUnique"
  | "findUniqueOrThrow"
  | "findFirst"
  | "findFirstOrThrow"
  | "findMany"
  | "findManyPaginated"
  | "count"
  | "aggregate"
  | "groupBy"
  | "create"
  | "createMany"
  | "createManyAndReturn"
  | "update"
  | "updateMany"
  | "updateManyAndReturn"
  | "upsert"
  | "delete"
  | "deleteMany"
  | "resolveContext"
> & {
  resolveContext?: (
    request: import("hono").Context<TEnv>,
  ) => TCtx | Promise<TCtx>;
  findUnique?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressFindUniqueShapeInput<TCtx>;
  };
  findUniqueOrThrow?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressFindUniqueOrThrowShapeInput<TCtx>;
  };
  findFirst?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressFindFirstShapeInput<TCtx>;
  };
  findFirstOrThrow?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressFindFirstOrThrowShapeInput<TCtx>;
  };
  findMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressFindManyShapeInput<TCtx>;
  };
  findManyPaginated?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressFindManyPaginatedShapeInput<TCtx>;
  };
  count?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressCountShapeInput<TCtx>;
  };
  aggregate?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressAggregateShapeInput<TCtx>;
  };
  groupBy?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressGroupByShapeInput<TCtx>;
  };
  create?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressCreateShapeInput<TCtx>;
  };
  createMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressCreateManyShapeInput<TCtx>;
  };
  createManyAndReturn?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressCreateManyAndReturnShapeInput<TCtx>;
  };
  update?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressUpdateShapeInput<TCtx>;
  };
  updateMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressUpdateManyShapeInput<TCtx>;
  };
  updateManyAndReturn?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressUpdateManyAndReturnShapeInput<TCtx>;
  };
  upsert?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressUpsertShapeInput<TCtx>;
  };
  delete?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressDeleteShapeInput<TCtx>;
  };
  deleteMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUnitProgressDeleteManyShapeInput<TCtx>;
  };
};

const _env = getEnv();

const MODEL_FIELDS = [
  {
    name: "id",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
  },
  {
    name: "userId",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "level",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "unit",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "totalWords",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
  },
  {
    name: "currentIndex",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
  },
  {
    name: "learnedCount",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
  },
  {
    name: "reviewCount",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
  },
  {
    name: "completedAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "lastStudiedAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "createdAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
  },
  {
    name: "updatedAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: true,
  },
  {
    name: "user",
    kind: "object",
    type: "User",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    relationFromFields: ["userId"],
  },
] as const;

const MODEL_ENUMS = [] as const;

type OperationConfigLike<TEnv extends HonoEnvBase> = {
  before?: HonoHookHandler<TEnv>[];
  after?: HonoHookHandler<TEnv>[];
  shape?: Record<string, unknown>;
};

const defaultOpConfig = Object.freeze({
  before: Object.freeze([]),
  after: Object.freeze([]),
}) as unknown as OperationConfigLike<HonoEnvBase>;

type HandlerContext = Context<{ Variables: HonoInternalVariables }>;

function isQueryBuilderEnabled(config: RouteConfig): boolean {
  if (config.queryBuilder === false) return false;
  if (
    typeof config.queryBuilder === "object" &&
    config.queryBuilder.enabled === false
  )
    return false;
  if (_env.NODE_ENV === "production") return false;
  return true;
}

function getQueryBuilderConfig(config: RouteConfig) {
  if (config.queryBuilder === false) return null;
  if (typeof config.queryBuilder === "object") return config.queryBuilder;
  return {};
}

async function parseQueryMiddleware(c: HandlerContext): Promise<void> {
  const raw = c.req.query() as Record<string, unknown>;
  if (raw && Object.keys(raw).length > 0) {
    c.set("parsedQuery", parseQueryParams(raw) as Record<string, unknown>);
  }
}

async function parseBodyAsQueryMiddleware(c: HandlerContext): Promise<void> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, {
      message: "Request body must be a JSON object",
    });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HTTPException(400, {
      message: "Request body must be a JSON object",
    });
  }
  c.set("parsedQuery", sanitizeKeys(body as Record<string, unknown>));
}

async function parseWriteBodyMiddleware(c: HandlerContext): Promise<void> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, {
      message: "Request body must be a JSON object",
    });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HTTPException(400, {
      message: "Request body must be a JSON object",
    });
  }
  c.set("body", sanitizeKeys(body as Record<string, unknown>));
}

function makeShapeMiddleware<TCtx, TPrisma, TEnv extends HonoEnvBase>(
  config: UserUnitProgressRouteConfig<TCtx, TPrisma, TEnv>,
  opConfig: OperationConfigLike<TEnv>,
) {
  return (c: Context<GeneratedHonoEnv<TEnv>>): void => {
    const paginationConfig = (
      config as { pagination?: OperationContext["paginationConfig"] }
    ).pagination;
    if (paginationConfig) {
      c.set("routeConfig", { pagination: paginationConfig });
    }
    const headerName = config.guard?.variantHeader || "x-api-variant";
    const headerValue = c.req.header(headerName);
    const caller =
      config.guard?.resolveVariant?.(c) ?? headerValue ?? undefined;
    if (caller) c.set("guardCaller", caller);
    if (opConfig.shape) {
      c.set("guardShape", opConfig.shape);
    }
  };
}

async function runHooks<TEnv extends HonoEnvBase>(
  hooks: HonoHookHandler<TEnv>[],
  c: Context<GeneratedHonoEnv<TEnv>>,
): Promise<Response | undefined> {
  for (const hook of hooks) {
    let advanced = false;
    const next: Next = async () => {
      advanced = true;
    };
    const result = await hook(c, next);
    if (result instanceof Response) return result;
    if (!advanced) {
      if (_env.NODE_ENV !== "production") {
        console.warn(
          "[hono-router] Hook returned without calling next() or returning a Response. " +
            "Use `return c.json(...)` to short-circuit, or `await next()` to continue.",
        );
      }
      return c.body(null) ?? undefined;
    }
  }
  return undefined;
}

function sendResult(c: HandlerContext): Response {
  const data = c.get("resultData");
  const status = (c.get("resultStatus") as number | undefined) ?? 200;
  if (data === undefined) {
    throw new HTTPException(500, { message: "No data set by handler" });
  }
  return c.json(
    transformResult(data) as Record<string, unknown>,
    status as ContentfulStatusCode,
  );
}

function sendError(c: HandlerContext, error: unknown): Response {
  const httpError = mapError(error);
  return c.json(
    { message: httpError.message },
    httpError.status as ContentfulStatusCode,
  );
}

export function UserUnitProgressRouter<
  TCtx = unknown,
  TPrisma = any,
  TEnv extends HonoEnvBase = HonoEnvBase,
>(
  config: UserUnitProgressRouteConfig<TCtx, TPrisma, TEnv> = {},
): Hono<GeneratedHonoEnv<TEnv>> {
  const app = new Hono<GeneratedHonoEnv<TEnv>>();

  const customPrefix = normalizePrefix(config.customUrlPrefix || "");
  const modelPrefix =
    config.addModelPrefix !== false ? "/userunitprogress" : "";
  const basePath = customPrefix + modelPrefix;

  const openApiDisabled =
    config.disableOpenApi === true ||
    (config.disableOpenApi !== false &&
      (_env.DISABLE_OPENAPI === "true" || _env.NODE_ENV === "production"));

  const postReadsEnabled = !config.disablePostReads;

  const openApiJsonSpec = openApiDisabled
    ? null
    : buildModelOpenApi(
        "UserUnitProgress",
        MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
        MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
        config as RouteConfig,
        { format: "json" },
      );
  const openApiYamlSpec = openApiDisabled
    ? null
    : buildModelOpenApi(
        "UserUnitProgress",
        MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
        MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
        config as RouteConfig,
        { format: "yaml" },
      );

  if (isQueryBuilderEnabled(config as RouteConfig)) {
    const qbConfig = getQueryBuilderConfig(config as RouteConfig);
    if (qbConfig) {
      try {
        startQueryBuilder(qbConfig);
      } catch (err) {
        if (_env.NODE_ENV !== "production")
          console.warn("[query-builder]", err);
      }
    }
  }

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json(
        { message: err.message },
        err.status as ContentfulStatusCode,
      );
    }
    return sendError(c as HandlerContext, err);
  });

  if (!openApiDisabled) {
    const openapiJsonPath = basePath
      ? `${basePath}/openapi.json`
      : "/openapi.json";
    const openapiYamlPath = basePath
      ? `${basePath}/openapi.yaml`
      : "/openapi.yaml";
    app.get(openapiJsonPath, (c) =>
      c.json(openApiJsonSpec as Record<string, unknown>),
    );
    app.get(openapiYamlPath, (c) => {
      c.header("Content-Type", "application/yaml");
      return c.body(openApiYamlSpec as string);
    });
  }

  const handleRead =
    (
      opConfig: OperationConfigLike<TEnv>,
      handlerFn: (c: HandlerContext) => Promise<void>,
      parseFn: (c: HandlerContext) => Promise<void>,
    ) =>
    async (c: Context<GeneratedHonoEnv<TEnv>>): Promise<Response> => {
      try {
        await parseFn(c);
        makeShapeMiddleware<TCtx, TPrisma, TEnv>(config, opConfig)(c);
        const { before = [], after = [] } = opConfig;
        const beforeResp = await runHooks<TEnv>(before, c);
        if (beforeResp) return beforeResp;
        await handlerFn(c);
        const afterResp = await runHooks<TEnv>(after, c);
        if (afterResp) return afterResp;
        return sendResult(c);
      } catch (error: unknown) {
        return sendError(c, error);
      }
    };

  const handleWrite =
    (
      opConfig: OperationConfigLike<TEnv>,
      handlerFn: (c: HandlerContext) => Promise<void>,
    ) =>
    async (c: Context<GeneratedHonoEnv<TEnv>>): Promise<Response> => {
      try {
        await parseWriteBodyMiddleware(c);
        makeShapeMiddleware<TCtx, TPrisma, TEnv>(config, opConfig)(c);
        const { before = [], after = [] } = opConfig;
        const beforeResp = await runHooks<TEnv>(before, c);
        if (beforeResp) return beforeResp;
        await handlerFn(c);
        const afterResp = await runHooks<TEnv>(after, c);
        if (afterResp) return afterResp;
        return sendResult(c);
      } catch (error: unknown) {
        return sendError(c, error);
      }
    };

  const opFor = <
    K extends keyof UserUnitProgressRouteConfig<TCtx, TPrisma, TEnv>,
  >(
    key: K,
  ): OperationConfigLike<TEnv> => {
    return (
      (config[key] as unknown as OperationConfigLike<TEnv> | undefined) ??
      (defaultOpConfig as OperationConfigLike<TEnv>)
    );
  };

  if (config.enableAll || config.findFirst) {
    const opConfig = opFor("findFirst");
    const path = basePath ? `${basePath}/first` : "/first";
    app.get(
      path,
      handleRead(opConfig, UserUnitProgressFindFirst, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserUnitProgressFindFirst,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.findFirstOrThrow) {
    const opConfig = opFor("findFirstOrThrow");
    const path = basePath ? `${basePath}/first/strict` : "/first/strict";
    app.get(
      path,
      handleRead(
        opConfig,
        UserUnitProgressFindFirstOrThrow,
        parseQueryMiddleware,
      ),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserUnitProgressFindFirstOrThrow,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.findManyPaginated) {
    const opConfig = opFor("findManyPaginated");
    const path = basePath ? `${basePath}/paginated` : "/paginated";
    app.get(
      path,
      handleRead(
        opConfig,
        UserUnitProgressFindManyPaginated,
        parseQueryMiddleware,
      ),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserUnitProgressFindManyPaginated,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.aggregate) {
    const opConfig = opFor("aggregate");
    const path = basePath ? `${basePath}/aggregate` : "/aggregate";
    app.get(
      path,
      handleRead(opConfig, UserUnitProgressAggregate, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserUnitProgressAggregate,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.count) {
    const opConfig = opFor("count");
    const path = basePath ? `${basePath}/count` : "/count";
    app.get(
      path,
      handleRead(opConfig, UserUnitProgressCount, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(opConfig, UserUnitProgressCount, parseBodyAsQueryMiddleware),
      );
  }
  if (config.enableAll || config.groupBy) {
    const opConfig = opFor("groupBy");
    const path = basePath ? `${basePath}/groupby` : "/groupby";
    app.get(
      path,
      handleRead(opConfig, UserUnitProgressGroupBy, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserUnitProgressGroupBy,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.findUniqueOrThrow) {
    const opConfig = opFor("findUniqueOrThrow");
    const path = basePath ? `${basePath}/unique/strict` : "/unique/strict";
    app.get(
      path,
      handleRead(
        opConfig,
        UserUnitProgressFindUniqueOrThrow,
        parseQueryMiddleware,
      ),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserUnitProgressFindUniqueOrThrow,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.findUnique) {
    const opConfig = opFor("findUnique");
    const path = basePath ? `${basePath}/unique` : "/unique";
    app.get(
      path,
      handleRead(opConfig, UserUnitProgressFindUnique, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserUnitProgressFindUnique,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.findMany) {
    const opConfig = opFor("findMany");
    const path = basePath || "/";
    app.get(
      path,
      handleRead(opConfig, UserUnitProgressFindMany, parseQueryMiddleware),
    );
    if (postReadsEnabled) {
      const postPath = basePath ? `${basePath}/read` : "/read";
      app.post(
        postPath,
        handleRead(
          opConfig,
          UserUnitProgressFindMany,
          parseBodyAsQueryMiddleware,
        ),
      );
    }
  }

  if (config.enableAll || config.createManyAndReturn) {
    const opConfig = opFor("createManyAndReturn");
    const path = basePath ? `${basePath}/many/return` : "/many/return";
    app.post(path, handleWrite(opConfig, UserUnitProgressCreateManyAndReturn));
  }
  if (config.enableAll || config.createMany) {
    const opConfig = opFor("createMany");
    const path = basePath ? `${basePath}/many` : "/many";
    app.post(path, handleWrite(opConfig, UserUnitProgressCreateMany));
  }
  if (config.enableAll || config.create) {
    const opConfig = opFor("create");
    const path = basePath || "/";
    app.post(path, handleWrite(opConfig, UserUnitProgressCreate));
  }
  if (config.enableAll || config.updateManyAndReturn) {
    const opConfig = opFor("updateManyAndReturn");
    const path = basePath ? `${basePath}/many/return` : "/many/return";
    app.put(path, handleWrite(opConfig, UserUnitProgressUpdateManyAndReturn));
  }
  if (config.enableAll || config.updateMany) {
    const opConfig = opFor("updateMany");
    const path = basePath ? `${basePath}/many` : "/many";
    app.put(path, handleWrite(opConfig, UserUnitProgressUpdateMany));
  }
  if (config.enableAll || config.update) {
    const opConfig = opFor("update");
    const path = basePath || "/";
    app.put(path, handleWrite(opConfig, UserUnitProgressUpdate));
  }
  if (config.enableAll || config.upsert) {
    const opConfig = opFor("upsert");
    const path = basePath || "/";
    app.patch(path, handleWrite(opConfig, UserUnitProgressUpsert));
  }
  if (config.enableAll || config.deleteMany) {
    const opConfig = opFor("deleteMany");
    const path = basePath ? `${basePath}/many` : "/many";
    app.delete(path, handleWrite(opConfig, UserUnitProgressDeleteMany));
  }
  if (config.enableAll || config.delete) {
    const opConfig = opFor("delete");
    const path = basePath || "/";
    app.delete(path, handleWrite(opConfig, UserUnitProgressDelete));
  }

  return app;
}

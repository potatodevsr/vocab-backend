import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";
import { startQueryBuilder } from "../queryBuilder.js";
import {
  UserWordAttemptFindUnique,
  UserWordAttemptFindUniqueOrThrow,
  UserWordAttemptFindFirst,
  UserWordAttemptFindFirstOrThrow,
  UserWordAttemptFindMany,
  UserWordAttemptFindManyPaginated,
  UserWordAttemptCreate,
  UserWordAttemptCreateMany,
  UserWordAttemptCreateManyAndReturn,
  UserWordAttemptUpdate,
  UserWordAttemptUpdateMany,
  UserWordAttemptUpdateManyAndReturn,
  UserWordAttemptUpsert,
  UserWordAttemptDelete,
  UserWordAttemptDeleteMany,
  UserWordAttemptAggregate,
  UserWordAttemptCount,
  UserWordAttemptGroupBy,
} from "./UserWordAttemptHandlers.js";
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
  UserWordAttemptFindUniqueShapeInput,
  UserWordAttemptFindUniqueOrThrowShapeInput,
  UserWordAttemptFindFirstShapeInput,
  UserWordAttemptFindFirstOrThrowShapeInput,
  UserWordAttemptFindManyShapeInput,
  UserWordAttemptFindManyPaginatedShapeInput,
  UserWordAttemptCountShapeInput,
  UserWordAttemptAggregateShapeInput,
  UserWordAttemptGroupByShapeInput,
  UserWordAttemptCreateShapeInput,
  UserWordAttemptCreateManyShapeInput,
  UserWordAttemptCreateManyAndReturnShapeInput,
  UserWordAttemptUpdateShapeInput,
  UserWordAttemptUpdateManyShapeInput,
  UserWordAttemptUpdateManyAndReturnShapeInput,
  UserWordAttemptUpsertShapeInput,
  UserWordAttemptDeleteShapeInput,
  UserWordAttemptDeleteManyShapeInput,
} from "../../guard/shapes.js";

export type UserWordAttemptRouteConfig<
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
    shape?: UserWordAttemptFindUniqueShapeInput<TCtx>;
  };
  findUniqueOrThrow?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptFindUniqueOrThrowShapeInput<TCtx>;
  };
  findFirst?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptFindFirstShapeInput<TCtx>;
  };
  findFirstOrThrow?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptFindFirstOrThrowShapeInput<TCtx>;
  };
  findMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptFindManyShapeInput<TCtx>;
  };
  findManyPaginated?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptFindManyPaginatedShapeInput<TCtx>;
  };
  count?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptCountShapeInput<TCtx>;
  };
  aggregate?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptAggregateShapeInput<TCtx>;
  };
  groupBy?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptGroupByShapeInput<TCtx>;
  };
  create?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptCreateShapeInput<TCtx>;
  };
  createMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptCreateManyShapeInput<TCtx>;
  };
  createManyAndReturn?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptCreateManyAndReturnShapeInput<TCtx>;
  };
  update?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptUpdateShapeInput<TCtx>;
  };
  updateMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptUpdateManyShapeInput<TCtx>;
  };
  updateManyAndReturn?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptUpdateManyAndReturnShapeInput<TCtx>;
  };
  upsert?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptUpsertShapeInput<TCtx>;
  };
  delete?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptDeleteShapeInput<TCtx>;
  };
  deleteMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserWordAttemptDeleteManyShapeInput<TCtx>;
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
    name: "wordId",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "sessionId",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "quizResultId",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: false,
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
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "activityType",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "result",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "answer",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
  },
  {
    name: "correctAnswer",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
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
    name: "user",
    kind: "object",
    type: "User",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    relationFromFields: ["userId"],
  },
  {
    name: "word",
    kind: "object",
    type: "VocabWord",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    relationFromFields: ["wordId"],
  },
  {
    name: "session",
    kind: "object",
    type: "LearningSession",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
    relationFromFields: ["sessionId"],
  },
  {
    name: "quizResult",
    kind: "object",
    type: "QuizResult",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
    relationFromFields: ["quizResultId"],
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
  config: UserWordAttemptRouteConfig<TCtx, TPrisma, TEnv>,
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

export function UserWordAttemptRouter<
  TCtx = unknown,
  TPrisma = any,
  TEnv extends HonoEnvBase = HonoEnvBase,
>(
  config: UserWordAttemptRouteConfig<TCtx, TPrisma, TEnv> = {},
): Hono<GeneratedHonoEnv<TEnv>> {
  const app = new Hono<GeneratedHonoEnv<TEnv>>();

  const customPrefix = normalizePrefix(config.customUrlPrefix || "");
  const modelPrefix = config.addModelPrefix !== false ? "/userwordattempt" : "";
  const basePath = customPrefix + modelPrefix;

  const openApiDisabled =
    config.disableOpenApi === true ||
    (config.disableOpenApi !== false &&
      (_env.DISABLE_OPENAPI === "true" || _env.NODE_ENV === "production"));

  const postReadsEnabled = !config.disablePostReads;

  const openApiJsonSpec = openApiDisabled
    ? null
    : buildModelOpenApi(
        "UserWordAttempt",
        MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
        MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
        config as RouteConfig,
        { format: "json" },
      );
  const openApiYamlSpec = openApiDisabled
    ? null
    : buildModelOpenApi(
        "UserWordAttempt",
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
    K extends keyof UserWordAttemptRouteConfig<TCtx, TPrisma, TEnv>,
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
      handleRead(opConfig, UserWordAttemptFindFirst, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserWordAttemptFindFirst,
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
        UserWordAttemptFindFirstOrThrow,
        parseQueryMiddleware,
      ),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserWordAttemptFindFirstOrThrow,
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
        UserWordAttemptFindManyPaginated,
        parseQueryMiddleware,
      ),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserWordAttemptFindManyPaginated,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.aggregate) {
    const opConfig = opFor("aggregate");
    const path = basePath ? `${basePath}/aggregate` : "/aggregate";
    app.get(
      path,
      handleRead(opConfig, UserWordAttemptAggregate, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserWordAttemptAggregate,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.count) {
    const opConfig = opFor("count");
    const path = basePath ? `${basePath}/count` : "/count";
    app.get(
      path,
      handleRead(opConfig, UserWordAttemptCount, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(opConfig, UserWordAttemptCount, parseBodyAsQueryMiddleware),
      );
  }
  if (config.enableAll || config.groupBy) {
    const opConfig = opFor("groupBy");
    const path = basePath ? `${basePath}/groupby` : "/groupby";
    app.get(
      path,
      handleRead(opConfig, UserWordAttemptGroupBy, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserWordAttemptGroupBy,
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
        UserWordAttemptFindUniqueOrThrow,
        parseQueryMiddleware,
      ),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserWordAttemptFindUniqueOrThrow,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.findUnique) {
    const opConfig = opFor("findUnique");
    const path = basePath ? `${basePath}/unique` : "/unique";
    app.get(
      path,
      handleRead(opConfig, UserWordAttemptFindUnique, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(
          opConfig,
          UserWordAttemptFindUnique,
          parseBodyAsQueryMiddleware,
        ),
      );
  }
  if (config.enableAll || config.findMany) {
    const opConfig = opFor("findMany");
    const path = basePath || "/";
    app.get(
      path,
      handleRead(opConfig, UserWordAttemptFindMany, parseQueryMiddleware),
    );
    if (postReadsEnabled) {
      const postPath = basePath ? `${basePath}/read` : "/read";
      app.post(
        postPath,
        handleRead(
          opConfig,
          UserWordAttemptFindMany,
          parseBodyAsQueryMiddleware,
        ),
      );
    }
  }

  if (config.enableAll || config.createManyAndReturn) {
    const opConfig = opFor("createManyAndReturn");
    const path = basePath ? `${basePath}/many/return` : "/many/return";
    app.post(path, handleWrite(opConfig, UserWordAttemptCreateManyAndReturn));
  }
  if (config.enableAll || config.createMany) {
    const opConfig = opFor("createMany");
    const path = basePath ? `${basePath}/many` : "/many";
    app.post(path, handleWrite(opConfig, UserWordAttemptCreateMany));
  }
  if (config.enableAll || config.create) {
    const opConfig = opFor("create");
    const path = basePath || "/";
    app.post(path, handleWrite(opConfig, UserWordAttemptCreate));
  }
  if (config.enableAll || config.updateManyAndReturn) {
    const opConfig = opFor("updateManyAndReturn");
    const path = basePath ? `${basePath}/many/return` : "/many/return";
    app.put(path, handleWrite(opConfig, UserWordAttemptUpdateManyAndReturn));
  }
  if (config.enableAll || config.updateMany) {
    const opConfig = opFor("updateMany");
    const path = basePath ? `${basePath}/many` : "/many";
    app.put(path, handleWrite(opConfig, UserWordAttemptUpdateMany));
  }
  if (config.enableAll || config.update) {
    const opConfig = opFor("update");
    const path = basePath || "/";
    app.put(path, handleWrite(opConfig, UserWordAttemptUpdate));
  }
  if (config.enableAll || config.upsert) {
    const opConfig = opFor("upsert");
    const path = basePath || "/";
    app.patch(path, handleWrite(opConfig, UserWordAttemptUpsert));
  }
  if (config.enableAll || config.deleteMany) {
    const opConfig = opFor("deleteMany");
    const path = basePath ? `${basePath}/many` : "/many";
    app.delete(path, handleWrite(opConfig, UserWordAttemptDeleteMany));
  }
  if (config.enableAll || config.delete) {
    const opConfig = opFor("delete");
    const path = basePath || "/";
    app.delete(path, handleWrite(opConfig, UserWordAttemptDelete));
  }

  return app;
}

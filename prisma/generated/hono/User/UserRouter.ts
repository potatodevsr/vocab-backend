import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";
import { startQueryBuilder } from "../queryBuilder.js";
import {
  UserFindUnique,
  UserFindUniqueOrThrow,
  UserFindFirst,
  UserFindFirstOrThrow,
  UserFindMany,
  UserFindManyPaginated,
  UserCreate,
  UserCreateMany,
  UserCreateManyAndReturn,
  UserUpdate,
  UserUpdateMany,
  UserUpdateManyAndReturn,
  UserUpsert,
  UserDelete,
  UserDeleteMany,
  UserAggregate,
  UserCount,
  UserGroupBy,
} from "./UserHandlers.js";
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
  UserFindUniqueShapeInput,
  UserFindUniqueOrThrowShapeInput,
  UserFindFirstShapeInput,
  UserFindFirstOrThrowShapeInput,
  UserFindManyShapeInput,
  UserFindManyPaginatedShapeInput,
  UserCountShapeInput,
  UserAggregateShapeInput,
  UserGroupByShapeInput,
  UserCreateShapeInput,
  UserCreateManyShapeInput,
  UserCreateManyAndReturnShapeInput,
  UserUpdateShapeInput,
  UserUpdateManyShapeInput,
  UserUpdateManyAndReturnShapeInput,
  UserUpsertShapeInput,
  UserDeleteShapeInput,
  UserDeleteManyShapeInput,
} from "../../guard/shapes.js";

export type UserRouteConfig<
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
    shape?: UserFindUniqueShapeInput<TCtx>;
  };
  findUniqueOrThrow?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserFindUniqueOrThrowShapeInput<TCtx>;
  };
  findFirst?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserFindFirstShapeInput<TCtx>;
  };
  findFirstOrThrow?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserFindFirstOrThrowShapeInput<TCtx>;
  };
  findMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserFindManyShapeInput<TCtx>;
  };
  findManyPaginated?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserFindManyPaginatedShapeInput<TCtx>;
  };
  count?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserCountShapeInput<TCtx>;
  };
  aggregate?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserAggregateShapeInput<TCtx>;
  };
  groupBy?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserGroupByShapeInput<TCtx>;
  };
  create?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserCreateShapeInput<TCtx>;
  };
  createMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserCreateManyShapeInput<TCtx>;
  };
  createManyAndReturn?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserCreateManyAndReturnShapeInput<TCtx>;
  };
  update?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUpdateShapeInput<TCtx>;
  };
  updateMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUpdateManyShapeInput<TCtx>;
  };
  updateManyAndReturn?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUpdateManyAndReturnShapeInput<TCtx>;
  };
  upsert?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserUpsertShapeInput<TCtx>;
  };
  delete?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserDeleteShapeInput<TCtx>;
  };
  deleteMany?: {
    before?: HonoHookHandler<TEnv>[];
    after?: HonoHookHandler<TEnv>[];
    shape?: UserDeleteManyShapeInput<TCtx>;
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
    name: "email",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "username",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "password",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
  },
  {
    name: "firstName",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
  },
  {
    name: "lastName",
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
    name: "updatedAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: true,
  },
  {
    name: "learningSessions",
    kind: "object",
    type: "LearningSession",
    isList: true,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    relationFromFields: [],
  },
  {
    name: "quizResults",
    kind: "object",
    type: "QuizResult",
    isList: true,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    relationFromFields: [],
  },
  {
    name: "unitProgresses",
    kind: "object",
    type: "UserUnitProgress",
    isList: true,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    relationFromFields: [],
  },
  {
    name: "wordProgresses",
    kind: "object",
    type: "UserWordProgress",
    isList: true,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    relationFromFields: [],
  },
  {
    name: "wordAttempts",
    kind: "object",
    type: "UserWordAttempt",
    isList: true,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    relationFromFields: [],
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
  config: UserRouteConfig<TCtx, TPrisma, TEnv>,
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

export function UserRouter<
  TCtx = unknown,
  TPrisma = any,
  TEnv extends HonoEnvBase = HonoEnvBase,
>(
  config: UserRouteConfig<TCtx, TPrisma, TEnv> = {},
): Hono<GeneratedHonoEnv<TEnv>> {
  const app = new Hono<GeneratedHonoEnv<TEnv>>();

  const customPrefix = normalizePrefix(config.customUrlPrefix || "");
  const modelPrefix = config.addModelPrefix !== false ? "/user" : "";
  const basePath = customPrefix + modelPrefix;

  const openApiDisabled =
    config.disableOpenApi === true ||
    (config.disableOpenApi !== false &&
      (_env.DISABLE_OPENAPI === "true" || _env.NODE_ENV === "production"));

  const postReadsEnabled = !config.disablePostReads;

  const openApiJsonSpec = openApiDisabled
    ? null
    : buildModelOpenApi(
        "User",
        MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
        MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
        config as RouteConfig,
        { format: "json" },
      );
  const openApiYamlSpec = openApiDisabled
    ? null
    : buildModelOpenApi(
        "User",
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

  const opFor = <K extends keyof UserRouteConfig<TCtx, TPrisma, TEnv>>(
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
    app.get(path, handleRead(opConfig, UserFindFirst, parseQueryMiddleware));
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(opConfig, UserFindFirst, parseBodyAsQueryMiddleware),
      );
  }
  if (config.enableAll || config.findFirstOrThrow) {
    const opConfig = opFor("findFirstOrThrow");
    const path = basePath ? `${basePath}/first/strict` : "/first/strict";
    app.get(
      path,
      handleRead(opConfig, UserFindFirstOrThrow, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(opConfig, UserFindFirstOrThrow, parseBodyAsQueryMiddleware),
      );
  }
  if (config.enableAll || config.findManyPaginated) {
    const opConfig = opFor("findManyPaginated");
    const path = basePath ? `${basePath}/paginated` : "/paginated";
    app.get(
      path,
      handleRead(opConfig, UserFindManyPaginated, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(opConfig, UserFindManyPaginated, parseBodyAsQueryMiddleware),
      );
  }
  if (config.enableAll || config.aggregate) {
    const opConfig = opFor("aggregate");
    const path = basePath ? `${basePath}/aggregate` : "/aggregate";
    app.get(path, handleRead(opConfig, UserAggregate, parseQueryMiddleware));
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(opConfig, UserAggregate, parseBodyAsQueryMiddleware),
      );
  }
  if (config.enableAll || config.count) {
    const opConfig = opFor("count");
    const path = basePath ? `${basePath}/count` : "/count";
    app.get(path, handleRead(opConfig, UserCount, parseQueryMiddleware));
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(opConfig, UserCount, parseBodyAsQueryMiddleware),
      );
  }
  if (config.enableAll || config.groupBy) {
    const opConfig = opFor("groupBy");
    const path = basePath ? `${basePath}/groupby` : "/groupby";
    app.get(path, handleRead(opConfig, UserGroupBy, parseQueryMiddleware));
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(opConfig, UserGroupBy, parseBodyAsQueryMiddleware),
      );
  }
  if (config.enableAll || config.findUniqueOrThrow) {
    const opConfig = opFor("findUniqueOrThrow");
    const path = basePath ? `${basePath}/unique/strict` : "/unique/strict";
    app.get(
      path,
      handleRead(opConfig, UserFindUniqueOrThrow, parseQueryMiddleware),
    );
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(opConfig, UserFindUniqueOrThrow, parseBodyAsQueryMiddleware),
      );
  }
  if (config.enableAll || config.findUnique) {
    const opConfig = opFor("findUnique");
    const path = basePath ? `${basePath}/unique` : "/unique";
    app.get(path, handleRead(opConfig, UserFindUnique, parseQueryMiddleware));
    if (postReadsEnabled)
      app.post(
        path,
        handleRead(opConfig, UserFindUnique, parseBodyAsQueryMiddleware),
      );
  }
  if (config.enableAll || config.findMany) {
    const opConfig = opFor("findMany");
    const path = basePath || "/";
    app.get(path, handleRead(opConfig, UserFindMany, parseQueryMiddleware));
    if (postReadsEnabled) {
      const postPath = basePath ? `${basePath}/read` : "/read";
      app.post(
        postPath,
        handleRead(opConfig, UserFindMany, parseBodyAsQueryMiddleware),
      );
    }
  }

  if (config.enableAll || config.createManyAndReturn) {
    const opConfig = opFor("createManyAndReturn");
    const path = basePath ? `${basePath}/many/return` : "/many/return";
    app.post(path, handleWrite(opConfig, UserCreateManyAndReturn));
  }
  if (config.enableAll || config.createMany) {
    const opConfig = opFor("createMany");
    const path = basePath ? `${basePath}/many` : "/many";
    app.post(path, handleWrite(opConfig, UserCreateMany));
  }
  if (config.enableAll || config.create) {
    const opConfig = opFor("create");
    const path = basePath || "/";
    app.post(path, handleWrite(opConfig, UserCreate));
  }
  if (config.enableAll || config.updateManyAndReturn) {
    const opConfig = opFor("updateManyAndReturn");
    const path = basePath ? `${basePath}/many/return` : "/many/return";
    app.put(path, handleWrite(opConfig, UserUpdateManyAndReturn));
  }
  if (config.enableAll || config.updateMany) {
    const opConfig = opFor("updateMany");
    const path = basePath ? `${basePath}/many` : "/many";
    app.put(path, handleWrite(opConfig, UserUpdateMany));
  }
  if (config.enableAll || config.update) {
    const opConfig = opFor("update");
    const path = basePath || "/";
    app.put(path, handleWrite(opConfig, UserUpdate));
  }
  if (config.enableAll || config.upsert) {
    const opConfig = opFor("upsert");
    const path = basePath || "/";
    app.patch(path, handleWrite(opConfig, UserUpsert));
  }
  if (config.enableAll || config.deleteMany) {
    const opConfig = opFor("deleteMany");
    const path = basePath ? `${basePath}/many` : "/many";
    app.delete(path, handleWrite(opConfig, UserDeleteMany));
  }
  if (config.enableAll || config.delete) {
    const opConfig = opFor("delete");
    const path = basePath || "/";
    app.delete(path, handleWrite(opConfig, UserDelete));
  }

  return app;
}

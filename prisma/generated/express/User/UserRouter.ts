import express from "express";
import type { Request, Response, NextFunction, RequestHandler } from "express";
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
import * as core from "./UserCore.js";
import type { RouteConfig, QueryBuilderConfig } from "../routeConfig.target.js";
import { parseQueryParams } from "../parseQueryParams.js";
import { sanitizeKeys, normalizePrefix, getEnv } from "../misc.js";
import { buildModelOpenApi } from "../buildModelOpenApi.js";
import type { OperationContext } from "../operationRuntime.js";
import {
  transformResult,
  acceptsEventStream,
  runProgressiveEndpoint,
  runSingleResultSSE,
  emitTerminalSSEError,
  removeReqCloseListener,
  mapError,
  HttpError,
} from "../operationRuntime.js";
import { relationModels } from "../relationModels.js";
import { runAutoIncludeProgressive } from "../autoIncludeRuntime.js";

import type {
  ProgressiveVariantConfig,
  ProgressiveStage,
} from "../routeConfig.target.js";

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

export type UserRouteConfig<TCtx = unknown, TPrisma = any> = Omit<
  RouteConfig<Record<string, unknown>, TCtx, TPrisma>,
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
  resolveContext?: (request: import("express").Request) => TCtx | Promise<TCtx>;
  findUnique?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserFindUniqueShapeInput<TCtx>;
    progressive?: Record<string, ProgressiveVariantConfig>;
    progressiveStages?: Record<string, ProgressiveStage<TCtx, TPrisma>>;
  };
  findUniqueOrThrow?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserFindUniqueOrThrowShapeInput<TCtx>;
    progressive?: Record<string, ProgressiveVariantConfig>;
    progressiveStages?: Record<string, ProgressiveStage<TCtx, TPrisma>>;
  };
  findFirst?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserFindFirstShapeInput<TCtx>;
    progressive?: Record<string, ProgressiveVariantConfig>;
    progressiveStages?: Record<string, ProgressiveStage<TCtx, TPrisma>>;
  };
  findFirstOrThrow?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserFindFirstOrThrowShapeInput<TCtx>;
    progressive?: Record<string, ProgressiveVariantConfig>;
    progressiveStages?: Record<string, ProgressiveStage<TCtx, TPrisma>>;
  };
  findMany?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserFindManyShapeInput<TCtx>;
    progressive?: Record<string, ProgressiveVariantConfig>;
    progressiveStages?: Record<string, ProgressiveStage<TCtx, TPrisma>>;
  };
  findManyPaginated?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserFindManyPaginatedShapeInput<TCtx>;
    progressive?: Record<string, ProgressiveVariantConfig>;
    progressiveStages?: Record<string, ProgressiveStage<TCtx, TPrisma>>;
  };
  count?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserCountShapeInput<TCtx>;
    progressive?: Record<string, ProgressiveVariantConfig>;
    progressiveStages?: Record<string, ProgressiveStage<TCtx, TPrisma>>;
  };
  aggregate?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserAggregateShapeInput<TCtx>;
    progressive?: Record<string, ProgressiveVariantConfig>;
    progressiveStages?: Record<string, ProgressiveStage<TCtx, TPrisma>>;
  };
  groupBy?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserGroupByShapeInput<TCtx>;
    progressive?: Record<string, ProgressiveVariantConfig>;
    progressiveStages?: Record<string, ProgressiveStage<TCtx, TPrisma>>;
  };
  create?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserCreateShapeInput<TCtx>;
  };
  createMany?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserCreateManyShapeInput<TCtx>;
  };
  createManyAndReturn?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserCreateManyAndReturnShapeInput<TCtx>;
  };
  update?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserUpdateShapeInput<TCtx>;
  };
  updateMany?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserUpdateManyShapeInput<TCtx>;
  };
  updateManyAndReturn?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserUpdateManyAndReturnShapeInput<TCtx>;
  };
  upsert?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserUpsertShapeInput<TCtx>;
  };
  delete?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
    shape?: UserDeleteShapeInput<TCtx>;
  };
  deleteMany?: {
    before?: RequestHandler[];
    after?: RequestHandler[];
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

type OperationConfigLike = {
  before?: RequestHandler[];
  after?: RequestHandler[];
  shape?: Record<string, unknown>;
  progressive?: Record<string, ProgressiveVariantConfig>;
  progressiveStages?: Record<string, ProgressiveStage<unknown>>;
};

type ExtendedRequest = Request & {
  prisma?: unknown;
  postgres?: unknown;
  sqlite?: unknown;
};

type LocalsBag = {
  parsedQuery?: Record<string, unknown>;
  routeConfig?: { pagination?: OperationContext["paginationConfig"] };
  guardShape?: Record<string, unknown>;
  guardCaller?: string;
  data?: unknown;
};

const defaultOpConfig: OperationConfigLike = Object.freeze({
  before: Object.freeze([]) as unknown as RequestHandler[],
  after: Object.freeze([]) as unknown as RequestHandler[],
});

function isQueryBuilderEnabled(config: {
  queryBuilder?: QueryBuilderConfig | false;
}): boolean {
  if (config.queryBuilder === false) return false;
  if (
    typeof config.queryBuilder === "object" &&
    config.queryBuilder.enabled === false
  )
    return false;
  if (_env.NODE_ENV === "production") return false;
  return true;
}

function getQueryBuilderConfig(config: {
  queryBuilder?: QueryBuilderConfig | false;
}) {
  if (config.queryBuilder === false) return null;
  if (typeof config.queryBuilder === "object") return config.queryBuilder;
  return {};
}

function readLocals(res: Response): LocalsBag {
  return res.locals as LocalsBag;
}

export function UserRouter<TCtx = unknown, TPrisma = any>(
  config: UserRouteConfig<TCtx, TPrisma> = {},
) {
  const router = express.Router();

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
        config as unknown as Parameters<typeof buildModelOpenApi>[3],
        { format: "json" },
      );
  const openApiYamlSpec = openApiDisabled
    ? null
    : buildModelOpenApi(
        "User",
        MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
        MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
        config as unknown as Parameters<typeof buildModelOpenApi>[3],
        { format: "yaml" },
      );

  const qbEnabled = isQueryBuilderEnabled(config);
  if (qbEnabled) {
    const qbConfig = getQueryBuilderConfig(config);
    if (qbConfig) {
      try {
        startQueryBuilder(qbConfig);
      } catch (err) {
        if (_env.NODE_ENV !== "production")
          console.warn("[query-builder]", err);
      }
    }
  }

  const buildContext = (req: Request, res: Response): OperationContext => {
    const extReq = req as ExtendedRequest;
    const locals = readLocals(res);
    return {
      prisma: extReq.prisma,
      postgres: extReq.postgres,
      sqlite: extReq.sqlite,
      parsedQuery: locals.parsedQuery,
      body: req.body,
      guardShape: locals.guardShape,
      guardCaller: locals.guardCaller,
      paginationConfig: locals.routeConfig?.pagination,
    };
  };

  const parseQuery: RequestHandler = (req, res, next) => {
    const rawQuery = req.query;
    if (rawQuery && Object.keys(rawQuery).length > 0) {
      const parsed = parseQueryParams(
        rawQuery as Record<string, unknown>,
      ) as Record<string, unknown>;
      readLocals(res).parsedQuery = parsed;
    }
    next();
  };

  const parseBodyAsQuery: RequestHandler = (req, res, next) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return next({
        status: 400,
        message: "Request body must be a JSON object",
      });
    }
    readLocals(res).parsedQuery = sanitizeKeys(
      req.body as Record<string, unknown>,
    );
    next();
  };

  const setShape = (opConfig: OperationConfigLike): RequestHandler => {
    return (req, res, next) => {
      const locals = readLocals(res);
      if (config.pagination) {
        locals.routeConfig = { pagination: config.pagination };
      }
      const headerName = config.guard?.variantHeader || "x-api-variant";
      const headerValue = req.get(headerName);
      const caller =
        config.guard?.resolveVariant?.(req) ?? headerValue ?? undefined;
      if (caller) locals.guardCaller = caller;
      if (opConfig.shape) locals.guardShape = opConfig.shape;
      next();
    };
  };

  const maybeProgressiveSSE = (
    opConfig: OperationConfigLike,
    coreFn: (ctx: OperationContext) => Promise<unknown>,
    baseOp: string,
  ): RequestHandler => {
    return async (req, res, next) => {
      if (res.headersSent || res.writableEnded) return next();
      if (req.method !== "GET") return next();
      if (!acceptsEventStream(req.headers.accept)) return next();

      const locals = readLocals(res);
      const variant = locals.guardCaller;
      const progressiveConfig = variant
        ? opConfig.progressive?.[variant]
        : undefined;

      try {
        if (!progressiveConfig || progressiveConfig.enabled === false) {
          await runSingleResultSSE({
            req,
            res,
            coreQueryFn: () => coreFn(buildContext(req, res)),
          });
          return;
        }

        if (progressiveConfig.mode === "autoInclude") {
          const isSingleRecordRead =
            baseOp === "findUnique" ||
            baseOp === "findUniqueOrThrow" ||
            baseOp === "findFirst" ||
            baseOp === "findFirstOrThrow";

          if (!isSingleRecordRead) {
            if (progressiveConfig.fallback === "error") {
              emitTerminalSSEError(
                res,
                "auto-progressive fallback: operation not single-record",
              );
              return;
            }
            await runSingleResultSSE({
              req,
              res,
              coreQueryFn: () => coreFn(buildContext(req, res)),
            });
            return;
          }

          const ctx = buildContext(req, res);
          const args = (locals.parsedQuery ?? {}) as Record<string, unknown>;
          const controller = new AbortController();
          const onClose = () => controller.abort();
          req.on("close", onClose);
          try {
            await runAutoIncludeProgressive({
              req,
              res,
              ctx,
              args,
              baseOp: baseOp as
                | "findUnique"
                | "findUniqueOrThrow"
                | "findFirst"
                | "findFirstOrThrow",
              modelName: "User",
              delegateKey: "user",
              models: relationModels,
              variantConfig: progressiveConfig,
              coreQueryFn: () => coreFn(ctx),
              signal: controller.signal,
            });
          } finally {
            removeReqCloseListener(req, onClose);
          }
          return;
        }

        if (!Array.isArray(progressiveConfig.stages)) {
          await runSingleResultSSE({
            req,
            res,
            coreQueryFn: () => coreFn(buildContext(req, res)),
          });
          return;
        }

        const stageRegistry = opConfig.progressiveStages ?? {};
        const missingStage = progressiveConfig.stages.find(
          (name: string) => typeof stageRegistry[name] !== "function",
        );
        if (missingStage) {
          return next({
            status: 500,
            message: "Missing progressive stage: " + missingStage,
          });
        }

        if (typeof config.resolveContext !== "function") {
          return next({
            status: 500,
            message: "Progressive endpoint requires config.resolveContext",
          });
        }

        const ctx = await config.resolveContext(req);
        await runProgressiveEndpoint({
          req,
          res,
          ctx,
          prisma: (req as ExtendedRequest).prisma,
          variant: variant as string,
          stages: progressiveConfig.stages,
          stageRegistry,
        });
      } catch (err) {
        console.error("[progressive] dispatch error:", err);
        if (!res.headersSent) {
          return next({ status: 500, message: "Internal server error" });
        }
      }
    };
  };

  const respond: RequestHandler = (_req, res) => {
    const data = readLocals(res).data;
    if (data === undefined)
      return res.status(500).json({ message: "No data set by handler" });
    return res.json(transformResult(data));
  };

  const respondCreated: RequestHandler = (_req, res) => {
    const data = readLocals(res).data;
    if (data === undefined)
      return res.status(500).json({ message: "No data set by handler" });
    return res.status(201).json(transformResult(data));
  };

  if (!openApiDisabled) {
    const openapiJsonPath = basePath
      ? `${basePath}/openapi.json`
      : "/openapi.json";
    const openapiYamlPath = basePath
      ? `${basePath}/openapi.yaml`
      : "/openapi.yaml";
    router.get(openapiJsonPath, (_req, res) => {
      res.json(openApiJsonSpec);
    });
    router.get(openapiYamlPath, (_req, res) => {
      res.type("application/yaml").send(openApiYamlSpec as string);
    });
  }

  if (config.enableAll || config.findFirst) {
    const opConfig: OperationConfigLike =
      (config.findFirst as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/first` : "/first";
    router.get(
      path,
      parseQuery,
      setShape(opConfig),
      ...before,
      maybeProgressiveSSE(opConfig, core.findFirst, "findFirst"),
      UserFindFirst as RequestHandler,
      ...after,
      respond,
    );
    if (postReadsEnabled)
      router.post(
        path,
        parseBodyAsQuery,
        setShape(opConfig),
        ...before,
        UserFindFirst as RequestHandler,
        ...after,
        respond,
      );
  }
  if (config.enableAll || config.findFirstOrThrow) {
    const opConfig: OperationConfigLike =
      (config.findFirstOrThrow as OperationConfigLike | undefined) ??
      defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/first/strict` : "/first/strict";
    router.get(
      path,
      parseQuery,
      setShape(opConfig),
      ...before,
      maybeProgressiveSSE(opConfig, core.findFirstOrThrow, "findFirstOrThrow"),
      UserFindFirstOrThrow as RequestHandler,
      ...after,
      respond,
    );
    if (postReadsEnabled)
      router.post(
        path,
        parseBodyAsQuery,
        setShape(opConfig),
        ...before,
        UserFindFirstOrThrow as RequestHandler,
        ...after,
        respond,
      );
  }
  if (config.enableAll || config.findManyPaginated) {
    const opConfig: OperationConfigLike =
      (config.findManyPaginated as OperationConfigLike | undefined) ??
      defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/paginated` : "/paginated";
    router.get(
      path,
      parseQuery,
      setShape(opConfig),
      ...before,
      maybeProgressiveSSE(
        opConfig,
        core.findManyPaginated,
        "findManyPaginated",
      ),
      UserFindManyPaginated as RequestHandler,
      ...after,
      respond,
    );
    if (postReadsEnabled)
      router.post(
        path,
        parseBodyAsQuery,
        setShape(opConfig),
        ...before,
        UserFindManyPaginated as RequestHandler,
        ...after,
        respond,
      );
  }
  if (config.enableAll || config.aggregate) {
    const opConfig: OperationConfigLike =
      (config.aggregate as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/aggregate` : "/aggregate";
    router.get(
      path,
      parseQuery,
      setShape(opConfig),
      ...before,
      maybeProgressiveSSE(opConfig, core.aggregate, "aggregate"),
      UserAggregate as RequestHandler,
      ...after,
      respond,
    );
    if (postReadsEnabled)
      router.post(
        path,
        parseBodyAsQuery,
        setShape(opConfig),
        ...before,
        UserAggregate as RequestHandler,
        ...after,
        respond,
      );
  }
  if (config.enableAll || config.count) {
    const opConfig: OperationConfigLike =
      (config.count as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/count` : "/count";
    router.get(
      path,
      parseQuery,
      setShape(opConfig),
      ...before,
      maybeProgressiveSSE(opConfig, core.count, "count"),
      UserCount as RequestHandler,
      ...after,
      respond,
    );
    if (postReadsEnabled)
      router.post(
        path,
        parseBodyAsQuery,
        setShape(opConfig),
        ...before,
        UserCount as RequestHandler,
        ...after,
        respond,
      );
  }
  if (config.enableAll || config.groupBy) {
    const opConfig: OperationConfigLike =
      (config.groupBy as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/groupby` : "/groupby";
    router.get(
      path,
      parseQuery,
      setShape(opConfig),
      ...before,
      maybeProgressiveSSE(opConfig, core.groupBy, "groupBy"),
      UserGroupBy as RequestHandler,
      ...after,
      respond,
    );
    if (postReadsEnabled)
      router.post(
        path,
        parseBodyAsQuery,
        setShape(opConfig),
        ...before,
        UserGroupBy as RequestHandler,
        ...after,
        respond,
      );
  }
  if (config.enableAll || config.findUniqueOrThrow) {
    const opConfig: OperationConfigLike =
      (config.findUniqueOrThrow as OperationConfigLike | undefined) ??
      defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/unique/strict` : "/unique/strict";
    router.get(
      path,
      parseQuery,
      setShape(opConfig),
      ...before,
      maybeProgressiveSSE(
        opConfig,
        core.findUniqueOrThrow,
        "findUniqueOrThrow",
      ),
      UserFindUniqueOrThrow as RequestHandler,
      ...after,
      respond,
    );
    if (postReadsEnabled)
      router.post(
        path,
        parseBodyAsQuery,
        setShape(opConfig),
        ...before,
        UserFindUniqueOrThrow as RequestHandler,
        ...after,
        respond,
      );
  }
  if (config.enableAll || config.findUnique) {
    const opConfig: OperationConfigLike =
      (config.findUnique as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/unique` : "/unique";
    router.get(
      path,
      parseQuery,
      setShape(opConfig),
      ...before,
      maybeProgressiveSSE(opConfig, core.findUnique, "findUnique"),
      UserFindUnique as RequestHandler,
      ...after,
      respond,
    );
    if (postReadsEnabled)
      router.post(
        path,
        parseBodyAsQuery,
        setShape(opConfig),
        ...before,
        UserFindUnique as RequestHandler,
        ...after,
        respond,
      );
  }
  if (config.enableAll || config.findMany) {
    const opConfig: OperationConfigLike =
      (config.findMany as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath || "/";
    router.get(
      path,
      parseQuery,
      setShape(opConfig),
      ...before,
      maybeProgressiveSSE(opConfig, core.findMany, "findMany"),
      UserFindMany as RequestHandler,
      ...after,
      respond,
    );
    if (postReadsEnabled) {
      const postPath = basePath ? `${basePath}/read` : "/read";
      router.post(
        postPath,
        parseBodyAsQuery,
        setShape(opConfig),
        ...before,
        UserFindMany as RequestHandler,
        ...after,
        respond,
      );
    }
  }

  if (config.enableAll || config.createManyAndReturn) {
    const opConfig: OperationConfigLike =
      (config.createManyAndReturn as OperationConfigLike | undefined) ??
      defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/many/return` : "/many/return";
    router.post(
      path,
      setShape(opConfig),
      ...before,
      UserCreateManyAndReturn as RequestHandler,
      ...after,
      respondCreated,
    );
  }
  if (config.enableAll || config.createMany) {
    const opConfig: OperationConfigLike =
      (config.createMany as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/many` : "/many";
    router.post(
      path,
      setShape(opConfig),
      ...before,
      UserCreateMany as RequestHandler,
      ...after,
      respondCreated,
    );
  }
  if (config.enableAll || config.create) {
    const opConfig: OperationConfigLike =
      (config.create as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath || "/";
    router.post(
      path,
      setShape(opConfig),
      ...before,
      UserCreate as RequestHandler,
      ...after,
      respondCreated,
    );
  }
  if (config.enableAll || config.updateManyAndReturn) {
    const opConfig: OperationConfigLike =
      (config.updateManyAndReturn as OperationConfigLike | undefined) ??
      defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/many/return` : "/many/return";
    router.put(
      path,
      setShape(opConfig),
      ...before,
      UserUpdateManyAndReturn as RequestHandler,
      ...after,
      respond,
    );
  }
  if (config.enableAll || config.updateMany) {
    const opConfig: OperationConfigLike =
      (config.updateMany as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/many` : "/many";
    router.put(
      path,
      setShape(opConfig),
      ...before,
      UserUpdateMany as RequestHandler,
      ...after,
      respond,
    );
  }
  if (config.enableAll || config.update) {
    const opConfig: OperationConfigLike =
      (config.update as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath || "/";
    router.put(
      path,
      setShape(opConfig),
      ...before,
      UserUpdate as RequestHandler,
      ...after,
      respond,
    );
  }
  if (config.enableAll || config.upsert) {
    const opConfig: OperationConfigLike =
      (config.upsert as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath || "/";
    router.patch(
      path,
      setShape(opConfig),
      ...before,
      UserUpsert as RequestHandler,
      ...after,
      respond,
    );
  }
  if (config.enableAll || config.deleteMany) {
    const opConfig: OperationConfigLike =
      (config.deleteMany as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath ? `${basePath}/many` : "/many";
    router.delete(
      path,
      setShape(opConfig),
      ...before,
      UserDeleteMany as RequestHandler,
      ...after,
      respond,
    );
  }
  if (config.enableAll || config.delete) {
    const opConfig: OperationConfigLike =
      (config.delete as OperationConfigLike | undefined) ?? defaultOpConfig;
    const { before = [], after = [] } = opConfig;
    const path = basePath || "/";
    router.delete(
      path,
      setShape(opConfig),
      ...before,
      UserDelete as RequestHandler,
      ...after,
      respond,
    );
  }

  router.use(
    (err: unknown, _req: Request, res: Response, next: NextFunction) => {
      let httpError: HttpError;
      if (err instanceof HttpError) {
        httpError = err;
      } else if (
        err &&
        typeof err === "object" &&
        typeof (err as { status?: number }).status === "number"
      ) {
        const e = err as { status: number; message?: string };
        httpError = new HttpError(
          e.status,
          e.message || "Internal server error",
        );
      } else {
        httpError = mapError(err);
      }
      if (!res.headersSent)
        return res
          .status(httpError.status)
          .json({ message: httpError.message });
      next(err);
    },
  );

  return router;
}

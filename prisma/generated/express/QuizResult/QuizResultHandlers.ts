import type { Request, Response, NextFunction } from "express";
import * as core from "./QuizResultCore.js";
import { OperationContext, mapError } from "../operationRuntime.js";

type ExtendedRequest = Request & {
  prisma?: unknown;
  postgres?: unknown;
  sqlite?: unknown;
};

type LocalsBag = {
  parsedQuery?: Record<string, unknown>;
  routeConfig?: { pagination?: unknown };
  guardShape?: Record<string, unknown>;
  guardCaller?: string;
  data?: unknown;
};

function buildContext(req: Request, res: Response): OperationContext {
  const extReq = req as ExtendedRequest;
  const locals = res.locals as LocalsBag;
  return {
    prisma: extReq.prisma,
    postgres: extReq.postgres,
    sqlite: extReq.sqlite,
    parsedQuery: locals.parsedQuery,
    body: req.body,
    guardShape: locals.guardShape,
    guardCaller: locals.guardCaller,
    paginationConfig: locals.routeConfig
      ?.pagination as OperationContext["paginationConfig"],
  };
}

export async function QuizResultFindMany(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.findMany(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultFindFirst(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.findFirst(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultFindFirstOrThrow(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.findFirstOrThrow(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultFindUnique(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.findUnique(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultFindUniqueOrThrow(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.findUniqueOrThrow(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultFindManyPaginated(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.findManyPaginated(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultCreate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.create(buildContext(req, res));
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultCreateMany(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.createMany(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultCreateManyAndReturn(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.createManyAndReturn(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultUpdate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.update(buildContext(req, res));
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultUpdateMany(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.updateMany(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultUpdateManyAndReturn(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.updateManyAndReturn(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultUpsert(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.upsert(buildContext(req, res));
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultDelete(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.deleteUnique(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultDeleteMany(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.deleteMany(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultAggregate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.aggregate(
      buildContext(req, res),
    );
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultCount(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.count(buildContext(req, res));
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

export async function QuizResultGroupBy(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    (res.locals as LocalsBag).data = await core.groupBy(buildContext(req, res));
    next();
  } catch (error: unknown) {
    next(mapError(error));
  }
}

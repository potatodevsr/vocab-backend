import type { Request, Response, NextFunction } from "express";
import * as core from "./VocabWordCore.js";
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

export async function VocabWordFindMany(
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

export async function VocabWordFindFirst(
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

export async function VocabWordFindFirstOrThrow(
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

export async function VocabWordFindUnique(
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

export async function VocabWordFindUniqueOrThrow(
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

export async function VocabWordFindManyPaginated(
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

export async function VocabWordCreate(
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

export async function VocabWordCreateMany(
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

export async function VocabWordCreateManyAndReturn(
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

export async function VocabWordUpdate(
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

export async function VocabWordUpdateMany(
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

export async function VocabWordUpdateManyAndReturn(
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

export async function VocabWordUpsert(
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

export async function VocabWordDelete(
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

export async function VocabWordDeleteMany(
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

export async function VocabWordAggregate(
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

export async function VocabWordCount(
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

export async function VocabWordGroupBy(
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

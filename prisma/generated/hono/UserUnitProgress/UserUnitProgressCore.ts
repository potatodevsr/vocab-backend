import {
  OperationContext,
  getExtendedClient,
  getDelegate,
  validateBody,
  requireBodyField,
  applyPaginationLimits,
  assertGuard,
  countForPagination,
} from "../operationRuntime.js";

export async function findMany(ctx: OperationContext): Promise<unknown> {
  const rawQuery = ctx.parsedQuery || {};
  const query = applyPaginationLimits(rawQuery, ctx.paginationConfig);
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).findMany(query);
  }
  return delegate.findMany(query);
}

export async function findFirst(ctx: OperationContext): Promise<unknown> {
  const query = ctx.parsedQuery || {};
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).findFirst(query);
  }
  return delegate.findFirst(query);
}

export async function findUnique(ctx: OperationContext): Promise<unknown> {
  const query = ctx.parsedQuery || {};
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).findUnique(query);
  }
  return delegate.findUnique(query);
}

export async function findUniqueOrThrow(
  ctx: OperationContext,
): Promise<unknown> {
  const query = ctx.parsedQuery || {};
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate
      .guard(ctx.guardShape, ctx.guardCaller)
      .findUniqueOrThrow(query);
  }
  return delegate.findUniqueOrThrow(query);
}

export async function findFirstOrThrow(
  ctx: OperationContext,
): Promise<unknown> {
  const query = ctx.parsedQuery || {};
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate
      .guard(ctx.guardShape, ctx.guardCaller)
      .findFirstOrThrow(query);
  }
  return delegate.findFirstOrThrow(query);
}

export async function count(ctx: OperationContext): Promise<unknown> {
  const query = ctx.parsedQuery || {};
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).count(query);
  }
  return delegate.count(query);
}

export async function aggregate(ctx: OperationContext): Promise<unknown> {
  const query = ctx.parsedQuery || {};
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).aggregate(query);
  }
  return delegate.aggregate(query);
}

export async function groupBy(ctx: OperationContext): Promise<unknown> {
  const query = ctx.parsedQuery || {};
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).groupBy(query);
  }
  return delegate.groupBy(query);
}

export async function create(ctx: OperationContext): Promise<unknown> {
  const body = validateBody(ctx.body);
  requireBodyField(body, "data");
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).create(body);
  }
  return delegate.create(body);
}

export async function createMany(ctx: OperationContext): Promise<unknown> {
  const body = validateBody(ctx.body);
  requireBodyField(body, "data");
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).createMany(body);
  }
  return delegate.createMany(body);
}

export async function createManyAndReturn(
  ctx: OperationContext,
): Promise<unknown> {
  const body = validateBody(ctx.body);
  requireBodyField(body, "data");
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate
      .guard(ctx.guardShape, ctx.guardCaller)
      .createManyAndReturn(body);
  }
  return delegate.createManyAndReturn(body);
}

export async function update(ctx: OperationContext): Promise<unknown> {
  const body = validateBody(ctx.body);
  requireBodyField(body, "where");
  requireBodyField(body, "data");
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).update(body);
  }
  return delegate.update(body);
}

export async function updateMany(ctx: OperationContext): Promise<unknown> {
  const body = validateBody(ctx.body);
  requireBodyField(body, "where");
  requireBodyField(body, "data");
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).updateMany(body);
  }
  return delegate.updateMany(body);
}

export async function updateManyAndReturn(
  ctx: OperationContext,
): Promise<unknown> {
  const body = validateBody(ctx.body);
  requireBodyField(body, "where");
  requireBodyField(body, "data");
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate
      .guard(ctx.guardShape, ctx.guardCaller)
      .updateManyAndReturn(body);
  }
  return delegate.updateManyAndReturn(body);
}

export async function deleteUnique(ctx: OperationContext): Promise<unknown> {
  const body = validateBody(ctx.body);
  requireBodyField(body, "where");
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).delete(body);
  }
  return delegate.delete(body);
}

export async function deleteMany(ctx: OperationContext): Promise<unknown> {
  const body = validateBody(ctx.body);
  requireBodyField(body, "where");
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).deleteMany(body);
  }
  return delegate.deleteMany(body);
}

export async function upsert(ctx: OperationContext): Promise<unknown> {
  const body = validateBody(ctx.body);
  requireBodyField(body, "where");
  requireBodyField(body, "create");
  requireBodyField(body, "update");
  const extended = await getExtendedClient(ctx);
  const delegate = getDelegate(extended, "userUnitProgress");
  if (ctx.guardShape) {
    assertGuard(delegate);
    return delegate.guard(ctx.guardShape, ctx.guardCaller).upsert(body);
  }
  return delegate.upsert(body);
}

export async function findManyPaginated(
  ctx: OperationContext,
): Promise<{ data: unknown[]; total: number; hasMore: boolean }> {
  const rawQuery = ctx.parsedQuery || {};
  const query = applyPaginationLimits(rawQuery, ctx.paginationConfig);
  const extended = await getExtendedClient(ctx);
  const shape = ctx.guardShape;
  const caller = ctx.guardCaller;
  const distinctCountLimit = ctx.paginationConfig?.distinctCountLimit;
  const delegate = getDelegate(extended, "userUnitProgress");

  if (shape) assertGuard(delegate);

  let items: unknown[];
  let total: number;

  const txClient = extended as {
    $transaction?: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };

  if (shape || typeof txClient.$transaction !== "function") {
    const [data, count] = await Promise.all([
      shape
        ? (delegate.guard as NonNullable<typeof delegate.guard>)(
            shape,
            caller,
          ).findMany(query)
        : delegate.findMany(query),
      countForPagination(delegate, query, shape, caller, distinctCountLimit),
    ]);
    items = data as unknown[];
    total = count;
  } else {
    try {
      const txResult = await txClient.$transaction(async (tx: unknown) => {
        const txDelegate = getDelegate(tx, "userUnitProgress");
        const d = await txDelegate.findMany(query);
        const t = await countForPagination(
          txDelegate,
          query,
          undefined,
          undefined,
          distinctCountLimit,
        );
        return { d, t };
      });
      items = txResult.d as unknown[];
      total = txResult.t;
    } catch (txError: unknown) {
      const txe = txError as { message?: string; code?: string };
      if (txe?.code === "P2028") {
        console.warn(
          "[prisma-generator-express] Interactive transactions not available, pagination queries are non-atomic",
        );
        items = (await delegate.findMany(query)) as unknown[];
        total = await countForPagination(
          delegate,
          query,
          undefined,
          undefined,
          distinctCountLimit,
        );
      } else {
        throw txError;
      }
    }
  }

  const skip = typeof query.skip === "number" ? query.skip : 0;
  const takeRaw = typeof query.take === "number" ? query.take : items.length;
  const absTake = Math.abs(takeRaw);
  const hasMore = items.length >= absTake && skip + items.length < total;

  return { data: items, total, hasMore };
}

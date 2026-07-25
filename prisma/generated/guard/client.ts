import type { PrismaClient } from '@prisma/client'
import type { GuardInput, GuardedModel } from 'prisma-guard'
import { createGuard } from 'prisma-guard'
import { SCOPE_MAP, TYPE_MAP, ENUM_MAP, ZOD_CHAINS, GUARD_CONFIG, UNIQUE_MAP, ZOD_DEFAULTS } from './index'
import type { ScopeRoot } from './index'

interface GuardModelExtension {
  $allModels: {
    guard<TDelegate>(this: TDelegate, input: GuardInput, caller?: string): GuardedModel<TDelegate>
  }
}

export const guard = createGuard<typeof TYPE_MAP, ScopeRoot, GuardModelExtension>({
  scopeMap: SCOPE_MAP,
  typeMap: TYPE_MAP,
  enumMap: ENUM_MAP,
  zodChains: ZOD_CHAINS,
  guardConfig: GUARD_CONFIG,
  uniqueMap: UNIQUE_MAP,
  zodDefaults: ZOD_DEFAULTS,
})

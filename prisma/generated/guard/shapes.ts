import type { TYPE_MAP, UNIQUE_MAP } from './index'
import type {
  TypedGuardShape,
  OperationShape,
  ShapeInput,
  TypedProjection,
  TypedInclude,
  TypedCountSelect,
} from 'prisma-guard'

type TM = typeof TYPE_MAP
type UM = typeof UNIQUE_MAP

export type WordlistSelect = TypedProjection<TM, 'Wordlist', 1, UM>
export type WordlistProjection = WordlistSelect
export type WordlistInclude = TypedInclude<TM, 'Wordlist', 1, UM>
export type WordlistCountSelect = TypedCountSelect<TM, 'Wordlist'>
export type WordlistGuardShape = TypedGuardShape<TM, 'Wordlist', 1, UM>
export type WordlistFindManyShape = OperationShape<TM, 'Wordlist', 'findMany', 1, UM>
export type WordlistFindManyShapeInput<TCtx = unknown> = ShapeInput<WordlistFindManyShape, TCtx>
export type WordlistFindFirstShape = OperationShape<TM, 'Wordlist', 'findFirst', 1, UM>
export type WordlistFindFirstShapeInput<TCtx = unknown> = ShapeInput<WordlistFindFirstShape, TCtx>
export type WordlistFindFirstOrThrowShape = OperationShape<TM, 'Wordlist', 'findFirstOrThrow', 1, UM>
export type WordlistFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<WordlistFindFirstOrThrowShape, TCtx>
export type WordlistFindUniqueShape = OperationShape<TM, 'Wordlist', 'findUnique', 1, UM>
export type WordlistFindUniqueShapeInput<TCtx = unknown> = ShapeInput<WordlistFindUniqueShape, TCtx>
export type WordlistFindUniqueOrThrowShape = OperationShape<TM, 'Wordlist', 'findUniqueOrThrow', 1, UM>
export type WordlistFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<WordlistFindUniqueOrThrowShape, TCtx>
export type WordlistFindManyPaginatedShape = OperationShape<TM, 'Wordlist', 'findManyPaginated', 1, UM>
export type WordlistFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<WordlistFindManyPaginatedShape, TCtx>
export type WordlistCountShape = OperationShape<TM, 'Wordlist', 'count', 1, UM>
export type WordlistCountShapeInput<TCtx = unknown> = ShapeInput<WordlistCountShape, TCtx>
export type WordlistAggregateShape = OperationShape<TM, 'Wordlist', 'aggregate', 1, UM>
export type WordlistAggregateShapeInput<TCtx = unknown> = ShapeInput<WordlistAggregateShape, TCtx>
export type WordlistGroupByShape = OperationShape<TM, 'Wordlist', 'groupBy', 1, UM>
export type WordlistGroupByShapeInput<TCtx = unknown> = ShapeInput<WordlistGroupByShape, TCtx>
export type WordlistCreateShape = OperationShape<TM, 'Wordlist', 'create', 1, UM>
export type WordlistCreateShapeInput<TCtx = unknown> = ShapeInput<WordlistCreateShape, TCtx>
export type WordlistCreateManyShape = OperationShape<TM, 'Wordlist', 'createMany', 1, UM>
export type WordlistCreateManyShapeInput<TCtx = unknown> = ShapeInput<WordlistCreateManyShape, TCtx>
export type WordlistCreateManyAndReturnShape = OperationShape<TM, 'Wordlist', 'createManyAndReturn', 1, UM>
export type WordlistCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<WordlistCreateManyAndReturnShape, TCtx>
export type WordlistUpdateShape = OperationShape<TM, 'Wordlist', 'update', 1, UM>
export type WordlistUpdateShapeInput<TCtx = unknown> = ShapeInput<WordlistUpdateShape, TCtx>
export type WordlistUpdateManyShape = OperationShape<TM, 'Wordlist', 'updateMany', 1, UM>
export type WordlistUpdateManyShapeInput<TCtx = unknown> = ShapeInput<WordlistUpdateManyShape, TCtx>
export type WordlistUpdateManyAndReturnShape = OperationShape<TM, 'Wordlist', 'updateManyAndReturn', 1, UM>
export type WordlistUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<WordlistUpdateManyAndReturnShape, TCtx>
export type WordlistUpsertShape = OperationShape<TM, 'Wordlist', 'upsert', 1, UM>
export type WordlistUpsertShapeInput<TCtx = unknown> = ShapeInput<WordlistUpsertShape, TCtx>
export type WordlistDeleteShape = OperationShape<TM, 'Wordlist', 'delete', 1, UM>
export type WordlistDeleteShapeInput<TCtx = unknown> = ShapeInput<WordlistDeleteShape, TCtx>
export type WordlistDeleteManyShape = OperationShape<TM, 'Wordlist', 'deleteMany', 1, UM>
export type WordlistDeleteManyShapeInput<TCtx = unknown> = ShapeInput<WordlistDeleteManyShape, TCtx>

export type VocabWordSelect = TypedProjection<TM, 'VocabWord', 1, UM>
export type VocabWordProjection = VocabWordSelect
export type VocabWordInclude = TypedInclude<TM, 'VocabWord', 1, UM>
export type VocabWordCountSelect = TypedCountSelect<TM, 'VocabWord'>
export type VocabWordGuardShape = TypedGuardShape<TM, 'VocabWord', 1, UM>
export type VocabWordFindManyShape = OperationShape<TM, 'VocabWord', 'findMany', 1, UM>
export type VocabWordFindManyShapeInput<TCtx = unknown> = ShapeInput<VocabWordFindManyShape, TCtx>
export type VocabWordFindFirstShape = OperationShape<TM, 'VocabWord', 'findFirst', 1, UM>
export type VocabWordFindFirstShapeInput<TCtx = unknown> = ShapeInput<VocabWordFindFirstShape, TCtx>
export type VocabWordFindFirstOrThrowShape = OperationShape<TM, 'VocabWord', 'findFirstOrThrow', 1, UM>
export type VocabWordFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<VocabWordFindFirstOrThrowShape, TCtx>
export type VocabWordFindUniqueShape = OperationShape<TM, 'VocabWord', 'findUnique', 1, UM>
export type VocabWordFindUniqueShapeInput<TCtx = unknown> = ShapeInput<VocabWordFindUniqueShape, TCtx>
export type VocabWordFindUniqueOrThrowShape = OperationShape<TM, 'VocabWord', 'findUniqueOrThrow', 1, UM>
export type VocabWordFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<VocabWordFindUniqueOrThrowShape, TCtx>
export type VocabWordFindManyPaginatedShape = OperationShape<TM, 'VocabWord', 'findManyPaginated', 1, UM>
export type VocabWordFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<VocabWordFindManyPaginatedShape, TCtx>
export type VocabWordCountShape = OperationShape<TM, 'VocabWord', 'count', 1, UM>
export type VocabWordCountShapeInput<TCtx = unknown> = ShapeInput<VocabWordCountShape, TCtx>
export type VocabWordAggregateShape = OperationShape<TM, 'VocabWord', 'aggregate', 1, UM>
export type VocabWordAggregateShapeInput<TCtx = unknown> = ShapeInput<VocabWordAggregateShape, TCtx>
export type VocabWordGroupByShape = OperationShape<TM, 'VocabWord', 'groupBy', 1, UM>
export type VocabWordGroupByShapeInput<TCtx = unknown> = ShapeInput<VocabWordGroupByShape, TCtx>
export type VocabWordCreateShape = OperationShape<TM, 'VocabWord', 'create', 1, UM>
export type VocabWordCreateShapeInput<TCtx = unknown> = ShapeInput<VocabWordCreateShape, TCtx>
export type VocabWordCreateManyShape = OperationShape<TM, 'VocabWord', 'createMany', 1, UM>
export type VocabWordCreateManyShapeInput<TCtx = unknown> = ShapeInput<VocabWordCreateManyShape, TCtx>
export type VocabWordCreateManyAndReturnShape = OperationShape<TM, 'VocabWord', 'createManyAndReturn', 1, UM>
export type VocabWordCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<VocabWordCreateManyAndReturnShape, TCtx>
export type VocabWordUpdateShape = OperationShape<TM, 'VocabWord', 'update', 1, UM>
export type VocabWordUpdateShapeInput<TCtx = unknown> = ShapeInput<VocabWordUpdateShape, TCtx>
export type VocabWordUpdateManyShape = OperationShape<TM, 'VocabWord', 'updateMany', 1, UM>
export type VocabWordUpdateManyShapeInput<TCtx = unknown> = ShapeInput<VocabWordUpdateManyShape, TCtx>
export type VocabWordUpdateManyAndReturnShape = OperationShape<TM, 'VocabWord', 'updateManyAndReturn', 1, UM>
export type VocabWordUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<VocabWordUpdateManyAndReturnShape, TCtx>
export type VocabWordUpsertShape = OperationShape<TM, 'VocabWord', 'upsert', 1, UM>
export type VocabWordUpsertShapeInput<TCtx = unknown> = ShapeInput<VocabWordUpsertShape, TCtx>
export type VocabWordDeleteShape = OperationShape<TM, 'VocabWord', 'delete', 1, UM>
export type VocabWordDeleteShapeInput<TCtx = unknown> = ShapeInput<VocabWordDeleteShape, TCtx>
export type VocabWordDeleteManyShape = OperationShape<TM, 'VocabWord', 'deleteMany', 1, UM>
export type VocabWordDeleteManyShapeInput<TCtx = unknown> = ShapeInput<VocabWordDeleteManyShape, TCtx>

export type ThaiLetterSelect = TypedProjection<TM, 'ThaiLetter', 1, UM>
export type ThaiLetterProjection = ThaiLetterSelect
export type ThaiLetterInclude = TypedInclude<TM, 'ThaiLetter', 1, UM>
export type ThaiLetterCountSelect = TypedCountSelect<TM, 'ThaiLetter'>
export type ThaiLetterGuardShape = TypedGuardShape<TM, 'ThaiLetter', 1, UM>
export type ThaiLetterFindManyShape = OperationShape<TM, 'ThaiLetter', 'findMany', 1, UM>
export type ThaiLetterFindManyShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterFindManyShape, TCtx>
export type ThaiLetterFindFirstShape = OperationShape<TM, 'ThaiLetter', 'findFirst', 1, UM>
export type ThaiLetterFindFirstShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterFindFirstShape, TCtx>
export type ThaiLetterFindFirstOrThrowShape = OperationShape<TM, 'ThaiLetter', 'findFirstOrThrow', 1, UM>
export type ThaiLetterFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterFindFirstOrThrowShape, TCtx>
export type ThaiLetterFindUniqueShape = OperationShape<TM, 'ThaiLetter', 'findUnique', 1, UM>
export type ThaiLetterFindUniqueShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterFindUniqueShape, TCtx>
export type ThaiLetterFindUniqueOrThrowShape = OperationShape<TM, 'ThaiLetter', 'findUniqueOrThrow', 1, UM>
export type ThaiLetterFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterFindUniqueOrThrowShape, TCtx>
export type ThaiLetterFindManyPaginatedShape = OperationShape<TM, 'ThaiLetter', 'findManyPaginated', 1, UM>
export type ThaiLetterFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterFindManyPaginatedShape, TCtx>
export type ThaiLetterCountShape = OperationShape<TM, 'ThaiLetter', 'count', 1, UM>
export type ThaiLetterCountShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterCountShape, TCtx>
export type ThaiLetterAggregateShape = OperationShape<TM, 'ThaiLetter', 'aggregate', 1, UM>
export type ThaiLetterAggregateShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterAggregateShape, TCtx>
export type ThaiLetterGroupByShape = OperationShape<TM, 'ThaiLetter', 'groupBy', 1, UM>
export type ThaiLetterGroupByShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterGroupByShape, TCtx>
export type ThaiLetterCreateShape = OperationShape<TM, 'ThaiLetter', 'create', 1, UM>
export type ThaiLetterCreateShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterCreateShape, TCtx>
export type ThaiLetterCreateManyShape = OperationShape<TM, 'ThaiLetter', 'createMany', 1, UM>
export type ThaiLetterCreateManyShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterCreateManyShape, TCtx>
export type ThaiLetterCreateManyAndReturnShape = OperationShape<TM, 'ThaiLetter', 'createManyAndReturn', 1, UM>
export type ThaiLetterCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterCreateManyAndReturnShape, TCtx>
export type ThaiLetterUpdateShape = OperationShape<TM, 'ThaiLetter', 'update', 1, UM>
export type ThaiLetterUpdateShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterUpdateShape, TCtx>
export type ThaiLetterUpdateManyShape = OperationShape<TM, 'ThaiLetter', 'updateMany', 1, UM>
export type ThaiLetterUpdateManyShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterUpdateManyShape, TCtx>
export type ThaiLetterUpdateManyAndReturnShape = OperationShape<TM, 'ThaiLetter', 'updateManyAndReturn', 1, UM>
export type ThaiLetterUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterUpdateManyAndReturnShape, TCtx>
export type ThaiLetterUpsertShape = OperationShape<TM, 'ThaiLetter', 'upsert', 1, UM>
export type ThaiLetterUpsertShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterUpsertShape, TCtx>
export type ThaiLetterDeleteShape = OperationShape<TM, 'ThaiLetter', 'delete', 1, UM>
export type ThaiLetterDeleteShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterDeleteShape, TCtx>
export type ThaiLetterDeleteManyShape = OperationShape<TM, 'ThaiLetter', 'deleteMany', 1, UM>
export type ThaiLetterDeleteManyShapeInput<TCtx = unknown> = ShapeInput<ThaiLetterDeleteManyShape, TCtx>

export type AdminUserSelect = TypedProjection<TM, 'AdminUser', 1, UM>
export type AdminUserProjection = AdminUserSelect
export type AdminUserInclude = TypedInclude<TM, 'AdminUser', 1, UM>
export type AdminUserCountSelect = TypedCountSelect<TM, 'AdminUser'>
export type AdminUserGuardShape = TypedGuardShape<TM, 'AdminUser', 1, UM>
export type AdminUserFindManyShape = OperationShape<TM, 'AdminUser', 'findMany', 1, UM>
export type AdminUserFindManyShapeInput<TCtx = unknown> = ShapeInput<AdminUserFindManyShape, TCtx>
export type AdminUserFindFirstShape = OperationShape<TM, 'AdminUser', 'findFirst', 1, UM>
export type AdminUserFindFirstShapeInput<TCtx = unknown> = ShapeInput<AdminUserFindFirstShape, TCtx>
export type AdminUserFindFirstOrThrowShape = OperationShape<TM, 'AdminUser', 'findFirstOrThrow', 1, UM>
export type AdminUserFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<AdminUserFindFirstOrThrowShape, TCtx>
export type AdminUserFindUniqueShape = OperationShape<TM, 'AdminUser', 'findUnique', 1, UM>
export type AdminUserFindUniqueShapeInput<TCtx = unknown> = ShapeInput<AdminUserFindUniqueShape, TCtx>
export type AdminUserFindUniqueOrThrowShape = OperationShape<TM, 'AdminUser', 'findUniqueOrThrow', 1, UM>
export type AdminUserFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<AdminUserFindUniqueOrThrowShape, TCtx>
export type AdminUserFindManyPaginatedShape = OperationShape<TM, 'AdminUser', 'findManyPaginated', 1, UM>
export type AdminUserFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<AdminUserFindManyPaginatedShape, TCtx>
export type AdminUserCountShape = OperationShape<TM, 'AdminUser', 'count', 1, UM>
export type AdminUserCountShapeInput<TCtx = unknown> = ShapeInput<AdminUserCountShape, TCtx>
export type AdminUserAggregateShape = OperationShape<TM, 'AdminUser', 'aggregate', 1, UM>
export type AdminUserAggregateShapeInput<TCtx = unknown> = ShapeInput<AdminUserAggregateShape, TCtx>
export type AdminUserGroupByShape = OperationShape<TM, 'AdminUser', 'groupBy', 1, UM>
export type AdminUserGroupByShapeInput<TCtx = unknown> = ShapeInput<AdminUserGroupByShape, TCtx>
export type AdminUserCreateShape = OperationShape<TM, 'AdminUser', 'create', 1, UM>
export type AdminUserCreateShapeInput<TCtx = unknown> = ShapeInput<AdminUserCreateShape, TCtx>
export type AdminUserCreateManyShape = OperationShape<TM, 'AdminUser', 'createMany', 1, UM>
export type AdminUserCreateManyShapeInput<TCtx = unknown> = ShapeInput<AdminUserCreateManyShape, TCtx>
export type AdminUserCreateManyAndReturnShape = OperationShape<TM, 'AdminUser', 'createManyAndReturn', 1, UM>
export type AdminUserCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<AdminUserCreateManyAndReturnShape, TCtx>
export type AdminUserUpdateShape = OperationShape<TM, 'AdminUser', 'update', 1, UM>
export type AdminUserUpdateShapeInput<TCtx = unknown> = ShapeInput<AdminUserUpdateShape, TCtx>
export type AdminUserUpdateManyShape = OperationShape<TM, 'AdminUser', 'updateMany', 1, UM>
export type AdminUserUpdateManyShapeInput<TCtx = unknown> = ShapeInput<AdminUserUpdateManyShape, TCtx>
export type AdminUserUpdateManyAndReturnShape = OperationShape<TM, 'AdminUser', 'updateManyAndReturn', 1, UM>
export type AdminUserUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<AdminUserUpdateManyAndReturnShape, TCtx>
export type AdminUserUpsertShape = OperationShape<TM, 'AdminUser', 'upsert', 1, UM>
export type AdminUserUpsertShapeInput<TCtx = unknown> = ShapeInput<AdminUserUpsertShape, TCtx>
export type AdminUserDeleteShape = OperationShape<TM, 'AdminUser', 'delete', 1, UM>
export type AdminUserDeleteShapeInput<TCtx = unknown> = ShapeInput<AdminUserDeleteShape, TCtx>
export type AdminUserDeleteManyShape = OperationShape<TM, 'AdminUser', 'deleteMany', 1, UM>
export type AdminUserDeleteManyShapeInput<TCtx = unknown> = ShapeInput<AdminUserDeleteManyShape, TCtx>

export type UserSelect = TypedProjection<TM, 'User', 1, UM>
export type UserProjection = UserSelect
export type UserInclude = TypedInclude<TM, 'User', 1, UM>
export type UserCountSelect = TypedCountSelect<TM, 'User'>
export type UserGuardShape = TypedGuardShape<TM, 'User', 1, UM>
export type UserFindManyShape = OperationShape<TM, 'User', 'findMany', 1, UM>
export type UserFindManyShapeInput<TCtx = unknown> = ShapeInput<UserFindManyShape, TCtx>
export type UserFindFirstShape = OperationShape<TM, 'User', 'findFirst', 1, UM>
export type UserFindFirstShapeInput<TCtx = unknown> = ShapeInput<UserFindFirstShape, TCtx>
export type UserFindFirstOrThrowShape = OperationShape<TM, 'User', 'findFirstOrThrow', 1, UM>
export type UserFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<UserFindFirstOrThrowShape, TCtx>
export type UserFindUniqueShape = OperationShape<TM, 'User', 'findUnique', 1, UM>
export type UserFindUniqueShapeInput<TCtx = unknown> = ShapeInput<UserFindUniqueShape, TCtx>
export type UserFindUniqueOrThrowShape = OperationShape<TM, 'User', 'findUniqueOrThrow', 1, UM>
export type UserFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<UserFindUniqueOrThrowShape, TCtx>
export type UserFindManyPaginatedShape = OperationShape<TM, 'User', 'findManyPaginated', 1, UM>
export type UserFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<UserFindManyPaginatedShape, TCtx>
export type UserCountShape = OperationShape<TM, 'User', 'count', 1, UM>
export type UserCountShapeInput<TCtx = unknown> = ShapeInput<UserCountShape, TCtx>
export type UserAggregateShape = OperationShape<TM, 'User', 'aggregate', 1, UM>
export type UserAggregateShapeInput<TCtx = unknown> = ShapeInput<UserAggregateShape, TCtx>
export type UserGroupByShape = OperationShape<TM, 'User', 'groupBy', 1, UM>
export type UserGroupByShapeInput<TCtx = unknown> = ShapeInput<UserGroupByShape, TCtx>
export type UserCreateShape = OperationShape<TM, 'User', 'create', 1, UM>
export type UserCreateShapeInput<TCtx = unknown> = ShapeInput<UserCreateShape, TCtx>
export type UserCreateManyShape = OperationShape<TM, 'User', 'createMany', 1, UM>
export type UserCreateManyShapeInput<TCtx = unknown> = ShapeInput<UserCreateManyShape, TCtx>
export type UserCreateManyAndReturnShape = OperationShape<TM, 'User', 'createManyAndReturn', 1, UM>
export type UserCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<UserCreateManyAndReturnShape, TCtx>
export type UserUpdateShape = OperationShape<TM, 'User', 'update', 1, UM>
export type UserUpdateShapeInput<TCtx = unknown> = ShapeInput<UserUpdateShape, TCtx>
export type UserUpdateManyShape = OperationShape<TM, 'User', 'updateMany', 1, UM>
export type UserUpdateManyShapeInput<TCtx = unknown> = ShapeInput<UserUpdateManyShape, TCtx>
export type UserUpdateManyAndReturnShape = OperationShape<TM, 'User', 'updateManyAndReturn', 1, UM>
export type UserUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<UserUpdateManyAndReturnShape, TCtx>
export type UserUpsertShape = OperationShape<TM, 'User', 'upsert', 1, UM>
export type UserUpsertShapeInput<TCtx = unknown> = ShapeInput<UserUpsertShape, TCtx>
export type UserDeleteShape = OperationShape<TM, 'User', 'delete', 1, UM>
export type UserDeleteShapeInput<TCtx = unknown> = ShapeInput<UserDeleteShape, TCtx>
export type UserDeleteManyShape = OperationShape<TM, 'User', 'deleteMany', 1, UM>
export type UserDeleteManyShapeInput<TCtx = unknown> = ShapeInput<UserDeleteManyShape, TCtx>

export type PushSubscriptionSelect = TypedProjection<TM, 'PushSubscription', 1, UM>
export type PushSubscriptionProjection = PushSubscriptionSelect
export type PushSubscriptionInclude = TypedInclude<TM, 'PushSubscription', 1, UM>
export type PushSubscriptionCountSelect = TypedCountSelect<TM, 'PushSubscription'>
export type PushSubscriptionGuardShape = TypedGuardShape<TM, 'PushSubscription', 1, UM>
export type PushSubscriptionFindManyShape = OperationShape<TM, 'PushSubscription', 'findMany', 1, UM>
export type PushSubscriptionFindManyShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionFindManyShape, TCtx>
export type PushSubscriptionFindFirstShape = OperationShape<TM, 'PushSubscription', 'findFirst', 1, UM>
export type PushSubscriptionFindFirstShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionFindFirstShape, TCtx>
export type PushSubscriptionFindFirstOrThrowShape = OperationShape<TM, 'PushSubscription', 'findFirstOrThrow', 1, UM>
export type PushSubscriptionFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionFindFirstOrThrowShape, TCtx>
export type PushSubscriptionFindUniqueShape = OperationShape<TM, 'PushSubscription', 'findUnique', 1, UM>
export type PushSubscriptionFindUniqueShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionFindUniqueShape, TCtx>
export type PushSubscriptionFindUniqueOrThrowShape = OperationShape<TM, 'PushSubscription', 'findUniqueOrThrow', 1, UM>
export type PushSubscriptionFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionFindUniqueOrThrowShape, TCtx>
export type PushSubscriptionFindManyPaginatedShape = OperationShape<TM, 'PushSubscription', 'findManyPaginated', 1, UM>
export type PushSubscriptionFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionFindManyPaginatedShape, TCtx>
export type PushSubscriptionCountShape = OperationShape<TM, 'PushSubscription', 'count', 1, UM>
export type PushSubscriptionCountShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionCountShape, TCtx>
export type PushSubscriptionAggregateShape = OperationShape<TM, 'PushSubscription', 'aggregate', 1, UM>
export type PushSubscriptionAggregateShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionAggregateShape, TCtx>
export type PushSubscriptionGroupByShape = OperationShape<TM, 'PushSubscription', 'groupBy', 1, UM>
export type PushSubscriptionGroupByShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionGroupByShape, TCtx>
export type PushSubscriptionCreateShape = OperationShape<TM, 'PushSubscription', 'create', 1, UM>
export type PushSubscriptionCreateShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionCreateShape, TCtx>
export type PushSubscriptionCreateManyShape = OperationShape<TM, 'PushSubscription', 'createMany', 1, UM>
export type PushSubscriptionCreateManyShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionCreateManyShape, TCtx>
export type PushSubscriptionCreateManyAndReturnShape = OperationShape<TM, 'PushSubscription', 'createManyAndReturn', 1, UM>
export type PushSubscriptionCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionCreateManyAndReturnShape, TCtx>
export type PushSubscriptionUpdateShape = OperationShape<TM, 'PushSubscription', 'update', 1, UM>
export type PushSubscriptionUpdateShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionUpdateShape, TCtx>
export type PushSubscriptionUpdateManyShape = OperationShape<TM, 'PushSubscription', 'updateMany', 1, UM>
export type PushSubscriptionUpdateManyShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionUpdateManyShape, TCtx>
export type PushSubscriptionUpdateManyAndReturnShape = OperationShape<TM, 'PushSubscription', 'updateManyAndReturn', 1, UM>
export type PushSubscriptionUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionUpdateManyAndReturnShape, TCtx>
export type PushSubscriptionUpsertShape = OperationShape<TM, 'PushSubscription', 'upsert', 1, UM>
export type PushSubscriptionUpsertShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionUpsertShape, TCtx>
export type PushSubscriptionDeleteShape = OperationShape<TM, 'PushSubscription', 'delete', 1, UM>
export type PushSubscriptionDeleteShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionDeleteShape, TCtx>
export type PushSubscriptionDeleteManyShape = OperationShape<TM, 'PushSubscription', 'deleteMany', 1, UM>
export type PushSubscriptionDeleteManyShapeInput<TCtx = unknown> = ShapeInput<PushSubscriptionDeleteManyShape, TCtx>

export type MagicLinkTokenSelect = TypedProjection<TM, 'MagicLinkToken', 1, UM>
export type MagicLinkTokenProjection = MagicLinkTokenSelect
export type MagicLinkTokenInclude = TypedInclude<TM, 'MagicLinkToken', 1, UM>
export type MagicLinkTokenCountSelect = TypedCountSelect<TM, 'MagicLinkToken'>
export type MagicLinkTokenGuardShape = TypedGuardShape<TM, 'MagicLinkToken', 1, UM>
export type MagicLinkTokenFindManyShape = OperationShape<TM, 'MagicLinkToken', 'findMany', 1, UM>
export type MagicLinkTokenFindManyShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenFindManyShape, TCtx>
export type MagicLinkTokenFindFirstShape = OperationShape<TM, 'MagicLinkToken', 'findFirst', 1, UM>
export type MagicLinkTokenFindFirstShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenFindFirstShape, TCtx>
export type MagicLinkTokenFindFirstOrThrowShape = OperationShape<TM, 'MagicLinkToken', 'findFirstOrThrow', 1, UM>
export type MagicLinkTokenFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenFindFirstOrThrowShape, TCtx>
export type MagicLinkTokenFindUniqueShape = OperationShape<TM, 'MagicLinkToken', 'findUnique', 1, UM>
export type MagicLinkTokenFindUniqueShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenFindUniqueShape, TCtx>
export type MagicLinkTokenFindUniqueOrThrowShape = OperationShape<TM, 'MagicLinkToken', 'findUniqueOrThrow', 1, UM>
export type MagicLinkTokenFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenFindUniqueOrThrowShape, TCtx>
export type MagicLinkTokenFindManyPaginatedShape = OperationShape<TM, 'MagicLinkToken', 'findManyPaginated', 1, UM>
export type MagicLinkTokenFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenFindManyPaginatedShape, TCtx>
export type MagicLinkTokenCountShape = OperationShape<TM, 'MagicLinkToken', 'count', 1, UM>
export type MagicLinkTokenCountShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenCountShape, TCtx>
export type MagicLinkTokenAggregateShape = OperationShape<TM, 'MagicLinkToken', 'aggregate', 1, UM>
export type MagicLinkTokenAggregateShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenAggregateShape, TCtx>
export type MagicLinkTokenGroupByShape = OperationShape<TM, 'MagicLinkToken', 'groupBy', 1, UM>
export type MagicLinkTokenGroupByShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenGroupByShape, TCtx>
export type MagicLinkTokenCreateShape = OperationShape<TM, 'MagicLinkToken', 'create', 1, UM>
export type MagicLinkTokenCreateShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenCreateShape, TCtx>
export type MagicLinkTokenCreateManyShape = OperationShape<TM, 'MagicLinkToken', 'createMany', 1, UM>
export type MagicLinkTokenCreateManyShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenCreateManyShape, TCtx>
export type MagicLinkTokenCreateManyAndReturnShape = OperationShape<TM, 'MagicLinkToken', 'createManyAndReturn', 1, UM>
export type MagicLinkTokenCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenCreateManyAndReturnShape, TCtx>
export type MagicLinkTokenUpdateShape = OperationShape<TM, 'MagicLinkToken', 'update', 1, UM>
export type MagicLinkTokenUpdateShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenUpdateShape, TCtx>
export type MagicLinkTokenUpdateManyShape = OperationShape<TM, 'MagicLinkToken', 'updateMany', 1, UM>
export type MagicLinkTokenUpdateManyShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenUpdateManyShape, TCtx>
export type MagicLinkTokenUpdateManyAndReturnShape = OperationShape<TM, 'MagicLinkToken', 'updateManyAndReturn', 1, UM>
export type MagicLinkTokenUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenUpdateManyAndReturnShape, TCtx>
export type MagicLinkTokenUpsertShape = OperationShape<TM, 'MagicLinkToken', 'upsert', 1, UM>
export type MagicLinkTokenUpsertShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenUpsertShape, TCtx>
export type MagicLinkTokenDeleteShape = OperationShape<TM, 'MagicLinkToken', 'delete', 1, UM>
export type MagicLinkTokenDeleteShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenDeleteShape, TCtx>
export type MagicLinkTokenDeleteManyShape = OperationShape<TM, 'MagicLinkToken', 'deleteMany', 1, UM>
export type MagicLinkTokenDeleteManyShapeInput<TCtx = unknown> = ShapeInput<MagicLinkTokenDeleteManyShape, TCtx>

export type PendingSignupSelect = TypedProjection<TM, 'PendingSignup', 1, UM>
export type PendingSignupProjection = PendingSignupSelect
export type PendingSignupInclude = TypedInclude<TM, 'PendingSignup', 1, UM>
export type PendingSignupCountSelect = TypedCountSelect<TM, 'PendingSignup'>
export type PendingSignupGuardShape = TypedGuardShape<TM, 'PendingSignup', 1, UM>
export type PendingSignupFindManyShape = OperationShape<TM, 'PendingSignup', 'findMany', 1, UM>
export type PendingSignupFindManyShapeInput<TCtx = unknown> = ShapeInput<PendingSignupFindManyShape, TCtx>
export type PendingSignupFindFirstShape = OperationShape<TM, 'PendingSignup', 'findFirst', 1, UM>
export type PendingSignupFindFirstShapeInput<TCtx = unknown> = ShapeInput<PendingSignupFindFirstShape, TCtx>
export type PendingSignupFindFirstOrThrowShape = OperationShape<TM, 'PendingSignup', 'findFirstOrThrow', 1, UM>
export type PendingSignupFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<PendingSignupFindFirstOrThrowShape, TCtx>
export type PendingSignupFindUniqueShape = OperationShape<TM, 'PendingSignup', 'findUnique', 1, UM>
export type PendingSignupFindUniqueShapeInput<TCtx = unknown> = ShapeInput<PendingSignupFindUniqueShape, TCtx>
export type PendingSignupFindUniqueOrThrowShape = OperationShape<TM, 'PendingSignup', 'findUniqueOrThrow', 1, UM>
export type PendingSignupFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<PendingSignupFindUniqueOrThrowShape, TCtx>
export type PendingSignupFindManyPaginatedShape = OperationShape<TM, 'PendingSignup', 'findManyPaginated', 1, UM>
export type PendingSignupFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<PendingSignupFindManyPaginatedShape, TCtx>
export type PendingSignupCountShape = OperationShape<TM, 'PendingSignup', 'count', 1, UM>
export type PendingSignupCountShapeInput<TCtx = unknown> = ShapeInput<PendingSignupCountShape, TCtx>
export type PendingSignupAggregateShape = OperationShape<TM, 'PendingSignup', 'aggregate', 1, UM>
export type PendingSignupAggregateShapeInput<TCtx = unknown> = ShapeInput<PendingSignupAggregateShape, TCtx>
export type PendingSignupGroupByShape = OperationShape<TM, 'PendingSignup', 'groupBy', 1, UM>
export type PendingSignupGroupByShapeInput<TCtx = unknown> = ShapeInput<PendingSignupGroupByShape, TCtx>
export type PendingSignupCreateShape = OperationShape<TM, 'PendingSignup', 'create', 1, UM>
export type PendingSignupCreateShapeInput<TCtx = unknown> = ShapeInput<PendingSignupCreateShape, TCtx>
export type PendingSignupCreateManyShape = OperationShape<TM, 'PendingSignup', 'createMany', 1, UM>
export type PendingSignupCreateManyShapeInput<TCtx = unknown> = ShapeInput<PendingSignupCreateManyShape, TCtx>
export type PendingSignupCreateManyAndReturnShape = OperationShape<TM, 'PendingSignup', 'createManyAndReturn', 1, UM>
export type PendingSignupCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<PendingSignupCreateManyAndReturnShape, TCtx>
export type PendingSignupUpdateShape = OperationShape<TM, 'PendingSignup', 'update', 1, UM>
export type PendingSignupUpdateShapeInput<TCtx = unknown> = ShapeInput<PendingSignupUpdateShape, TCtx>
export type PendingSignupUpdateManyShape = OperationShape<TM, 'PendingSignup', 'updateMany', 1, UM>
export type PendingSignupUpdateManyShapeInput<TCtx = unknown> = ShapeInput<PendingSignupUpdateManyShape, TCtx>
export type PendingSignupUpdateManyAndReturnShape = OperationShape<TM, 'PendingSignup', 'updateManyAndReturn', 1, UM>
export type PendingSignupUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<PendingSignupUpdateManyAndReturnShape, TCtx>
export type PendingSignupUpsertShape = OperationShape<TM, 'PendingSignup', 'upsert', 1, UM>
export type PendingSignupUpsertShapeInput<TCtx = unknown> = ShapeInput<PendingSignupUpsertShape, TCtx>
export type PendingSignupDeleteShape = OperationShape<TM, 'PendingSignup', 'delete', 1, UM>
export type PendingSignupDeleteShapeInput<TCtx = unknown> = ShapeInput<PendingSignupDeleteShape, TCtx>
export type PendingSignupDeleteManyShape = OperationShape<TM, 'PendingSignup', 'deleteMany', 1, UM>
export type PendingSignupDeleteManyShapeInput<TCtx = unknown> = ShapeInput<PendingSignupDeleteManyShape, TCtx>

export type PracticeTrialSelect = TypedProjection<TM, 'PracticeTrial', 1, UM>
export type PracticeTrialProjection = PracticeTrialSelect
export type PracticeTrialInclude = TypedInclude<TM, 'PracticeTrial', 1, UM>
export type PracticeTrialCountSelect = TypedCountSelect<TM, 'PracticeTrial'>
export type PracticeTrialGuardShape = TypedGuardShape<TM, 'PracticeTrial', 1, UM>
export type PracticeTrialFindManyShape = OperationShape<TM, 'PracticeTrial', 'findMany', 1, UM>
export type PracticeTrialFindManyShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialFindManyShape, TCtx>
export type PracticeTrialFindFirstShape = OperationShape<TM, 'PracticeTrial', 'findFirst', 1, UM>
export type PracticeTrialFindFirstShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialFindFirstShape, TCtx>
export type PracticeTrialFindFirstOrThrowShape = OperationShape<TM, 'PracticeTrial', 'findFirstOrThrow', 1, UM>
export type PracticeTrialFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialFindFirstOrThrowShape, TCtx>
export type PracticeTrialFindUniqueShape = OperationShape<TM, 'PracticeTrial', 'findUnique', 1, UM>
export type PracticeTrialFindUniqueShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialFindUniqueShape, TCtx>
export type PracticeTrialFindUniqueOrThrowShape = OperationShape<TM, 'PracticeTrial', 'findUniqueOrThrow', 1, UM>
export type PracticeTrialFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialFindUniqueOrThrowShape, TCtx>
export type PracticeTrialFindManyPaginatedShape = OperationShape<TM, 'PracticeTrial', 'findManyPaginated', 1, UM>
export type PracticeTrialFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialFindManyPaginatedShape, TCtx>
export type PracticeTrialCountShape = OperationShape<TM, 'PracticeTrial', 'count', 1, UM>
export type PracticeTrialCountShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialCountShape, TCtx>
export type PracticeTrialAggregateShape = OperationShape<TM, 'PracticeTrial', 'aggregate', 1, UM>
export type PracticeTrialAggregateShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialAggregateShape, TCtx>
export type PracticeTrialGroupByShape = OperationShape<TM, 'PracticeTrial', 'groupBy', 1, UM>
export type PracticeTrialGroupByShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialGroupByShape, TCtx>
export type PracticeTrialCreateShape = OperationShape<TM, 'PracticeTrial', 'create', 1, UM>
export type PracticeTrialCreateShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialCreateShape, TCtx>
export type PracticeTrialCreateManyShape = OperationShape<TM, 'PracticeTrial', 'createMany', 1, UM>
export type PracticeTrialCreateManyShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialCreateManyShape, TCtx>
export type PracticeTrialCreateManyAndReturnShape = OperationShape<TM, 'PracticeTrial', 'createManyAndReturn', 1, UM>
export type PracticeTrialCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialCreateManyAndReturnShape, TCtx>
export type PracticeTrialUpdateShape = OperationShape<TM, 'PracticeTrial', 'update', 1, UM>
export type PracticeTrialUpdateShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialUpdateShape, TCtx>
export type PracticeTrialUpdateManyShape = OperationShape<TM, 'PracticeTrial', 'updateMany', 1, UM>
export type PracticeTrialUpdateManyShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialUpdateManyShape, TCtx>
export type PracticeTrialUpdateManyAndReturnShape = OperationShape<TM, 'PracticeTrial', 'updateManyAndReturn', 1, UM>
export type PracticeTrialUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialUpdateManyAndReturnShape, TCtx>
export type PracticeTrialUpsertShape = OperationShape<TM, 'PracticeTrial', 'upsert', 1, UM>
export type PracticeTrialUpsertShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialUpsertShape, TCtx>
export type PracticeTrialDeleteShape = OperationShape<TM, 'PracticeTrial', 'delete', 1, UM>
export type PracticeTrialDeleteShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialDeleteShape, TCtx>
export type PracticeTrialDeleteManyShape = OperationShape<TM, 'PracticeTrial', 'deleteMany', 1, UM>
export type PracticeTrialDeleteManyShapeInput<TCtx = unknown> = ShapeInput<PracticeTrialDeleteManyShape, TCtx>

export type TrialRateLimitSelect = TypedProjection<TM, 'TrialRateLimit', 1, UM>
export type TrialRateLimitProjection = TrialRateLimitSelect
export type TrialRateLimitInclude = TypedInclude<TM, 'TrialRateLimit', 1, UM>
export type TrialRateLimitCountSelect = TypedCountSelect<TM, 'TrialRateLimit'>
export type TrialRateLimitGuardShape = TypedGuardShape<TM, 'TrialRateLimit', 1, UM>
export type TrialRateLimitFindManyShape = OperationShape<TM, 'TrialRateLimit', 'findMany', 1, UM>
export type TrialRateLimitFindManyShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitFindManyShape, TCtx>
export type TrialRateLimitFindFirstShape = OperationShape<TM, 'TrialRateLimit', 'findFirst', 1, UM>
export type TrialRateLimitFindFirstShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitFindFirstShape, TCtx>
export type TrialRateLimitFindFirstOrThrowShape = OperationShape<TM, 'TrialRateLimit', 'findFirstOrThrow', 1, UM>
export type TrialRateLimitFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitFindFirstOrThrowShape, TCtx>
export type TrialRateLimitFindUniqueShape = OperationShape<TM, 'TrialRateLimit', 'findUnique', 1, UM>
export type TrialRateLimitFindUniqueShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitFindUniqueShape, TCtx>
export type TrialRateLimitFindUniqueOrThrowShape = OperationShape<TM, 'TrialRateLimit', 'findUniqueOrThrow', 1, UM>
export type TrialRateLimitFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitFindUniqueOrThrowShape, TCtx>
export type TrialRateLimitFindManyPaginatedShape = OperationShape<TM, 'TrialRateLimit', 'findManyPaginated', 1, UM>
export type TrialRateLimitFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitFindManyPaginatedShape, TCtx>
export type TrialRateLimitCountShape = OperationShape<TM, 'TrialRateLimit', 'count', 1, UM>
export type TrialRateLimitCountShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitCountShape, TCtx>
export type TrialRateLimitAggregateShape = OperationShape<TM, 'TrialRateLimit', 'aggregate', 1, UM>
export type TrialRateLimitAggregateShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitAggregateShape, TCtx>
export type TrialRateLimitGroupByShape = OperationShape<TM, 'TrialRateLimit', 'groupBy', 1, UM>
export type TrialRateLimitGroupByShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitGroupByShape, TCtx>
export type TrialRateLimitCreateShape = OperationShape<TM, 'TrialRateLimit', 'create', 1, UM>
export type TrialRateLimitCreateShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitCreateShape, TCtx>
export type TrialRateLimitCreateManyShape = OperationShape<TM, 'TrialRateLimit', 'createMany', 1, UM>
export type TrialRateLimitCreateManyShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitCreateManyShape, TCtx>
export type TrialRateLimitCreateManyAndReturnShape = OperationShape<TM, 'TrialRateLimit', 'createManyAndReturn', 1, UM>
export type TrialRateLimitCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitCreateManyAndReturnShape, TCtx>
export type TrialRateLimitUpdateShape = OperationShape<TM, 'TrialRateLimit', 'update', 1, UM>
export type TrialRateLimitUpdateShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitUpdateShape, TCtx>
export type TrialRateLimitUpdateManyShape = OperationShape<TM, 'TrialRateLimit', 'updateMany', 1, UM>
export type TrialRateLimitUpdateManyShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitUpdateManyShape, TCtx>
export type TrialRateLimitUpdateManyAndReturnShape = OperationShape<TM, 'TrialRateLimit', 'updateManyAndReturn', 1, UM>
export type TrialRateLimitUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitUpdateManyAndReturnShape, TCtx>
export type TrialRateLimitUpsertShape = OperationShape<TM, 'TrialRateLimit', 'upsert', 1, UM>
export type TrialRateLimitUpsertShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitUpsertShape, TCtx>
export type TrialRateLimitDeleteShape = OperationShape<TM, 'TrialRateLimit', 'delete', 1, UM>
export type TrialRateLimitDeleteShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitDeleteShape, TCtx>
export type TrialRateLimitDeleteManyShape = OperationShape<TM, 'TrialRateLimit', 'deleteMany', 1, UM>
export type TrialRateLimitDeleteManyShapeInput<TCtx = unknown> = ShapeInput<TrialRateLimitDeleteManyShape, TCtx>

export type MixedSessionSelect = TypedProjection<TM, 'MixedSession', 1, UM>
export type MixedSessionProjection = MixedSessionSelect
export type MixedSessionInclude = TypedInclude<TM, 'MixedSession', 1, UM>
export type MixedSessionCountSelect = TypedCountSelect<TM, 'MixedSession'>
export type MixedSessionGuardShape = TypedGuardShape<TM, 'MixedSession', 1, UM>
export type MixedSessionFindManyShape = OperationShape<TM, 'MixedSession', 'findMany', 1, UM>
export type MixedSessionFindManyShapeInput<TCtx = unknown> = ShapeInput<MixedSessionFindManyShape, TCtx>
export type MixedSessionFindFirstShape = OperationShape<TM, 'MixedSession', 'findFirst', 1, UM>
export type MixedSessionFindFirstShapeInput<TCtx = unknown> = ShapeInput<MixedSessionFindFirstShape, TCtx>
export type MixedSessionFindFirstOrThrowShape = OperationShape<TM, 'MixedSession', 'findFirstOrThrow', 1, UM>
export type MixedSessionFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<MixedSessionFindFirstOrThrowShape, TCtx>
export type MixedSessionFindUniqueShape = OperationShape<TM, 'MixedSession', 'findUnique', 1, UM>
export type MixedSessionFindUniqueShapeInput<TCtx = unknown> = ShapeInput<MixedSessionFindUniqueShape, TCtx>
export type MixedSessionFindUniqueOrThrowShape = OperationShape<TM, 'MixedSession', 'findUniqueOrThrow', 1, UM>
export type MixedSessionFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<MixedSessionFindUniqueOrThrowShape, TCtx>
export type MixedSessionFindManyPaginatedShape = OperationShape<TM, 'MixedSession', 'findManyPaginated', 1, UM>
export type MixedSessionFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<MixedSessionFindManyPaginatedShape, TCtx>
export type MixedSessionCountShape = OperationShape<TM, 'MixedSession', 'count', 1, UM>
export type MixedSessionCountShapeInput<TCtx = unknown> = ShapeInput<MixedSessionCountShape, TCtx>
export type MixedSessionAggregateShape = OperationShape<TM, 'MixedSession', 'aggregate', 1, UM>
export type MixedSessionAggregateShapeInput<TCtx = unknown> = ShapeInput<MixedSessionAggregateShape, TCtx>
export type MixedSessionGroupByShape = OperationShape<TM, 'MixedSession', 'groupBy', 1, UM>
export type MixedSessionGroupByShapeInput<TCtx = unknown> = ShapeInput<MixedSessionGroupByShape, TCtx>
export type MixedSessionCreateShape = OperationShape<TM, 'MixedSession', 'create', 1, UM>
export type MixedSessionCreateShapeInput<TCtx = unknown> = ShapeInput<MixedSessionCreateShape, TCtx>
export type MixedSessionCreateManyShape = OperationShape<TM, 'MixedSession', 'createMany', 1, UM>
export type MixedSessionCreateManyShapeInput<TCtx = unknown> = ShapeInput<MixedSessionCreateManyShape, TCtx>
export type MixedSessionCreateManyAndReturnShape = OperationShape<TM, 'MixedSession', 'createManyAndReturn', 1, UM>
export type MixedSessionCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<MixedSessionCreateManyAndReturnShape, TCtx>
export type MixedSessionUpdateShape = OperationShape<TM, 'MixedSession', 'update', 1, UM>
export type MixedSessionUpdateShapeInput<TCtx = unknown> = ShapeInput<MixedSessionUpdateShape, TCtx>
export type MixedSessionUpdateManyShape = OperationShape<TM, 'MixedSession', 'updateMany', 1, UM>
export type MixedSessionUpdateManyShapeInput<TCtx = unknown> = ShapeInput<MixedSessionUpdateManyShape, TCtx>
export type MixedSessionUpdateManyAndReturnShape = OperationShape<TM, 'MixedSession', 'updateManyAndReturn', 1, UM>
export type MixedSessionUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<MixedSessionUpdateManyAndReturnShape, TCtx>
export type MixedSessionUpsertShape = OperationShape<TM, 'MixedSession', 'upsert', 1, UM>
export type MixedSessionUpsertShapeInput<TCtx = unknown> = ShapeInput<MixedSessionUpsertShape, TCtx>
export type MixedSessionDeleteShape = OperationShape<TM, 'MixedSession', 'delete', 1, UM>
export type MixedSessionDeleteShapeInput<TCtx = unknown> = ShapeInput<MixedSessionDeleteShape, TCtx>
export type MixedSessionDeleteManyShape = OperationShape<TM, 'MixedSession', 'deleteMany', 1, UM>
export type MixedSessionDeleteManyShapeInput<TCtx = unknown> = ShapeInput<MixedSessionDeleteManyShape, TCtx>

export type UnitCheckpointSelect = TypedProjection<TM, 'UnitCheckpoint', 1, UM>
export type UnitCheckpointProjection = UnitCheckpointSelect
export type UnitCheckpointInclude = TypedInclude<TM, 'UnitCheckpoint', 1, UM>
export type UnitCheckpointCountSelect = TypedCountSelect<TM, 'UnitCheckpoint'>
export type UnitCheckpointGuardShape = TypedGuardShape<TM, 'UnitCheckpoint', 1, UM>
export type UnitCheckpointFindManyShape = OperationShape<TM, 'UnitCheckpoint', 'findMany', 1, UM>
export type UnitCheckpointFindManyShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointFindManyShape, TCtx>
export type UnitCheckpointFindFirstShape = OperationShape<TM, 'UnitCheckpoint', 'findFirst', 1, UM>
export type UnitCheckpointFindFirstShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointFindFirstShape, TCtx>
export type UnitCheckpointFindFirstOrThrowShape = OperationShape<TM, 'UnitCheckpoint', 'findFirstOrThrow', 1, UM>
export type UnitCheckpointFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointFindFirstOrThrowShape, TCtx>
export type UnitCheckpointFindUniqueShape = OperationShape<TM, 'UnitCheckpoint', 'findUnique', 1, UM>
export type UnitCheckpointFindUniqueShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointFindUniqueShape, TCtx>
export type UnitCheckpointFindUniqueOrThrowShape = OperationShape<TM, 'UnitCheckpoint', 'findUniqueOrThrow', 1, UM>
export type UnitCheckpointFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointFindUniqueOrThrowShape, TCtx>
export type UnitCheckpointFindManyPaginatedShape = OperationShape<TM, 'UnitCheckpoint', 'findManyPaginated', 1, UM>
export type UnitCheckpointFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointFindManyPaginatedShape, TCtx>
export type UnitCheckpointCountShape = OperationShape<TM, 'UnitCheckpoint', 'count', 1, UM>
export type UnitCheckpointCountShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointCountShape, TCtx>
export type UnitCheckpointAggregateShape = OperationShape<TM, 'UnitCheckpoint', 'aggregate', 1, UM>
export type UnitCheckpointAggregateShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointAggregateShape, TCtx>
export type UnitCheckpointGroupByShape = OperationShape<TM, 'UnitCheckpoint', 'groupBy', 1, UM>
export type UnitCheckpointGroupByShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointGroupByShape, TCtx>
export type UnitCheckpointCreateShape = OperationShape<TM, 'UnitCheckpoint', 'create', 1, UM>
export type UnitCheckpointCreateShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointCreateShape, TCtx>
export type UnitCheckpointCreateManyShape = OperationShape<TM, 'UnitCheckpoint', 'createMany', 1, UM>
export type UnitCheckpointCreateManyShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointCreateManyShape, TCtx>
export type UnitCheckpointCreateManyAndReturnShape = OperationShape<TM, 'UnitCheckpoint', 'createManyAndReturn', 1, UM>
export type UnitCheckpointCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointCreateManyAndReturnShape, TCtx>
export type UnitCheckpointUpdateShape = OperationShape<TM, 'UnitCheckpoint', 'update', 1, UM>
export type UnitCheckpointUpdateShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointUpdateShape, TCtx>
export type UnitCheckpointUpdateManyShape = OperationShape<TM, 'UnitCheckpoint', 'updateMany', 1, UM>
export type UnitCheckpointUpdateManyShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointUpdateManyShape, TCtx>
export type UnitCheckpointUpdateManyAndReturnShape = OperationShape<TM, 'UnitCheckpoint', 'updateManyAndReturn', 1, UM>
export type UnitCheckpointUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointUpdateManyAndReturnShape, TCtx>
export type UnitCheckpointUpsertShape = OperationShape<TM, 'UnitCheckpoint', 'upsert', 1, UM>
export type UnitCheckpointUpsertShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointUpsertShape, TCtx>
export type UnitCheckpointDeleteShape = OperationShape<TM, 'UnitCheckpoint', 'delete', 1, UM>
export type UnitCheckpointDeleteShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointDeleteShape, TCtx>
export type UnitCheckpointDeleteManyShape = OperationShape<TM, 'UnitCheckpoint', 'deleteMany', 1, UM>
export type UnitCheckpointDeleteManyShapeInput<TCtx = unknown> = ShapeInput<UnitCheckpointDeleteManyShape, TCtx>

export type LearningSessionSelect = TypedProjection<TM, 'LearningSession', 1, UM>
export type LearningSessionProjection = LearningSessionSelect
export type LearningSessionInclude = TypedInclude<TM, 'LearningSession', 1, UM>
export type LearningSessionCountSelect = TypedCountSelect<TM, 'LearningSession'>
export type LearningSessionGuardShape = TypedGuardShape<TM, 'LearningSession', 1, UM>
export type LearningSessionFindManyShape = OperationShape<TM, 'LearningSession', 'findMany', 1, UM>
export type LearningSessionFindManyShapeInput<TCtx = unknown> = ShapeInput<LearningSessionFindManyShape, TCtx>
export type LearningSessionFindFirstShape = OperationShape<TM, 'LearningSession', 'findFirst', 1, UM>
export type LearningSessionFindFirstShapeInput<TCtx = unknown> = ShapeInput<LearningSessionFindFirstShape, TCtx>
export type LearningSessionFindFirstOrThrowShape = OperationShape<TM, 'LearningSession', 'findFirstOrThrow', 1, UM>
export type LearningSessionFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<LearningSessionFindFirstOrThrowShape, TCtx>
export type LearningSessionFindUniqueShape = OperationShape<TM, 'LearningSession', 'findUnique', 1, UM>
export type LearningSessionFindUniqueShapeInput<TCtx = unknown> = ShapeInput<LearningSessionFindUniqueShape, TCtx>
export type LearningSessionFindUniqueOrThrowShape = OperationShape<TM, 'LearningSession', 'findUniqueOrThrow', 1, UM>
export type LearningSessionFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<LearningSessionFindUniqueOrThrowShape, TCtx>
export type LearningSessionFindManyPaginatedShape = OperationShape<TM, 'LearningSession', 'findManyPaginated', 1, UM>
export type LearningSessionFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<LearningSessionFindManyPaginatedShape, TCtx>
export type LearningSessionCountShape = OperationShape<TM, 'LearningSession', 'count', 1, UM>
export type LearningSessionCountShapeInput<TCtx = unknown> = ShapeInput<LearningSessionCountShape, TCtx>
export type LearningSessionAggregateShape = OperationShape<TM, 'LearningSession', 'aggregate', 1, UM>
export type LearningSessionAggregateShapeInput<TCtx = unknown> = ShapeInput<LearningSessionAggregateShape, TCtx>
export type LearningSessionGroupByShape = OperationShape<TM, 'LearningSession', 'groupBy', 1, UM>
export type LearningSessionGroupByShapeInput<TCtx = unknown> = ShapeInput<LearningSessionGroupByShape, TCtx>
export type LearningSessionCreateShape = OperationShape<TM, 'LearningSession', 'create', 1, UM>
export type LearningSessionCreateShapeInput<TCtx = unknown> = ShapeInput<LearningSessionCreateShape, TCtx>
export type LearningSessionCreateManyShape = OperationShape<TM, 'LearningSession', 'createMany', 1, UM>
export type LearningSessionCreateManyShapeInput<TCtx = unknown> = ShapeInput<LearningSessionCreateManyShape, TCtx>
export type LearningSessionCreateManyAndReturnShape = OperationShape<TM, 'LearningSession', 'createManyAndReturn', 1, UM>
export type LearningSessionCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<LearningSessionCreateManyAndReturnShape, TCtx>
export type LearningSessionUpdateShape = OperationShape<TM, 'LearningSession', 'update', 1, UM>
export type LearningSessionUpdateShapeInput<TCtx = unknown> = ShapeInput<LearningSessionUpdateShape, TCtx>
export type LearningSessionUpdateManyShape = OperationShape<TM, 'LearningSession', 'updateMany', 1, UM>
export type LearningSessionUpdateManyShapeInput<TCtx = unknown> = ShapeInput<LearningSessionUpdateManyShape, TCtx>
export type LearningSessionUpdateManyAndReturnShape = OperationShape<TM, 'LearningSession', 'updateManyAndReturn', 1, UM>
export type LearningSessionUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<LearningSessionUpdateManyAndReturnShape, TCtx>
export type LearningSessionUpsertShape = OperationShape<TM, 'LearningSession', 'upsert', 1, UM>
export type LearningSessionUpsertShapeInput<TCtx = unknown> = ShapeInput<LearningSessionUpsertShape, TCtx>
export type LearningSessionDeleteShape = OperationShape<TM, 'LearningSession', 'delete', 1, UM>
export type LearningSessionDeleteShapeInput<TCtx = unknown> = ShapeInput<LearningSessionDeleteShape, TCtx>
export type LearningSessionDeleteManyShape = OperationShape<TM, 'LearningSession', 'deleteMany', 1, UM>
export type LearningSessionDeleteManyShapeInput<TCtx = unknown> = ShapeInput<LearningSessionDeleteManyShape, TCtx>

export type QuizResultSelect = TypedProjection<TM, 'QuizResult', 1, UM>
export type QuizResultProjection = QuizResultSelect
export type QuizResultInclude = TypedInclude<TM, 'QuizResult', 1, UM>
export type QuizResultCountSelect = TypedCountSelect<TM, 'QuizResult'>
export type QuizResultGuardShape = TypedGuardShape<TM, 'QuizResult', 1, UM>
export type QuizResultFindManyShape = OperationShape<TM, 'QuizResult', 'findMany', 1, UM>
export type QuizResultFindManyShapeInput<TCtx = unknown> = ShapeInput<QuizResultFindManyShape, TCtx>
export type QuizResultFindFirstShape = OperationShape<TM, 'QuizResult', 'findFirst', 1, UM>
export type QuizResultFindFirstShapeInput<TCtx = unknown> = ShapeInput<QuizResultFindFirstShape, TCtx>
export type QuizResultFindFirstOrThrowShape = OperationShape<TM, 'QuizResult', 'findFirstOrThrow', 1, UM>
export type QuizResultFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<QuizResultFindFirstOrThrowShape, TCtx>
export type QuizResultFindUniqueShape = OperationShape<TM, 'QuizResult', 'findUnique', 1, UM>
export type QuizResultFindUniqueShapeInput<TCtx = unknown> = ShapeInput<QuizResultFindUniqueShape, TCtx>
export type QuizResultFindUniqueOrThrowShape = OperationShape<TM, 'QuizResult', 'findUniqueOrThrow', 1, UM>
export type QuizResultFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<QuizResultFindUniqueOrThrowShape, TCtx>
export type QuizResultFindManyPaginatedShape = OperationShape<TM, 'QuizResult', 'findManyPaginated', 1, UM>
export type QuizResultFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<QuizResultFindManyPaginatedShape, TCtx>
export type QuizResultCountShape = OperationShape<TM, 'QuizResult', 'count', 1, UM>
export type QuizResultCountShapeInput<TCtx = unknown> = ShapeInput<QuizResultCountShape, TCtx>
export type QuizResultAggregateShape = OperationShape<TM, 'QuizResult', 'aggregate', 1, UM>
export type QuizResultAggregateShapeInput<TCtx = unknown> = ShapeInput<QuizResultAggregateShape, TCtx>
export type QuizResultGroupByShape = OperationShape<TM, 'QuizResult', 'groupBy', 1, UM>
export type QuizResultGroupByShapeInput<TCtx = unknown> = ShapeInput<QuizResultGroupByShape, TCtx>
export type QuizResultCreateShape = OperationShape<TM, 'QuizResult', 'create', 1, UM>
export type QuizResultCreateShapeInput<TCtx = unknown> = ShapeInput<QuizResultCreateShape, TCtx>
export type QuizResultCreateManyShape = OperationShape<TM, 'QuizResult', 'createMany', 1, UM>
export type QuizResultCreateManyShapeInput<TCtx = unknown> = ShapeInput<QuizResultCreateManyShape, TCtx>
export type QuizResultCreateManyAndReturnShape = OperationShape<TM, 'QuizResult', 'createManyAndReturn', 1, UM>
export type QuizResultCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<QuizResultCreateManyAndReturnShape, TCtx>
export type QuizResultUpdateShape = OperationShape<TM, 'QuizResult', 'update', 1, UM>
export type QuizResultUpdateShapeInput<TCtx = unknown> = ShapeInput<QuizResultUpdateShape, TCtx>
export type QuizResultUpdateManyShape = OperationShape<TM, 'QuizResult', 'updateMany', 1, UM>
export type QuizResultUpdateManyShapeInput<TCtx = unknown> = ShapeInput<QuizResultUpdateManyShape, TCtx>
export type QuizResultUpdateManyAndReturnShape = OperationShape<TM, 'QuizResult', 'updateManyAndReturn', 1, UM>
export type QuizResultUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<QuizResultUpdateManyAndReturnShape, TCtx>
export type QuizResultUpsertShape = OperationShape<TM, 'QuizResult', 'upsert', 1, UM>
export type QuizResultUpsertShapeInput<TCtx = unknown> = ShapeInput<QuizResultUpsertShape, TCtx>
export type QuizResultDeleteShape = OperationShape<TM, 'QuizResult', 'delete', 1, UM>
export type QuizResultDeleteShapeInput<TCtx = unknown> = ShapeInput<QuizResultDeleteShape, TCtx>
export type QuizResultDeleteManyShape = OperationShape<TM, 'QuizResult', 'deleteMany', 1, UM>
export type QuizResultDeleteManyShapeInput<TCtx = unknown> = ShapeInput<QuizResultDeleteManyShape, TCtx>

export type CompletionLedgerSelect = TypedProjection<TM, 'CompletionLedger', 1, UM>
export type CompletionLedgerProjection = CompletionLedgerSelect
export type CompletionLedgerInclude = TypedInclude<TM, 'CompletionLedger', 1, UM>
export type CompletionLedgerCountSelect = TypedCountSelect<TM, 'CompletionLedger'>
export type CompletionLedgerGuardShape = TypedGuardShape<TM, 'CompletionLedger', 1, UM>
export type CompletionLedgerFindManyShape = OperationShape<TM, 'CompletionLedger', 'findMany', 1, UM>
export type CompletionLedgerFindManyShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerFindManyShape, TCtx>
export type CompletionLedgerFindFirstShape = OperationShape<TM, 'CompletionLedger', 'findFirst', 1, UM>
export type CompletionLedgerFindFirstShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerFindFirstShape, TCtx>
export type CompletionLedgerFindFirstOrThrowShape = OperationShape<TM, 'CompletionLedger', 'findFirstOrThrow', 1, UM>
export type CompletionLedgerFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerFindFirstOrThrowShape, TCtx>
export type CompletionLedgerFindUniqueShape = OperationShape<TM, 'CompletionLedger', 'findUnique', 1, UM>
export type CompletionLedgerFindUniqueShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerFindUniqueShape, TCtx>
export type CompletionLedgerFindUniqueOrThrowShape = OperationShape<TM, 'CompletionLedger', 'findUniqueOrThrow', 1, UM>
export type CompletionLedgerFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerFindUniqueOrThrowShape, TCtx>
export type CompletionLedgerFindManyPaginatedShape = OperationShape<TM, 'CompletionLedger', 'findManyPaginated', 1, UM>
export type CompletionLedgerFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerFindManyPaginatedShape, TCtx>
export type CompletionLedgerCountShape = OperationShape<TM, 'CompletionLedger', 'count', 1, UM>
export type CompletionLedgerCountShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerCountShape, TCtx>
export type CompletionLedgerAggregateShape = OperationShape<TM, 'CompletionLedger', 'aggregate', 1, UM>
export type CompletionLedgerAggregateShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerAggregateShape, TCtx>
export type CompletionLedgerGroupByShape = OperationShape<TM, 'CompletionLedger', 'groupBy', 1, UM>
export type CompletionLedgerGroupByShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerGroupByShape, TCtx>
export type CompletionLedgerCreateShape = OperationShape<TM, 'CompletionLedger', 'create', 1, UM>
export type CompletionLedgerCreateShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerCreateShape, TCtx>
export type CompletionLedgerCreateManyShape = OperationShape<TM, 'CompletionLedger', 'createMany', 1, UM>
export type CompletionLedgerCreateManyShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerCreateManyShape, TCtx>
export type CompletionLedgerCreateManyAndReturnShape = OperationShape<TM, 'CompletionLedger', 'createManyAndReturn', 1, UM>
export type CompletionLedgerCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerCreateManyAndReturnShape, TCtx>
export type CompletionLedgerUpdateShape = OperationShape<TM, 'CompletionLedger', 'update', 1, UM>
export type CompletionLedgerUpdateShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerUpdateShape, TCtx>
export type CompletionLedgerUpdateManyShape = OperationShape<TM, 'CompletionLedger', 'updateMany', 1, UM>
export type CompletionLedgerUpdateManyShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerUpdateManyShape, TCtx>
export type CompletionLedgerUpdateManyAndReturnShape = OperationShape<TM, 'CompletionLedger', 'updateManyAndReturn', 1, UM>
export type CompletionLedgerUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerUpdateManyAndReturnShape, TCtx>
export type CompletionLedgerUpsertShape = OperationShape<TM, 'CompletionLedger', 'upsert', 1, UM>
export type CompletionLedgerUpsertShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerUpsertShape, TCtx>
export type CompletionLedgerDeleteShape = OperationShape<TM, 'CompletionLedger', 'delete', 1, UM>
export type CompletionLedgerDeleteShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerDeleteShape, TCtx>
export type CompletionLedgerDeleteManyShape = OperationShape<TM, 'CompletionLedger', 'deleteMany', 1, UM>
export type CompletionLedgerDeleteManyShapeInput<TCtx = unknown> = ShapeInput<CompletionLedgerDeleteManyShape, TCtx>

export type UserUnitProgressSelect = TypedProjection<TM, 'UserUnitProgress', 1, UM>
export type UserUnitProgressProjection = UserUnitProgressSelect
export type UserUnitProgressInclude = TypedInclude<TM, 'UserUnitProgress', 1, UM>
export type UserUnitProgressCountSelect = TypedCountSelect<TM, 'UserUnitProgress'>
export type UserUnitProgressGuardShape = TypedGuardShape<TM, 'UserUnitProgress', 1, UM>
export type UserUnitProgressFindManyShape = OperationShape<TM, 'UserUnitProgress', 'findMany', 1, UM>
export type UserUnitProgressFindManyShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressFindManyShape, TCtx>
export type UserUnitProgressFindFirstShape = OperationShape<TM, 'UserUnitProgress', 'findFirst', 1, UM>
export type UserUnitProgressFindFirstShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressFindFirstShape, TCtx>
export type UserUnitProgressFindFirstOrThrowShape = OperationShape<TM, 'UserUnitProgress', 'findFirstOrThrow', 1, UM>
export type UserUnitProgressFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressFindFirstOrThrowShape, TCtx>
export type UserUnitProgressFindUniqueShape = OperationShape<TM, 'UserUnitProgress', 'findUnique', 1, UM>
export type UserUnitProgressFindUniqueShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressFindUniqueShape, TCtx>
export type UserUnitProgressFindUniqueOrThrowShape = OperationShape<TM, 'UserUnitProgress', 'findUniqueOrThrow', 1, UM>
export type UserUnitProgressFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressFindUniqueOrThrowShape, TCtx>
export type UserUnitProgressFindManyPaginatedShape = OperationShape<TM, 'UserUnitProgress', 'findManyPaginated', 1, UM>
export type UserUnitProgressFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressFindManyPaginatedShape, TCtx>
export type UserUnitProgressCountShape = OperationShape<TM, 'UserUnitProgress', 'count', 1, UM>
export type UserUnitProgressCountShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressCountShape, TCtx>
export type UserUnitProgressAggregateShape = OperationShape<TM, 'UserUnitProgress', 'aggregate', 1, UM>
export type UserUnitProgressAggregateShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressAggregateShape, TCtx>
export type UserUnitProgressGroupByShape = OperationShape<TM, 'UserUnitProgress', 'groupBy', 1, UM>
export type UserUnitProgressGroupByShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressGroupByShape, TCtx>
export type UserUnitProgressCreateShape = OperationShape<TM, 'UserUnitProgress', 'create', 1, UM>
export type UserUnitProgressCreateShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressCreateShape, TCtx>
export type UserUnitProgressCreateManyShape = OperationShape<TM, 'UserUnitProgress', 'createMany', 1, UM>
export type UserUnitProgressCreateManyShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressCreateManyShape, TCtx>
export type UserUnitProgressCreateManyAndReturnShape = OperationShape<TM, 'UserUnitProgress', 'createManyAndReturn', 1, UM>
export type UserUnitProgressCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressCreateManyAndReturnShape, TCtx>
export type UserUnitProgressUpdateShape = OperationShape<TM, 'UserUnitProgress', 'update', 1, UM>
export type UserUnitProgressUpdateShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressUpdateShape, TCtx>
export type UserUnitProgressUpdateManyShape = OperationShape<TM, 'UserUnitProgress', 'updateMany', 1, UM>
export type UserUnitProgressUpdateManyShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressUpdateManyShape, TCtx>
export type UserUnitProgressUpdateManyAndReturnShape = OperationShape<TM, 'UserUnitProgress', 'updateManyAndReturn', 1, UM>
export type UserUnitProgressUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressUpdateManyAndReturnShape, TCtx>
export type UserUnitProgressUpsertShape = OperationShape<TM, 'UserUnitProgress', 'upsert', 1, UM>
export type UserUnitProgressUpsertShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressUpsertShape, TCtx>
export type UserUnitProgressDeleteShape = OperationShape<TM, 'UserUnitProgress', 'delete', 1, UM>
export type UserUnitProgressDeleteShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressDeleteShape, TCtx>
export type UserUnitProgressDeleteManyShape = OperationShape<TM, 'UserUnitProgress', 'deleteMany', 1, UM>
export type UserUnitProgressDeleteManyShapeInput<TCtx = unknown> = ShapeInput<UserUnitProgressDeleteManyShape, TCtx>

export type UserWordProgressSelect = TypedProjection<TM, 'UserWordProgress', 1, UM>
export type UserWordProgressProjection = UserWordProgressSelect
export type UserWordProgressInclude = TypedInclude<TM, 'UserWordProgress', 1, UM>
export type UserWordProgressCountSelect = TypedCountSelect<TM, 'UserWordProgress'>
export type UserWordProgressGuardShape = TypedGuardShape<TM, 'UserWordProgress', 1, UM>
export type UserWordProgressFindManyShape = OperationShape<TM, 'UserWordProgress', 'findMany', 1, UM>
export type UserWordProgressFindManyShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressFindManyShape, TCtx>
export type UserWordProgressFindFirstShape = OperationShape<TM, 'UserWordProgress', 'findFirst', 1, UM>
export type UserWordProgressFindFirstShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressFindFirstShape, TCtx>
export type UserWordProgressFindFirstOrThrowShape = OperationShape<TM, 'UserWordProgress', 'findFirstOrThrow', 1, UM>
export type UserWordProgressFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressFindFirstOrThrowShape, TCtx>
export type UserWordProgressFindUniqueShape = OperationShape<TM, 'UserWordProgress', 'findUnique', 1, UM>
export type UserWordProgressFindUniqueShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressFindUniqueShape, TCtx>
export type UserWordProgressFindUniqueOrThrowShape = OperationShape<TM, 'UserWordProgress', 'findUniqueOrThrow', 1, UM>
export type UserWordProgressFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressFindUniqueOrThrowShape, TCtx>
export type UserWordProgressFindManyPaginatedShape = OperationShape<TM, 'UserWordProgress', 'findManyPaginated', 1, UM>
export type UserWordProgressFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressFindManyPaginatedShape, TCtx>
export type UserWordProgressCountShape = OperationShape<TM, 'UserWordProgress', 'count', 1, UM>
export type UserWordProgressCountShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressCountShape, TCtx>
export type UserWordProgressAggregateShape = OperationShape<TM, 'UserWordProgress', 'aggregate', 1, UM>
export type UserWordProgressAggregateShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressAggregateShape, TCtx>
export type UserWordProgressGroupByShape = OperationShape<TM, 'UserWordProgress', 'groupBy', 1, UM>
export type UserWordProgressGroupByShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressGroupByShape, TCtx>
export type UserWordProgressCreateShape = OperationShape<TM, 'UserWordProgress', 'create', 1, UM>
export type UserWordProgressCreateShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressCreateShape, TCtx>
export type UserWordProgressCreateManyShape = OperationShape<TM, 'UserWordProgress', 'createMany', 1, UM>
export type UserWordProgressCreateManyShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressCreateManyShape, TCtx>
export type UserWordProgressCreateManyAndReturnShape = OperationShape<TM, 'UserWordProgress', 'createManyAndReturn', 1, UM>
export type UserWordProgressCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressCreateManyAndReturnShape, TCtx>
export type UserWordProgressUpdateShape = OperationShape<TM, 'UserWordProgress', 'update', 1, UM>
export type UserWordProgressUpdateShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressUpdateShape, TCtx>
export type UserWordProgressUpdateManyShape = OperationShape<TM, 'UserWordProgress', 'updateMany', 1, UM>
export type UserWordProgressUpdateManyShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressUpdateManyShape, TCtx>
export type UserWordProgressUpdateManyAndReturnShape = OperationShape<TM, 'UserWordProgress', 'updateManyAndReturn', 1, UM>
export type UserWordProgressUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressUpdateManyAndReturnShape, TCtx>
export type UserWordProgressUpsertShape = OperationShape<TM, 'UserWordProgress', 'upsert', 1, UM>
export type UserWordProgressUpsertShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressUpsertShape, TCtx>
export type UserWordProgressDeleteShape = OperationShape<TM, 'UserWordProgress', 'delete', 1, UM>
export type UserWordProgressDeleteShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressDeleteShape, TCtx>
export type UserWordProgressDeleteManyShape = OperationShape<TM, 'UserWordProgress', 'deleteMany', 1, UM>
export type UserWordProgressDeleteManyShapeInput<TCtx = unknown> = ShapeInput<UserWordProgressDeleteManyShape, TCtx>

export type UserWordAttemptSelect = TypedProjection<TM, 'UserWordAttempt', 1, UM>
export type UserWordAttemptProjection = UserWordAttemptSelect
export type UserWordAttemptInclude = TypedInclude<TM, 'UserWordAttempt', 1, UM>
export type UserWordAttemptCountSelect = TypedCountSelect<TM, 'UserWordAttempt'>
export type UserWordAttemptGuardShape = TypedGuardShape<TM, 'UserWordAttempt', 1, UM>
export type UserWordAttemptFindManyShape = OperationShape<TM, 'UserWordAttempt', 'findMany', 1, UM>
export type UserWordAttemptFindManyShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptFindManyShape, TCtx>
export type UserWordAttemptFindFirstShape = OperationShape<TM, 'UserWordAttempt', 'findFirst', 1, UM>
export type UserWordAttemptFindFirstShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptFindFirstShape, TCtx>
export type UserWordAttemptFindFirstOrThrowShape = OperationShape<TM, 'UserWordAttempt', 'findFirstOrThrow', 1, UM>
export type UserWordAttemptFindFirstOrThrowShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptFindFirstOrThrowShape, TCtx>
export type UserWordAttemptFindUniqueShape = OperationShape<TM, 'UserWordAttempt', 'findUnique', 1, UM>
export type UserWordAttemptFindUniqueShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptFindUniqueShape, TCtx>
export type UserWordAttemptFindUniqueOrThrowShape = OperationShape<TM, 'UserWordAttempt', 'findUniqueOrThrow', 1, UM>
export type UserWordAttemptFindUniqueOrThrowShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptFindUniqueOrThrowShape, TCtx>
export type UserWordAttemptFindManyPaginatedShape = OperationShape<TM, 'UserWordAttempt', 'findManyPaginated', 1, UM>
export type UserWordAttemptFindManyPaginatedShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptFindManyPaginatedShape, TCtx>
export type UserWordAttemptCountShape = OperationShape<TM, 'UserWordAttempt', 'count', 1, UM>
export type UserWordAttemptCountShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptCountShape, TCtx>
export type UserWordAttemptAggregateShape = OperationShape<TM, 'UserWordAttempt', 'aggregate', 1, UM>
export type UserWordAttemptAggregateShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptAggregateShape, TCtx>
export type UserWordAttemptGroupByShape = OperationShape<TM, 'UserWordAttempt', 'groupBy', 1, UM>
export type UserWordAttemptGroupByShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptGroupByShape, TCtx>
export type UserWordAttemptCreateShape = OperationShape<TM, 'UserWordAttempt', 'create', 1, UM>
export type UserWordAttemptCreateShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptCreateShape, TCtx>
export type UserWordAttemptCreateManyShape = OperationShape<TM, 'UserWordAttempt', 'createMany', 1, UM>
export type UserWordAttemptCreateManyShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptCreateManyShape, TCtx>
export type UserWordAttemptCreateManyAndReturnShape = OperationShape<TM, 'UserWordAttempt', 'createManyAndReturn', 1, UM>
export type UserWordAttemptCreateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptCreateManyAndReturnShape, TCtx>
export type UserWordAttemptUpdateShape = OperationShape<TM, 'UserWordAttempt', 'update', 1, UM>
export type UserWordAttemptUpdateShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptUpdateShape, TCtx>
export type UserWordAttemptUpdateManyShape = OperationShape<TM, 'UserWordAttempt', 'updateMany', 1, UM>
export type UserWordAttemptUpdateManyShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptUpdateManyShape, TCtx>
export type UserWordAttemptUpdateManyAndReturnShape = OperationShape<TM, 'UserWordAttempt', 'updateManyAndReturn', 1, UM>
export type UserWordAttemptUpdateManyAndReturnShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptUpdateManyAndReturnShape, TCtx>
export type UserWordAttemptUpsertShape = OperationShape<TM, 'UserWordAttempt', 'upsert', 1, UM>
export type UserWordAttemptUpsertShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptUpsertShape, TCtx>
export type UserWordAttemptDeleteShape = OperationShape<TM, 'UserWordAttempt', 'delete', 1, UM>
export type UserWordAttemptDeleteShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptDeleteShape, TCtx>
export type UserWordAttemptDeleteManyShape = OperationShape<TM, 'UserWordAttempt', 'deleteMany', 1, UM>
export type UserWordAttemptDeleteManyShapeInput<TCtx = unknown> = ShapeInput<UserWordAttemptDeleteManyShape, TCtx>

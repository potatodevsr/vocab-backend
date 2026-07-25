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

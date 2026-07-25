import type { ModelRelationMap } from "./autoIncludePlanner.js";
import { VocabWordRelations } from "./VocabWord/VocabWordRelations.js";
import { AdminUserRelations } from "./AdminUser/AdminUserRelations.js";
import { UserRelations } from "./User/UserRelations.js";
import { LearningSessionRelations } from "./LearningSession/LearningSessionRelations.js";
import { QuizResultRelations } from "./QuizResult/QuizResultRelations.js";
import { UserUnitProgressRelations } from "./UserUnitProgress/UserUnitProgressRelations.js";
import { UserWordProgressRelations } from "./UserWordProgress/UserWordProgressRelations.js";
import { UserWordAttemptRelations } from "./UserWordAttempt/UserWordAttemptRelations.js";

export const relationModels: Record<string, ModelRelationMap> = {
  VocabWord: VocabWordRelations,
  AdminUser: AdminUserRelations,
  User: UserRelations,
  LearningSession: LearningSessionRelations,
  QuizResult: QuizResultRelations,
  UserUnitProgress: UserUnitProgressRelations,
  UserWordProgress: UserWordProgressRelations,
  UserWordAttempt: UserWordAttemptRelations,
};

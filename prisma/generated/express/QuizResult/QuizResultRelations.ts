import type { ModelRelationMap } from "../autoIncludePlanner.js";

export const QuizResultRelations: ModelRelationMap = {
  name: "QuizResult",
  delegateKey: "quizResult",
  scalarFields: [
    "id",
    "userId",
    "level",
    "unit",
    "score",
    "total",
    "correctCount",
    "incorrectCount",
    "startedAt",
    "endedAt",
    "createdAt",
  ],
  relations: {
    user: {
      name: "user",
      type: "User",
      isList: false,
      isRequired: true,
      direction: "parentOwnsFk",
      parentLinkFields: ["userId"],
      childLinkFields: ["id"],
    },
    attempts: {
      name: "attempts",
      type: "UserWordAttempt",
      isList: true,
      isRequired: true,
      direction: "childOwnsFk",
      parentLinkFields: ["id"],
      childLinkFields: ["quizResultId"],
    },
  },
};

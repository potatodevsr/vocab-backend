import type { ModelRelationMap } from "../autoIncludePlanner.js";

export const LearningSessionRelations: ModelRelationMap = {
  name: "LearningSession",
  delegateKey: "learningSession",
  scalarFields: [
    "id",
    "userId",
    "level",
    "unit",
    "mode",
    "startedAt",
    "endedAt",
    "totalWords",
    "completedWords",
    "correctCount",
    "incorrectCount",
    "durationSec",
    "createdAt",
    "updatedAt",
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
      childLinkFields: ["sessionId"],
    },
  },
};

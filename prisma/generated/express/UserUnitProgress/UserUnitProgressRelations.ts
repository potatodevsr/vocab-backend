import type { ModelRelationMap } from "../autoIncludePlanner.js";

export const UserUnitProgressRelations: ModelRelationMap = {
  name: "UserUnitProgress",
  delegateKey: "userUnitProgress",
  scalarFields: [
    "id",
    "userId",
    "level",
    "unit",
    "totalWords",
    "currentIndex",
    "learnedCount",
    "reviewCount",
    "completedAt",
    "lastStudiedAt",
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
  },
};

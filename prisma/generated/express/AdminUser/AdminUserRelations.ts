import type { ModelRelationMap } from "../autoIncludePlanner.js";

export const AdminUserRelations: ModelRelationMap = {
  name: "AdminUser",
  delegateKey: "adminUser",
  scalarFields: ["id", "username", "password", "createdAt", "updatedAt"],
  relations: {},
};

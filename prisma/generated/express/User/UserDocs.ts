import { Request, Response } from "express";
import { buildModelOpenApi } from "../buildModelOpenApi.js";
import {
  renderDocs,
  renderScalar,
  renderPlayground,
  isOpenApiDisabled,
  isPlaygroundAvailable,
  type FieldMeta,
  type EnumMeta,
  type DocsUI,
  type DocsConfig,
  type DocsModelContext,
} from "../docsRenderer.js";

export const MODEL_FIELDS: FieldMeta[] = [
  {
    name: "id",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: true,
    isUnique: false,
  },
  {
    name: "email",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: true,
  },
  {
    name: "username",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: true,
  },
  {
    name: "password",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "firstName",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "lastName",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "createdAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "updatedAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: true,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "learningSessions",
    kind: "object",
    type: "LearningSession",
    isList: true,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
    relationFromFields: [],
  },
  {
    name: "quizResults",
    kind: "object",
    type: "QuizResult",
    isList: true,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
    relationFromFields: [],
  },
  {
    name: "unitProgresses",
    kind: "object",
    type: "UserUnitProgress",
    isList: true,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
    relationFromFields: [],
  },
  {
    name: "wordProgresses",
    kind: "object",
    type: "UserWordProgress",
    isList: true,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
    relationFromFields: [],
  },
  {
    name: "wordAttempts",
    kind: "object",
    type: "UserWordAttempt",
    isList: true,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
    relationFromFields: [],
  },
];

export const MODEL_ENUMS: EnumMeta[] = [];

const COMPOUND_ID: { fields: string[] } | null = null;

const COMPOUND_UNIQUES: { name: string; fields: string[] }[] = [];

const EXAMPLE_VALUES: Record<string, unknown> = {
  id: "example",
  email: "example",
  username: "example",
  password: "example",
  firstName: "example",
  lastName: "example",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const MODEL_CONTEXT: DocsModelContext = {
  fields: MODEL_FIELDS,
  enums: MODEL_ENUMS,
  compoundId: COMPOUND_ID,
  compoundUniques: COMPOUND_UNIQUES,
  exampleValues: EXAMPLE_VALUES,
};

export function UserDocs(config: DocsConfig = {}) {
  return (req: Request, res: Response) => {
    const disabled = isOpenApiDisabled(config.disableOpenApi);
    if (disabled)
      return res
        .status(404)
        .send("OpenAPI documentation is disabled in production");

    const rawUi =
      (req.query["ui"] as string | undefined) || config.docsUi || "docs";
    const validUis: DocsUI[] = ["docs", "scalar", "json", "yaml", "playground"];
    const ui: DocsUI = validUis.includes(rawUi as DocsUI)
      ? (rawUi as DocsUI)
      : "docs";

    if (ui === "playground") {
      if (!isPlaygroundAvailable(config)) {
        return res.status(404).send("Query builder is disabled");
      }
      return res.type("html").send(renderPlayground("User", config));
    }

    if (ui === "yaml") {
      const yaml = buildModelOpenApi(
        "User",
        MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
        MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
        config,
        { format: "yaml" },
      );
      return res.type("application/yaml").send(yaml as string);
    }

    const spec = buildModelOpenApi(
      "User",
      MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
      MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
      config,
      { format: "json" },
    );

    if (ui === "json") return res.json(spec);

    const pageTitle = config.docsTitle || `User API`;

    if (ui === "scalar") {
      return res
        .type("html")
        .send(renderScalar("User", spec, pageTitle, config.scalarCdnUrl));
    }

    const html = renderDocs("User", config, MODEL_CONTEXT);
    return res.type("html").send(html);
  };
}

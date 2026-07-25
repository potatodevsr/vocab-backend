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
    name: "userId",
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
    name: "wordId",
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
    name: "level",
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
    name: "unit",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "status",
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
    name: "mastery",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "seenCount",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "knownCount",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "reviewCount",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "correctCount",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "incorrectCount",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "streak",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "lastSeenAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "lastCorrectAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "lastIncorrectAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "nextReviewAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "masteredAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
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
    name: "user",
    kind: "object",
    type: "User",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
    relationFromFields: ["userId"],
  },
  {
    name: "word",
    kind: "object",
    type: "VocabWord",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
    relationFromFields: ["wordId"],
  },
];

export const MODEL_ENUMS: EnumMeta[] = [];

const COMPOUND_ID: { fields: string[] } | null = null;

const COMPOUND_UNIQUES: { name: string; fields: string[] }[] = [
  { name: "userId_wordId", fields: ["userId", "wordId"] },
];

const EXAMPLE_VALUES: Record<string, unknown> = {
  id: "example",
  userId: "example",
  wordId: "example",
  level: "example",
  unit: 1,
  status: "example",
  mastery: 1,
  seenCount: 1,
  knownCount: 1,
  reviewCount: 1,
  correctCount: 1,
  incorrectCount: 1,
  streak: 1,
  lastSeenAt: "2025-01-01T00:00:00.000Z",
  lastCorrectAt: "2025-01-01T00:00:00.000Z",
  lastIncorrectAt: "2025-01-01T00:00:00.000Z",
  nextReviewAt: "2025-01-01T00:00:00.000Z",
  masteredAt: "2025-01-01T00:00:00.000Z",
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

export function UserWordProgressDocs(config: DocsConfig = {}) {
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
      return res
        .type("html")
        .send(renderPlayground("UserWordProgress", config));
    }

    if (ui === "yaml") {
      const yaml = buildModelOpenApi(
        "UserWordProgress",
        MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
        MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
        config,
        { format: "yaml" },
      );
      return res.type("application/yaml").send(yaml as string);
    }

    const spec = buildModelOpenApi(
      "UserWordProgress",
      MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
      MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
      config,
      { format: "json" },
    );

    if (ui === "json") return res.json(spec);

    const pageTitle = config.docsTitle || `UserWordProgress API`;

    if (ui === "scalar") {
      return res
        .type("html")
        .send(
          renderScalar(
            "UserWordProgress",
            spec,
            pageTitle,
            config.scalarCdnUrl,
          ),
        );
    }

    const html = renderDocs("UserWordProgress", config, MODEL_CONTEXT);
    return res.type("html").send(html);
  };
}

import type { Context } from "hono";
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
    name: "level",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: false,
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
    name: "wordIds",
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
    name: "poolIds",
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
    name: "answers",
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
    name: "completedAt",
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
    name: "claimedAt",
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
    name: "expiresAt",
    kind: "scalar",
    type: "DateTime",
    isList: false,
    isRequired: true,
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
];

export const MODEL_ENUMS: EnumMeta[] = [];

const COMPOUND_ID: { fields: string[] } | null = null;

const COMPOUND_UNIQUES: { name: string; fields: string[] }[] = [];

const EXAMPLE_VALUES: Record<string, unknown> = {
  id: "example",
  level: "example",
  unit: 1,
  wordIds: "example",
  poolIds: "example",
  answers: "example",
  correctCount: 1,
  completedAt: "2025-01-01T00:00:00.000Z",
  claimedAt: "2025-01-01T00:00:00.000Z",
  expiresAt: "2025-01-01T00:00:00.000Z",
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

export function PracticeTrialDocs(config: DocsConfig = {}) {
  return (c: Context): Response | Promise<Response> => {
    const disabled = isOpenApiDisabled(config.disableOpenApi);
    if (disabled)
      return c.text("OpenAPI documentation is disabled in production", 404);

    const rawUi = c.req.query("ui") || config.docsUi || "docs";
    const validUis: DocsUI[] = ["docs", "scalar", "json", "yaml", "playground"];
    const ui: DocsUI = (validUis as string[]).includes(rawUi)
      ? (rawUi as DocsUI)
      : "docs";

    if (ui === "playground") {
      if (!isPlaygroundAvailable(config)) {
        return c.text("Query builder is disabled", 404);
      }
      return c.html(renderPlayground("PracticeTrial", config));
    }

    if (ui === "yaml") {
      const yaml = buildModelOpenApi(
        "PracticeTrial",
        MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
        MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
        config,
        { format: "yaml" },
      ) as string;
      return c.body(yaml, 200, { "Content-Type": "application/yaml" });
    }

    const spec = buildModelOpenApi(
      "PracticeTrial",
      MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
      MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
      config,
      { format: "json" },
    );

    if (ui === "json") return c.json(spec as Record<string, unknown>);

    const pageTitle = config.docsTitle || `PracticeTrial API`;

    if (ui === "scalar") {
      return c.html(
        renderScalar("PracticeTrial", spec, pageTitle, config.scalarCdnUrl),
      );
    }

    const html = renderDocs("PracticeTrial", config, MODEL_CONTEXT);
    return c.html(html);
  };
}

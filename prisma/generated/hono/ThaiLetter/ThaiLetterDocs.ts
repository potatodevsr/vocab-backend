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
    name: "kind",
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
    name: "ordinal",
    kind: "scalar",
    type: "Int",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation:
      "* Position within `kind`, in the order the list is traditionally taught.",
    isId: false,
    isUnique: false,
  },
  {
    name: "char",
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
    name: "name",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation:
      '* How it is read aloud in Thai: "ก ไก่", "สระเอ", "ไม้เอก".',
    isId: false,
    isUnique: false,
  },
  {
    name: "roman",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation:
      "* The romanised name — what a non-Thai reader sees under the button.",
    isId: false,
    isUnique: false,
  },
  {
    name: "sound",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation:
      "* RTGS value in initial position, or the vowel's sound. Empty for อ and the marks.",
    isId: false,
    isUnique: false,
  },
  {
    name: "soundFinal",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation:
      "* RTGS value in final position. Consonants only, and empty for those that never close a syllable.",
    isId: false,
    isUnique: false,
  },
  {
    name: "vowelLength",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: "* `short` | `long`, for `vowelSound` rows only.",
    isId: false,
    isUnique: false,
  },
  {
    name: "clip",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation:
      "* Audio object key, resolved under the audio prefix. Defaults to `id`.",
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

const COMPOUND_UNIQUES: { name: string; fields: string[] }[] = [
  { name: "kind_char", fields: ["kind", "char"] },
];

const EXAMPLE_VALUES: Record<string, unknown> = {
  id: "example",
  kind: "example",
  ordinal: 1,
  char: "example",
  name: "example",
  roman: "example",
  sound: "example",
  soundFinal: "example",
  vowelLength: "example",
  clip: "example",
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

export function ThaiLetterDocs(config: DocsConfig = {}) {
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
      return c.html(renderPlayground("ThaiLetter", config));
    }

    if (ui === "yaml") {
      const yaml = buildModelOpenApi(
        "ThaiLetter",
        MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
        MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
        config,
        { format: "yaml" },
      ) as string;
      return c.body(yaml, 200, { "Content-Type": "application/yaml" });
    }

    const spec = buildModelOpenApi(
      "ThaiLetter",
      MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
      MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
      config,
      { format: "json" },
    );

    if (ui === "json") return c.json(spec as Record<string, unknown>);

    const pageTitle = config.docsTitle || `ThaiLetter API`;

    if (ui === "scalar") {
      return c.html(
        renderScalar("ThaiLetter", spec, pageTitle, config.scalarCdnUrl),
      );
    }

    const html = renderDocs("ThaiLetter", config, MODEL_CONTEXT);
    return c.html(html);
  };
}

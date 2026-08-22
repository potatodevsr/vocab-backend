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
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "googleId",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: true,
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
    name: "timezone",
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
    name: "locale",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation:
      "*\n     * Which interface language this learner reads, captured the same silent way from the\n     * locale they registered under.\n     *\n     * It exists for the surfaces that have no request to infer it from: a reminder email\n     * sent by a cron, and the notification text a service worker fetches. Those were\n     * hard-coded Thai — right for most of this audience and wrong for the English-interface\n     * learner, who would get a Thai push about a course they are reading in English.\n     * Defaults to `th` because that is the primary audience, not because it is a guess.",
    isId: false,
    isUnique: false,
  },
  {
    name: "weeklyGoalDays",
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
    name: "wordlistId",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation:
      "*\n     * Reminder email settings. Off unless the learner turns them on — a streak is a memory\n     * aid, not a threat (LEARNER-LIFECYCLE.md §1.2), and an unasked-for daily email is the\n     * fastest way to turn one into the other.\n     *\n     * `reminderHour` is an hour in the learner's own `timezone`, which is why the cron runs\n     * hourly and each user's local time is computed rather than stored: one UTC send time\n     * would reach Bangkok and Berlin at unrelated moments of their day.\n     *\n     * `lastReminderOn` is a local date string (`YYYY-MM-DD`), and it is the idempotency\n     * key. D1 has no transactions, so \"did we already mail this person today\" cannot be a\n     * read-modify-write on a timestamp — it is a compare against a date the send itself\n     * writes.\n/**\n     * The list this learner is studying. Defaults to the Oxford 3000 course, which is what\n     * every existing learner is on, so the column is inert until a second list is\n     * published.",
    isId: false,
    isUnique: false,
  },
  {
    name: "reminderOptIn",
    kind: "scalar",
    type: "Boolean",
    isList: false,
    isRequired: true,
    hasDefaultValue: true,
    isUpdatedAt: false,
    documentation: null,
    isId: false,
    isUnique: false,
  },
  {
    name: "reminderHour",
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
    name: "lastReminderOn",
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
    name: "lastRecapOn",
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
  {
    name: "magicLinkTokens",
    kind: "object",
    type: "MagicLinkToken",
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
    name: "mixedSessions",
    kind: "object",
    type: "MixedSession",
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
    name: "completions",
    kind: "object",
    type: "CompletionLedger",
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
    name: "unitCheckpoints",
    kind: "object",
    type: "UnitCheckpoint",
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
    name: "pushSubscriptions",
    kind: "object",
    type: "PushSubscription",
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
  googleId: "example",
  firstName: "example",
  lastName: "example",
  timezone: "example",
  locale: "example",
  weeklyGoalDays: 1,
  wordlistId: "example",
  reminderOptIn: true,
  reminderHour: 1,
  lastReminderOn: "example",
  lastRecapOn: "example",
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
      return c.html(renderPlayground("User", config));
    }

    if (ui === "yaml") {
      const yaml = buildModelOpenApi(
        "User",
        MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
        MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
        config,
        { format: "yaml" },
      ) as string;
      return c.body(yaml, 200, { "Content-Type": "application/yaml" });
    }

    const spec = buildModelOpenApi(
      "User",
      MODEL_FIELDS as unknown as Parameters<typeof buildModelOpenApi>[1],
      MODEL_ENUMS as unknown as Parameters<typeof buildModelOpenApi>[2],
      config,
      { format: "json" },
    );

    if (ui === "json") return c.json(spec as Record<string, unknown>);

    const pageTitle = config.docsTitle || `User API`;

    if (ui === "scalar") {
      return c.html(renderScalar("User", spec, pageTitle, config.scalarCdnUrl));
    }

    const html = renderDocs("User", config, MODEL_CONTEXT);
    return c.html(html);
  };
}

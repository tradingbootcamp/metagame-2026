import { beforeAll, describe, expect, it } from "vitest";
import { airtableConfig } from "@/lib/airtable-config";
import { allQuestions, type Question } from "./engine";
import { FORMS } from "./index";

// Checks every journey against the live Airtable base, without writing
// anything: each table and field exists, each field's type fits its
// question, and every option is one Airtable has. It needs a token that can
// read the base's schema (schema.bases:read), so it's skipped without one,
// as in CI. To run it:
//
//   AIRTABLE_API_KEY=pat… pnpm vitest run src/v2/forms/airtable-schema.test.ts

const KEY = process.env.AIRTABLE_API_KEY;

type Field = {
  id: string;
  name: string;
  type: string;
  options?: { choices?: { name: string }[] };
};
type Table = { id: string; name: string; fields: Field[] };

// The Airtable field types each kind of question can write to.
const FITS: Record<Question["type"], string[]> = {
  text: ["singleLineText", "email", "phoneNumber", "url", "multilineText"],
  email: ["email", "singleLineText"],
  phone: ["phoneNumber", "singleLineText"],
  longtext: ["multilineText", "richText", "singleLineText"],
  number: ["number"],
  choice: ["singleSelect"],
  choices: ["multipleSelects"],
  toggle: ["checkbox"],
  file: ["multipleAttachments"],
};
const fits = (q: Question) =>
  q.type === "choice" && q.asList ? ["multipleSelects"] : FITS[q.type];

describe.skipIf(!KEY)("journeys against the live Airtable base", () => {
  let tables: Map<string, Table>;

  beforeAll(async () => {
    const res = await fetch(
      `https://api.airtable.com/v0/meta/bases/${airtableConfig.baseId}/tables`,
      { headers: { Authorization: `Bearer ${KEY}` } },
    );
    if (!res.ok)
      throw new Error(`Airtable responded ${res.status}: ${await res.text()}`);
    const { tables: list } = (await res.json()) as { tables: Table[] };
    tables = new Map(list.map((t) => [t.id, t]));
  });

  for (const def of Object.values(FORMS)) {
    it(`${def.slug} fits ${def.tableId}`, () => {
      const table = tables.get(def.tableId);
      expect(table, "table").toBeDefined();
      const fields = new Map(table!.fields.map((f) => [f.id, f]));
      const problems: string[] = [];
      const utm = Object.values(def.utmFields ?? {});
      for (const id of utm)
        if (!fields.has(id)) problems.push(`UTM field ${id} is missing`);
      for (const q of allQuestions(def)) {
        if (!q.field) continue;
        const field = fields.get(q.field);
        if (!field) {
          problems.push(`${q.key}: field ${q.field} is missing`);
          continue;
        }
        if (!fits(q).includes(field.type))
          problems.push(
            `${q.key}: "${field.name}" is ${field.type}, not ${fits(q).join(" or ")}`,
          );
        if (q.type === "choice" || q.type === "choices") {
          const names = new Set(
            field.options?.choices?.map((c) => c.name) ?? [],
          );
          for (const o of q.options)
            if (!names.has(o.value))
              problems.push(`${q.key}: "${field.name}" has no "${o.value}"`);
        }
      }
      expect(problems).toEqual([]);
    });
  }
});

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { API_AREAS, apiGuideMarkdown } from "./api-docs";

const ROOT = path.resolve(__dirname, "../app/api/admin");
const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
// authorize() with no argument; see admin-api.ts.
const DEFAULT_PERMISSION = "schedule.manage";

/** "METHOD /api/admin/…" → the permission its handler authorizes with. */
function routeGates(): Map<string, string[]> {
  const gates = new Map<string, string[]>();
  const files = readdirSync(ROOT, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith("route.ts"))
    .map((f) => path.join(ROOT, f));
  for (const file of files) {
    const route =
      "/api/admin/" +
      path
        .relative(ROOT, path.dirname(file))
        .split(path.sep)
        .map((s) => s.replace(/^\[(.+)\]$/, "{$1}"))
        .join("/");
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const fns = new Map<string, ts.FunctionDeclaration>();
    source.forEachChild((n) => {
      if (ts.isFunctionDeclaration(n) && n.name) fns.set(n.name.text, n);
    });
    // The permissions a function authorizes with, following local helpers.
    const gatesOf = (fn: ts.Node, seen = new Set<ts.Node>()): string[] => {
      if (seen.has(fn)) return [];
      seen.add(fn);
      const found: string[] = [];
      const visit = (n: ts.Node) => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
          const name = n.expression.text;
          if (name === "authorize") {
            const [arg] = n.arguments;
            found.push(
              arg && ts.isStringLiteral(arg) ? arg.text : DEFAULT_PERMISSION,
            );
          } else if (fns.has(name)) {
            found.push(...gatesOf(fns.get(name)!, seen));
          }
        }
        n.forEachChild(visit);
      };
      fn.forEachChild(visit);
      return found;
    };
    for (const [name, fn] of fns) {
      const exported = fn.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (exported && METHODS.has(name))
        gates.set(`${name} ${route}`, gatesOf(fn));
    }
  }
  return gates;
}

const documented = API_AREAS.flatMap((a) => a.endpoints);

describe("API docs", () => {
  const gates = routeGates();

  it("cover every handler under /api/admin, and nothing else", () => {
    expect(documented.map((e) => `${e.method} ${e.path}`).sort()).toEqual(
      [...gates.keys()].sort(),
    );
  });

  it("name the permission each handler checks", () => {
    for (const e of documented) {
      expect(
        gates.get(`${e.method} ${e.path}`),
        `${e.method} ${e.path}`,
      ).toEqual([e.permission]);
    }
  });

  it("render every endpoint into the agent guide", () => {
    const md = apiGuideMarkdown("https://example.test");
    expect(md).toContain("Base URL: https://example.test");
    for (const e of documented)
      expect(md).toContain(`### ${e.method} ${e.path}`);
  });
});

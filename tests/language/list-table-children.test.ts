/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { TemplateError } from "../../core/src";
import { analyze } from "../../core/src/analyze";
import { render, validate } from "../../core/src/render";
import { resolveTemplate } from "../../core/src/resolve";
import { spec } from "../../core/src/spec";
import { Limits } from "../../core/src/types";
import { runGoldenCases } from "../golden/harness";
import { check } from "../headless/http-helpers";

// FOR and IF build LIST items and TABLE rows. Every row below runs in all four entries (render and resolve, strict
// and lenient) unless it names its own. Expected outputs of the new syntax are the outputs of the same list or table
// written out by hand with LIST_ITEM and ROW tags only. Ids: lc-list lc-table lc-close lc-errors lc-limits lc-ws
// lc-analyze lc-pipes lc-compat.

type Entry = "render-strict" | "render-lenient" | "resolve-strict" | "resolve-lenient";
const ENTRIES: Entry[] = ["render-strict", "render-lenient", "resolve-strict", "resolve-lenient"];

interface Outcome {
  /** "ok" or the diagnostic code; "threw:<name>" for an exception that is not a TemplateError */
  code: string;
  line?: number;
  column?: number;
  message?: string;
  suggestion?: string;
  output?: string;
  iterations?: number;
}

type RunOptions = Record<string, any>;

function run(entry: Entry, template: string, data: Record<string, any>, limits?: Partial<Limits>, opts?: RunOptions): Outcome {
  const strictMode = entry.endsWith("strict");
  try {
    if (entry.startsWith("render")) {
      const r = render(template, data, { strictMode, limits, ...opts });
      if (r.ok) return { code: "ok", output: r.output, iterations: r.stats.iterations };
      const d = r.diagnostics[0] as any;
      return { code: d.code, line: d.line, column: d.column, message: d.message, suggestion: d.suggestion, output: r.output, iterations: r.stats.iterations };
    }
    const out = resolveTemplate(template, new Map(Object.entries(data)), { strictMode, limits, ...opts });
    return { code: "ok", output: out };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}`, message: String((e as Error)?.message) };
  }
}

/** validate and analyze reported as one outcome; a TemplateError thrown by analyze counts as its diagnostic. */
function runStatic(kind: "validate" | "analyze", template: string): Outcome {
  try {
    if (kind === "validate") {
      const r = validate(template);
      if (r.ok) return { code: "ok" };
      const d = (r.diagnostics.find((x) => x.severity === "error") ?? r.diagnostics[0]) as any;
      return { code: d.code, line: d.line, column: d.column, message: d.message, suggestion: d.suggestion };
    }
    const a = analyze(template);
    const d = a.diagnostics[0] as any;
    if (!d) return { code: "ok" };
    return { code: d.code, line: d.line, column: d.column, message: d.message, suggestion: d.suggestion };
  } catch (e) {
    if (e instanceof TemplateError) return { code: e.code, line: e.line, column: e.column, message: e.message };
    return { code: `threw:${(e as Error)?.constructor?.name ?? typeof e}` };
  }
}

type Want =
  | { out: string }
  | { err: string; line: number; col: number; has?: string; sug?: string }
  | { code: string }
  | { loc: string };
type Wants = Want | { strict: Want; lenient: Want };
const OUT = (out: string): Want => ({ out });
const ERR = (err: string, line: number, col: number, has?: string, sug?: string): Want => ({ err, line, col, has, sug });
/** only the code is pinned */
const CODE = (code: string): Want => ({ code });
/** the code is pinned and the position must be a real position, never 1:1 */
const LOC = (loc: string): Want => ({ loc });
const SL = (strict: Want, lenient: Want): Wants => ({ strict, lenient });
const pick = (w: Wants, entry: Entry): Want => ("strict" in w ? (entry.endsWith("strict") ? w.strict : w.lenient) : w);

interface Row {
  name: string;
  tpl: string;
  data: Record<string, any>;
  want: Wants;
  entries?: Entry[];
  limits?: Partial<Limits>;
  opts?: RunOptions;
}

function verifyOutcome(o: Outcome, want: Want, label: string): void {
  if ("err" in want) {
    check(o.code, `${label}: expects the error ${want.err}`).toBe(want.err);
    check({ line: o.line, column: o.column }, `${label}: located at ${want.line}:${want.col}`).toEqual({ line: want.line, column: want.col });
    if (want.has) check(o.message ?? "", `${label}: the message holds ${JSON.stringify(want.has)}`).toContain(want.has);
    if (want.sug) check(`${o.suggestion ?? ""} ${o.message ?? ""}`, `${label}: the suggestion tells ${JSON.stringify(want.sug)}`).toContain(want.sug);
    return;
  }
  if ("code" in want) {
    check(o.code, `${label}: expects the error ${want.code}`).toBe(want.code);
    return;
  }
  if ("loc" in want) {
    check(o.code, `${label}: expects the error ${want.loc}`).toBe(want.loc);
    check(o.line !== undefined && o.column !== undefined && !(o.line === 1 && o.column === 1), `${label}: located at the offending token, never 1:1 (got ${o.line}:${o.column})`).toBe(true);
    return;
  }
  check(o.code, `${label}: renders without an error (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe("ok");
  check(o.output, `${label}: renders ${JSON.stringify(want.out)}`).toBe(want.out);
}

function verify(entry: Entry, r: Row, id: string): void {
  const o = run(entry, r.tpl, r.data, r.limits, r.opts);
  verifyOutcome(o, pick(r.want, entry), `${id} [${entry}] ${r.name}`);
}

function expand(rows: Row[]) {
  return rows.flatMap((r) => (r.entries ?? ENTRIES).map((entry) => ({ entry, r, name: r.name })));
}

/** A hand-written row with a § in the template at the place where the error is located. */
function marked(tplMarked: string): { tpl: string; line: number; col: number } {
  const i = tplMarked.indexOf("§");
  const before = tplMarked.slice(0, i);
  return { tpl: tplMarked.replace("§", ""), line: before.split("\n").length, col: before.length - (before.lastIndexOf("\n") + 1) + 1 };
}

interface SynRow {
  name: string;
  tpl: string;
  line: number;
  col: number;
  has?: string;
}
interface AnalyzeRow {
  name: string;
  tpl: string;
  usedIn: Record<string, string[]>;
  blocks: Record<string, number>;
}

const cyc: any = {};
cyc.self = cyc;
const big = BigInt(10);
const BS = String.fromCharCode(92);

const D: Record<string, any> = {"xs":["a","b","c"],"ys":["p","q"],"empty":[],"t":true,"f":false,"nul":null,"obj":{"k":1},"sel":2,"cfg":{"a":1},"people":[{"name":"Ann","on":true},{"name":"Bo","on":false},{"name":"Cy","on":true}]};

const LIST_ROWS: Row[] = [
  { name: "a FOR yields one item per element", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "static items before and after a FOR share one counter", tpl: "{{LIST}}{{LIST_ITEM}}s1{{END_LIST_ITEM}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}s2{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. s1\n2. a\n3. b\n4. c\n5. s2") },
  { name: "two FORs and static items between them number without gaps", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}mid{{END_LIST_ITEM}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p\n2. q\n3. mid\n4. a") },
  { name: "an item written after a FOR with no items takes the next number", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. s\n2. e") },
  { name: "an IF true yields its items and not the ELSE items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. Y") },
  { name: "an IF false yields the ELSE items", tpl: "{{LIST}}{{IF f}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. N") },
  { name: "an IF false without ELSE yields no item and the next item is 1", tpl: "{{LIST}}{{IF f}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}z{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. z") },
  { name: "an IF true holds several items", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{IF t}}{{LIST_ITEM}}Y1{{END_LIST_ITEM}}{{LIST_ITEM}}Y2{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. s\n2. Y1\n3. Y2\n4. e") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of items, sel=1", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{IF sel == 1}}{{LIST_ITEM}}one{{END_LIST_ITEM}}{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{LIST_ITEM}}two2{{END_LIST_ITEM}}{{ELSEIF sel == 3}}{{LIST_ITEM}}three{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}other{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":1} }, want: OUT("1. s\n2. one\n3. e") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of items, sel=2", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{IF sel == 1}}{{LIST_ITEM}}one{{END_LIST_ITEM}}{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{LIST_ITEM}}two2{{END_LIST_ITEM}}{{ELSEIF sel == 3}}{{LIST_ITEM}}three{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}other{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":2} }, want: OUT("1. s\n2. two\n3. two2\n4. e") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of items, sel=3", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{IF sel == 1}}{{LIST_ITEM}}one{{END_LIST_ITEM}}{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{LIST_ITEM}}two2{{END_LIST_ITEM}}{{ELSEIF sel == 3}}{{LIST_ITEM}}three{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}other{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":3} }, want: OUT("1. s\n2. three\n3. e") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of items, sel=4", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{IF sel == 1}}{{LIST_ITEM}}one{{END_LIST_ITEM}}{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{END_LIST_ITEM}}{{LIST_ITEM}}two2{{END_LIST_ITEM}}{{ELSEIF sel == 3}}{{LIST_ITEM}}three{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}other{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":4} }, want: OUT("1. s\n2. other\n3. e") },
  { name: "limit and offset pick the items and @index0, @total are read in them", tpl: "{{LIST}}{{FOR xs AS x limit=2 offset=1}}{{LIST_ITEM}}${{@index0}}/${{@total}} ${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. 0/2 b\n2. 1/2 c") },
  { name: "a FOR over an empty array renders its ELSE items", tpl: "{{LIST}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. none") },
  { name: "the ELSE items follow static items in one counter", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. s\n2. none\n3. e") },
  { name: "a FOR that renders items does not render its ELSE items", tpl: "{{LIST}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a") },
  { name: "an offset past the end renders the ELSE items", tpl: "{{LIST}}{{FOR xs AS x offset=9}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. none") },
  { name: "the loop name is not bound in the ELSE items", tpl: "{{LIST}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}[${{x}}]{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { ...D, ...{"x":"D"} }, want: OUT("1. [D]") },
  { name: "a FOR inside a FOR inside a LIST", tpl: "{{LIST}}{{FOR ys AS y}}{{FOR xs AS x}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. pa\n2. pb\n3. pc\n4. qa\n5. qb\n6. qc") },
  { name: "a FOR inside a FOR with an ELSE at each level", tpl: "{{LIST}}{{FOR ys AS y}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}in-${{y}}{{END_LIST_ITEM}}{{END_FOR}}{{ELSE}}{{LIST_ITEM}}out{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. in-p\n2. in-q") },
  { name: "an IF inside a FOR numbers the kept items without gaps", tpl: "{{LIST}}{{FOR xs AS x}}{{IF x != \"b\"}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. c") },
  { name: "an IF/ELSE inside a FOR picks per element", tpl: "{{LIST}}{{FOR people AS p}}{{IF p.on}}{{LIST_ITEM}}${{p.name}} on{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}${{p.name}} off{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. Ann on\n2. Bo off\n3. Cy on") },
  { name: "an IF/ELSEIF/ELSE inside a FOR", tpl: "{{LIST}}{{FOR xs AS x}}{{IF x == \"a\"}}{{LIST_ITEM}}A{{END_LIST_ITEM}}{{ELSEIF x == \"b\"}}{{LIST_ITEM}}B{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}other{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. A\n2. B\n3. other") },
  { name: "a FOR inside an IF branch", tpl: "{{LIST}}{{IF t}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "a FOR inside an IF ELSE branch", tpl: "{{LIST}}{{IF f}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. p\n2. q") },
  { name: "an IF inside an IF", tpl: "{{LIST}}{{IF t}}{{IF f}}{{LIST_ITEM}}A{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}B{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM}}C{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. B\n2. C") },
  { name: "six levels: FOR, IF, FOR, IF, FOR, IF", tpl: "{{LIST}}{{FOR ys AS y}}{{IF t}}{{FOR xs AS x limit=2}}{{IF t}}{{FOR empty AS z}}{{LIST_ITEM}}no{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. pa\n2. pb\n3. qa\n4. qb") },
  { name: "an item skipped by its own condition inside a FOR takes no number", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM x != \"b\"}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. c") },
  { name: "an item with a fallback inside a FOR is numbered with the fallback text", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM x != \"b\" | fallback=\"fb\"}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. fb\n3. c") },
  { name: "an item with an empty content is numbered inside a FOR", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. s\n2. \n3. ") },
  { name: "an item condition reads the loop name and the metadata", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM @index0 > 0}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. b\n2. c") },
  { name: "an item with a missing condition name is skipped, not an error, in strict mode", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM nope}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. e") },
  { name: "an item with a missing condition name takes its fallback", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM nope | fallback=\"fb\"}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. fb\n2. fb") },
  { name: "a nested LIST inside a generated item has its own counter", tpl: "{{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. s\n2. p\n   1. a\n   2. b\n   3. c\n3. q\n   1. a\n   2. b\n   3. c") },
  { name: "generated items in a nested LIST", tpl: "{{LIST}}{{LIST_ITEM}}top{{END_LIST_ITEM}}{{LIST_ITEM}}p{{LIST}}{{LIST_ITEM}}n0{{END_LIST_ITEM}}{{FOR xs AS x}}{{IF x != \"b\"}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{LIST_ITEM}}n9{{END_LIST_ITEM}}{{END_LIST}}{{END_LIST_ITEM}}{{LIST_ITEM}}z{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. top\n2. p\n   1. n0\n   2. a\n   3. c\n   4. n9\n3. z") },
  { name: "an IF in a FOR in a LIST in an item's nested LIST", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{LIST}}{{FOR xs AS x}}{{IF x == \"a\"}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}-{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_LIST}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p\n   1. pa\n   2. -\n   3. -\n2. q\n   1. qa\n   2. -\n   3. -") },
  { name: "an item's own spacing is kept in a generated item", tpl: "{{LIST}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}  ${{x}} and  more  {{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a and  more") },
  { name: "a multi-line generated item keeps its lines", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{x}}\nline2{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\nline2\n2. b\nline2") },
  { name: "the same name in a FOR inside a FOR is the inner item inside", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{FOR ys AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p\n2. q\n3. p\n4. q") },
  { name: "the outer name is back after an inner loop of the same name", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{FOR ys AS x limit=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. p\n3. a\n4. b\n5. p\n6. b") },
  { name: "a missing iterable: strict error at the FOR, lenient renders the ELSE items", tpl: "a\n  {{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR nope AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: SL(ERR("missing-variable", 2, 42, "nope"), OUT("a\n  1. s\n2. none")) },
  { name: "a non-iterable object: strict type-error at the FOR, lenient renders the ELSE items", tpl: "a\n  {{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR obj AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: SL(ERR("type-error", 2, 42), OUT("a\n  1. s\n2. none")) },
  { name: "a null iterable: strict type-error at the FOR, lenient renders the ELSE items", tpl: "a\n  {{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR nul AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: SL(ERR("type-error", 2, 42), OUT("a\n  1. s\n2. none")) },
  { name: "a non-iterable without ELSE renders zero items in lenient mode", tpl: "a\n  {{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR obj AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: SL(ERR("type-error", 2, 42), OUT("a\n  1. s")) },
  { name: "a non-iterable in a FOR inside an IF inside a LIST: strict error at the FOR", tpl: "a\n{{LIST}}{{IF t}}  {{FOR obj AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: SL(ERR("type-error", 2, 19), OUT("a\n1. e")) },
  { name: "a missing iterable in an inner FOR is located at the inner FOR", tpl: "{{LIST}}{{FOR ys AS y}}\n    {{FOR nope AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: SL(ERR("missing-variable", 2, 5, "nope"), OUT("")) },
  { name: "a bad window value in a LIST FOR is a type-error at the FOR", tpl: "a\n  {{LIST}}{{LIST_ITEM}}s{{END_LIST_ITEM}}{{FOR xs AS x limit=n}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { ...D, ...{"n":-1} }, want: ERR("type-error", 2, 42) },
  { name: "a missing condition name in an IF is false and not an error", tpl: "{{LIST}}{{IF nope}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. N") },
  { name: "a null condition in an IF is false", tpl: "{{LIST}}{{IF nul}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. N") },
  { name: "a present condition in an IF is true", tpl: "{{LIST}}{{IF cfg.a}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. Y") },
  { name: "a missing nested path in an ELSEIF is false", tpl: "{{LIST}}{{IF cfg.zz}}{{LIST_ITEM}}A{{END_LIST_ITEM}}{{END_IF}}{{IF f}}{{LIST_ITEM}}B{{END_LIST_ITEM}}{{ELSEIF cfg.zz.deep}}{{LIST_ITEM}}C{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}D{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. D") },
  { name: "emoji in generated item text", tpl: "{{LIST}}{{FOR es AS e}}{{LIST_ITEM}}${{e}} ok 😀{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { ...D, ...{"es":["🚀","𝒳"]} }, want: OUT("1. 🚀 ok 😀\n2. 𝒳 ok 😀") },
  { name: "__proto__ as the loop item name", tpl: "{{LIST}}{{FOR xs AS __proto__ limit=2}}{{LIST_ITEM}}${{__proto__}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "constructor as the loop item name with a path", tpl: "{{LIST}}{{FOR people AS constructor limit=2}}{{LIST_ITEM}}${{constructor.name}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. Ann\n2. Bo") },
  { name: "constructor as a data key is an ordinary iterable", tpl: "{{LIST}}{{FOR constructor AS c}}{{LIST_ITEM}}${{c}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { ...D, ...{"constructor":["c1","c2"]} }, want: OUT("1. c1\n2. c2") },
  { name: "a prototype path segment in a condition is false", tpl: "{{LIST}}{{IF cfg.constructor}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{IF cfg.__proto__}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}N{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. N\n2. N") },
  { name: "the loop name is gone after the FOR", tpl: "{{LIST}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{LIST_ITEM}}[${{x}}]{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"x":"D"} }, want: OUT("1. a\n2. [D]") },
  { name: "a LIST generated inside a FOR keeps one counter per LIST", tpl: "{{FOR ys AS y}}{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}{{END_FOR}}", data: D, want: OUT("1. pa\n2. pb1. qa\n2. qb") },
];

const TABLE_ROWS: Row[] = [
  { name: "an IF true yields its rows and not the ELSE rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "an IF false yields the ELSE rows", tpl: "{{TABLE}}{{IF f}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| b | 2 |") },
  { name: "an IF false without ELSE yields no row", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF f}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| s | 0 |") },
  { name: "an IF with no HEADER makes no header: the first row is a plain row", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 2 |") },
  { name: "an IF holding several rows between static rows keeps source order", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{ROW}}e|9{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| s | 0 |\n| a | 1 |\n| b | 2 |\n| e | 9 |") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of rows, sel=1", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF sel == 1}}{{ROW}}one|1{{END_ROW}}{{ELSEIF sel == 2}}{{ROW}}two|2{{END_ROW}}{{ROW}}two2|2{{END_ROW}}{{ELSEIF sel == 3}}{{ROW}}three|3{{END_ROW}}{{ELSE}}{{ROW}}other|4{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"sel":1} }, want: OUT("| s | 0 |\n| one | 1 |") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of rows, sel=2", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF sel == 1}}{{ROW}}one|1{{END_ROW}}{{ELSEIF sel == 2}}{{ROW}}two|2{{END_ROW}}{{ROW}}two2|2{{END_ROW}}{{ELSEIF sel == 3}}{{ROW}}three|3{{END_ROW}}{{ELSE}}{{ROW}}other|4{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"sel":2} }, want: OUT("| s | 0 |\n| two | 2 |\n| two2 | 2 |") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of rows, sel=3", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF sel == 1}}{{ROW}}one|1{{END_ROW}}{{ELSEIF sel == 2}}{{ROW}}two|2{{END_ROW}}{{ROW}}two2|2{{END_ROW}}{{ELSEIF sel == 3}}{{ROW}}three|3{{END_ROW}}{{ELSE}}{{ROW}}other|4{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"sel":3} }, want: OUT("| s | 0 |\n| three | 3 |") },
  { name: "an IF/ELSEIF/ELSE chain picks one branch of rows, sel=4", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF sel == 1}}{{ROW}}one|1{{END_ROW}}{{ELSEIF sel == 2}}{{ROW}}two|2{{END_ROW}}{{ROW}}two2|2{{END_ROW}}{{ELSEIF sel == 3}}{{ROW}}three|3{{END_ROW}}{{ELSE}}{{ROW}}other|4{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"sel":4} }, want: OUT("| s | 0 |\n| other | 4 |") },
  { name: "a header followed by IF rows keeps the header rule", tpl: "{{TABLE}}{{HEADER}}N|T{{END_HEADER}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{ROW}}z|9{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| N | T |\n|:-----|:-----|\n| a | 1 |\n| z | 9 |") },
  { name: "a header and an IF that yields no row render the header alone", tpl: "{{TABLE}}{{HEADER}}N|T{{END_HEADER}}{{IF f}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| N | T |\n|:-----|:-----|") },
  { name: "rows from different branches are padded to the widest row", tpl: "{{TABLE}}{{IF t}}{{ROW}}a{{END_ROW}}{{END_IF}}{{IF f}}{{ROW}}x{{END_ROW}}{{ELSE}}{{ROW}}b|c|d{{END_ROW}}{{END_IF}}{{ROW}}e|f{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| a |  |  |\n| b | c | d |\n| e | f |  |") },
  { name: "rows from an IF are padded to the header width", tpl: "{{TABLE}}{{HEADER}}A|B|C{{END_HEADER}}{{IF t}}{{ROW}}1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| A | B | C |\n|:-----|:-----|:-----|\n| 1 |  |  |") },
  { name: "a FOR inside an IF yields rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|${{@index0}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 0 |\n| b | 1 |\n| c | 2 |") },
  { name: "a FOR inside an IF with a header", tpl: "{{TABLE}}{{HEADER}}L|I{{END_HEADER}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|${{@index0}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| L | I |\n|:-----|:-----|\n| a | 0 |\n| b | 1 |\n| c | 2 |") },
  { name: "a FOR inside an ELSE branch", tpl: "{{TABLE}}{{IF f}}{{ROW}}no|0{{END_ROW}}{{ELSE}}{{FOR ys AS y}}{{ROW}}${{y}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| p | 1 |\n| q | 1 |") },
  { name: "limit, offset, @total and @index1 in rows from a FOR in an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=2 offset=1}}{{ROW}}${{x}}|${{@index1}}/${{@total}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| b | 1/2 |\n| c | 2/2 |") },
  { name: "a FOR in an IF renders its ELSE rows for an empty array", tpl: "{{TABLE}}{{IF t}}{{FOR empty AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| none | 0 |") },
  { name: "a FOR in an IF does not render its ELSE rows when rows render", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=1}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "a FOR in an IF with an offset past the end renders the ELSE rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x offset=9}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| none | 0 |") },
  { name: "the loop name is not bound in the ELSE rows of a FOR in an IF", tpl: "{{TABLE}}{{IF t}}{{FOR empty AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}[${{x}}]|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"x":"D"} }, want: OUT("| [D] | 0 |") },
  { name: "an IF inside a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{IF x != \"b\"}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}skipped|0{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| skipped | 0 |\n| c | 1 |") },
  { name: "an IF/ELSEIF/ELSE inside a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{IF x == \"a\"}}{{ROW}}A|1{{END_ROW}}{{ELSEIF x == \"b\"}}{{ROW}}B|2{{END_ROW}}{{ELSE}}{{ROW}}other|3{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| A | 1 |\n| B | 2 |\n| other | 3 |") },
  { name: "a FOR inside a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}{{FOR xs AS x limit=2}}{{ROW}}${{y}}|${{x}}{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| p | a |\n| p | b |\n| q | a |\n| q | b |") },
  { name: "an IF inside an IF", tpl: "{{TABLE}}{{IF t}}{{IF f}}{{ROW}}A|1{{END_ROW}}{{ELSE}}{{ROW}}B|2{{END_ROW}}{{END_IF}}{{ROW}}C|3{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| B | 2 |\n| C | 3 |") },
  { name: "conditions in the rows read the loop name", tpl: "{{TABLE}}{{HEADER}}Name|On{{END_HEADER}}{{IF t}}{{FOR people AS p}}{{IF p.on}}{{ROW}}${{p.name}}|yes{{END_ROW}}{{ELSE}}{{ROW}}${{p.name}}|no{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| Name | On |\n|:-----|:-----|\n| Ann | yes |\n| Bo | no |\n| Cy | yes |") },
  { name: "a FOR directly in the TABLE holding an IF with a ROW yields rows", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF x != \"b\"}}{{ROW}}${{x}}|1{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| c | 1 |") },
  { name: "a FOR directly in the TABLE holding an IF/ELSE with ROWs yields rows", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF x != \"b\"}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}skipped|0{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| skipped | 0 |\n| c | 1 |") },
  { name: "a FOR directly in the TABLE holding a FOR inside an IF with ROWs yields rows", tpl: "{{TABLE}}{{FOR ys AS y}}{{IF t}}{{FOR xs AS x limit=2}}{{ROW}}${{y}}|${{x}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| p | a |\n| p | b |\n| q | a |\n| q | b |") },
  { name: "a header, a direct FOR with an IF row and a static row", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{FOR xs AS x limit=2}}{{IF t}}{{ROW}}${{x}}|1{{END_ROW}}{{END_IF}}{{END_FOR}}{{ROW}}z|9{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|\n| a | 1 |\n| b | 1 |\n| z | 9 |") },
  { name: "a missing condition name in an IF is false and not an error", tpl: "{{TABLE}}{{IF nope}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| b | 2 |") },
  { name: "a null condition in an IF is false", tpl: "{{TABLE}}{{IF nul}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| b | 2 |") },
  { name: "a present condition in an IF is true", tpl: "{{TABLE}}{{IF cfg.a}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "a non-iterable object in a FOR inside an IF is silent in every mode and the ELSE rows render", tpl: "{{TABLE}}{{IF t}}{{FOR obj AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| none | 0 |") },
  { name: "a null iterable in a FOR inside an IF is silent in every mode", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF t}}{{FOR nul AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| s | 0 |\n| none | 0 |") },
  { name: "a non-iterable without ELSE in a FOR inside an IF renders no row", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{IF t}}{{FOR obj AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|") },
  { name: "a non-iterable object in a FOR inside a FOR inside an IF is silent", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}{{FOR obj AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|${{y}}{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| none | p |\n| none | q |") },
  { name: "a missing iterable in a FOR inside an IF: strict error at the FOR, lenient renders the ELSE rows", tpl: "a\n{{TABLE}}{{IF t}}  {{FOR nope AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: SL(ERR("missing-variable", 2, 20, "nope"), OUT("a\n| none | 0 |")) },
  { name: "a bad window value in a FOR inside an IF is a type-error at the FOR", tpl: "a\n{{TABLE}}{{IF t}}  {{FOR xs AS x limit=n}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"n":"abc"} }, want: ERR("type-error", 2, 20) },
  { name: "emoji in generated cells", tpl: "{{TABLE}}{{IF t}}{{FOR es AS e}}{{ROW}}${{e}}|ok 😀{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"es":["🚀","𝒳"]} }, want: OUT("| 🚀 | ok 😀 |\n| 𝒳 | ok 😀 |") },
  { name: "__proto__ as the loop item name in a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS __proto__ limit=2}}{{ROW}}${{__proto__}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |") },
  { name: "constructor as the loop item name with a path", tpl: "{{TABLE}}{{IF t}}{{FOR people AS constructor limit=2}}{{ROW}}${{constructor.name}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| Ann | 1 |\n| Bo | 1 |") },
  { name: "constructor as a data key is an ordinary iterable", tpl: "{{TABLE}}{{IF t}}{{FOR constructor AS c}}{{ROW}}${{c}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"constructor":["c1","c2"]} }, want: OUT("| c1 | 1 |\n| c2 | 1 |") },
  { name: "a prototype path segment in an IF condition is false", tpl: "{{TABLE}}{{IF cfg.constructor}}{{ROW}}Y|1{{END_ROW}}{{ELSE}}{{ROW}}N|0{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| N | 0 |") },
  { name: "a TABLE with only an IF that yields no row renders nothing", tpl: "{{TABLE}}{{IF f}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("") },
  { name: "two IFs and a FOR in source order", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{FOR ys AS y}}{{ROW}}${{y}}|2{{END_ROW}}{{END_FOR}}{{IF f}}{{ROW}}x|0{{END_ROW}}{{ELSE}}{{ROW}}b|3{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| p | 2 |\n| q | 2 |\n| b | 3 |") },
  { name: "cells with spaces and several nodes in a generated row", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=1}}{{ROW}}  ${{x}} is first | ${{@total}}  {{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a is first | 1 |") },
];

const CLOSE_ROWS: Row[] = [
  { name: "an unclosed item ends at END_FOR", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "an unclosed item ends at END_FOR with a static item after the FOR", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{x}}{{END_FOR}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. e") },
  { name: "an unclosed item ends at the ELSE of its FOR", tpl: "{{LIST}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{ELSE}}{{LIST_ITEM}}none{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. none") },
  { name: "the ELSE of a FOR that renders items is not rendered", tpl: "{{LIST}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}${{x}}{{ELSE}}{{LIST_ITEM}}none{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a") },
  { name: "an unclosed item ends at ELSEIF, ELSE and END_IF, sel=1", tpl: "{{LIST}}{{IF sel == 1}}{{LIST_ITEM}}one{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{ELSE}}{{LIST_ITEM}}other{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":1} }, want: OUT("1. one\n2. e") },
  { name: "an unclosed item ends at ELSEIF, ELSE and END_IF, sel=2", tpl: "{{LIST}}{{IF sel == 1}}{{LIST_ITEM}}one{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{ELSE}}{{LIST_ITEM}}other{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":2} }, want: OUT("1. two\n2. e") },
  { name: "an unclosed item ends at ELSEIF, ELSE and END_IF, sel=3", tpl: "{{LIST}}{{IF sel == 1}}{{LIST_ITEM}}one{{ELSEIF sel == 2}}{{LIST_ITEM}}two{{ELSE}}{{LIST_ITEM}}other{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"sel":3} }, want: OUT("1. other\n2. e") },
  { name: "several unclosed items in a branch end at END_IF", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{LIST_ITEM}}b{{LIST_ITEM}}c{{END_IF}}{{LIST_ITEM}}e{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c\n4. e") },
  { name: "the last unclosed item before END_IF in a branch", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{LIST_ITEM}}b{{END_IF}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "an unclosed item before END_LIST still ends there", tpl: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{LIST_ITEM}}b{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "an unclosed item before the next item still ends there", tpl: "{{LIST}}{{LIST_ITEM}}a{{LIST_ITEM}}b{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "an unclosed item with a condition and a fallback in a FOR", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM x != \"b\" | fallback=\"fb\"}}${{x}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. fb\n3. c") },
  { name: "an unclosed item followed by a FOR is that item's content", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. aabc") },
  { name: "an unclosed item followed by an IF is that item's content", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF t}}Y{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. aY") },
  { name: "an unclosed item in a FOR whose content is a FOR", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. pabc\n2. qabc") },
  { name: "an unclosed item in a FOR whose content is an IF", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{IF t}}!{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p!\n2. q!") },
  { name: "an ELSE inside the IF that is item content belongs to that IF", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{IF f}}!{{ELSE}}?{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p?\n2. q?") },
  { name: "an unclosed item whose content is an IF with ELSEIF, in an IF branch", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{IF f}}1{{ELSEIF t}}2{{ELSE}}3{{END_IF}}{{LIST_ITEM}}b{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a2\n2. b") },
  { name: "an unclosed item whose content is a nested LIST", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{LIST}}{{LIST_ITEM}}c1{{LIST_ITEM}}c2{{END_LIST}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. p\n   1. c1\n   2. c2\n2. q\n   1. c1\n   2. c2") },
  { name: "a ROW without END_ROW ends at END_FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |\n| c | 1 |") },
  { name: "a ROW without END_ROW ends at the ELSE of its FOR", tpl: "{{TABLE}}{{IF t}}{{FOR empty AS x}}{{ROW}}${{x}}|1{{ELSE}}{{ROW}}none|0{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| none | 0 |") },
  { name: "a ROW without END_ROW ends at ELSEIF, ELSE and END_IF, sel=1", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{IF sel == 1}}{{ROW}}one|1{{ELSEIF sel == 2}}{{ROW}}two|2{{ELSE}}{{ROW}}other|3{{END_IF}}{{ROW}}e|9{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"sel":1} }, want: OUT("| A | B |\n|:-----|:-----|\n| one | 1 |\n| e | 9 |") },
  { name: "a ROW without END_ROW ends at ELSEIF, ELSE and END_IF, sel=2", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{IF sel == 1}}{{ROW}}one|1{{ELSEIF sel == 2}}{{ROW}}two|2{{ELSE}}{{ROW}}other|3{{END_IF}}{{ROW}}e|9{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"sel":2} }, want: OUT("| A | B |\n|:-----|:-----|\n| two | 2 |\n| e | 9 |") },
  { name: "a ROW without END_ROW ends at ELSEIF, ELSE and END_IF, sel=3", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{IF sel == 1}}{{ROW}}one|1{{ELSEIF sel == 2}}{{ROW}}two|2{{ELSE}}{{ROW}}other|3{{END_IF}}{{ROW}}e|9{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"sel":3} }, want: OUT("| A | B |\n|:-----|:-----|\n| other | 3 |\n| e | 9 |") },
  { name: "several unclosed rows in an IF branch", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{ROW}}b|2{{ROW}}c|3{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 2 |\n| c | 3 |") },
  { name: "an unclosed row before END_TABLE and before the next ROW still end there", tpl: "{{TABLE}}{{ROW}}a|1{{ROW}}b|2{{ROW}}c|3{{END_ROW}}{{ROW}}d|4{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 2 |\n| c | 3 |\n| d | 4 |") },
  { name: "an unclosed row before END_FOR in a FOR inside an IF in a TABLE, after static rows", tpl: "{{TABLE}}{{ROW}}s|0{{END_ROW}}{{IF t}}{{FOR ys AS y}}{{ROW}}${{y}}|1{{END_FOR}}{{END_IF}}{{ROW}}e|9{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| s | 0 |\n| p | 1 |\n| q | 1 |\n| e | 9 |") },
  { name: "an unclosed row whose content is an IF, in a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}{{ROW}}${{y}}|{{IF t}}!{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| p | ! |\n| q | ! |") },
  { name: "an unclosed row in a FOR inside a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}{{FOR xs AS x limit=2}}{{ROW}}${{y}}|${{x}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| p | a |\n| p | b |\n| q | a |\n| q | b |") },
  { name: "a LIST_ITEM inside a FOR that is the content of an unclosed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}{{LIST_ITEM}}b{{END_FOR}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 38, undefined, "END_LIST_ITEM") },
  { name: "a LIST_ITEM inside an IF that is the content of an unclosed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF t}}{{LIST_ITEM}}b{{END_IF}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 31, undefined, "END_LIST_ITEM") },
  { name: "a LIST_ITEM inside a FOR that is the content of a closed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 38, undefined, "END_LIST_ITEM") },
  { name: "a LIST_ITEM inside an IF ELSE that is the content of a closed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF f}}x{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 40, undefined, "END_LIST_ITEM") },
  { name: "a LIST_ITEM inside the content of an unclosed item that sits in a generated FOR", tpl: "a\n{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{IF t}}\n  {{LIST_ITEM}}b{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("syntax-error", 3, 3, undefined, "END_LIST_ITEM") },
  { name: "a LIST_ITEM inside a FOR inside an IF that is the content of an unclosed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF t}}{{FOR xs AS x}}{{LIST_ITEM}}b{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 46, undefined, "END_LIST_ITEM") },
];

const COMMENT_ROWS: Row[] = [
  { name: "a comment directly in a LIST is allowed", tpl: "{{LIST}}{{# note #}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{# more #}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{# end #}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "a comment directly in a TABLE is allowed", tpl: "{{TABLE}}{{# note #}}{{ROW}}a|1{{END_ROW}}{{# more #}}{{ROW}}b|2{{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 2 |") },
  { name: "a comment among the children of a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{# one #}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{# two #}}{{ELSE}}{{# else #}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "a comment in the ELSE of a FOR that builds items", tpl: "{{LIST}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{# else #}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{# after #}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. none") },
  { name: "a comment among the branches of an IF that builds items", tpl: "{{LIST}}{{IF f}}{{# a #}}{{LIST_ITEM}}A{{END_LIST_ITEM}}{{ELSEIF f}}{{# b #}}{{LIST_ITEM}}B{{END_LIST_ITEM}}{{ELSE}}{{# c #}}{{LIST_ITEM}}C{{END_LIST_ITEM}}{{# d #}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. C") },
  { name: "a comment among the children of an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{# a #}}{{ROW}}a|1{{END_ROW}}{{# b #}}{{ELSE}}{{# c #}}{{ROW}}b|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "a comment in a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=2}}{{# one #}}{{ROW}}${{x}}|1{{END_ROW}}{{# two #}}{{ELSE}}{{# e #}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |") },
  { name: "a comment next to a HEADER in a TABLE", tpl: "{{TABLE}}{{# a #}}{{HEADER}}A|B{{END_HEADER}}{{# b #}}{{IF t}}{{ROW}}1|2{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|\n| 1 | 2 |") },
  { name: "whitespace and line breaks among the children of a FOR that builds items", tpl: "{{LIST}}\n  {{FOR xs AS x limit=2}}\n    {{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\n  \n  {{END_FOR}}\n  {{LIST_ITEM}}e{{END_LIST_ITEM}}\n{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. e") },
  { name: "whitespace and line breaks among the children of an IF that builds rows", tpl: "{{TABLE}}\n  {{IF t}}\n    {{ROW}}a|1{{END_ROW}}\n\t\n  {{ELSE}}\n    {{ROW}}b|2{{END_ROW}}\n  {{END_IF}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "a FOR directly in a TABLE keeps the text-row fallback", tpl: "{{TABLE}}{{FOR xs AS x}}${{x}}|${{@index0}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 0 |\n| b | 1 |\n| c | 2 |") },
  { name: "an IF of text in a direct TABLE FOR body keeps working", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF x == \"b\"}}B|y{{ELSE}}${{x}}|o{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | o |\n| B | y |\n| c | o |") },
  { name: "an IF with text in a direct FOR body is rendered and split, not an error", tpl: "{{TABLE}}{{FOR ys AS y}}{{IF t}}text ${{y}}|1{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| text p | 1 |\n| text q | 1 |") },
];

const LIMIT_ROWS: Row[] = [
  { name: "a FOR in a LIST: 4 nodes fit", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. a\n3. a"), limits: {"maxNodes":4} },
  { name: "a FOR in a LIST: 3 nodes cross at the last node", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-nodes", 1, 37), limits: {"maxNodes":3} },
  { name: "an IF in a LIST: 4 nodes fit", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a"), limits: {"maxNodes":4} },
  { name: "an IF in a LIST: 3 nodes cross at the last node", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-nodes", 1, 30), limits: {"maxNodes":3} },
  { name: "an IF with ELSE in a LIST: 6 nodes fit", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a"), limits: {"maxNodes":6} },
  { name: "an IF with ELSE in a LIST: 5 nodes cross at the last node", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-nodes", 1, 69), limits: {"maxNodes":5} },
  { name: "two FORs in a LIST: 7 nodes fit", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{FOR ys AS y}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. a\n3. a\n4. b\n5. b"), limits: {"maxNodes":7} },
  { name: "two FORs in a LIST: 6 nodes cross at the last node", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{FOR ys AS y}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-nodes", 1, 94), limits: {"maxNodes":6} },
  { name: "a FOR in an IF in a LIST: 5 nodes fit", tpl: "{{LIST}}{{IF t}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a\n2. a\n3. a"), limits: {"maxNodes":5} },
  { name: "a FOR in an IF in a LIST: 4 nodes cross at the last node", tpl: "{{LIST}}{{IF t}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-nodes", 1, 45), limits: {"maxNodes":4} },
  { name: "an IF in a TABLE: 4 nodes fit", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | b |"), limits: {"maxNodes":4} },
  { name: "an IF in a TABLE: 3 nodes cross at the last node", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-nodes", 1, 25), limits: {"maxNodes":3} },
  { name: "a FOR in an IF in a TABLE: 5 nodes fit", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| a | b |\n| a | b |"), limits: {"maxNodes":5} },
  { name: "a FOR in an IF in a TABLE: 4 nodes cross at the last node", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-nodes", 1, 40), limits: {"maxNodes":4} },
  { name: "an IF with ELSE in a TABLE: 6 nodes fit", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{ELSE}}{{ROW}}c|d{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | b |"), limits: {"maxNodes":6} },
  { name: "an IF with ELSE in a TABLE: 5 nodes cross at the last node", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{ELSE}}{{ROW}}c|d{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-nodes", 1, 54), limits: {"maxNodes":5} },
  { name: "a FOR directly in a TABLE keeps its count: 5 nodes fit", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| a | b |\n| a | b |"), limits: {"maxNodes":5} },
  { name: "a FOR directly in a TABLE keeps its count: 4 nodes cross at the last node", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: ERR("limit-nodes", 1, 32), limits: {"maxNodes":4} },
  { name: "a text FOR directly in a TABLE keeps its count: 4 nodes fit", tpl: "{{TABLE}}{{FOR xs AS x}}a|b{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| a | b |\n| a | b |"), limits: {"maxNodes":4} },
  { name: "a text FOR directly in a TABLE keeps its count: 3 nodes cross at the last node", tpl: "{{TABLE}}{{FOR xs AS x}}a|b{{END_FOR}}{{END_TABLE}}", data: D, want: ERR("limit-nodes", 1, 25), limits: {"maxNodes":3} },
  { name: "a FOR in a LIST: depth 2 is within the limit", tpl: "a\n  {{LIST}}\n    {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("a\n  1. a\n2. b\n3. c"), limits: {"maxDepth":2} },
  { name: "a FOR in a LIST: depth 1 crosses at the opening tag", tpl: "a\n  {{LIST}}\n    {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-depth", 3, 5), limits: {"maxDepth":1} },
  { name: "an IF in a LIST: depth 2 is within the limit", tpl: "a\n  {{LIST}}\n    {{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("a\n  1. a"), limits: {"maxDepth":2} },
  { name: "an IF in a LIST: depth 1 crosses at the opening tag", tpl: "a\n  {{LIST}}\n    {{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-depth", 3, 5), limits: {"maxDepth":1} },
  { name: "a FOR in an IF in a LIST: depth 3 is within the limit", tpl: "{{LIST}}{{IF t}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c"), limits: {"maxDepth":3} },
  { name: "a FOR in an IF in a LIST: depth 2 crosses at the opening tag", tpl: "{{LIST}}{{IF t}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-depth", 2, 3), limits: {"maxDepth":2} },
  { name: "a FOR in the ELSE of an IF in a LIST: depth 3 is within the limit", tpl: "{{LIST}}{{IF f}}{{ELSE}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c"), limits: {"maxDepth":3} },
  { name: "a FOR in the ELSE of an IF in a LIST: depth 2 crosses at the opening tag", tpl: "{{LIST}}{{IF f}}{{ELSE}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-depth", 2, 3), limits: {"maxDepth":2} },
  { name: "an IF in a FOR in an IF in a FOR in a LIST: depth 5 is within the limit", tpl: "{{LIST}}{{FOR ys AS y}}{{IF t}}{{FOR xs AS x}}\n  {{IF t}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c\n4. a\n5. b\n6. c"), limits: {"maxDepth":5} },
  { name: "an IF in a FOR in an IF in a FOR in a LIST: depth 4 crosses at the opening tag", tpl: "{{LIST}}{{FOR ys AS y}}{{IF t}}{{FOR xs AS x}}\n  {{IF t}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-depth", 2, 3), limits: {"maxDepth":4} },
  { name: "an IF in a TABLE: depth 2 is within the limit", tpl: "a\n  {{TABLE}}\n    {{IF t}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("a\n  | a | b |"), limits: {"maxDepth":2} },
  { name: "an IF in a TABLE: depth 1 crosses at the opening tag", tpl: "a\n  {{TABLE}}\n    {{IF t}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-depth", 3, 5), limits: {"maxDepth":1} },
  { name: "a FOR in an IF in a TABLE: depth 3 is within the limit", tpl: "{{TABLE}}{{IF t}}\n  {{FOR xs AS x}}{{ROW}}${{x}}|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| b | b |\n| c | b |"), limits: {"maxDepth":3} },
  { name: "a FOR in an IF in a TABLE: depth 2 crosses at the opening tag", tpl: "{{TABLE}}{{IF t}}\n  {{FOR xs AS x}}{{ROW}}${{x}}|b{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-depth", 2, 3), limits: {"maxDepth":2} },
  { name: "an IF in a FOR in an IF in a TABLE: depth 4 is within the limit", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}\n  {{IF t}}{{ROW}}${{x}}|b{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| b | b |\n| c | b |"), limits: {"maxDepth":4} },
  { name: "an IF in a FOR in an IF in a TABLE: depth 3 crosses at the opening tag", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}\n  {{IF t}}{{ROW}}${{x}}|b{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-depth", 2, 3), limits: {"maxDepth":3} },
  { name: "a FOR directly in a TABLE keeps its depth: depth 2 is within the limit", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | b |\n| a | b |\n| a | b |"), limits: {"maxDepth":2} },
  { name: "a FOR directly in a TABLE keeps its depth: depth 1 crosses at the opening tag", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: ERR("limit-depth", 1, 10), limits: {"maxDepth":1} },
  { name: "a LIST FOR over three items: 3 iterations fit", tpl: "a\n  {{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("a\n  1. a\n2. b\n3. c"), limits: {"maxIterations":3} },
  { name: "a LIST FOR over three items: 2 iterations cross at the FOR", tpl: "a\n  {{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-iterations", 2, 11), limits: {"maxIterations":2} },
  { name: "a LIST FOR with a window: 2 iterations fit", tpl: "a\n  {{LIST}}{{FOR xs AS x limit=2 offset=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("a\n  1. b\n2. c"), limits: {"maxIterations":2} },
  { name: "a LIST FOR with a window: 1 iterations cross at the FOR", tpl: "a\n  {{LIST}}{{FOR xs AS x limit=2 offset=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-iterations", 2, 11), limits: {"maxIterations":1} },
  { name: "a LIST FOR whose items are skipped by their own condition still iterates: 3 iterations fit", tpl: "{{LIST}}\n{{FOR xs AS x}}{{LIST_ITEM nope}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT(""), limits: {"maxIterations":3} },
  { name: "a LIST FOR whose items are skipped by their own condition still iterates: 2 iterations cross at the FOR", tpl: "{{LIST}}\n{{FOR xs AS x}}{{LIST_ITEM nope}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-iterations", 2, 1), limits: {"maxIterations":2} },
  { name: "a FOR in an IF in a LIST: 3 iterations fit", tpl: "{{LIST}}{{IF t}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c"), limits: {"maxIterations":3} },
  { name: "a FOR in an IF in a LIST: 2 iterations cross at the FOR", tpl: "{{LIST}}{{IF t}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", data: D, want: ERR("limit-iterations", 2, 3), limits: {"maxIterations":2} },
  { name: "an inner FOR in a FOR in a LIST (outer 2 plus inner 3 twice): 8 iterations fit", tpl: "{{LIST}}{{FOR ys AS y}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. pa\n2. pb\n3. pc\n4. qa\n5. qb\n6. qc"), limits: {"maxIterations":8} },
  { name: "an inner FOR in a FOR in a LIST (outer 2 plus inner 3 twice): 7 iterations cross at the FOR", tpl: "{{LIST}}{{FOR ys AS y}}\n  {{FOR xs AS x}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, want: ERR("limit-iterations", 2, 3), limits: {"maxIterations":7} },
  { name: "a FOR in an IF in a TABLE: 3 iterations fit", tpl: "a\n{{TABLE}}{{IF t}}\n  {{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("a\n| a | 1 |\n| b | 1 |\n| c | 1 |"), limits: {"maxIterations":3} },
  { name: "a FOR in an IF in a TABLE: 2 iterations cross at the FOR", tpl: "a\n{{TABLE}}{{IF t}}\n  {{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-iterations", 3, 3), limits: {"maxIterations":2} },
  { name: "a FOR in an IF in a TABLE with a window: 2 iterations fit", tpl: "{{TABLE}}{{IF t}}\n  {{FOR xs AS x offset=1}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| b | 1 |\n| c | 1 |"), limits: {"maxIterations":2} },
  { name: "a FOR in an IF in a TABLE with a window: 1 iterations cross at the FOR", tpl: "{{TABLE}}{{IF t}}\n  {{FOR xs AS x offset=1}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-iterations", 2, 3), limits: {"maxIterations":1} },
  { name: "an inner FOR in a FOR in an IF in a TABLE: 8 iterations fit", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}\n  {{FOR xs AS x}}{{ROW}}${{y}}|${{x}}{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| p | a |\n| p | b |\n| p | c |\n| q | a |\n| q | b |\n| q | c |"), limits: {"maxIterations":8} },
  { name: "an inner FOR in a FOR in an IF in a TABLE: 7 iterations cross at the FOR", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}\n  {{FOR xs AS x}}{{ROW}}${{y}}|${{x}}{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: ERR("limit-iterations", 2, 3), limits: {"maxIterations":7} },
  { name: "a FOR directly in a TABLE keeps counting: 3 iterations fit", tpl: "a\n{{TABLE}}  {{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("a\n| a | 1 |\n| b | 1 |\n| c | 1 |"), limits: {"maxIterations":3} },
  { name: "a FOR directly in a TABLE keeps counting: 2 iterations cross at the FOR", tpl: "a\n{{TABLE}}  {{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: ERR("limit-iterations", 2, 12), limits: {"maxIterations":2} },
];

const WS_ROWS: Row[] = [
  { name: "FOR and END_FOR tags on their own lines in a LIST (standalone)", tpl: "head\n{{LIST}}\n{{FOR xs AS x}}\n{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}\ntail", data: D, want: OUT("head\n1. a\n2. b\n3. c\ntail"), opts: {"standaloneLines":true} },
  { name: "IF, ELSEIF, ELSE and END_IF tags on their own lines in a LIST (standalone)", tpl: "head\n{{LIST}}\n{{IF sel == 1}}\n{{LIST_ITEM}}one{{END_LIST_ITEM}}\n{{ELSEIF sel == 2}}\n{{LIST_ITEM}}two{{END_LIST_ITEM}}\n{{ELSE}}\n{{LIST_ITEM}}other{{END_LIST_ITEM}}\n{{END_IF}}\n{{END_LIST}}\ntail", data: D, want: OUT("head\n1. two\ntail"), opts: {"standaloneLines":true} },
  { name: "FOR with an ELSE on its own lines in a LIST (standalone)", tpl: "{{LIST}}\n{{FOR empty AS x}}\n{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\n{{ELSE}}\n{{LIST_ITEM}}none{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}\n", data: D, want: OUT("1. none\n"), opts: {"standaloneLines":true} },
  { name: "unclosed items on their own lines in a FOR in a LIST (standalone)", tpl: "{{LIST}}\n{{FOR xs AS x}}\n{{LIST_ITEM}}${{x}}\n{{END_FOR}}\n{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c"), opts: {"standaloneLines":true} },
  { name: "tags on their own lines in a TABLE (standalone)", tpl: "{{TABLE}}\n{{HEADER}}A|B{{END_HEADER}}\n{{IF t}}\n{{ROW}}1|2{{END_ROW}}\n{{ELSE}}\n{{ROW}}3|4{{END_ROW}}\n{{END_IF}}\n{{FOR xs AS x}}\n{{ROW}}${{x}}|z{{END_ROW}}\n{{END_FOR}}\n{{END_TABLE}}\n", data: D, want: OUT("| A | B |\n|:-----|:-----|\n| 1 | 2 |\n| a | z |\n| b | z |\n| c | z |\n"), opts: {"standaloneLines":true} },
  { name: "a FOR inside an IF on their own lines in a TABLE (standalone)", tpl: "x\n{{TABLE}}\n{{IF t}}\n  {{FOR ys AS y}}\n  {{ROW}}${{y}}|1{{END_ROW}}\n  {{END_FOR}}\n{{END_IF}}\n{{END_TABLE}}\ny", data: D, want: OUT("x\n| p | 1 |\n| q | 1 |\ny"), opts: {"standaloneLines":true} },
  { name: "a FOR in an IF with ROW lines in a direct TABLE FOR (standalone)", tpl: "{{TABLE}}\n{{FOR xs AS x}}\n{{IF x != \"b\"}}\n{{ROW}}${{x}}|1{{END_ROW}}\n{{END_IF}}\n{{END_FOR}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| c | 1 |"), opts: {"standaloneLines":true} },
  { name: "the legacy direct TABLE FOR with a ROW body on its own lines (standalone)", tpl: "{{TABLE}}\n{{FOR xs AS x}}\n{{ROW}}${{x}}|1{{END_ROW}}\n{{END_FOR}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |\n| c | 1 |"), opts: {"standaloneLines":true} },
  { name: "unclosed rows on their own lines in an IF in a TABLE (standalone)", tpl: "{{TABLE}}\n{{IF t}}\n{{ROW}}a|1\n{{ROW}}b|2\n{{END_IF}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 2 |"), opts: {"standaloneLines":true} },
  { name: "FOR and END_FOR tags on their own lines in a LIST (no standalone)", tpl: "head\n{{LIST}}\n{{FOR xs AS x}}\n{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}\ntail", data: D, want: OUT("head\n1. a\n2. b\n3. c\ntail"), opts: {"standaloneLines":false} },
  { name: "IF, ELSEIF, ELSE and END_IF tags on their own lines in a LIST (no standalone)", tpl: "head\n{{LIST}}\n{{IF sel == 1}}\n{{LIST_ITEM}}one{{END_LIST_ITEM}}\n{{ELSEIF sel == 2}}\n{{LIST_ITEM}}two{{END_LIST_ITEM}}\n{{ELSE}}\n{{LIST_ITEM}}other{{END_LIST_ITEM}}\n{{END_IF}}\n{{END_LIST}}\ntail", data: D, want: OUT("head\n1. two\ntail"), opts: {"standaloneLines":false} },
  { name: "FOR with an ELSE on its own lines in a LIST (no standalone)", tpl: "{{LIST}}\n{{FOR empty AS x}}\n{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\n{{ELSE}}\n{{LIST_ITEM}}none{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}\n", data: D, want: OUT("1. none\n"), opts: {"standaloneLines":false} },
  { name: "tags on their own lines in a TABLE (no standalone)", tpl: "{{TABLE}}\n{{HEADER}}A|B{{END_HEADER}}\n{{IF t}}\n{{ROW}}1|2{{END_ROW}}\n{{ELSE}}\n{{ROW}}3|4{{END_ROW}}\n{{END_IF}}\n{{FOR xs AS x}}\n{{ROW}}${{x}}|z{{END_ROW}}\n{{END_FOR}}\n{{END_TABLE}}\n", data: D, want: OUT("| A | B |\n|:-----|:-----|\n| 1 | 2 |\n| a | z |\n| b | z |\n| c | z |\n"), opts: {"standaloneLines":false} },
  { name: "a FOR inside an IF on their own lines in a TABLE (no standalone)", tpl: "x\n{{TABLE}}\n{{IF t}}\n  {{FOR ys AS y}}\n  {{ROW}}${{y}}|1{{END_ROW}}\n  {{END_FOR}}\n{{END_IF}}\n{{END_TABLE}}\ny", data: D, want: OUT("x\n| p | 1 |\n| q | 1 |\ny"), opts: {"standaloneLines":false} },
  { name: "a FOR in an IF with ROW lines in a direct TABLE FOR (no standalone)", tpl: "{{TABLE}}\n{{FOR xs AS x}}\n{{IF x != \"b\"}}\n{{ROW}}${{x}}|1{{END_ROW}}\n{{END_IF}}\n{{END_FOR}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| c | 1 |"), opts: {"standaloneLines":false} },
  { name: "the legacy direct TABLE FOR with a ROW body on its own lines (no standalone)", tpl: "{{TABLE}}\n{{FOR xs AS x}}\n{{ROW}}${{x}}|1{{END_ROW}}\n{{END_FOR}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |\n| c | 1 |"), opts: {"standaloneLines":false} },
  { name: "trim markers on FOR and END_FOR beside items in a LIST", tpl: "{{LIST}}  {{- FOR xs AS x -}}  {{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}  {{- END_FOR -}}  {{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "trim markers on IF, ELSE and END_IF beside items in a LIST", tpl: "{{LIST}}\n  {{- IF f -}}\n  {{LIST_ITEM}}Y{{END_LIST_ITEM}}\n  {{- ELSE -}}\n  {{LIST_ITEM}}N{{END_LIST_ITEM}}\n  {{- END_IF -}}\n{{END_LIST}}", data: D, want: OUT("1. N") },
  { name: "a trim marker on END_FOR trims the end of an unclosed item", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{x}}  \n  {{- END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "without a trim marker the trailing spaces and break of an unclosed item are trimmed as in a closed item", tpl: "{{LIST}}{{FOR xs AS x limit=2}}{{LIST_ITEM}}${{x}}  \n  {{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b"), opts: {"standaloneLines":false} },
  { name: "a trim marker on END_IF trims the end of an unclosed item", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a  \n  {{- END_IF}}{{END_LIST}}", data: D, want: OUT("1. a") },
  { name: "a trim marker after a FOR tag trims the start of an unclosed row", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=2 -}}\n  {{ROW}}${{x}}|1  \n  {{- END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |") },
  { name: "a trim marker before a FOR in the content of an unclosed item trims the text before it", tpl: "{{LIST}}{{LIST_ITEM}}a  {{- FOR ys AS y}}${{y}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. apq") },
  { name: "without a trim marker the text before a FOR in an item keeps its spaces", tpl: "{{LIST}}{{LIST_ITEM}}a  {{FOR ys AS y}}${{y}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. a  pq") },
  { name: "a trim marker after END_FOR beside the next item", tpl: "{{LIST}}{{FOR ys AS y}}{{LIST_ITEM}}${{y}}{{END_FOR -}}  \n{{LIST_ITEM}}z{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. p\n2. q\n3. z") },
  { name: "trim markers on IF and END_IF around rows in a TABLE", tpl: "{{TABLE}}\n  {{- IF t -}}\n  {{ROW}}a|1{{END_ROW}}\n  {{- ELSE -}}\n  {{ROW}}b|2{{END_ROW}}\n  {{- END_IF -}}\n{{END_TABLE}}", data: D, want: OUT("| a | 1 |") },
  { name: "trim markers on a FOR inside an IF in a TABLE", tpl: "{{TABLE}}{{IF t}}  {{- FOR xs AS x limit=2 -}}  {{ROW}}${{x}}|1{{END_ROW}}  {{- END_FOR -}}  {{END_IF}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| b | 1 |") },
  { name: "CRLF line breaks around FOR and END_FOR in a LIST", tpl: "head\r\n{{LIST}}\r\n{{FOR xs AS x}}\r\n{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}\r\n{{END_FOR}}\r\n{{END_LIST}}\r\ntail", data: D, want: OUT("head\n1. a\n2. b\n3. c\ntail"), opts: {"standaloneLines":true} },
  { name: "CRLF line breaks around IF and ELSE in a TABLE", tpl: "{{TABLE}}\r\n{{IF f}}\r\n{{ROW}}1|2{{END_ROW}}\r\n{{ELSE}}\r\n{{ROW}}3|4{{END_ROW}}\r\n{{END_IF}}\r\n{{END_TABLE}}\r\n", data: D, want: OUT("| 3 | 4 |\n"), opts: {"standaloneLines":true} },
  { name: "an item's own spacing and lines are kept in a generated item", tpl: "{{LIST}}\n{{FOR xs AS x limit=2}}\n{{LIST_ITEM}}\n  ${{x}} text\n{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}", data: D, want: OUT("1. a text\n2. b text"), opts: {"standaloneLines":true} },
  { name: "an IF line inside an item's content in a generated LIST keeps the standalone rule", tpl: "{{LIST}}\n{{FOR xs AS x limit=2}}\n{{LIST_ITEM}}${{x}}\n{{IF t}}\nyes\n{{END_IF}}\n{{END_LIST_ITEM}}\n{{END_FOR}}\n{{END_LIST}}", data: D, want: OUT("1. a\nyes\n2. b\nyes"), opts: {"standaloneLines":true} },
  { name: "the standalone rule applies to a FOR line around a generated LIST", tpl: "x\n{{FOR ys AS y}}\n{{LIST}}\n{{LIST_ITEM}}${{y}}{{END_LIST_ITEM}}\n{{END_LIST}}\n{{END_FOR}}\ny", data: D, want: OUT("x\n1. p\n1. q\ny"), opts: {"standaloneLines":true} },
];

const COMPAT_ROWS: Row[] = [
  { name: "TABLE FOR with a ROW body and a header", tpl: "{{TABLE}}{{HEADER}}N|T{{END_HEADER}}{{FOR ps AS p}}{{ROW}}${{p}}|${{@index0}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"ps":["Ann","Bo"]} }, want: OUT("| N | T |\n|:-----|:-----|\n| Ann | 0 |\n| Bo | 1 |") },
  { name: "TABLE FOR with a text body", tpl: "{{TABLE}}{{FOR xs AS x}}${{x}}|${{@index0}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 0 |\n| b | 1 |\n| c | 2 |") },
  { name: "TABLE FOR with a text body of several lines", tpl: "{{TABLE}}{{FOR xs AS x}}${{x}}|1\n${{x}}|2\n{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| a | 2 |\n| b | 1 |\n| b | 2 |\n| c | 1 |\n| c | 2 |") },
  { name: "TABLE FOR with an IF of text in its body", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF x == \"y\"}}Y|y{{ELSE}}${{x}}|o{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"xs":["x","y","z"]} }, want: OUT("| x | o |\n| Y | y |\n| z | o |") },
  { name: "TABLE FOR with an IF of text and an ELSEIF", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF x == \"x\"}}X|1{{ELSEIF x == \"y\"}}Y|2{{ELSE}}${{x}}|3{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"xs":["x","y","z"]} }, want: OUT("| X | 1 |\n| Y | 2 |\n| z | 3 |") },
  { name: "TABLE with two FORs", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|a{{END_ROW}}{{END_FOR}}{{FOR ps AS p}}{{ROW}}${{p}}|b{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"ps":["Ann","Bo"]} }, want: OUT("| a | a |\n| b | a |\n| c | a |\n| Ann | b |\n| Bo | b |") },
  { name: "TABLE FOR with several ROWs in the body", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ROW}}${{x}}|2{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| a | 2 |\n| b | 1 |\n| b | 2 |\n| c | 1 |\n| c | 2 |") },
  { name: "TABLE FOR with a ROW and text in the body", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}${{x}}|2{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a | 1 |\n| a | 2 |\n| b | 1 |\n| b | 2 |\n| c | 1 |\n| c | 2 |") },
  { name: "TABLE FOR over a non-iterable object is silent in every mode", tpl: "{{TABLE}}{{FOR obj AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("") },
  { name: "TABLE FOR over null is silent in every mode", tpl: "{{TABLE}}{{FOR nul AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("") },
  { name: "TABLE FOR over a missing name: strict error, lenient nothing", tpl: "{{TABLE}}{{FOR nope AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: SL(ERR("missing-variable", 1, 10, "Variable 'nope' not found"), OUT("")) },
  { name: "TABLE FOR over an iterable with extra spaces in the tag", tpl: "{{TABLE}}{{FOR  xs  AS  m }}{{ROW}}${{m}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, want: OUT("| a |\n| b |\n| c |") },
  { name: "TABLE with spaces in header and row cells", tpl: "{{TABLE}}{{HEADER}} A | B {{END_HEADER}}{{ROW}} 1 | 2 {{END_ROW}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|\n| 1 | 2 |") },
  { name: "TABLE FOR nested FOR in a text body", tpl: "{{TABLE}}{{FOR ps AS p}}${{p}}|{{FOR ys AS y}}a${{p}}{{END_FOR}}|b{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"ps":["Ann"]} }, want: OUT("| Ann |  |\n| aAnnaAnn |  |\n|  | b |") },
  { name: "TABLE with an unclosed ROW before the next ROW", tpl: "{{TABLE}}{{ROW}}a|b{{ROW}}c|d{{END_TABLE}}", data: D, want: OUT("| a | b |\n| c | d |") },
  { name: "TABLE with unclosed rows and a header and different widths", tpl: "{{TABLE}}{{HEADER}}H1|H2{{END_HEADER}}{{ROW}}a{{ROW}}c|d|e{{END_TABLE}}", data: D, want: OUT("| H1 | H2 |  |\n|:-----|:-----|:-----|\n| a |  |  |\n| c | d | e |") },
  { name: "TABLE with a header only", tpl: "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{END_TABLE}}", data: D, want: OUT("| A | B |\n|:-----|:-----|") },
  { name: "TABLE FOR with an unclosed ROW is still a syntax error at END_FOR", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_FOR}}{{END_TABLE}}", data: D, want: ERR("syntax-error", 1, 40, "Unexpected token: END_FOR") },
  { name: "a LIST with conditions and fallbacks", tpl: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{LIST_ITEM t}}b{{END_LIST_ITEM}}{{LIST_ITEM f}}c{{END_LIST_ITEM}}{{LIST_ITEM f | fallback=\"fb\"}}d{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. fb") },
  { name: "a LIST with a missing condition name", tpl: "{{LIST}}{{LIST_ITEM nope}}a{{END_LIST_ITEM}}{{LIST_ITEM nope | fallback=\"fb\"}}b{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. fb") },
  { name: "a LIST with an unclosed item before the next item", tpl: "{{LIST}}{{LIST_ITEM}}a{{LIST_ITEM}}b{{END_LIST}}", data: D, want: OUT("1. a\n2. b") },
  { name: "a LIST with three unclosed items", tpl: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{LIST_ITEM}}b{{LIST_ITEM}}c{{END_LIST}}", data: D, want: OUT("1. a\n2. b\n3. c") },
  { name: "a nested LIST", tpl: "{{LIST}}{{LIST_ITEM}}p{{LIST}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_LIST}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. p\n   1. c") },
  { name: "a nested LIST in an unclosed item", tpl: "{{LIST}}{{LIST_ITEM}}p{{LIST}}{{LIST_ITEM}}c1{{LIST_ITEM}}c2{{END_LIST}}{{END_LIST}}", data: D, want: OUT("1. p\n   1. c1\n   2. c2") },
  { name: "a LIST with empty and multi-line items", tpl: "{{LIST}}{{LIST_ITEM}}{{END_LIST_ITEM}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{LIST_ITEM}}\nline1\nline2{{END_LIST_ITEM}}{{LIST_ITEM}}  a b  {{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. \n2. b\n3. line1\nline2\n4. a b") },
  { name: "a LIST item whose content is a FOR", tpl: "{{LIST}}{{LIST_ITEM}}{{FOR xs AS x}}${{x}},{{END_FOR}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. a,b,c,") },
  { name: "a LIST item whose content is an IF", tpl: "{{LIST}}{{LIST_ITEM}}{{IF t}}Y{{ELSE}}N{{END_IF}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. Y") },
  { name: "an unclosed LIST item whose content is a FOR", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}${{x}}{{END_FOR}}{{END_LIST}}", data: D, want: OUT("1. aabc") },
  { name: "an unclosed LIST item whose content is an IF", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF t}}Y{{END_IF}}{{END_LIST}}", data: D, want: OUT("1. aY") },
  { name: "an unclosed LIST item with a FOR content followed by an item", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}${{x}}{{END_FOR}}{{LIST_ITEM}}b{{END_LIST}}", data: D, want: OUT("1. aabc\n2. b") },
  { name: "a LIST inside a FOR", tpl: "{{FOR xs AS x}}{{LIST}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_LIST}}{{END_FOR}}", data: D, want: OUT("1. a1. b1. c") },
  { name: "a LIST inside an IF", tpl: "{{IF t}}{{LIST}}{{LIST_ITEM}}Y{{END_LIST_ITEM}}{{END_LIST}}{{END_IF}}", data: D, want: OUT("1. Y") },
  { name: "text directly in a LIST is a syntax error at the text", tpl: "{{LIST}}hi{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 9, "Unexpected text in LIST: \"hi\"") },
  { name: "a SECTION directly in a LIST is a syntax error", tpl: "{{LIST}}{{SECTION \"S\"}}x{{END_SECTION}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 9, "Unexpected token in LIST: SECTION") },
  { name: "a ROW directly in a LIST is a syntax error", tpl: "{{LIST}}{{ROW}}a|1{{END_ROW}}{{END_LIST}}", data: D, want: ERR("syntax-error", 1, 9, "Unexpected token in LIST: ROW") },
  { name: "a LIST_ITEM directly in a TABLE is a syntax error", tpl: "{{TABLE}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_TABLE}}", data: D, want: ERR("syntax-error", 1, 10, "Unexpected token in TABLE: LIST_ITEM") },
  { name: "an IF holding a ROW in a FOR outside any TABLE is unchanged", tpl: "{{FOR xs AS x}}{{IF t}}{{ROW}}${{x}}|1{{END_ROW}}{{END_IF}}{{END_FOR}}", data: D, want: OUT("") },
  { name: "a FOR with rows in a LIST_ITEM content", tpl: "{{LIST}}{{LIST_ITEM}}{{FOR xs AS x}}{{TABLE}}{{ROW}}${{x}}|1{{END_ROW}}{{END_TABLE}}{{END_FOR}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. | a | 1 || b | 1 || c | 1 |") },
  { name: "a TABLE inside a LIST item", tpl: "{{LIST}}{{LIST_ITEM}}t{{TABLE}}{{ROW}}a|1{{END_ROW}}{{END_TABLE}}{{END_LIST_ITEM}}{{END_LIST}}", data: D, want: OUT("1. t| a | 1 |") },
  { name: "a FOR with an ELSE and a window outside lists", tpl: "{{FOR xs AS x limit=2}}${{x}},{{ELSE}}none{{END_FOR}}", data: D, want: OUT("a,b,") },
];

const PIPE_ROWS: Row[] = [
  { name: "0 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a|b"} }, want: OUT("| a\\|b | x |") },
  { name: "1 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\|b"} }, want: OUT("| a\\|b | x |") },
  { name: "2 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "3 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "4 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\\\|b"} }, want: OUT("| a\\\\\\\\\\|b | x |") },
  { name: "5 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\\\\\|b"} }, want: OUT("| a\\\\\\\\\\|b | x |") },
  { name: "6 backslash(es) before a pipe in a ROW cell", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\\\\\\\|b"} }, want: OUT("| a\\\\\\\\\\\\\\|b | x |") },
  { name: "a pipe at the start of a value", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"|a"} }, want: OUT("| \\|a | x |") },
  { name: "a pipe at the end of a value", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a|"} }, want: OUT("| a\\| | x |") },
  { name: "two backslashes then a pipe at the end of a value", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"ab\\\\|"} }, want: OUT("| ab\\\\\\| | x |") },
  { name: "a pipe after two backslashes at the start of a cell value", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a \\\\|"} }, want: OUT("| a \\\\\\| | x |") },
  { name: "several pipes with mixed runs", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a|b\\\\|c\\|d\\\\\\\\|e"} }, want: OUT("| a\\|b\\\\\\|c\\|d\\\\\\\\\\|e | x |") },
  { name: "a value with a newline before the pipe", tpl: "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\nb\\\\|c"} }, want: OUT("| a b\\\\\\|c | x |") },
  { name: "a run of backslashes split across two values", tpl: "{{TABLE}}{{ROW}}${{v}}${{w}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\","w":"|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "an odd run split across two values", tpl: "{{TABLE}}{{ROW}}${{v}}${{w}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\","w":"|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "two backslashes before a pipe in the second cell", tpl: "{{TABLE}}{{ROW}}k|${{v}}{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| k | a\\\\\\|b |") },
  { name: "two backslashes before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:-----|:-----|\n| 1 | 2 |") },
  { name: "three backslashes before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:-----|:-----|\n| 1 | 2 |") },
  { name: "no backslash before a pipe in a header cell", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a|b"} }, want: OUT("| a\\|b | h |\n|:-----|:-----|\n| 1 | 2 |") },
  { name: "a pipe after two backslashes in a generated row of an IF", tpl: "{{TABLE}}{{IF t}}{{FOR vs AS v}}{{ROW}}${{v}}|x{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"vs":["a\\\\|b","a\\\\\\|b","a|b","a\\|b","a\\\\\\\\|b"]} }, want: OUT("| a\\\\\\|b | x |\n| a\\\\\\|b | x |\n| a\\|b | x |\n| a\\|b | x |\n| a\\\\\\\\\\|b | x |") },
  { name: "a pipe after two backslashes in a row of a direct TABLE FOR", tpl: "{{TABLE}}{{FOR vs AS v}}{{ROW}}${{v}}|x{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: { ...D, ...{"vs":["a\\\\|b","a\\\\\\|b"]} }, want: OUT("| a\\\\\\|b | x |\n| a\\\\\\|b | x |") },
  { name: "a pipe after two backslashes in a row from an IF branch", tpl: "{{TABLE}}{{IF f}}{{ROW}}n|n{{END_ROW}}{{ELSE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "a pipe after two backslashes in a row from a FOR with a window", tpl: "{{TABLE}}{{IF t}}{{FOR vs AS v limit=1 offset=1}}{{ROW}}${{v}}|${{@total}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"vs":["z","a\\\\|b","y"]} }, want: OUT("| a\\\\\\|b | 1 |") },
  { name: "a pipe after two backslashes in a cell that holds an IF", tpl: "{{TABLE}}{{ROW}}{{IF t}}${{v}}{{END_IF}}|x{{END_ROW}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | x |") },
  { name: "a pipe after two backslashes in a header cell of a table with generated rows", tpl: "{{TABLE}}{{HEADER}}${{v}}|h{{END_HEADER}}{{IF t}}{{FOR xs AS x limit=1}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("| a\\\\\\|b | h |\n|:-----|:-----|\n| a | 1 |") },
  { name: "a pipe after two backslashes in a list item is left as written (not a table cell)", tpl: "{{LIST}}{{LIST_ITEM}}${{v}}{{END_LIST_ITEM}}{{END_LIST}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("1. a\\\\|b") },
  { name: "a pipe after two backslashes in plain text is left as written", tpl: "${{v}}", data: { ...D, ...{"v":"a\\\\|b"} }, want: OUT("a\\\\|b") },
];

const SYNTAX_ROWS: SynRow[] = [
  { name: "text in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}hi{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 24, has: "Unexpected" },
  { name: "text after an item in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}tail{{END_FOR}}{{END_LIST}}", line: 1, col: 55, has: "Unexpected" },
  { name: "an output tag in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}${{x}}{{END_FOR}}{{END_LIST}}", line: 1, col: 55, has: "Unexpected" },
  { name: "a SECTION in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{SECTION \"S\"}}x{{END_SECTION}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 24, has: "Unexpected" },
  { name: "a ROW in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_LIST}}", line: 1, col: 24, has: "Unexpected" },
  { name: "a HEADER in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{HEADER}}a{{END_HEADER}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 24, has: "Unexpected" },
  { name: "a nested LIST in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}{{END_FOR}}{{END_LIST}}", line: 1, col: 24, has: "Unexpected" },
  { name: "a stray END_LIST_ITEM in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 55, has: "Unexpected" },
  { name: "text in the ELSE of a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}none{{END_FOR}}{{END_LIST}}", line: 1, col: 63, has: "Unexpected" },
  { name: "a tag in the ELSE of a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}${{y}}{{END_FOR}}{{END_LIST}}", line: 1, col: 63, has: "Unexpected" },
  { name: "text in an IF branch that builds items", tpl: "{{LIST}}{{IF t}}hi{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 17, has: "Unexpected" },
  { name: "text in an ELSEIF branch that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSEIF f}}hi{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 60, has: "Unexpected" },
  { name: "text in an ELSE branch that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}hi{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 56, has: "Unexpected" },
  { name: "an output tag in an IF branch that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}${{x}}{{END_IF}}{{END_LIST}}", line: 1, col: 48, has: "Unexpected" },
  { name: "a ROW in an ELSE branch that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_LIST}}", line: 1, col: 56, has: "Unexpected" },
  { name: "a SECTION in an ELSEIF branch that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSEIF f}}{{SECTION \"S\"}}x{{END_SECTION}}{{END_IF}}{{END_LIST}}", line: 1, col: 60, has: "Unexpected" },
  { name: "text in an IF inside a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}oops{{END_IF}}{{END_FOR}}{{END_LIST}}", line: 1, col: 63, has: "Unexpected" },
  { name: "text in a FOR inside an IF inside a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{IF t}}{{FOR ys AS y}}oops{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_FOR}}{{END_LIST}}", line: 1, col: 47, has: "Unexpected" },
  { name: "text in a branch that never renders", tpl: "{{LIST}}{{IF f}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}hi{{END_FOR}}{{END_IF}}{{END_LIST}}", line: 1, col: 63, has: "Unexpected" },
  { name: "a ROW in a FOR with no items", tpl: "{{LIST}}{{FOR empty AS x}}{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_LIST}}", line: 1, col: 27, has: "Unexpected" },
  { name: "text in a LIST FOR inside an item's content of a nested list is still reported", tpl: "{{LIST}}{{LIST_ITEM}}p{{LIST}}{{FOR xs AS x}}hi{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}{{END_LIST_ITEM}}{{END_LIST}}", line: 1, col: 46, has: "Unexpected" },
  { name: "text in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}hi{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 18, has: "Unexpected" },
  { name: "text after a row in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}tail{{END_IF}}{{END_TABLE}}", line: 1, col: 39, has: "Unexpected" },
  { name: "an output tag in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}${{x}}{{END_IF}}{{END_TABLE}}", line: 1, col: 39, has: "Unexpected" },
  { name: "a LIST_ITEM in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 18, has: "Unexpected" },
  { name: "a HEADER in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{HEADER}}A|B{{END_HEADER}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 18, has: "Unexpected" },
  { name: "a HEADER in an ELSE that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{HEADER}}A|B{{END_HEADER}}{{END_IF}}{{END_TABLE}}", line: 1, col: 47, has: "Unexpected" },
  { name: "a HEADER in a FOR in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{HEADER}}A|B{{END_HEADER}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 33, has: "Unexpected" },
  { name: "a SECTION in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{SECTION \"S\"}}x{{END_SECTION}}{{END_IF}}{{END_TABLE}}", line: 1, col: 18, has: "Unexpected" },
  { name: "text in an ELSEIF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSEIF f}}hi{{END_IF}}{{END_TABLE}}", line: 1, col: 51, has: "Unexpected" },
  { name: "text in an ELSE that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}hi{{END_IF}}{{END_TABLE}}", line: 1, col: 47, has: "Unexpected" },
  { name: "text in a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}hi{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 33, has: "Unexpected" },
  { name: "an output tag in a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|1{{END_ROW}}${{x}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 54, has: "Unexpected" },
  { name: "text in the ELSE of a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|1{{END_ROW}}{{ELSE}}none{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 62, has: "Unexpected" },
  { name: "a LIST_ITEM in a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 33, has: "Unexpected" },
  { name: "text in an IF inside a FOR inside an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{IF t}}{{ROW}}a|1{{END_ROW}}oops{{END_IF}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 62, has: "Unexpected" },
  { name: "text in an IF that builds rows that never renders", tpl: "{{TABLE}}{{IF f}}hi{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 18, has: "Unexpected" },
  { name: "text in a FOR inside an IF that builds rows with no items", tpl: "{{TABLE}}{{IF t}}{{FOR empty AS x}}hi{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 36, has: "Unexpected" },
  { name: "a second ELSE in an IF that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 87 },
  { name: "a second ELSE in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{ELSE}}{{ROW}}c|3{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 68 },
  { name: "a second ELSE in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 94 },
  { name: "a second ELSE in a FOR inside an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{ELSE}}{{ROW}}c|3{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", line: 1, col: 83 },
  { name: "an ELSEIF after the ELSE of an IF that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{ELSEIF f}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 87 },
  { name: "an ELSEIF after the ELSE of an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSE}}{{ROW}}b|2{{END_ROW}}{{ELSEIF f}}{{ROW}}c|3{{END_ROW}}{{END_IF}}{{END_TABLE}}", line: 1, col: 68 },
  { name: "an ELSEIF directly in a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSEIF f}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 55 },
  { name: "an ELSEIF after the ELSE of a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{ELSEIF f}}{{LIST_ITEM}}c{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 94 },
  { name: "an END_FOR that closes an IF that builds items", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", line: 1, col: 48 },
  { name: "an END_IF that closes a FOR that builds items", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 55 },
  { name: "an END_FOR that closes an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", line: 1, col: 39 },
  { name: "an END_IF that closes a FOR in an IF that builds rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|1{{END_ROW}}{{END_IF}}{{END_IF}}{{END_TABLE}}", line: 1, col: 54 },
  { name: "an END_IF with no IF in a LIST", tpl: "{{LIST}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", line: 1, col: 40 },
  { name: "an END_FOR with no FOR in a TABLE", tpl: "{{TABLE}}{{ROW}}a|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", line: 1, col: 31 },
  { name: "text directly in a LIST keeps its message", tpl: "{{LIST}}hi{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}", line: 1, col: 9, has: "Unexpected text in LIST" },
  { name: "a SECTION directly in a LIST keeps its message", tpl: "{{LIST}}{{SECTION \"S\"}}x{{END_SECTION}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}", line: 1, col: 9, has: "Unexpected token in LIST" },
  { name: "a ROW directly in a LIST keeps its message", tpl: "{{LIST}}{{ROW}}a|1{{END_ROW}}{{END_LIST}}", line: 1, col: 9, has: "Unexpected token in LIST" },
  { name: "a LIST_ITEM directly in a TABLE keeps its message", tpl: "{{TABLE}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_TABLE}}", line: 1, col: 10, has: "Unexpected token in TABLE" },
  { name: "a SECTION directly in a TABLE keeps its message", tpl: "{{TABLE}}{{SECTION \"S\"}}x{{END_SECTION}}{{END_TABLE}}", line: 1, col: 10, has: "Unexpected token in TABLE" },
];

const ANALYZE_ROWS: AnalyzeRow[] = [
  { name: "a FOR in a LIST: the loop name is scoped over the item and its condition", tpl: "{{LIST}}{{FOR xs AS x limit=n}}{{LIST_ITEM x.ok | fallback=\"f\"}}${{x.name}} ${{y}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", usedIn: {"xs":["for"],"n":["for"],"y":["output"]}, blocks: {"LIST":1,"FOR":1} },
  { name: "an IF in a LIST: conditions and items", tpl: "{{LIST}}{{IF a}}{{LIST_ITEM}}${{p}}{{END_LIST_ITEM}}{{ELSEIF b}}{{LIST_ITEM c}}${{q}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}${{r}}{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", usedIn: {"a":["if"],"b":["elseif"],"c":["list_item"],"p":["output"],"q":["output"],"r":["output"]}, blocks: {"LIST":1,"IF":1} },
  { name: "an IF in a TABLE: conditions and cells", tpl: "{{TABLE}}{{IF a}}{{ROW}}${{p}}|${{q}}{{END_ROW}}{{ELSE}}{{ROW}}${{r}}{{END_ROW}}{{END_IF}}{{END_TABLE}}", usedIn: {"a":["if"],"p":["table"],"q":["table"],"r":["table"]}, blocks: {"TABLE":1,"IF":1} },
  { name: "a FOR in an IF in a TABLE: iterable, window and cells", tpl: "{{TABLE}}{{HEADER}}${{h}}|B{{END_HEADER}}{{IF a}}{{FOR ps AS p limit=n offset=m}}{{ROW}}${{p.name}}|${{k}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", usedIn: {"h":["table"],"a":["if"],"ps":["for"],"n":["for"],"m":["for"],"k":["table"]}, blocks: {"TABLE":1,"IF":1,"FOR":1} },
  { name: "the loop name is not scoped in the ELSE items of a FOR in a LIST", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", usedIn: {"xs":["for"],"x":["output"]}, blocks: {"LIST":1,"FOR":1} },
  { name: "the loop name is not scoped in the ELSE rows of a FOR in an IF in a TABLE", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}${{x}}|2{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", usedIn: {"t":["if"],"xs":["for"],"x":["table"]}, blocks: {"TABLE":1,"IF":1,"FOR":1} },
  { name: "a nested FOR reads the outer loop name in its iterable", tpl: "{{LIST}}{{FOR ys AS y}}{{FOR y.items AS i}}{{LIST_ITEM}}${{y.name}}${{i}}${{z}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", usedIn: {"ys":["for"],"z":["output"]}, blocks: {"LIST":1,"FOR":2} },
  { name: "an inner loop name is scoped in an IF inside a FOR inside a LIST", tpl: "{{LIST}}{{FOR xs AS x}}{{IF x.on}}{{LIST_ITEM x.show}}${{x.name}}${{w}}{{END_LIST_ITEM}}{{END_IF}}{{END_FOR}}{{END_LIST}}", usedIn: {"xs":["for"],"w":["output"]}, blocks: {"LIST":1,"FOR":1,"IF":1} },
  { name: "a variable read only in a generated item is an input", tpl: "{{LIST}}{{IF a}}{{FOR xs AS x}}{{LIST_ITEM}}${{only_here}}{{END_LIST_ITEM}}{{END_FOR}}{{END_IF}}{{END_LIST}}", usedIn: {"a":["if"],"xs":["for"],"only_here":["output"]}, blocks: {"LIST":1,"IF":1,"FOR":1} },
  { name: "the same name used as condition and item output lists both kinds", tpl: "{{LIST}}{{IF a}}{{LIST_ITEM}}${{a}}{{END_LIST_ITEM}}{{END_IF}}{{LIST_ITEM a}}z{{END_LIST_ITEM}}{{END_LIST}}", usedIn: {"a":["if","list_item","output"]}, blocks: {"LIST":1,"IF":1} },
  { name: "the same name used as an IF condition and cell in a TABLE lists both kinds", tpl: "{{TABLE}}{{IF a}}{{ROW}}${{a}}|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", usedIn: {"a":["if","table"]}, blocks: {"TABLE":1,"IF":1} },
  { name: "a FOR directly in a TABLE with a text body keeps its kinds", tpl: "{{TABLE}}{{FOR ps AS p limit=n}}${{p}}|${{q}}{{END_FOR}}{{END_TABLE}}", usedIn: {"ps":["for"],"n":["for"],"q":["table"]}, blocks: {"TABLE":1,"FOR":1} },
  { name: "a FOR directly in a TABLE with a ROW body keeps its kinds", tpl: "{{TABLE}}{{FOR ps AS p}}{{ROW}}${{p}}|${{q}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}", usedIn: {"ps":["for"],"q":["table"]}, blocks: {"TABLE":1,"FOR":1} },
  { name: "an IF in a FOR directly in a TABLE", tpl: "{{TABLE}}{{FOR ps AS p}}{{IF p.on}}{{ROW}}${{p.name}}|${{q}}{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_TABLE}}", usedIn: {"ps":["for"],"q":["table"]}, blocks: {"TABLE":1,"FOR":1,"IF":1} },
  { name: "a LIST with items only keeps its kinds", tpl: "{{LIST}}{{LIST_ITEM show | fallback=\"none\"}}A{{END_LIST_ITEM}}{{END_LIST}}", usedIn: {"show":["list_item"]}, blocks: {"LIST":1} },
];

// =====================================================================================
// golden cases
// =====================================================================================

function goldenCase(name: string): { count: number; message: string } {
  const casesDir = path.join(__dirname, "..", "golden", "render-cases");
  const only = fs.mkdtempSync(path.join(os.tmpdir(), "tr-gold-"));
  try {
    const src = path.join(casesDir, name);
    const dst = path.join(only, name);
    fs.mkdirSync(dst);
    for (const f of ["template.md", "data.json", "options.json", "expected.md"]) {
      check(fs.existsSync(path.join(src, f)), `the case folder ${name} holds ${f}`).toBe(true);
      fs.copyFileSync(path.join(src, f), path.join(dst, f));
    }
    const results = runGoldenCases(
      only,
      (template, data, options) => {
        const r = render(template, data, options);
        if (!r.ok) throw new Error(`render failed: ${r.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`);
        return r.output;
      },
      { update: false }
    );
    return { count: results.length, message: results[0]?.message ?? "no result" };
  } finally {
    fs.rmSync(only, { recursive: true, force: true });
  }
}

// =====================================================================================
// lc-list
// =====================================================================================

describe("lc-list: FOR and IF build numbered items", () => {
  it.each(expand(LIST_ROWS))("lc-list: [$entry] $name", ({ entry, r }) => verify(entry, r, "lc-list"));

  const printed: Array<{ name: string; tpl: string; data: Record<string, any> }> = [];
  for (const [label, bad] of [["a cyclic value", cyc], ["a BigInt", big]] as Array<[string, any]>) {
    printed.push({ name: `${label} printed in an item of a FOR`, tpl: "a\n{{LIST}}{{FOR vs AS v}}{{LIST_ITEM}}x§${{v}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { vs: [bad] } });
    printed.push({ name: `${label} printed in an item of an IF`, tpl: "a\n{{LIST}}{{IF t}}{{LIST_ITEM}}x§${{v}}{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: { t: true, v: bad } });
    printed.push({ name: `${label} printed in an ELSE item of a FOR`, tpl: "a\n{{LIST}}{{FOR empty AS e}}{{LIST_ITEM}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}x§${{v}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { empty: [], v: bad } });
  }
  const printedCases = printed.flatMap((p) => ENTRIES.map((entry) => ({ entry, ...p })));
  it.each(printedCases)("lc-list: [$entry] $name is a type-error located at the printing tag", (c) => {
    const m = marked(c.tpl);
    const o = run(c.entry, m.tpl, c.data);
    verifyOutcome(o, ERR("type-error", m.line, m.col), `lc-list [${c.entry}] ${c.name}`);
  });

  it("lc-list: a value that is cyclic but never printed does not fail a generated item", () => {
    for (const entry of ENTRIES) {
      const o = run(entry, "{{LIST}}{{FOR vs AS v limit=1 offset=1}}{{LIST_ITEM}}ok{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", { vs: [cyc, "b"] });
      check(o.output, `${entry}: the skipped cyclic item is never printed`).toBe("1. ok");
    }
  });

  it("lc-list: golden case lang-list-for renders to its expected file", () => {
    const g = goldenCase("lang-list-for");
    check(g.count, "one golden case ran").toBe(1);
    check(g.message, "the case renders to expected.md").toBe("");
  });
});

// =====================================================================================
// lc-table
// =====================================================================================

describe("lc-table: IF builds rows and FOR and IF nest in it", () => {
  it.each(expand(TABLE_ROWS))("lc-table: [$entry] $name", ({ entry, r }) => verify(entry, r, "lc-table"));

  const printed: Array<{ name: string; tpl: string; data: Record<string, any> }> = [];
  for (const [label, bad] of [["a cyclic value", cyc], ["a BigInt", big]] as Array<[string, any]>) {
    printed.push({ name: `${label} printed in a cell of a row from an IF`, tpl: "a\n{{TABLE}}{{IF t}}{{ROW}}x§${{v}}|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { t: true, v: bad } });
    printed.push({ name: `${label} printed in a cell of a row from a FOR in an IF`, tpl: "a\n{{TABLE}}{{IF t}}{{FOR vs AS v}}{{ROW}}x§${{v}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { t: true, vs: [bad] } });
    printed.push({ name: `${label} printed in an ELSE row`, tpl: "a\n{{TABLE}}{{IF f}}{{ROW}}a|b{{END_ROW}}{{ELSE}}{{ROW}}x§${{v}}|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { f: false, v: bad } });
  }
  const printedCases = printed.flatMap((p) => ENTRIES.map((entry) => ({ entry, ...p })));
  it.each(printedCases)("lc-table: [$entry] $name is a type-error located at the printing tag", (c) => {
    const m = marked(c.tpl);
    const o = run(c.entry, m.tpl, c.data);
    verifyOutcome(o, ERR("type-error", m.line, m.col), `lc-table [${c.entry}] ${c.name}`);
  });

  it("lc-table: golden case lang-table-if renders to its expected file", () => {
    const g = goldenCase("lang-table-if");
    check(g.count, "one golden case ran").toBe(1);
    check(g.message, "the case renders to expected.md").toBe("");
  });
});

// =====================================================================================
// lc-close
// =====================================================================================

describe("lc-close: where an unclosed item or row ends", () => {
  const rows = CLOSE_ROWS;
  it.each(expand(rows))("lc-close: [$entry] $name", ({ entry, r }) => verify(entry, r, "lc-close"));

  const itemSug: Array<{ name: string; tpl: string }> = [
    { name: "a LIST_ITEM in a FOR in the content of an unclosed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{FOR xs AS x}}§{{LIST_ITEM}}b{{END_FOR}}{{END_LIST}}" },
    { name: "a LIST_ITEM in an IF in the content of an unclosed item", tpl: "{{LIST}}{{LIST_ITEM}}a{{IF t}}§{{LIST_ITEM}}b{{END_IF}}{{END_LIST}}" },
  ];
  it.each(itemSug.flatMap((s) => (["validate", "analyze"] as const).map((kind) => ({ kind, ...s }))))("lc-close: [$kind] $name is a syntax-error that says to close the item with END_LIST_ITEM", (c) => {
    const m = marked(c.tpl);
    verifyOutcome(runStatic(c.kind, m.tpl), ERR("syntax-error", m.line, m.col, undefined, "END_LIST_ITEM"), `lc-close ${c.kind} ${c.name}`);
  });
});

// =====================================================================================
// lc-errors
// =====================================================================================

describe("lc-errors: anything else in a FOR or IF that builds items or rows is a syntax-error", () => {
  const SYN: SynRow[] = SYNTAX_ROWS;
  const runCases = SYN.flatMap((s) => ENTRIES.map((entry) => ({ entry, s })));
  it.each(runCases)("lc-errors: [$entry] $s.name is a syntax-error at its own position", ({ entry, s }) => {
    const o = run(entry, s.tpl, D);
    verifyOutcome(o, ERR("syntax-error", s.line, s.col, s.has), `lc-errors [${entry}] ${s.name}`);
  });
  const staticCases = SYN.flatMap((s) => (["validate", "analyze"] as const).map((kind) => ({ kind, s })));
  it.each(staticCases)("lc-errors: [$kind] $s.name is reported as a syntax-error at its own position", ({ kind, s }) => {
    verifyOutcome(runStatic(kind, s.tpl), ERR("syntax-error", s.line, s.col, s.has), `lc-errors ${kind} ${s.name}`);
  });

  const UNTERMINATED: Array<{ name: string; tpl: string }> = [
    { name: "an IF in a LIST closed by END_LIST", tpl: "a\n  {{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}" },
    { name: "a FOR in a LIST closed by END_LIST", tpl: "a\n  {{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{END_LIST}}" },
    { name: "an unclosed item in an IF in a LIST closed by END_LIST", tpl: "a\n  {{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST}}" },
    { name: "an IF in a TABLE closed by END_TABLE", tpl: "a\n  {{TABLE}}{{IF t}}{{ROW}}a|b{{END_ROW}}{{END_TABLE}}" },
    { name: "a FOR in an IF in a TABLE closed by END_IF", tpl: "a\n  {{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}{{END_IF}}{{END_TABLE}}" },
    { name: "an IF in a LIST that runs to the end of the template", tpl: "a\n  {{LIST}}{{IF t}}" },
    { name: "a FOR in a TABLE IF that runs to the end of the template", tpl: "a\n  {{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}a|b{{END_ROW}}" },
  ];
  it.each(UNTERMINATED.flatMap((u) => ENTRIES.map((entry) => ({ entry, ...u }))))("lc-errors: [$entry] $name is a located syntax-error", (c) => {
    verifyOutcome(run(c.entry, c.tpl, D), LOC("syntax-error"), `lc-errors [${c.entry}] ${c.name}`);
  });
  it.each(UNTERMINATED.flatMap((u) => (["validate", "analyze"] as const).map((kind) => ({ kind, ...u }))))("lc-errors: [$kind] $name is a located syntax-error", (c) => {
    verifyOutcome(runStatic(c.kind, c.tpl), LOC("syntax-error"), `lc-errors ${c.kind} ${c.name}`);
  });

  it.each(expand(COMMENT_ROWS))("lc-errors: [$entry] $name", ({ entry, r }) => verify(entry, r, "lc-errors"));

  const valid: Array<{ name: string; tpl: string }> = [
    { name: "a FOR in a LIST with comments", tpl: "{{LIST}}{{# a #}}{{FOR xs AS x limit=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{# e #}}{{END_FOR}}{{END_LIST}}" },
    { name: "an IF in a TABLE with ELSEIF", tpl: "{{TABLE}}{{IF t}}{{ROW}}a|1{{END_ROW}}{{ELSEIF f}}{{ROW}}b|2{{END_ROW}}{{ELSE}}{{ROW}}c|3{{END_ROW}}{{END_IF}}{{END_TABLE}}" },
    { name: "a FOR in a FOR in an IF in a TABLE", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}{{FOR xs AS x}}{{ROW}}${{y}}|${{x}}{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}" },
  ];
  it.each(valid.flatMap((v) => (["validate", "analyze"] as const).map((kind) => ({ kind, ...v }))))("lc-errors: [$kind] $name is valid", (c) => {
    check(runStatic(c.kind, c.tpl).code, `${c.kind}: ${c.name} is valid syntax`).toBe("ok");
  });
});

// =====================================================================================
// lc-limits
// =====================================================================================

describe("lc-limits: FOR and IF in LIST and TABLE are counted and bounded", () => {
  it.each(expand(LIMIT_ROWS))("lc-limits: [$entry] $name", ({ entry, r }) => verify(entry, r, "lc-limits"));

  const stats: Array<{ name: string; tpl: string; data: Record<string, any>; n: number }> = [
    { name: "a LIST FOR counts every item", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, n: 3 },
    { name: "a LIST FOR with a window counts the rendered items", tpl: "{{LIST}}{{FOR xs AS x limit=2 offset=1}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, n: 2 },
    { name: "an item skipped by its own condition still counts as an iteration", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM nope}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, n: 3 },
    { name: "the ELSE items of a LIST FOR are not iterations", tpl: "{{LIST}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}none{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, n: 0 },
    { name: "an IF in a LIST adds no iteration", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}a{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}b{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: D, n: 0 },
    { name: "a nested FOR in a LIST adds up (2 plus 2 times 3)", tpl: "{{LIST}}{{FOR ys AS y}}{{FOR xs AS x}}{{LIST_ITEM}}${{y}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_FOR}}{{END_LIST}}", data: D, n: 8 },
    { name: "two FORs in a LIST add up", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{FOR ys AS y limit=1}}{{LIST_ITEM}}${{y}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: D, n: 4 },
    { name: "a FOR in an IF in a TABLE counts the rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, n: 3 },
    { name: "a FOR in an IF in a TABLE with a window counts the rendered rows", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x limit=2}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, n: 2 },
    { name: "the ELSE rows of a FOR in an IF in a TABLE are not iterations", tpl: "{{TABLE}}{{IF t}}{{FOR empty AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{ELSE}}{{ROW}}none|0{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, n: 0 },
    { name: "a nested FOR in an IF in a TABLE adds up", tpl: "{{TABLE}}{{IF t}}{{FOR ys AS y}}{{FOR xs AS x}}{{ROW}}${{y}}|${{x}}{{END_ROW}}{{END_FOR}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: D, n: 8 },
    { name: "a FOR directly in a TABLE keeps counting its rows", tpl: "{{TABLE}}{{FOR xs AS x}}{{ROW}}${{x}}|1{{END_ROW}}{{END_FOR}}{{END_TABLE}}", data: D, n: 3 },
    { name: "an IF row in a FOR directly in a TABLE counts the FOR iterations", tpl: "{{TABLE}}{{FOR xs AS x}}{{IF t}}{{ROW}}${{x}}|1{{END_ROW}}{{END_IF}}{{END_FOR}}{{END_TABLE}}", data: D, n: 3 },
  ];
  it.each(stats)("lc-limits: stats.iterations $name", (c) => {
    const r = render(c.tpl, c.data, { strictMode: true });
    check(r.ok, `render is ok (${r.diagnostics.map((d) => d.code).join(",")})`).toBe(true);
    check(r.stats.iterations, `stats.iterations is ${c.n}`).toBe(c.n);
  });

  const many = Array.from({ length: 40 }, (_, i) => `entry${i}`);
  const outRows: Array<{ name: string; tpl: string; data: Record<string, any>; limit: number }> = [
    { name: "items of a FOR in a LIST", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}} and some more text{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { xs: many }, limit: 200 },
    { name: "ELSE items of a FOR in a LIST", tpl: "{{LIST}}{{FOR empty AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{ELSE}}{{LIST_ITEM}}" + "0123456789".repeat(20) + "{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { empty: [] }, limit: 100 },
    { name: "items of an IF in a LIST", tpl: "{{LIST}}{{IF t}}{{LIST_ITEM}}" + "0123456789".repeat(20) + "{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: { t: true }, limit: 100 },
    { name: "rows of a FOR in an IF in a TABLE", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|and some more text{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { t: true, xs: many }, limit: 200 },
    { name: "rows of an IF in a TABLE", tpl: "{{TABLE}}{{IF t}}{{ROW}}" + "0123456789".repeat(20) + "|b{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { t: true }, limit: 100 },
  ];
  it.each(outRows.flatMap((o) => ENTRIES.map((entry) => ({ entry, ...o }))))("lc-limits: [$entry] maxOutputChars is enforced for the $name", (c) => {
    verifyOutcome(run(c.entry, c.tpl, c.data, { maxOutputChars: c.limit }), CODE("limit-output"), `lc-limits [${c.entry}] ${c.name} over ${c.limit}`);
    check(run(c.entry, c.tpl, c.data, { maxOutputChars: 100000 }).code, `lc-limits [${c.entry}] ${c.name}: renders under a large limit`).toBe("ok");
  });

  it("lc-limits: render reports a limit located at its node and never at 1:1", () => {
    const tpl = "a\n  {{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}";
    const r = render(tpl, D, { strictMode: true, limits: { maxIterations: 1 } });
    check(r.ok, "render is not ok").toBe(false);
    const d = r.diagnostics[0];
    check({ code: d.code, line: d.line, column: d.column }, "limit-iterations at the FOR").toEqual({ code: "limit-iterations", line: 2, column: 11 });
    check(r.stats.iterations <= 3, "iterations stay bounded by the items").toBe(true);
  });
});

// =====================================================================================
// lc-ws
// =====================================================================================

describe("lc-ws: standalone lines and trim markers on FOR, IF, ELSE and END tags in LIST and TABLE", () => {
  it.each(expand(WS_ROWS))("lc-ws: [$entry] $name", ({ entry, r }) => verify(entry, r, "lc-ws"));
});

// =====================================================================================
// lc-analyze
// =====================================================================================

describe("lc-analyze: analyze visits generated items and rows", () => {
  function analyzed(tpl: string) {
    const o = runStatic("analyze", tpl);
    check(o.code, `analyze accepts the template (got ${o.code} ${o.line}:${o.column} ${o.message ?? ""})`).toBe("ok");
    return analyze(tpl);
  }
  function usage(tpl: string) {
    const a = analyzed(tpl);
    const used: Record<string, string[]> = {};
    for (const v of a.variables) used[v.name] = [...v.usedIn].sort();
    return { used, blocks: a.blocks, diagnostics: a.diagnostics };
  }
  it.each(ANALYZE_ROWS)("lc-analyze: $name", (row) => {
    const u = usage(row.tpl);
    check(u.diagnostics.length, `lc-analyze: ${row.name}: no diagnostics (${u.diagnostics.map((d: any) => d.message).join("; ")})`).toBe(0);
    const want: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(row.usedIn)) want[k] = [...v].sort();
    check(u.used, `lc-analyze: ${row.name}: the inputs and the kinds they are used in`).toEqual(want);
    check(u.blocks, `lc-analyze: ${row.name}: the block counts`).toEqual(row.blocks);
  });

  const agree: Array<{ name: string; tpl: string; data: Record<string, any>; input: string }> = [
    { name: "a name read only in a generated item", tpl: "{{LIST}}{{FOR xs AS x}}{{LIST_ITEM}}${{x}} ${{only_here}}{{END_LIST_ITEM}}{{END_FOR}}{{END_LIST}}", data: { xs: ["a"] }, input: "only_here" },
    { name: "a name read only in an ELSE item", tpl: "{{LIST}}{{IF f}}{{LIST_ITEM}}A{{ELSE}}{{LIST_ITEM}}${{late}}{{END_LIST_ITEM}}{{END_IF}}{{END_LIST}}", data: { f: false }, input: "late" },
    { name: "a name read only in a generated row", tpl: "{{TABLE}}{{IF t}}{{ROW}}${{only_here}}|1{{END_ROW}}{{END_IF}}{{END_TABLE}}", data: { t: true }, input: "only_here" },
    { name: "a name read in a row of a FOR in an IF", tpl: "{{TABLE}}{{IF t}}{{FOR xs AS x}}{{ROW}}${{x}}|${{only_here}}{{END_ROW}}{{END_FOR}}{{END_IF}}{{END_TABLE}}", data: { t: true, xs: ["a"] }, input: "only_here" },
  ];
  it.each(agree.flatMap((a) => (["render", "resolve"] as const).map((m) => ({ m, ...a }))))("lc-analyze: [$m] $name is an input that render also asks for", (c) => {
    const names = analyzed(c.tpl).variables.map((v) => v.name);
    check(names, `analyze lists ${c.input} as an input`).toContain(c.input);
    const entry: Entry = c.m === "render" ? "render-strict" : "resolve-strict";
    const without = run(entry, c.tpl, c.data);
    check(without.code, `${c.m}: without ${c.input} the strict run asks for it`).toBe("missing-variable");
    check(without.message ?? "", `${c.m}: the missing name is ${c.input}`).toContain(c.input);
    const withIt = run(entry, c.tpl, { ...c.data, [c.input]: "V" });
    check(withIt.code, `${c.m}: with ${c.input} it renders`).toBe("ok");
  });

  it("lc-analyze: spec() says that FOR and IF build items and rows", () => {
    const blocks = spec().blocks;
    const desc = (n: string) => blocks.find((b) => b.name === n)?.description ?? "";
    for (const n of ["LIST", "TABLE"]) {
      check(/\bFOR\b/.test(desc(n)), `the ${n} description names FOR: ${desc(n)}`).toBe(true);
      check(/\bIF\b/.test(desc(n)), `the ${n} description names IF: ${desc(n)}`).toBe(true);
    }
    check(/(FOR|IF|END_FOR|END_IF|ELSE)/.test(desc("LIST_ITEM")), `the LIST_ITEM description tells how an unclosed item ends: ${desc("LIST_ITEM")}`).toBe(true);
    check(/(FOR|IF|END_FOR|END_IF|ELSE)/.test(desc("ROW")), `the ROW description tells how an unclosed row ends: ${desc("ROW")}`).toBe(true);
  });
});

// =====================================================================================
// lc-pipes
// =====================================================================================

describe("lc-pipes: a pipe after an even run of backslashes is escaped in a table cell", () => {
  it.each(expand(PIPE_ROWS))("lc-pipes: [$entry] $name", ({ entry, r }) => verify(entry, r, "lc-pipes"));
  it("lc-pipes: the example values from the rule", () => {
    const tpl = "{{TABLE}}{{ROW}}${{v}}|x{{END_ROW}}{{END_TABLE}}";
    const cases: Array<[string, string]> = [
      ["a|b", "| a" + BS + "|b | x |"],
      ["a" + BS + BS + "|b", "| a" + BS + BS + BS + "|b | x |"],
      ["a" + BS + BS + BS + "|b", "| a" + BS + BS + BS + "|b | x |"],
    ];
    for (const entry of ENTRIES) {
      for (const [v, want] of cases) check(run(entry, tpl, { v }).output, `${entry}: ${JSON.stringify(v)} in a cell`).toBe(want);
    }
  });
});

// =====================================================================================
// lc-compat
// =====================================================================================

describe("lc-compat: templates that were valid keep their output", () => {
  it.each(expand(COMPAT_ROWS))("lc-compat: [$entry] $name", ({ entry, r }) => verify(entry, r, "lc-compat"));
});

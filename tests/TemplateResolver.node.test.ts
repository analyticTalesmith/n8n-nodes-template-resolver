/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================================
// IMPORTS - Modular Structure
// ============================================================================

// Type definitions
import {
  VariableMap,
  TemplateValue,
  TokenType,
  TextNode,
  VariableNode,
  IfNode,
  CaseNode,
  ForNode,
  ListNode,
  ListItemNode,
  TableNode,
  CommentNode,
} from "../nodes/TemplateResolver/types";

// Type coercion functions
import {
  tryCoerceToNumber,
  tryCoerceToArray,
  tryCoerceToObject,
  tryCoerceToBoolean,
  tryCoerceToString,
} from "../nodes/TemplateResolver/coercion";

// Filter system
import {
  parseFilter,
  applyFilter,
  applyFilters,
} from "../nodes/TemplateResolver/filters";

// Lexer
import { Lexer } from "../nodes/TemplateResolver/lexer";

// Parser
import { Parser } from "../nodes/TemplateResolver/parser";

// Expression evaluation
import {
  evaluateCondition,
  evaluateMathExpression,
} from "../nodes/TemplateResolver/expressions";

// Main entry point
import { resolveTemplate } from "../nodes/TemplateResolver/TemplateResolver.node";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to create VariableMap with proper typing
 */
function vars(entries: [string, TemplateValue][]): VariableMap {
  return new Map(entries);
}

/**
 * Helper to parse and resolve in one call (for simple tests)
 */
function resolve(
  template: string,
  variables: VariableMap,
  options?: { strictMode?: boolean }
): string {
  return resolveTemplate(template, variables, options);
}

// ============================================================================
// TYPE COERCION TESTS
// ============================================================================

describe("Type Coercion", () => {
  describe("tryCoerceToBoolean", () => {
    describe("successful coercion", () => {
      test("native booleans", () => {
        expect(tryCoerceToBoolean(true)).toBe(true);
        expect(tryCoerceToBoolean(false)).toBe(false);
      });

      test("boolean strings - case insensitive", () => {
        expect(tryCoerceToBoolean("true")).toBe(true);
        expect(tryCoerceToBoolean("false")).toBe(false);
        expect(tryCoerceToBoolean("TRUE")).toBe(true);
        expect(tryCoerceToBoolean("FALSE")).toBe(false);
        expect(tryCoerceToBoolean("True")).toBe(true);
        expect(tryCoerceToBoolean("False")).toBe(false);
        expect(tryCoerceToBoolean("tRuE")).toBe(true);
        expect(tryCoerceToBoolean("FaLsE")).toBe(false);
      });

      test("boolean strings with whitespace", () => {
        expect(tryCoerceToBoolean("  true  ")).toBe(true);
        expect(tryCoerceToBoolean("\nfalse\n")).toBe(false);
        expect(tryCoerceToBoolean("\tTRUE\t")).toBe(true);
      });

      test("yes/no strings - case insensitive", () => {
        expect(tryCoerceToBoolean("yes")).toBe(true);
        expect(tryCoerceToBoolean("no")).toBe(false);
        expect(tryCoerceToBoolean("YES")).toBe(true);
        expect(tryCoerceToBoolean("NO")).toBe(false);
        expect(tryCoerceToBoolean("Yes")).toBe(true);
        expect(tryCoerceToBoolean("No")).toBe(false);
        expect(tryCoerceToBoolean("yEs")).toBe(true);
      });

      test("1/0 strings and numbers", () => {
        expect(tryCoerceToBoolean("1")).toBe(true);
        expect(tryCoerceToBoolean("0")).toBe(false);
        expect(tryCoerceToBoolean(1)).toBe(true);
        expect(tryCoerceToBoolean(0)).toBe(false);
      });
    });

    describe("ambiguous values (return null)", () => {
      test("non-boolean numbers", () => {
        expect(tryCoerceToBoolean(2)).toBeNull();
        expect(tryCoerceToBoolean(-1)).toBeNull();
        expect(tryCoerceToBoolean(42)).toBeNull();
        expect(tryCoerceToBoolean(3.14)).toBeNull();
        expect(tryCoerceToBoolean(-99)).toBeNull();
        expect(tryCoerceToBoolean(NaN)).toBeNull();
      });

      test("ambiguous strings", () => {
        expect(tryCoerceToBoolean("maybe")).toBeNull();
        expect(tryCoerceToBoolean("hello")).toBeNull();
        expect(tryCoerceToBoolean("2")).toBeNull();
        expect(tryCoerceToBoolean("")).toBeNull();
      });

      test("arrays and objects", () => {
        expect(tryCoerceToBoolean([])).toBeNull();
        expect(tryCoerceToBoolean({})).toBeNull();
        expect(tryCoerceToBoolean([1, 2])).toBeNull();
        expect(tryCoerceToBoolean({ a: 1 })).toBeNull();
      });

      test("null and undefined", () => {
        expect(tryCoerceToBoolean(null)).toBeNull();
        expect(tryCoerceToBoolean(undefined)).toBeNull();
      });
    });
  });

  describe("tryCoerceToArray", () => {
    describe("successful coercion", () => {
      test("native arrays", () => {
        expect(tryCoerceToArray([1, 2, 3])).toEqual([1, 2, 3]);
        expect(tryCoerceToArray([])).toEqual([]);
        expect(tryCoerceToArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
        expect(tryCoerceToArray([{ name: "Alice" }])).toEqual([
          { name: "Alice" },
        ]);
      });

      test("JSON array strings - simple values", () => {
        expect(tryCoerceToArray("[1,2,3]")).toEqual([1, 2, 3]);
        expect(tryCoerceToArray('["a","b","c"]')).toEqual(["a", "b", "c"]);
        expect(tryCoerceToArray("[true,false]")).toEqual([true, false]);
        expect(tryCoerceToArray("[]")).toEqual([]);
      });

      test("JSON array strings with trailing commas", () => {
        expect(tryCoerceToArray("[1,2,3,]")).toEqual([1, 2, 3]);
        expect(tryCoerceToArray('["a","b","c",]')).toEqual(["a", "b", "c"]);
        expect(tryCoerceToArray("[1,]")).toEqual([1]);
      });

      test("JSON array strings with leading commas", () => {
        expect(tryCoerceToArray("[,1,2,3]")).toEqual([1, 2, 3]);
        expect(tryCoerceToArray('[,"a","b","c"]')).toEqual(["a", "b", "c"]);
        expect(tryCoerceToArray("[,1]")).toEqual([1]);
      });

      test("JSON array strings with leading and trailing commas", () => {
        expect(tryCoerceToArray("[,1,2,3,]")).toEqual([1, 2, 3]);
        expect(tryCoerceToArray('[,"a","b",]')).toEqual(["a", "b"]);
      });

      test("comma-separated string (no brackets) becomes array", () => {
        expect(tryCoerceToArray("1,2,3")).toEqual(["1", "2", "3"]);
        expect(tryCoerceToArray("apple,banana,cherry")).toEqual([
          "apple",
          "banana",
          "cherry",
        ]);
        expect(tryCoerceToArray("a, b, c")).toEqual(["a", "b", "c"]);
      });

      test("comma-separated with trailing comma", () => {
        expect(tryCoerceToArray("1,2,3,")).toEqual(["1", "2", "3"]);
        expect(tryCoerceToArray("a,b,")).toEqual(["a", "b"]);
      });

      test("comma-separated with leading comma", () => {
        expect(tryCoerceToArray(",1,2,3")).toEqual(["1", "2", "3"]);
        expect(tryCoerceToArray(",a,b")).toEqual(["a", "b"]);
      });

      test("single value becomes single-item array", () => {
        expect(tryCoerceToArray(42)).toEqual([42]);
        expect(tryCoerceToArray("hello")).toEqual(["hello"]);
        expect(tryCoerceToArray(true)).toEqual([true]);
        expect(tryCoerceToArray(false)).toEqual([false]);
        expect(tryCoerceToArray(3.14)).toEqual([3.14]);
      });

      test("JSON array strings - objects", () => {
        expect(tryCoerceToArray('[{"name":"Alice"}]')).toEqual([
          { name: "Alice" },
        ]);
        expect(tryCoerceToArray('[{"a":1},{"b":2}]')).toEqual([
          { a: 1 },
          { b: 2 },
        ]);
      });

      test("JSON array strings - nested", () => {
        expect(tryCoerceToArray("[[1,2],[3,4]]")).toEqual([
          [1, 2],
          [3, 4],
        ]);
        expect(tryCoerceToArray('[{"items":[1,2,3]}]')).toEqual([
          { items: [1, 2, 3] },
        ]);
      });

      test("JSON array strings with whitespace", () => {
        expect(tryCoerceToArray("  [1,2,3]  ")).toEqual([1, 2, 3]);
        expect(tryCoerceToArray("\n[1,2]\n")).toEqual([1, 2]);
      });
    });

    describe("failed coercion", () => {
      test("JSON object strings (not array)", () => {
        expect(tryCoerceToArray("{}")).toBeNull();
        expect(tryCoerceToArray('{"a":1}')).toBeNull();
      });

      test("objects become null (cannot meaningfully convert to text array)", () => {
        expect(tryCoerceToArray({ a: 1 })).toBeNull();
        expect(tryCoerceToArray({ a: 1, b: 2 })).toBeNull();
      });

      test("malformed JSON with brackets", () => {
        expect(tryCoerceToArray("[1,2,3")).toEqual(["1", "2", "3"]);
        expect(tryCoerceToArray("[1,2,3}")).toEqual(["1", "2", "3"]);
      });

      test("null and undefined", () => {
        expect(tryCoerceToArray(null)).toBeNull();
        expect(tryCoerceToArray(undefined)).toBeNull();
      });
    });
  });

  describe("tryCoerceToObject", () => {
    describe("successful coercion", () => {
      test("native objects", () => {
        expect(tryCoerceToObject({ name: "Alice" })).toEqual({ name: "Alice" });
        expect(tryCoerceToObject({})).toEqual({});
        expect(tryCoerceToObject({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
      });

      test("JSON object strings - simple", () => {
        expect(tryCoerceToObject('{"name":"Alice"}')).toEqual({
          name: "Alice",
        });
        expect(tryCoerceToObject('{"a":1,"b":2}')).toEqual({ a: 1, b: 2 });
        expect(tryCoerceToObject("{}")).toEqual({});
      });

      test("JSON object strings with trailing commas", () => {
        expect(tryCoerceToObject('{"a":1,"b":2,}')).toEqual({ a: 1, b: 2 });
        expect(tryCoerceToObject('{"name":"Alice",}')).toEqual({
          name: "Alice",
        });
      });

      test("JSON object strings with leading and/or trailing commas", () => {
        expect(tryCoerceToObject('{,"name":"Alice"}')).toEqual({
          name: "Alice",
        });
        expect(tryCoerceToObject('{"name":"Alice",}')).toEqual({
          name: "Alice",
        });
        expect(tryCoerceToObject('{,"name":"Alice",}')).toEqual({
          name: "Alice",
        });
      });

      test("JSON object strings - nested", () => {
        expect(tryCoerceToObject('{"user":{"name":"Alice"}}')).toEqual({
          user: { name: "Alice" },
        });
        expect(tryCoerceToObject('{"a":{"b":{"c":1}}}')).toEqual({
          a: { b: { c: 1 } },
        });
      });

      test("JSON object strings - arrays as values", () => {
        expect(tryCoerceToObject('{"items":[1,2,3]}')).toEqual({
          items: [1, 2, 3],
        });
        expect(tryCoerceToObject('{"users":[{"name":"Alice"}]}')).toEqual({
          users: [{ name: "Alice" }],
        });
      });

      test("JSON object strings with whitespace", () => {
        expect(tryCoerceToObject('  {"a":1}  ')).toEqual({ a: 1 });
        expect(tryCoerceToObject('\n{"key":"val"}\n')).toEqual({ key: "val" });
      });
    });

    describe("failed coercion", () => {
      test("non-object strings", () => {
        expect(tryCoerceToObject("not an object")).toBeNull();
        expect(tryCoerceToObject("text")).toBeNull();
      });

      test("JSON array strings", () => {
        expect(tryCoerceToObject("[]")).toBeNull();
        expect(tryCoerceToObject("[1,2,3]")).toBeNull();
        expect(tryCoerceToObject('[{"a":1}]')).toBeNull();
      });

      test("malformed JSON", () => {
        expect(tryCoerceToObject('{"a":1')).toBeNull();
        expect(tryCoerceToObject('{"a":1]')).toBeNull();
        expect(tryCoerceToObject("{a:1}")).toBeNull();
        expect(tryCoerceToObject('{"a":}')).toBeNull();
      });

      test("other types", () => {
        expect(tryCoerceToObject(42)).toBeNull();
        expect(tryCoerceToObject(true)).toBeNull();
        expect(tryCoerceToObject([1, 2])).toBeNull();
        expect(tryCoerceToObject(null)).toBeNull();
        expect(tryCoerceToObject(undefined)).toBeNull();
      });
    });
  });

  describe("tryCoerceToNumber", () => {
    test("native numbers", () => {
      expect(tryCoerceToNumber(42)).toBe(42);
      expect(tryCoerceToNumber(3.14)).toBe(3.14);
      expect(tryCoerceToNumber(0)).toBe(0);
      expect(tryCoerceToNumber(-5)).toBe(-5);
    });

    test("string numbers", () => {
      expect(tryCoerceToNumber("42")).toBe(42);
      expect(tryCoerceToNumber("3.14")).toBe(3.14);
      expect(tryCoerceToNumber("0")).toBe(0);
      expect(tryCoerceToNumber("-5")).toBe(-5);
    });

    test("booleans", () => {
      expect(tryCoerceToNumber(true)).toBe(1);
      expect(tryCoerceToNumber(false)).toBe(0);
    });

    test("whitespace trimming", () => {
      expect(tryCoerceToNumber("  42  ")).toBe(42);
      expect(tryCoerceToNumber("\n99\n")).toBe(99);
    });

    test("failed coercion", () => {
      expect(tryCoerceToNumber("abc")).toBeNull();
      expect(tryCoerceToNumber("")).toBeNull();
      expect(tryCoerceToNumber([])).toBeNull();
      expect(tryCoerceToNumber({})).toBeNull();
      expect(tryCoerceToNumber(null)).toBeNull();
      expect(tryCoerceToNumber(undefined)).toBeNull();
      expect(tryCoerceToNumber(NaN)).toBeNull();
    });
  });

  describe("tryCoerceToString", () => {
    test("strings pass through", () => {
      expect(tryCoerceToString("hello")).toBe("hello");
      expect(tryCoerceToString("")).toBe("");
    });

    test("primitives", () => {
      expect(tryCoerceToString(42)).toBe("42");
      expect(tryCoerceToString(true)).toBe("true");
      expect(tryCoerceToString(false)).toBe("false");
    });

    test("arrays and objects", () => {
      expect(tryCoerceToString([1, 2, 3])).toBe("[1,2,3]");
      expect(tryCoerceToString({ a: 1 })).toBe('{"a":1}');
    });

    test("null and undefined", () => {
      expect(tryCoerceToString(null)).toBeNull();
      expect(tryCoerceToString(undefined)).toBeNull();
    });
  });

  describe("tryCoerceToArray", () => {
    describe("successful coercion", () => {
      test("native arrays", () => {
        expect(tryCoerceToArray([1, 2, 3])).toEqual([1, 2, 3]);
        expect(tryCoerceToArray([])).toEqual([]);
        expect(tryCoerceToArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
        expect(tryCoerceToArray([{ name: "Alice" }])).toEqual([
          { name: "Alice" },
        ]);
      });

      test("JSON array strings - simple values", () => {
        expect(tryCoerceToArray("[1,2,3]")).toEqual([1, 2, 3]);
        expect(tryCoerceToArray('["a","b","c"]')).toEqual(["a", "b", "c"]);
        expect(tryCoerceToArray("[true,false]")).toEqual([true, false]);
        expect(tryCoerceToArray("[]")).toEqual([]);
      });

      test("JSON array strings with trailing commas", () => {
        expect(tryCoerceToArray("[1,2,3,]")).toEqual([1, 2, 3]);
        expect(tryCoerceToArray('["a","b","c",]')).toEqual(["a", "b", "c"]);
        expect(tryCoerceToArray("[1,]")).toEqual([1]);
      });

      test("JSON array strings with leading commas", () => {
        expect(tryCoerceToArray("[,1,2,3]")).toEqual([1, 2, 3]);
        expect(tryCoerceToArray('[,"a","b","c"]')).toEqual(["a", "b", "c"]);
        expect(tryCoerceToArray("[,1]")).toEqual([1]);
      });

      test("JSON array strings with leading and trailing commas", () => {
        expect(tryCoerceToArray("[,1,2,3,]")).toEqual([1, 2, 3]);
        expect(tryCoerceToArray('[,"a","b",]')).toEqual(["a", "b"]);
      });

      test("comma-separated string (no brackets) becomes array", () => {
        expect(tryCoerceToArray("1,2,3")).toEqual(["1", "2", "3"]);
        expect(tryCoerceToArray("apple,banana,cherry")).toEqual([
          "apple",
          "banana",
          "cherry",
        ]);
        expect(tryCoerceToArray("a, b, c")).toEqual(["a", "b", "c"]); // Trimmed
      });

      test("comma-separated with trailing comma", () => {
        expect(tryCoerceToArray("1,2,3,")).toEqual(["1", "2", "3"]);
        expect(tryCoerceToArray("a,b,")).toEqual(["a", "b"]);
      });

      test("comma-separated with leading comma", () => {
        expect(tryCoerceToArray(",1,2,3")).toEqual(["1", "2", "3"]);
        expect(tryCoerceToArray(",a,b")).toEqual(["a", "b"]);
      });

      test("single value becomes single-item array", () => {
        expect(tryCoerceToArray(42)).toEqual([42]);
        expect(tryCoerceToArray("hello")).toEqual(["hello"]);
        expect(tryCoerceToArray(true)).toEqual([true]);
        expect(tryCoerceToArray(false)).toEqual([false]);
        expect(tryCoerceToArray(3.14)).toEqual([3.14]);
      });

      test("JSON array strings - objects", () => {
        expect(tryCoerceToArray('[{"name":"Alice"}]')).toEqual([
          { name: "Alice" },
        ]);
        expect(tryCoerceToArray('[{"a":1},{"b":2}]')).toEqual([
          { a: 1 },
          { b: 2 },
        ]);
      });

      test("JSON array strings - nested", () => {
        expect(tryCoerceToArray("[[1,2],[3,4]]")).toEqual([
          [1, 2],
          [3, 4],
        ]);
        expect(tryCoerceToArray('[{"items":[1,2,3]}]')).toEqual([
          { items: [1, 2, 3] },
        ]);
      });

      test("JSON array strings with whitespace", () => {
        expect(tryCoerceToArray("  [1,2,3]  ")).toEqual([1, 2, 3]);
        expect(tryCoerceToArray("\n[1,2]\n")).toEqual([1, 2]);
      });
    });

    describe("failed coercion", () => {
      test("JSON object strings (not array)", () => {
        expect(tryCoerceToArray("{}")).toBeNull();
        expect(tryCoerceToArray('{"a":1}')).toBeNull();
      });

      test("objects become null (cannot meaningfully convert to text array)", () => {
        // Objects are excluded from array coercion because:
        // 1. This is a TEXT-BASED system - output must be renderable as strings
        // 2. Choosing keys vs values would be arbitrary and lossy
        // 3. [{key, value}] arrays would stringify as "[object Object]"
        // 4. Users should structure data as arrays upfront or use explicit property access
        expect(tryCoerceToArray({ a: 1 })).toBeNull();
        expect(tryCoerceToArray({ a: 1, b: 2 })).toBeNull();
      });

      test("user must structure iterable data correctly", () => {
        // BAD: Object at root
        const bad = vars([
          ["user", { name: "Alice", email: "alice@example.com" }],
        ]);
        expect(() =>
          resolve("{{FOR user AS prop}}${{prop}}{{END_FOR}}", bad)
        ).toThrow(/Cannot iterate over non-array value/i);

        // GOOD: Array of objects
        const good = vars([["users", [{ name: "Alice" }, { name: "Bob" }]]]);
        expect(resolve("{{FOR users AS u}}${{u.name}} {{END_FOR}}", good)).toBe(
          "Alice Bob "
        );

        // GOOD: Explicit property access
        expect(
          resolve("Name: ${{user.name}}, Email: ${{user.email}}", bad)
        ).toBe("Name: Alice, Email: alice@example.com");
      });

      test("malformed JSON with brackets", () => {
        expect(tryCoerceToArray("[1,2,3")).toEqual(["1", "2", "3"]); // Unclosed
        expect(tryCoerceToArray("[1,2,3}")).toEqual(["1", "2", "3"]); // Wrong bracket
      });

      test("null and undefined", () => {
        expect(tryCoerceToArray(null)).toBeNull();
        expect(tryCoerceToArray(undefined)).toBeNull();
      });
    });
  });

  describe("tryCoerceToObject", () => {
    describe("successful coercion", () => {
      test("native objects", () => {
        expect(tryCoerceToObject({ name: "Alice" })).toEqual({ name: "Alice" });
        expect(tryCoerceToObject({})).toEqual({});
        expect(tryCoerceToObject({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
      });

      test("JSON object strings - simple", () => {
        expect(tryCoerceToObject('{"name":"Alice"}')).toEqual({
          name: "Alice",
        });
        expect(tryCoerceToObject('{"a":1,"b":2}')).toEqual({ a: 1, b: 2 });
        expect(tryCoerceToObject("{}")).toEqual({});
      });

      test("JSON object strings with trailing commas", () => {
        expect(tryCoerceToObject('{"a":1,"b":2,}')).toEqual({ a: 1, b: 2 });
        expect(tryCoerceToObject('{"name":"Alice",}')).toEqual({
          name: "Alice",
        });
      });

      test("JSON object strings with leading and/or trailing commas", () => {
        expect(tryCoerceToObject('{,"name":"Alice"}')).toEqual({
          name: "Alice",
        });
        expect(tryCoerceToObject('{"name":"Alice",}')).toEqual({
          name: "Alice",
        });
        expect(tryCoerceToObject('{,"name":"Alice",}')).toEqual({
          name: "Alice",
        });
      });

      test("JSON object strings - nested", () => {
        expect(tryCoerceToObject('{"user":{"name":"Alice"}}')).toEqual({
          user: { name: "Alice" },
        });
        expect(tryCoerceToObject('{"a":{"b":{"c":1}}}')).toEqual({
          a: { b: { c: 1 } },
        });
      });

      test("JSON object strings - arrays as values", () => {
        expect(tryCoerceToObject('{"items":[1,2,3]}')).toEqual({
          items: [1, 2, 3],
        });
        expect(tryCoerceToObject('{"users":[{"name":"Alice"}]}')).toEqual({
          users: [{ name: "Alice" }],
        });
      });

      test("JSON object strings with whitespace", () => {
        expect(tryCoerceToObject('  {"a":1}  ')).toEqual({ a: 1 });
        expect(tryCoerceToObject('\n{"key":"val"}\n')).toEqual({ key: "val" });
      });
    });

    describe("failed coercion", () => {
      test("non-object strings", () => {
        expect(tryCoerceToObject("not an object")).toBeNull();
        expect(tryCoerceToObject("text")).toBeNull();
      });

      test("JSON array strings", () => {
        expect(tryCoerceToObject("[]")).toBeNull();
        expect(tryCoerceToObject("[1,2,3]")).toBeNull();
        expect(tryCoerceToObject('[{"a":1}]')).toBeNull(); // Array of objects
      });

      test("malformed JSON", () => {
        expect(tryCoerceToObject('{"a":1')).toBeNull(); // Unclosed
        expect(tryCoerceToObject('{"a":1]')).toBeNull(); // Wrong bracket
        expect(tryCoerceToObject("{a:1}")).toBeNull(); // Unquoted key
        expect(tryCoerceToObject('{"a":}')).toBeNull(); // Missing value
      });

      test("other types", () => {
        expect(tryCoerceToObject(42)).toBeNull();
        expect(tryCoerceToObject(true)).toBeNull();
        expect(tryCoerceToObject([1, 2])).toBeNull();
        expect(tryCoerceToObject(null)).toBeNull();
        expect(tryCoerceToObject(undefined)).toBeNull();
      });
    });
  });
});

// ============================================================================
// NESTED PROPERTY ACCESS TESTS
// ============================================================================

describe("Nested Property Access", () => {
  describe("safe nested access", () => {
    test("simple nested property", () => {
      const v = vars([["post_idea", { final_topic: "AI Ethics" }]]);
      expect(resolve("${{post_idea.final_topic}}", v)).toBe("AI Ethics");
    });

    test("deeply nested property", () => {
      const v = vars([
        ["user", { profile: { contact: { email: "alice@example.com" } } }],
      ]);
      expect(resolve("${{user.profile.contact.email}}", v)).toBe(
        "alice@example.com"
      );
    });

    test("missing intermediate property returns empty", () => {
      const v = vars([["post_idea", { title: "Hello" }]]);
      expect(resolve("${{post_idea.final_topic}}", v)).toBe("");
    });

    test("missing root variable returns empty", () => {
      const v = vars([]);
      expect(
        resolve("${{post_idea.final_topic}}", v, { strictMode: false })
      ).toBe("");
    });

    test("accessing property on primitive returns empty", () => {
      const v = vars([["count", 42]]);
      expect(resolve("${{count.value}}", v)).toBe("");
    });

    test("accessing property on null returns empty", () => {
      const v = vars([["user", null]]);
      expect(resolve("${{user.name}}", v)).toBe("");
    });

    test("accessing property on undefined returns empty", () => {
      const v = vars([["user", undefined]]);
      expect(resolve("${{user.name}}", v, { strictMode: false })).toBe("");
    });

    test("multiple missing nested accesses returns empty", () => {
      const v = vars([["data", {}]]);
      expect(resolve("${{data.user.profile.name}}", v)).toBe("");
    });
  });

  describe("safe nested access in conditions", () => {
    test("missing property is falsy in IF", () => {
      const v = vars([["post_idea", { title: "Hello" }]]);
      const template =
        "{{IF post_idea.final_topic}}Has topic{{ELSE}}No topic{{END_IF}}";
      expect(resolve(template, v)).toBe("No topic");
    });

    test("existing property is truthy in IF", () => {
      const v = vars([["post_idea", { final_topic: "AI Ethics" }]]);
      const template = "{{IF post_idea.final_topic}}Has topic{{END_IF}}";
      expect(resolve(template, v)).toBe("Has topic");
    });

    test("missing root variable is falsy", () => {
      const v = vars([]);
      const template =
        "{{IF post_idea.final_topic}}Has topic{{ELSE}}No topic{{END_IF}}";
      expect(resolve(template, v)).toBe("No topic");
    });

    test("deeply nested missing property is falsy", () => {
      const v = vars([["data", {}]]);
      const template =
        "{{IF data.user.profile.verified}}Verified{{ELSE}}Not verified{{END_IF}}";
      expect(resolve(template, v)).toBe("Not verified");
    });

    test("can compare missing property with isEmpty", () => {
      const v = vars([["post", { title: "Hello" }]]);
      const template =
        "{{IF post.description isEmpty}}No description{{END_IF}}";
      expect(resolve(template, v)).toBe("No description");
    });
  });

  describe("safe nested access with default operator", () => {
    test("uses default for missing nested property", () => {
      const v = vars([["post", { title: "Hello" }]]);
      expect(resolve('${{post.author ?? "Anonymous"}}', v)).toBe("Anonymous");
    });

    test("uses default for missing root", () => {
      const v = vars([]);
      expect(
        resolve('${{post.author ?? "Unknown"}}', v, { strictMode: false })
      ).toBe("Unknown");
    });

    test("does not use default for existing nested property", () => {
      const v = vars([["post", { author: "Alice" }]]);
      expect(resolve('${{post.author ?? "Anonymous"}}', v)).toBe("Alice");
    });
  });

  describe("safe nested access in CASE", () => {
    test("missing property evaluates to empty string in CASE", () => {
      const v = vars([["post", { title: "Hello" }]]);
      const template = `{{CASE post.status}}
{{WHEN "published"}}Published{{END_WHEN}}
{{WHEN "draft"}}Draft{{END_WHEN}}
{{DEFAULT}}Unknown{{END_DEFAULT}}
{{END_CASE}}`;
      expect(resolve(template, v)).toBe("Unknown");
    });

    test("missing property evaluates to empty string in CASE", () => {
      const v = vars([["post", { title: "Hello" }]]);
      const template = `{{CASE post.status}}
{{WHEN ""}}No status{{END_WHEN}}
{{DEFAULT}}Other{{END_DEFAULT}}
{{END_CASE}}`;
      expect(resolve(template, v)).toBe("No status");
    });

    test("null property evaluates to empty string in CASE", () => {
      const v = vars([["post", { status: null }]]);
      const template = `{{CASE post.status}}
{{WHEN ""}}Null status{{END_WHEN}}
{{DEFAULT}}Other{{END_DEFAULT}}
{{END_CASE}}`;
      expect(resolve(template, v)).toBe("Null status");
    });
  });

  describe("safe nested access in FOR loops", () => {
    test("missing array property results in no output", () => {
      const v = vars([["data", { title: "Report" }]]);
      const template = "{{FOR data.items AS item}}${{item}}{{END_FOR}}";
      expect(resolve(template, v, { strictMode: false })).toBe("");
    });

    test("can iterate over nested array", () => {
      const v = vars([["response", { data: { items: ["a", "b", "c"] } }]]);
      const template =
        "{{FOR response.data.items AS item}}${{item}},{{END_FOR}}";
      expect(resolve(template, v)).toBe("a,b,c,");
    });
  });

  describe("safe nested access with JSON strings", () => {
    test("nested access on JSON string object", () => {
      const v = vars([
        ["post_idea", '{"final_topic":"AI Ethics","author":"Alice"}'],
      ]);
      expect(resolve("${{post_idea.final_topic}}", v)).toBe("AI Ethics");
    });

    test("deeply nested JSON string", () => {
      const v = vars([["data", '{"user":{"profile":{"name":"Alice"}}}']]);
      expect(resolve("${{data.user.profile.name}}", v)).toBe("Alice");
    });

    test("missing property in JSON string returns empty", () => {
      const v = vars([["post", '{"title":"Hello"}']]);
      expect(resolve("${{post.author}}", v)).toBe("");
    });

    test("mixed: object with JSON string property", () => {
      const v = vars([["response", { data: '{"items":["a","b","c"]}' }]]);
      expect(resolve("${{response.data.items.0}}", v)).toBe("a");
    });
  });
});

// ============================================================================
// COMMA-SEPARATED ARRAY COERCION TESTS
// ============================================================================

describe("Comma-Separated Array Coercion", () => {
  describe("basic comma-separated strings", () => {
    test("simple comma-separated values", () => {
      const v = vars([["items", "1,2,3"]]);
      const template = "{{FOR items AS item}}${{item}} {{END_FOR}}";
      expect(resolve(template, v)).toBe("1 2 3 ");
    });

    test("comma-separated words", () => {
      const v = vars([["tags", "tech,programming,web"]]);
      const template = "{{FOR tags AS tag}}#${{tag}} {{END_FOR}}";
      expect(resolve(template, v)).toBe("#tech #programming #web ");
    });

    test("comma-separated with spaces", () => {
      const v = vars([["items", "apple, banana, cherry"]]);
      const template = "{{FOR items AS item}}${{item}},{{END_FOR}}";
      // Items should be trimmed
      expect(resolve(template, v)).toBe("apple,banana,cherry,");
    });

    test("single item (no comma)", () => {
      const v = vars([["item", "single"]]);
      const template = "{{FOR item AS i}}${{i}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("single");
    });
  });

  describe("comma-separated with trailing/leading commas", () => {
    test("trailing comma removed", () => {
      const v = vars([["items", "a,b,c,"]]);
      const template = "{{FOR items AS item}}${{item}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("abc");
    });

    test("leading comma removed", () => {
      const v = vars([["items", ",a,b,c"]]);
      const template = "{{FOR items AS item}}${{item}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("abc");
    });

    test("both leading and trailing commas removed", () => {
      const v = vars([["items", ",a,b,c,"]]);
      const template = "{{FOR items AS item}}${{item}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("abc");
    });

    test("multiple trailing commas", () => {
      const v = vars([["items", "a,b,c,,,"]]);
      const template = "{{FOR items AS item}}${{item}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("abc");
    });
  });

  describe("isArray check with comma-separated", () => {
    test("comma-separated string is recognized as array", () => {
      const v = vars([["items", "1,2,3"]]);
      const template =
        "{{IF items isArray}}Is array{{ELSE}}Not array{{END_IF}}";
      expect(resolve(template, v)).toBe("Is array");
    });

    test("coercible single value is recognized as array", () => {
      const v = vars([["item", "single"]]);
      const template = "{{IF item isArray}}Is array{{END_IF}}";
      expect(resolve(template, v)).toBe("Is array");
    });
  });
});

// ============================================================================
// SINGLE VALUE TO ARRAY COERCION TESTS
// ============================================================================

describe("Single Value to Array Coercion", () => {
  describe("primitives become single-item arrays", () => {
    test("number becomes array", () => {
      const v = vars([["num", 42]]);
      const template = "{{FOR num AS n}}${{n}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("42");
    });

    test("string becomes array", () => {
      const v = vars([["text", "hello"]]);
      const template = "{{FOR text AS t}}${{t}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("hello");
    });

    test("boolean true becomes array", () => {
      const v = vars([["flag", true]]);
      const template = "{{FOR flag AS f}}${{f}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("true");
    });

    test("boolean false becomes array", () => {
      const v = vars([["flag", false]]);
      const template = "{{FOR flag AS f}}${{f}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("false");
    });
  });

  describe("isArray recognizes single values", () => {
    test("number is array", () => {
      const v = vars([["num", 42]]);
      expect(resolve("{{IF num isArray}}Yes{{END_IF}}", v)).toBe("Yes");
    });

    test("string is array", () => {
      const v = vars([["text", "hello"]]);
      expect(resolve("{{IF text isArray}}Yes{{END_IF}}", v)).toBe("Yes");
    });

    test("boolean is array", () => {
      const v = vars([["flag", true]]);
      expect(resolve("{{IF flag isArray}}Yes{{END_IF}}", v)).toBe("Yes");
    });
  });
});

// ============================================================================
// JSON TRAILING/LEADING COMMA TESTS
// ============================================================================

describe("JSON Comma Handling", () => {
  describe("arrays with malformed commas", () => {
    test("JSON array with trailing comma is fixed", () => {
      const v = vars([["items", "[1,2,3,]"]]);
      const template = "{{FOR items AS item}}${{item}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("123");
    });

    test("JSON array with leading comma is fixed", () => {
      const v = vars([["items", "[,1,2,3]"]]);
      const template = "{{FOR items AS item}}${{item}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("123");
    });

    test("JSON array with both leading and trailing commas", () => {
      const v = vars([["items", "[,1,2,3,]"]]);
      const template = "{{FOR items AS item}}${{item}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("123");
    });

    test("nested array with trailing commas", () => {
      expect(tryCoerceToArray("[[1,2,],[3,4,]]")).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });
  });

  describe("objects with malformed commas", () => {
    test("JSON object with trailing comma is fixed", () => {
      const v = vars([["user", '{"name":"Alice","age":30,}']]);
      expect(resolve("${{user.name}}", v)).toBe("Alice");
      expect(resolve("${{user.age}}", v)).toBe("30");
    });

    test("nested object with trailing commas", () => {
      const v = vars([["data", '{"user":{"name":"Alice",},"count":5,}']]);
      expect(resolve("${{data.user.name}}", v)).toBe("Alice");
      expect(resolve("${{data.count}}", v)).toBe("5");
    });
  });
});

// ============================================================================
// FILTER SYSTEM TESTS
// ============================================================================

describe("Filter System", () => {
  describe("Filter Parsing", () => {
    describe("no parameters", () => {
      test("simple filter", () => {
        expect(parseFilter("trim")).toEqual({
          name: "trim",
          params: {},
        });
      });

      test("filter with underscore", () => {
        expect(parseFilter("escape_md")).toEqual({
          name: "escape_md",
          params: {},
        });
      });

      test("with whitespace", () => {
        expect(parseFilter("  trim  ")).toEqual({
          name: "trim",
          params: {},
        });
      });
    });

    describe("shorthand single parameter", () => {
      test("head=N", () => {
        expect(parseFilter("head=100")).toEqual({
          name: "head",
          params: { value: "100" },
        });
      });

      test("tail=N", () => {
        expect(parseFilter("tail=50")).toEqual({
          name: "tail",
          params: { value: "50" },
        });
      });

      test("with quoted value", () => {
        expect(parseFilter('head="100"')).toEqual({
          name: "head",
          params: { value: "100" },
        });
      });

      test("handles whitespace", () => {
        expect(parseFilter("  head = 100  ")).toEqual({
          name: "head",
          params: { value: "100" },
        });
      });
    });

    describe("multiple named parameters (comma-separated)", () => {
      test("two parameters", () => {
        expect(parseFilter('replace:find="old",with="new"')).toEqual({
          name: "replace",
          params: {
            find: "old",
            with: "new",
          },
        });
      });

      test("three parameters", () => {
        expect(
          parseFilter('replace:find="old",with="new",case="insensitive"')
        ).toEqual({
          name: "replace",
          params: {
            find: "old",
            with: "new",
            case: "insensitive",
          },
        });
      });

      test("mixed quoted and unquoted", () => {
        expect(parseFilter('pad:width=5,char="0"')).toEqual({
          name: "pad",
          params: {
            width: "5",
            char: "0",
          },
        });
      });

      test("complex punctuation in quotes", () => {
        expect(parseFilter('custom:ellipsis="...",length=100')).toEqual({
          name: "custom",
          params: {
            ellipsis: "...",
            length: "100",
          },
        });
      });

      test("comma inside quoted value", () => {
        expect(parseFilter('replace:find="a, b",with="c, d"')).toEqual({
          name: "replace",
          params: {
            find: "a, b",
            with: "c, d",
          },
        });
      });

      test("equals sign inside quoted value", () => {
        expect(parseFilter('replace:find="a=b",with="c=d"')).toEqual({
          name: "replace",
          params: {
            find: "a=b",
            with: "c=d",
          },
        });
      });

      test("single quotes", () => {
        expect(parseFilter("replace:find='old',with='new'")).toEqual({
          name: "replace",
          params: {
            find: "old",
            with: "new",
          },
        });
      });

      test("escaped quotes in value", () => {
        expect(parseFilter('text:value="say \\"hello\\""')).toEqual({
          name: "text",
          params: {
            value: 'say "hello"',
          },
        });
      });
    });

    describe("edge cases", () => {
      test("empty parameter value", () => {
        expect(parseFilter('replace:find="",with=new')).toEqual({
          name: "replace",
          params: {
            find: "",
            with: "new",
          },
        });
      });

      test("whitespace around commas", () => {
        expect(parseFilter('replace:find="old" , with="new"')).toEqual({
          name: "replace",
          params: {
            find: "old",
            with: "new",
          },
        });
      });

      test("parameter with special characters", () => {
        expect(parseFilter('custom:pattern="[a-z]+",flags="gi"')).toEqual({
          name: "custom",
          params: {
            pattern: "[a-z]+",
            flags: "gi",
          },
        });
      });
    });
  });

  describe("Filter Application", () => {
    describe("head filter", () => {
      test("basic usage", () => {
        const filter = parseFilter("head=5");
        expect(applyFilter("hello world", filter)).toBe("hello");
      });

      test("truncates longer text", () => {
        const filter = parseFilter("head=10");
        expect(applyFilter("This is a long sentence", filter)).toBe(
          "This is a "
        );
      });

      test("handles text shorter than limit", () => {
        const filter = parseFilter("head=100");
        expect(applyFilter("short", filter)).toBe("short");
      });

      test("handles negative value for length", () => {
        const filter = parseFilter("head=-2");
        expect(applyFilter("short", filter)).toBe("sho");
      });

      test("handles zero", () => {
        const filter = parseFilter("head=0");
        expect(applyFilter("text", filter)).toBe("");
      });

      test("throws on missing parameter", () => {
        expect(() => applyFilter("text", { name: "head", params: {} })).toThrow(
          /head filter requires parameter/i
        );
      });

      test("throws on invalid parameter", () => {
        expect(() =>
          applyFilter("text", { name: "head", params: { value: "abc" } })
        ).toThrow(/invalid head parameter.*must be a number/i);
      });
    });

    describe("tail filter", () => {
      test("basic usage", () => {
        const filter = parseFilter("tail=5");
        expect(applyFilter("hello world", filter)).toBe("world");
      });

      test("gets last N characters", () => {
        const filter = parseFilter("tail=10");
        expect(applyFilter("This is a long sentence", filter)).toBe(
          "g sentence"
        );
      });

      test("handles text shorter than limit", () => {
        const filter = parseFilter("tail=100");
        expect(applyFilter("short", filter)).toBe("short");
      });

      test("handles zero", () => {
        const filter = parseFilter("tail=0");
        expect(applyFilter("text", filter)).toBe("");
      });

      test("throws on missing parameter", () => {
        expect(() => applyFilter("text", { name: "tail", params: {} })).toThrow(
          /tail filter requires parameter/i
        );
      });

      test("throws on invalid parameter", () => {
        expect(() =>
          applyFilter("text", { name: "tail", params: { value: "xyz" } })
        ).toThrow(/invalid tail parameter.*must be a number/i);
      });

      test("handles negative value for length", () => {
        const filter = parseFilter("tail=-2");
        expect(applyFilter("short", filter)).toBe("ort");
      });
    });

    describe("trim filter", () => {
      test("removes leading whitespace", () => {
        const filter = parseFilter("trim");
        expect(applyFilter("  text", filter)).toBe("text");
      });

      test("removes trailing whitespace", () => {
        const filter = parseFilter("trim");
        expect(applyFilter("text  ", filter)).toBe("text");
      });

      test("removes both", () => {
        const filter = parseFilter("trim");
        expect(applyFilter("  text  ", filter)).toBe("text");
      });

      test("removes newlines and tabs", () => {
        const filter = parseFilter("trim");
        expect(applyFilter("\n\ttext\n\t", filter)).toBe("text");
      });

      test("preserves internal whitespace", () => {
        const filter = parseFilter("trim");
        expect(applyFilter("  hello  world  ", filter)).toBe("hello  world");
      });

      test("handles empty string", () => {
        const filter = parseFilter("trim");
        expect(applyFilter("", filter)).toBe("");
      });

      test("handles whitespace-only string", () => {
        const filter = parseFilter("trim");
        expect(applyFilter("    ", filter)).toBe("");
      });
    });

    describe("escape_md filter", () => {
      test("escapes asterisks", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("*bold*", filter)).toBe("\\*bold\\*");
      });

      test("escapes underscores", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("_italic_", filter)).toBe("\\_italic\\_");
      });

      test("escapes brackets", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("[link](url)", filter)).toBe("\\[link\\]\\(url\\)");
      });

      test("escapes backticks", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("`code`", filter)).toBe("\\`code\\`");
      });

      test("escapes hash", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("# heading", filter)).toBe("\\# heading");
      });

      test("escapes greater than", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("> blockquote", filter)).toBe("\\> blockquote");
      });

      test("escapes tilde", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("~~strikethrough~~", filter)).toBe(
          "\\~\\~strikethrough\\~\\~"
        );
      });

      test("escapes pipe", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("| table |", filter)).toBe("\\| table \\|");
      });

      test("escapes backslash", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("text \\ backslash", filter)).toBe(
          "text \\\\ backslash"
        );
      });

      test("escapes all special chars", () => {
        const filter = parseFilter("escape_md");
        const input = "*_[]()#`>~|\\";
        const expected = "\\*\\_\\[\\]\\(\\)\\#\\`\\>\\~\\|\\\\";
        expect(applyFilter(input, filter)).toBe(expected);
      });

      test("escape_md with already escaped content", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("\\*already\\*", filter)).toBe(
          "\\\\\\*already\\\\\\*"
        );
      });

      test("does not escape regular text", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("regular text 123", filter)).toBe(
          "regular text 123"
        );
      });

      test("handles empty string", () => {
        const filter = parseFilter("escape_md");
        expect(applyFilter("", filter)).toBe("");
      });
    });

    describe("unknown filter", () => {
      test("throws error", () => {
        expect(() =>
          applyFilter("text", { name: "unknown", params: {} })
        ).toThrow(/unknown filter: unknown/i);
      });
    });
  });

  describe("Filter Chaining", () => {
    test("chain multiple filters", () => {
      const text = "  > This is a long text with *markdown*  ";

      const filters = [
        parseFilter("trim"),
        parseFilter("head=20"),
        parseFilter("escape_md"),
      ];

      const result = applyFilters(text, filters);
      // 1. trim: "> This is a long text with *markdown*"
      // 2. head=20: "> This is a long tex"
      // 3. escape_md: "\> This is a long te"
      expect(result).toBe("\\> This is a long tex");
    });

    test("escape before truncate preserves escapes", () => {
      const text = "*hello world*";

      const filters = [parseFilter("escape_md"), parseFilter("head=10")];

      const result = applyFilters(text, filters);
      // 1. escape_md: "\\*hello world\\*"
      // 2. head=10: "\\*hello wo"
      expect(result).toBe("\\*hello wo");
    });

    test("trim then tail", () => {
      const text = "  hello world  ";

      const filters = [parseFilter("trim"), parseFilter("tail=5")];

      const result = applyFilters(text, filters);
      // 1. trim: "hello world"
      // 2. tail=5: "world"
      expect(result).toBe("world");
    });

    test("complex chain", () => {
      const text = "  ## Title with *markdown* and more text  ";

      const filters = [
        parseFilter("trim"),
        parseFilter("head=25"),
        parseFilter("tail=15"),
        parseFilter("escape_md"),
      ];

      const result = applyFilters(text, filters);
      // 1. trim: "## Title with *markdown* and more text"
      // 2. head=25: "## Title with *markdown* "
      // 3. tail=15: "ith *markdown* "
      // 4. escape_md: "ith \*markdown\* "
      expect(result).toBe("ith \\*markdown\\* ");
    });

    test("single filter", () => {
      const filters = [parseFilter("trim")];
      expect(applyFilters("  text  ", filters)).toBe("text");
    });

    test("no filters", () => {
      expect(applyFilters("text", [])).toBe("text");
    });

    test("empty string through chain", () => {
      const filters = [
        parseFilter("trim"),
        parseFilter("head=10"),
        parseFilter("escape_md"),
      ];
      expect(applyFilters("", filters)).toBe("");
    });
  });
});

// ============================================================================
// LEXER / TOKENIZATION TESTS
// ============================================================================

describe("Lexer / Tokenization", () => {
  describe("basic text", () => {
    test("plain text", () => {
      const lexer = new Lexer("Hello world");
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(2); // TEXT + EOF
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toBe("Hello world");
      expect(tokens[1].type).toBe(TokenType.EOF);
    });

    test("empty string", () => {
      const lexer = new Lexer("");
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(1); // EOF only
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    test("whitespace", () => {
      const lexer = new Lexer("   \n\t  ");
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(2); // TEXT + EOF
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toBe("   \n\t  ");
    });
  });

  describe("variable substitution", () => {
    test("simple variable", () => {
      const lexer = new Lexer("${{name}}");
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.VARIABLE, value: "name" })
      );
    });

    test("dot notation", () => {
      const lexer = new Lexer("${{user.name}}");
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({
          type: TokenType.VARIABLE,
          value: "user.name",
        })
      );
    });

    test("variable with filter", () => {
      const lexer = new Lexer("${{text | trim}}");
      const tokens = lexer.tokenize();
      // Should parse as VARIABLE with filter info
      const varToken = tokens.find(
        (t: { type: any }) => t.type === TokenType.VARIABLE
      );
      expect(varToken).toBeDefined();
      expect(varToken?.value).toContain("text");
      expect(varToken?.value).toContain("trim");
    });

    test("variable with default", () => {
      const lexer = new Lexer('${{name ?? "Anonymous"}}');
      const tokens = lexer.tokenize();
      const varToken = tokens.find(
        (t: { type: any }) => t.type === TokenType.VARIABLE
      );
      expect(varToken).toBeDefined();
      expect(varToken?.value).toContain("name");
      expect(varToken?.value).toContain("??");
      expect(varToken?.value).toContain("Anonymous");
    });

    test("multiple variables", () => {
      const lexer = new Lexer("${{a}} and ${{b}}");
      const tokens = lexer.tokenize();
      const varTokens = tokens.filter(
        (t: { type: any }) => t.type === TokenType.VARIABLE
      );
      expect(varTokens).toHaveLength(2);
    });
  });

  describe("conditionals", () => {
    test("simple IF", () => {
      const lexer = new Lexer("{{IF show}}text{{END_IF}}");
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.IF })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.END_IF })
      );
    });

    test("IF with ELSE", () => {
      const lexer = new Lexer("{{IF x}}A{{ELSE}}B{{END_IF}}");
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.IF })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.ELSE })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.END_IF })
      );
    });

    test("IF with ELSEIF", () => {
      const lexer = new Lexer("{{IF a}}A{{ELSEIF b}}B{{END_IF}}");
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.ELSEIF })
      );
    });

    test("nested IFs", () => {
      const lexer = new Lexer("{{IF a}}{{IF b}}text{{END_IF}}{{END_IF}}");
      const tokens = lexer.tokenize();
      const ifTokens = tokens.filter(
        (t: { type: any }) => t.type === TokenType.IF
      );
      const endIfTokens = tokens.filter(
        (t: { type: any }) => t.type === TokenType.END_IF
      );
      expect(ifTokens).toHaveLength(2);
      expect(endIfTokens).toHaveLength(2);
    });
  });

  describe("CASE blocks", () => {
    test("simple CASE", () => {
      const lexer = new Lexer(
        '{{CASE status}}{{WHEN "a"}}A{{END_WHEN}}{{END_CASE}}'
      );
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.CASE })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.WHEN })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.END_CASE })
      );
    });

    test("CASE with DEFAULT", () => {
      const lexer = new Lexer(
        '{{CASE x}}{{WHEN "a"}}A{{END_WHEN}}{{DEFAULT}}D{{END_DEFAULT}}{{END_CASE}}'
      );
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.DEFAULT })
      );
    });
  });

  describe("FOR loops", () => {
    test("FOR with AS", () => {
      const lexer = new Lexer("{{FOR items AS item}}${{item}}{{END_FOR}}");
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.FOR })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.END_FOR })
      );
    });

    test("nested FOR loops", () => {
      const lexer = new Lexer(
        "{{FOR a AS x}}{{FOR b AS y}}${{x}}${{y}}{{END_FOR}}{{END_FOR}}"
      );
      const tokens = lexer.tokenize();
      const forTokens = tokens.filter(
        (t: { type: any }) => t.type === TokenType.FOR
      );
      const endForTokens = tokens.filter(
        (t: { type: any }) => t.type === TokenType.END_FOR
      );
      expect(forTokens).toHaveLength(2);
      expect(endForTokens).toHaveLength(2);
    });
  });

  describe("tables", () => {
    test("table with header", () => {
      const lexer = new Lexer(
        "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}"
      );
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.TABLE })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.HEADER })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.ROW })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.END_TABLE })
      );
    });
  });

  describe("comments", () => {
    test("single-line comment", () => {
      const lexer = new Lexer("{{# This is a comment #}}");
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.COMMENT })
      );
    });

    test("multi-line comment", () => {
      const lexer = new Lexer("{{# Line 1\nLine 2\nLine 3 #}}");
      const tokens = lexer.tokenize();
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: TokenType.COMMENT })
      );
    });
  });

  describe("line and column tracking", () => {
    test("single line", () => {
      const lexer = new Lexer("Hello ${{name}}");
      const tokens = lexer.tokenize();
      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(1);
    });

    test("multiple lines", () => {
      const lexer = new Lexer("Line 1\n${{var}}\nLine 3");
      const tokens = lexer.tokenize();
      const varToken = tokens.find(
        (t: { type: any }) => t.type === TokenType.VARIABLE
      );
      expect(varToken?.line).toBe(2);
    });
  });

  describe("malformed syntax", () => {
    test("unclosed variable", () => {
      const lexer = new Lexer("${{name");
      expect(() => lexer.tokenize()).toThrow(/unclosed/i);
    });

    test("unclosed IF", () => {
      const lexer = new Lexer("{{IF show}}text");
      expect(() => lexer.tokenize()).toThrow(/Unclosed./i);
    });

    test("mismatched brackets", () => {
      const lexer = new Lexer("{{IF x}}{{END_FOR}}");
      expect(() => lexer.tokenize()).toThrow(/mismatched|unexpected/i);
    });
  });
});

// ============================================================================
// PARSER TESTS (AST Construction)
// ============================================================================

describe("Parser / AST Construction", () => {
  describe("basic parsing", () => {
    test("plain text", () => {
      const lexer = new Lexer("Hello world");
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.type).toBe("Program");
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe("Text");
      expect((ast.body[0] as TextNode).content).toBe("Hello world");
    });

    test("variable substitution", () => {
      const lexer = new Lexer("${{name}}");
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const varNode = ast.body[0] as VariableNode;
      expect(varNode.type).toBe("Variable");
      expect(varNode.path).toEqual(["name"]);
    });

    test("variable with dot notation", () => {
      const lexer = new Lexer("${{user.name}}");
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const varNode = ast.body[0] as VariableNode;
      expect(varNode.path).toEqual(["user", "name"]);
    });
  });

  describe("IF blocks", () => {
    test("simple IF", () => {
      const lexer = new Lexer("{{IF show}}content{{END_IF}}");
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const ifNode = ast.body[0] as IfNode;
      expect(ifNode.type).toBe("If");
      expect(ifNode.consequent).toHaveLength(1);
      expect(ifNode.alternate).toBeNull();
    });

    test("IF with ELSE", () => {
      const lexer = new Lexer("{{IF x}}A{{ELSE}}B{{END_IF}}");
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const ifNode = ast.body[0] as IfNode;
      expect(ifNode.consequent).toHaveLength(1);
      expect(ifNode.alternate).not.toBeNull();
      expect(Array.isArray(ifNode.alternate)).toBe(true);
    });

    test("IF with ELSEIF", () => {
      const lexer = new Lexer("{{IF a}}A{{ELSEIF b}}B{{END_IF}}");
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const ifNode = ast.body[0] as IfNode;
      expect(ifNode.alternate).not.toBeNull();
      expect((ifNode.alternate as IfNode).type).toBe("If");
    });

    test("nested IF", () => {
      const lexer = new Lexer(
        "{{IF outer}}{{IF inner}}text{{END_IF}}{{END_IF}}"
      );
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const outerIf = ast.body[0] as IfNode;
      expect(outerIf.consequent).toHaveLength(1);
      expect(outerIf.consequent[0].type).toBe("If");
    });
  });

  describe("CASE blocks", () => {
    test("simple CASE", () => {
      const lexer = new Lexer(
        '{{CASE status}}{{WHEN "active"}}Active{{END_WHEN}}{{END_CASE}}'
      );
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const caseNode = ast.body[0] as CaseNode;
      expect(caseNode.type).toBe("Case");
      expect(caseNode.cases).toHaveLength(1);
      expect(caseNode.cases[0].value).toBe("active");
    });

    test("CASE with multiple WHEN", () => {
      const lexer = new Lexer(
        '{{CASE x}}{{WHEN "a"}}A{{END_WHEN}}{{WHEN "b"}}B{{END_WHEN}}{{END_CASE}}'
      );
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const caseNode = ast.body[0] as CaseNode;
      expect(caseNode.cases).toHaveLength(2);
    });

    test("CASE with DEFAULT", () => {
      const lexer = new Lexer(
        '{{CASE x}}{{WHEN "a"}}A{{END_WHEN}}{{DEFAULT}}D{{END_DEFAULT}}{{END_CASE}}'
      );
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const caseNode = ast.body[0] as CaseNode;
      expect(caseNode.default).not.toBeNull();
    });
  });

  describe("FOR loops", () => {
    test("simple FOR", () => {
      const lexer = new Lexer("{{FOR items AS item}}${{item}}{{END_FOR}}");
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const forNode = ast.body[0] as ForNode;
      expect(forNode.type).toBe("For");
      expect(forNode.iterable).toEqual(["items"]);
      expect(forNode.itemName).toBe("item");
    });

    test("nested FOR", () => {
      const lexer = new Lexer(
        "{{FOR outer AS o}}{{FOR inner AS i}}${{o}}${{i}}{{END_FOR}}{{END_FOR}}"
      );
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const outerFor = ast.body[0] as ForNode;
      expect(outerFor.body).toHaveLength(1);
      expect(outerFor.body[0].type).toBe("For");
    });
  });

  describe("tables", () => {
    test("table with header and row", () => {
      const lexer = new Lexer(
        "{{TABLE}}{{HEADER}}A|B{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}"
      );
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const tableNode = ast.body[0] as TableNode;
      expect(tableNode.type).toBe("Table");
      expect(tableNode.hasHeader).toBe(true);
      expect(tableNode.rows).toHaveLength(1);
    });

    test("table without header", () => {
      const lexer = new Lexer("{{TABLE}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}");
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const tableNode = ast.body[0] as TableNode;
      expect(tableNode.hasHeader).toBe(false);
      expect(tableNode.header).toBeNull();
    });
  });

  describe("lists", () => {
    test("simple list", () => {
      const lexer = new Lexer(
        "{{LIST}}{{LIST_ITEM}}Item 1{{END_LIST_ITEM}}{{END_LIST}}"
      );
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const listNode = ast.body[0] as ListNode;
      expect(listNode.type).toBe("List");
      expect(listNode.items).toHaveLength(1);
    });

    test("nested list", () => {
      const lexer = new Lexer(
        "{{LIST}}{{LIST_ITEM}}Parent{{LIST}}{{LIST_ITEM}}Child{{END_LIST_ITEM}}{{END_LIST}}{{END_LIST_ITEM}}{{END_LIST}}"
      );
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const outerList = ast.body[0] as ListNode;
      const firstItem = outerList.items[0] as ListItemNode;
      // Check that nested list is in content
      expect(
        firstItem.content.some((node: { type: string }) => node.type === "List")
      ).toBe(true);
    });
  });

  describe("comments", () => {
    test("comment node", () => {
      const lexer = new Lexer("{{# This is a comment #}}");
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const commentNode = ast.body[0] as CommentNode;
      expect(commentNode.type).toBe("Comment");
      expect(commentNode.content).toContain("This is a comment");
    });

    test("comments are excluded from output", () => {
      const lexer = new Lexer("Before{{# comment #}}After");
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Comment should not affect surrounding text nodes
      const textNodes = ast.body.filter(
        (n: { type: string }) => n.type === "Text"
      );
      expect(textNodes).toHaveLength(2);
    });
  });
});

// ============================================================================
// EXPRESSION EVALUATION TESTS
// ============================================================================

describe("Expression Evaluation", () => {
  describe("simple conditions", () => {
    test("variable truthiness", () => {
      const v = vars([["name", "Alice"]]);
      expect(evaluateCondition("name", v)).toBe(true);
    });

    test("variable falsiness", () => {
      const v = vars([["empty", ""]]);
      expect(evaluateCondition("empty", v)).toBe(false);
    });

    test("missing variable", () => {
      const v = vars([]);
      expect(evaluateCondition("missing", v)).toBe(false);
    });
  });

  describe("comparison operators", () => {
    test("== equality", () => {
      const v = vars([["status", "active"]]);
      expect(evaluateCondition('status == "active"', v)).toBe(true);
      expect(evaluateCondition('status == "inactive"', v)).toBe(false);
    });

    test("!= inequality", () => {
      const v = vars([["status", "active"]]);
      expect(evaluateCondition('status != "inactive"', v)).toBe(true);
      expect(evaluateCondition('status != "active"', v)).toBe(false);
    });

    test("> greater than", () => {
      const v = vars([["age", 25]]);
      expect(evaluateCondition("age > 18", v)).toBe(true);
      expect(evaluateCondition("age > 30", v)).toBe(false);
    });

    test("> with string numbers", () => {
      const v = vars([["age", "25"]]);
      expect(evaluateCondition("age > 18", v)).toBe(true);
      expect(evaluateCondition("age > 30", v)).toBe(false);
    });

    test("< less than", () => {
      const v = vars([["age", 15]]);
      expect(evaluateCondition("age < 18", v)).toBe(true);
      expect(evaluateCondition("age < 10", v)).toBe(false);
    });

    test(">= greater or equal", () => {
      const v = vars([["score", 90]]);
      expect(evaluateCondition("score >= 90", v)).toBe(true);
      expect(evaluateCondition("score >= 100", v)).toBe(false);
    });

    test("<= less or equal", () => {
      const v = vars([["score", 85]]);
      expect(evaluateCondition("score <= 90", v)).toBe(true);
      expect(evaluateCondition("score <= 80", v)).toBe(false);
    });

    test("throws on non-numeric comparison", () => {
      const v = vars([["name", "Alice"]]);
      expect(() => evaluateCondition("name > 18", v)).toThrow(
        /cannot use operator.*non-numeric/i
      );
    });
  });

  describe("string operators", () => {
    test("contains", () => {
      const v = vars([["email", "user@gmail.com"]]);
      expect(evaluateCondition('email contains "@gmail"', v)).toBe(true);
      expect(evaluateCondition('email contains "@yahoo"', v)).toBe(false);
    });

    test("startsWith", () => {
      const v = vars([["url", "https://example.com"]]);
      expect(evaluateCondition('url startsWith "https://"', v)).toBe(true);
      expect(evaluateCondition('url startsWith "http://"', v)).toBe(false);
    });

    test("endsWith", () => {
      const v = vars([["filename", "document.pdf"]]);
      expect(evaluateCondition('filename endsWith ".pdf"', v)).toBe(true);
      expect(evaluateCondition('filename endsWith ".docx"', v)).toBe(false);
    });
  });

  describe("type check operators", () => {
    test("isEmpty", () => {
      const v = vars([
        ["empty", ""],
        ["notEmpty", "text"],
      ]);
      expect(evaluateCondition("empty isEmpty", v)).toBe(true);
      expect(evaluateCondition("notEmpty isEmpty", v)).toBe(false);
    });

    test("isEmpty with whitespace", () => {
      const v = vars([["whitespace", "   "]]);
      expect(evaluateCondition("whitespace isEmpty", v)).toBe(true);
    });

    test("isNotEmpty", () => {
      const v = vars([["text", "content"]]);
      expect(evaluateCondition("text isNotEmpty", v)).toBe(true);
    });

    test("isArray with native array", () => {
      const v = vars([["items", [1, 2, 3]]]);
      expect(evaluateCondition("items isArray", v)).toBe(true);
    });

    test("isArray with JSON string", () => {
      const v = vars([["items", "[1,2,3]"]]);
      expect(evaluateCondition("items isArray", v)).toBe(true);
    });

    test("isArray with non-array", () => {
      const v = vars([["text", "not an array"]]);
      expect(evaluateCondition("text isArray", v)).toBe(true); // Seems off, but since "not an array" becomes the single string
    });

    test("isNumber with number", () => {
      const v = vars([["age", 42]]);
      expect(evaluateCondition("age isNumber", v)).toBe(true);
    });

    test("isNumber with string number", () => {
      const v = vars([["age", "42"]]);
      expect(evaluateCondition("age isNumber", v)).toBe(true);
    });

    test("isNumber with non-number", () => {
      const v = vars([["text", "abc"]]);
      expect(evaluateCondition("text isNumber", v)).toBe(false);
    });

    test("isObject with native object", () => {
      const v = vars([["user", { name: "Alice" }]]);
      expect(evaluateCondition("user isObject", v)).toBe(true);
    });

    test("isObject with JSON string", () => {
      const v = vars([["user", '{"name":"Alice"}']]);
      expect(evaluateCondition("user isObject", v)).toBe(true);
    });

    test("isObject with array", () => {
      const v = vars([["items", [1, 2]]]);
      expect(evaluateCondition("items isObject", v)).toBe(false);
    });

    test("isBoolean", () => {
      const v = vars([["flag", true]]);
      expect(evaluateCondition("flag isBoolean", v)).toBe(true);
    });
  });

  describe("logical operators", () => {
    test("AND both true", () => {
      const v = vars([
        ["a", "yes"],
        ["b", "yes"],
      ]);
      expect(evaluateCondition("a AND b", v)).toBe(true);
    });

    test("AND one false", () => {
      const v = vars([
        ["a", "yes"],
        ["b", ""],
      ]);
      expect(evaluateCondition("a AND b", v)).toBe(false);
    });

    test("OR both false", () => {
      const v = vars([
        ["a", ""],
        ["b", ""],
      ]);
      expect(evaluateCondition("a OR b", v)).toBe(false);
    });

    test("OR one true", () => {
      const v = vars([
        ["a", ""],
        ["b", "yes"],
      ]);
      expect(evaluateCondition("a OR b", v)).toBe(true);
    });

    test("NOT true becomes false", () => {
      const v = vars([["active", "yes"]]);
      expect(evaluateCondition("NOT(active)", v)).toBe(false);
    });

    test("NOT false becomes true", () => {
      const v = vars([["inactive", ""]]);
      expect(evaluateCondition("NOT(inactive)", v)).toBe(true);
    });

    test("complex: AND and OR", () => {
      const v = vars([
        ["a", "yes"],
        ["b", ""],
        ["c", "yes"],
      ]);
      // a AND b OR c = false OR true = true
      expect(evaluateCondition("a AND b OR c", v)).toBe(true);
    });

    test("parentheses change precedence", () => {
      const v = vars([
        ["a", "yes"],
        ["b", ""],
        ["c", "yes"],
      ]);
      // a AND (b OR c) = true AND true = true
      expect(evaluateCondition("a AND (b OR c)", v)).toBe(true);
    });

    test("NOT with complex expression", () => {
      const v = vars([
        ["a", "yes"],
        ["b", "yes"],
      ]);
      expect(evaluateCondition("NOT(a AND b)", v)).toBe(false);
    });
  });

  describe("math expressions", () => {
    test("addition", () => {
      const v = vars([
        ["a", 10],
        ["b", 5],
      ]);
      expect(evaluateMathExpression("a + b", v)).toBe(15);
    });

    test("subtraction", () => {
      const v = vars([
        ["a", 10],
        ["b", 3],
      ]);
      expect(evaluateMathExpression("a - b", v)).toBe(7);
    });

    test("multiplication", () => {
      const v = vars([
        ["price", 10],
        ["quantity", 3],
      ]);
      expect(evaluateMathExpression("price * quantity", v)).toBe(30);
    });

    test("division", () => {
      const v = vars([
        ["total", 100],
        ["count", 4],
      ]);
      expect(evaluateMathExpression("total / count", v)).toBe(25);
    });

    test("modulo", () => {
      const v = vars([["value", 10]]);
      expect(evaluateMathExpression("value % 3", v)).toBe(1);
    });

    test("parentheses", () => {
      const v = vars([
        ["a", 2],
        ["b", 3],
        ["c", 4],
      ]);
      expect(evaluateMathExpression("(a + b) * c", v)).toBe(20);
    });

    test("operator precedence", () => {
      const v = vars([
        ["a", 2],
        ["b", 3],
        ["c", 4],
      ]);
      // 2 + 3 * 4 = 2 + 12 = 14
      expect(evaluateMathExpression("a + b * c", v)).toBe(14);
    });

    test("with string numbers", () => {
      const v = vars([
        ["a", "10"],
        ["b", "5"],
      ]);
      expect(evaluateMathExpression("a + b", v)).toBe(15);
    });

    test("throws on non-numeric", () => {
      const v = vars([["text", "abc"]]);
      expect(() => evaluateMathExpression("text + 5", v)).toThrow(
        /non-numeric/i
      );
    });
  });

  describe("truthiness evaluation", () => {
    test("non-empty string is truthy", () => {
      const v = vars([["text", "hello"]]);
      expect(evaluateCondition("text", v)).toBe(true);
    });

    test("empty string is falsy", () => {
      const v = vars([["empty", ""]]);
      expect(evaluateCondition("empty", v)).toBe(false);
    });

    test("whitespace-only is falsy", () => {
      const v = vars([["whitespace", "   "]]);
      expect(evaluateCondition("whitespace", v)).toBe(false);
    });

    test('string "false" is falsy', () => {
      const v = vars([["flag", "false"]]);
      expect(evaluateCondition("flag", v)).toBe(false);
    });

    test('string "0" is falsy', () => {
      const v = vars([["zero", "0"]]);
      expect(evaluateCondition("zero", v)).toBe(false);
    });

    test('string "no" is falsy', () => {
      const v = vars([["answer", "no"]]);
      expect(evaluateCondition("answer", v)).toBe(false);
    });

    test("number 0 is falsy", () => {
      const v = vars([["count", 0]]);
      expect(evaluateCondition("count", v)).toBe(false);
    });

    test("non-zero number is truthy", () => {
      const v = vars([["count", 1]]);
      expect(evaluateCondition("count", v)).toBe(true);
    });

    test("boolean true is truthy", () => {
      const v = vars([["flag", true]]);
      expect(evaluateCondition("flag", v)).toBe(true);
    });

    test("boolean false is falsy", () => {
      const v = vars([["flag", false]]);
      expect(evaluateCondition("flag", v)).toBe(false);
    });

    test("empty array is falsy", () => {
      const v = vars([["items", []]]);
      expect(evaluateCondition("items", v)).toBe(false);
    });

    test("non-empty array is truthy", () => {
      const v = vars([["items", [1]]]);
      expect(evaluateCondition("items", v)).toBe(true);
    });

    test("empty object is falsy", () => {
      const v = vars([["data", {}]]);
      expect(evaluateCondition("data", v)).toBe(false);
    });

    test("non-empty object is truthy", () => {
      const v = vars([["data", { a: 1 }]]);
      expect(evaluateCondition("data", v)).toBe(true);
    });

    test("null is falsy", () => {
      const v = vars([["value", null]]);
      expect(evaluateCondition("value", v)).toBe(false);
    });

    test("undefined is falsy", () => {
      const v = vars([["value", undefined]]);
      expect(evaluateCondition("value", v)).toBe(false);
    });
  });
});

// ============================================================================
// INTERPRETER TESTS (Full Template Resolution)
// ============================================================================

describe("Interpreter / Template Resolution", () => {
  describe("variable substitution", () => {
    test("simple variable", () => {
      const v = vars([["name", "Alice"]]);
      expect(resolve("Hello ${{name}}!", v)).toBe("Hello Alice!");
    });

    test("multiple variables", () => {
      const v = vars([
        ["first", "Alice"],
        ["last", "Smith"],
      ]);
      expect(resolve("${{first}} ${{last}}", v)).toBe("Alice Smith");
    });

    test("dot notation", () => {
      const v = vars([["user", { name: "Alice", age: 30 }]]);
      expect(resolve("${{user.name}} is ${{user.age}}", v)).toBe("Alice is 30");
    });

    test("dot notation with JSON string", () => {
      const v = vars([["user", '{"name":"Alice","age":30}']]);
      expect(resolve("${{user.name}} is ${{user.age}}", v)).toBe("Alice is 30");
    });

    test("array index access", () => {
      const v = vars([["items", [1, 2, 3]]]);
      expect(resolve("${{items.0}}, ${{items.1}}, ${{items.2}}", v)).toBe(
        "1, 2, 3"
      );
    });

    test("array index out of bounds returns null", () => {
      const v = vars([["items", [1, 2, 3]]]);
      expect(resolve("${{items.10}}", v)).toBe("");
    });

    test("missing variable", () => {
      const v = vars([]);
      expect(resolve("Hello ${{missing}}!", v, { strictMode: false })).toBe(
        "Hello !"
      );
    });

    test("null variable", () => {
      const v = vars([["value", null]]);
      expect(resolve("Value: ${{value}}", v, { strictMode: false })).toBe(
        "Value: "
      );
    });
  });

  describe("default operator", () => {
    test("uses default for null", () => {
      const v = vars([["name", null]]);
      expect(resolve('${{name ?? "Anonymous"}}', v)).toBe("Anonymous");
    });

    test("uses default for undefined", () => {
      const v = vars([["name", undefined]]);
      expect(
        resolve('${{name ?? "Anonymous"}}', v, { strictMode: false })
      ).toBe("Anonymous");
    });

    test("uses default for empty string", () => {
      const v = vars([["name", ""]]);
      expect(resolve('${{name ?? "Anonymous"}}', v)).toBe("Anonymous");
    });

    test("uses default for 0", () => {
      const v = vars([["count", 0]]);
      expect(resolve('${{count ?? "N/A"}}', v)).toBe("N/A");
    });

    test("uses default for false", () => {
      const v = vars([["flag", false]]);
      expect(resolve('${{flag ?? "Unknown"}}', v)).toBe("Unknown");
    });

    test("uses default for empty array", () => {
      const v = vars([["items", []]]);
      expect(resolve('${{items ?? "None"}}', v)).toBe("None");
    });

    test("uses default for empty object", () => {
      const v = vars([["data", {}]]);
      expect(resolve('${{data ?? "No data"}}', v)).toBe("No data");
    });

    test("does not use default for non-falsy", () => {
      const v = vars([["name", "Alice"]]);
      expect(resolve('${{name ?? "Anonymous"}}', v)).toBe("Alice");
    });

    test('does not use default for string "0"', () => {
      // String "0" is falsy in truthiness, so default should be used
      const v = vars([["value", "0"]]);
      expect(resolve('${{value ?? "None"}}', v)).toBe("None");
    });
  });

  describe("filters", () => {
    test("single filter", () => {
      const v = vars([["text", "  hello  "]]);
      expect(resolve("${{text | trim}}", v)).toBe("hello");
    });

    test("filter chain", () => {
      const v = vars([["text", "  long text with *markdown*  "]]);
      expect(resolve("${{text | trim | head=10 | escape_md}}", v)).toBe(
        "long text "
      );
    });

    test("filter with default operator", () => {
      const v = vars([["text", null]]);
      expect(resolve('${{text ?? "default" | trim | head=5}}', v)).toBe(
        "defau"
      );
    });
  });

  describe("IF blocks", () => {
    test("true condition shows content", () => {
      const v = vars([["show", "yes"]]);
      expect(resolve("{{IF show}}visible{{END_IF}}", v)).toBe("visible");
    });

    test("false condition hides content", () => {
      const v = vars([["show", ""]]);
      expect(resolve("{{IF show}}hidden{{END_IF}}", v)).toBe("");
    });

    test("ELSE branch", () => {
      const v = vars([["show", ""]]);
      expect(resolve("{{IF show}}A{{ELSE}}B{{END_IF}}", v)).toBe("B");
    });

    test("ELSEIF branch", () => {
      const v = vars([
        ["a", ""],
        ["b", "yes"],
      ]);
      expect(resolve("{{IF a}}A{{ELSEIF b}}B{{ELSE}}C{{END_IF}}", v)).toBe("B");
    });

    test("with comparison operator", () => {
      const v = vars([["age", 25]]);
      expect(resolve("{{IF age >= 18}}Adult{{ELSE}}Minor{{END_IF}}", v)).toBe(
        "Adult"
      );
    });

    test("with AND condition", () => {
      const v = vars([
        ["a", "yes"],
        ["b", "yes"],
      ]);
      expect(resolve("{{IF a AND b}}Both{{END_IF}}", v)).toBe("Both");
    });

    test("with NOT condition", () => {
      const v = vars([["empty", ""]]);
      expect(resolve("{{IF NOT(empty)}}Not empty{{END_IF}}", v)).toBe(
        "Not empty"
      );
    });

    test("nested IF", () => {
      const v = vars([
        ["outer", "yes"],
        ["inner", "yes"],
      ]);
      expect(resolve("{{IF outer}}O{{IF inner}}I{{END_IF}}{{END_IF}}", v)).toBe(
        "OI"
      );
    });
  });

  describe("CASE blocks", () => {
    test("matches first WHEN", () => {
      const v = vars([["status", "active"]]);
      const template =
        '{{CASE status}}{{WHEN "active"}}Active{{END_WHEN}}{{WHEN "inactive"}}Inactive{{END_WHEN}}{{END_CASE}}';
      expect(resolve(template, v)).toBe("Active");
    });

    test("matches second WHEN", () => {
      const v = vars([["status", "inactive"]]);
      const template =
        '{{CASE status}}{{WHEN "active"}}Active{{END_WHEN}}{{WHEN "inactive"}}Inactive{{END_WHEN}}{{END_CASE}}';
      expect(resolve(template, v)).toBe("Inactive");
    });

    test("falls to DEFAULT", () => {
      const v = vars([["status", "unknown"]]);
      const template =
        '{{CASE status}}{{WHEN "active"}}Active{{END_WHEN}}{{DEFAULT}}Unknown{{END_DEFAULT}}{{END_CASE}}';
      expect(resolve(template, v)).toBe("Unknown");
    });

    test("no match and no DEFAULT", () => {
      const v = vars([["status", "unknown"]]);
      const template =
        '{{CASE status}}{{WHEN "active"}}Active{{END_WHEN}}{{END_CASE}}';
      expect(resolve(template, v)).toBe("");
    });
  });

  describe("FOR loops", () => {
    test("simple loop", () => {
      const v = vars([["items", ["a", "b", "c"]]]);
      expect(resolve("{{FOR items AS item}}${{item}},{{END_FOR}}", v)).toBe(
        "a,b,c,"
      );
    });

    test("loop with JSON array string", () => {
      const v = vars([["items", '["a","b","c"]']]);
      expect(resolve("{{FOR items AS item}}${{item}},{{END_FOR}}", v)).toBe(
        "a,b,c,"
      );
    });

    test("loop with object array", () => {
      const v = vars([["users", [{ name: "Alice" }, { name: "Bob" }]]]);
      expect(
        resolve("{{FOR users AS user}}${{user.name}},{{END_FOR}}", v)
      ).toBe("Alice,Bob,");
    });

    test("loop with @index0", () => {
      const v = vars([["items", ["a", "b", "c"]]]);
      expect(
        resolve("{{FOR items AS item}}${{@index0}}:${{item}} {{END_FOR}}", v)
      ).toBe("0:a 1:b 2:c ");
    });

    test("loop with @index1", () => {
      const v = vars([["items", ["a", "b", "c"]]]);
      expect(
        resolve("{{FOR items AS item}}${{@index1}}:${{item}} {{END_FOR}}", v)
      ).toBe("1:a 2:b 3:c ");
    });

    test("loop with @first", () => {
      const v = vars([["items", ["a", "b", "c"]]]);
      expect(
        resolve(
          "{{FOR items AS item}}{{IF @first}}First: {{END_IF}}${{item}} {{END_FOR}}",
          v
        )
      ).toBe("First: a b c ");
    });

    test("loop with @last", () => {
      const v = vars([["items", ["a", "b", "c"]]]);
      expect(
        resolve(
          "{{FOR items AS item}}${{item}}{{IF @last}}!{{ELSE}},{{END_IF}}{{END_FOR}}",
          v
        )
      ).toBe("a,b,c!");
    });

    test("can iterate over nested array with @notLast", () => {
      const v = vars([["response", { data: { items: ["a", "b", "c"] } }]]);
      const template =
        "{{FOR response.data.items AS item}}${{item}}{{IF @notLast}}, {{END_IF}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("a, b, c");
    });

    test("can iterate over nested array with @notFirst", () => {
      const v = vars([["response", { data: { items: ["a", "b", "c"] } }]]);
      const template =
        "{{FOR response.data.items AS item}}{{IF @notFirst}},{{END_IF}}${{item}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("a,b,c");
    });

    test("nested loops", () => {
      const v = vars([
        ["outer", [1, 2]],
        ["inner", ["a", "b"]],
      ]);
      const template =
        "{{FOR outer AS o}}{{FOR inner AS i}}${{o}}${{i}} {{END_FOR}}{{END_FOR}}";
      expect(resolve(template, v)).toBe("1a 1b 2a 2b ");
    });

    test("empty array", () => {
      const v = vars([["items", []]]);
      expect(resolve("{{FOR items AS item}}${{item}}{{END_FOR}}", v)).toBe("");
    });
  });

  describe("lists", () => {
    test("simple list", () => {
      const v = vars([]);
      const template =
        "{{LIST}}{{LIST_ITEM}}Item 1{{END_LIST_ITEM}}{{LIST_ITEM}}Item 2{{END_LIST_ITEM}}{{END_LIST}}";
      expect(resolve(template, v)).toContain("1. Item 1");
      expect(resolve(template, v)).toContain("2. Item 2");
    });

    test("conditional list item", () => {
      const v = vars([
        ["show", true],
        ["hide", false],
      ]);
      const template =
        "{{LIST}}{{LIST_ITEM show}}Visible{{END_LIST_ITEM}}{{LIST_ITEM hide}}Hidden{{END_LIST_ITEM}}{{END_LIST}}";
      const result = resolve(template, v);
      expect(result).toContain("1. Visible");
      expect(result).not.toContain("Hidden");
    });

    test("list with fallback", () => {
      const v = vars([["missing", ""]]);
      const template =
        '{{LIST}}{{LIST_ITEM missing | fallback="Default"}}Should not show{{END_LIST_ITEM}}{{END_LIST}}';
      const result = resolve(template, v);
      expect(result).toContain("1. Default");
    });

    test("nested lists", () => {
      const v = vars([]);
      const template = `{{LIST}}
{{LIST_ITEM}}Parent 1
  {{LIST}}
  {{LIST_ITEM}}Child 1.1{{END_LIST_ITEM}}
  {{LIST_ITEM}}Child 1.2{{END_LIST_ITEM}}
  {{END_LIST}}
{{END_LIST_ITEM}}
{{LIST_ITEM}}Parent 2{{END_LIST_ITEM}}
{{END_LIST}}`;
      const result = resolve(template, v);
      expect(result).toContain("1. Parent 1");
      expect(result).toContain("   1. Child 1.1");
      expect(result).toContain("   2. Child 1.2");
      expect(result).toContain("2. Parent 2");
    });
  });

  describe("tables", () => {
    test("table with header", () => {
      const v = vars([]);
      const template =
        "{{TABLE}}{{HEADER}}Name|Age{{END_HEADER}}{{ROW}}Alice|30{{END_ROW}}{{ROW}}Bob|25{{END_ROW}}{{END_TABLE}}";
      const result = resolve(template, v);
      expect(result).toContain("| Name | Age |");
      expect(result).toContain("|:-----|:-----|");
      expect(result).toContain("| Alice | 30 |");
      expect(result).toContain("| Bob | 25 |");
    });

    test("table without header", () => {
      const v = vars([]);
      const template =
        "{{TABLE}}{{ROW}}Key|Value{{END_ROW}}{{ROW}}Name|Alice{{END_ROW}}{{END_TABLE}}";
      const result = resolve(template, v);
      expect(result).toContain("| Key | Value |");
      expect(result).toContain("| Name | Alice |");
      expect(result).not.toContain("|------|-------|"); // No header separator
    });

    test("table with variables", () => {
      const v = vars([
        ["name", "Alice"],
        ["age", 30],
      ]);
      const template =
        "{{TABLE}}{{HEADER}}Name|Age{{END_HEADER}}{{ROW}}${{name}}|${{age}}{{END_ROW}}{{END_TABLE}}";
      const result = resolve(template, v);
      expect(result).toContain("| Alice | 30 |");
    });

    test("table with FOR loop", () => {
      const v = vars([
        [
          "users",
          [
            { name: "Alice", age: 30 },
            { name: "Bob", age: 25 },
          ],
        ],
      ]);
      const template =
        "{{TABLE}}{{HEADER}}Name|Age{{END_HEADER}}{{FOR users AS user}}{{ROW}}${{user.name}}|${{user.age}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}";
      const result = resolve(template, v);
      expect(result).toContain("| Alice | 30 |");
      expect(result).toContain("| Bob | 25 |");
    });

    test("table with alignment", () => {
      const v = vars([]);
      const template =
        '{{TABLE align="left|center|right"}}{{HEADER}}Left|Center|Right{{END_HEADER}}{{ROW}}A|B|C{{END_ROW}}{{END_TABLE}}';
      const result = resolve(template, v);
      expect(result).toContain("|:-----|:------:|-----:|");
    });

    test("auto-pads columns", () => {
      const v = vars([]);
      const template =
        "{{TABLE}}{{HEADER}}A|B|C{{END_HEADER}}{{ROW}}1|2{{END_ROW}}{{END_TABLE}}";
      const result = resolve(template, v);
      expect(result).toContain("| 1 | 2 |  |"); // Third column padded with empty string
    });
  });

  describe("comments", () => {
    test("comments are removed", () => {
      const v = vars([]);
      expect(resolve("Before{{# This is a comment #}}After", v)).toBe(
        "BeforeAfter"
      );
    });

    test("multi-line comments", () => {
      const v = vars([]);
      const template = "Before{{# Line 1\nLine 2\nLine 3 #}}After";
      expect(resolve(template, v)).toBe("BeforeAfter");
    });

    test("comments in conditionals", () => {
      const v = vars([["show", true]]);
      const template = "{{IF show}}{{# TODO: improve this #}}Content{{END_IF}}";
      expect(resolve(template, v)).toBe("Content");
      expect(resolve(template, v)).not.toContain("TODO");
    });
  });

  describe("math operations", () => {
    test("simple addition", () => {
      const v = vars([
        ["a", 10],
        ["b", 5],
      ]);
      expect(resolve("${{a + b}}", v)).toBe("15");
    });

    test("multiplication", () => {
      const v = vars([
        ["price", 10],
        ["quantity", 3],
      ]);
      expect(resolve("Total: ${{price * quantity}}", v)).toBe("Total: 30");
    });

    test("with parentheses", () => {
      const v = vars([
        ["a", 2],
        ["b", 3],
        ["c", 4],
      ]);
      expect(resolve("${{(a + b) * c}}", v)).toBe("20");
    });

    test("in loop with @index", () => {
      const v = vars([["items", ["a", "b", "c"]]]);
      expect(
        resolve(
          "{{FOR items AS item}}${{@index0 + 1}}. ${{item}} {{END_FOR}}",
          v
        )
      ).toBe("1. a 2. b 3. c ");
    });
  });

  describe("complex integration", () => {
    test("blog post template", () => {
      const v = vars([
        ["title", "My Blog Post"],
        ["author", "Alice"],
        ["published", true],
        ["tags", ["tech", "programming", "web"]],
        ["content", "This is the content..."],
      ]);

      const template = `# \${{title}}

{{IF author}}By \${{author}}{{END_IF}}

{{IF published}}**Status**: Published{{ELSE}}**Status**: Draft{{END_IF}}

**Tags**: {{FOR tags AS tag}}\${{tag}}{{IF @last}}{{ELSE}}, {{END_IF}}{{END_FOR}}

---

\${{content}}`;

      const result = resolve(template, v);
      expect(result).toContain("# My Blog Post");
      expect(result).toContain("By Alice");
      expect(result).toContain("Published");
      expect(result).toContain("tech, programming, web");
      expect(result).toContain("This is the content...");
    });

    test("data report template", () => {
      const v = vars([
        ["reportTitle", "Q4 Sales Report"],
        ["quarter", "Q4"],
        ["year", 2024],
        ["total", 1500000],
        [
          "regions",
          [
            { name: "North", revenue: 500000, growth: 15 },
            { name: "South", revenue: 400000, growth: 10 },
            { name: "East", revenue: 350000, growth: 20 },
            { name: "West", revenue: 250000, growth: 5 },
          ],
        ],
      ]);

      const template = `# \${{reportTitle}}

**Period**: \${{quarter}} \${{year}}
**Total Revenue**: $\${{total ?? "N/A"}}

## Regional Performance

{{TABLE}}
{{HEADER}}Region|Revenue|Growth{{END_HEADER}}
{{FOR regions AS region}}
{{ROW}}\${{region.name}}|$\${{region.revenue}}|\${{region.growth}}%{{END_ROW}}
{{END_FOR}}
{{END_TABLE}}

{{# Analysis would go here #}}

{{IF total >= 1000000}}
ðŸŽ‰ **Milestone**: Exceeded $1M in revenue!
{{END_IF}}`;

      const result = resolve(template, v);
      expect(result).toContain("# Q4 Sales Report");
      expect(result).toContain("Q4 2024");
      expect(result).toContain("$1500000");
      expect(result).toContain("| North | $500000 | 15% |");
      expect(result).toContain("Exceeded $1M");
      expect(result).not.toContain("Analysis would go here");
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe("Error Handling", () => {
  describe("syntax errors", () => {
    test("unclosed variable", () => {
      expect(() => resolve("${{name", vars([]))).toThrow(/unclosed/i);
    });

    test("unclosed IF", () => {
      expect(() => resolve("{{IF show}}text", vars([]))).toThrow(/Unclosed./i);
    });

    test("unclosed FOR", () => {
      expect(() => resolve("{{FOR items AS i}}text", vars([]))).toThrow(
        /Unclosed./i
      );
    });

    test("unclosed TABLE", () => {
      expect(() => resolve("{{TABLE}}{{ROW}}A|B{{END_ROW}}", vars([]))).toThrow(
        /Unclosed/i
      );
    });

    test("mismatched tags", () => {
      expect(() => resolve("{{IF x}}{{END_FOR}}", vars([]))).toThrow(
        /without matching/i
      );
    });
  });

  describe("type errors", () => {
    test("numeric comparison on non-numeric", () => {
      const v = vars([["name", "Alice"]]);
      expect(() => resolve("{{IF name > 18}}Adult{{END_IF}}", v)).toThrow(
        /non-numeric/i
      );
    });

    test("accessing property on non-object string", () => {
      const v = vars([["text", "plain string"]]);
      expect(resolve("${{text.property}}", v)).toBe("");
    });

    test("iterating non-array", () => {
      const v = vars([["text", "not an array"]]);
      expect(resolve("{{FOR text AS item}}${{item}}{{END_FOR}}", v)).toBe(
        "not an array"
      );
    });
  });

  describe("strict mode", () => {
    test("throws on missing variable in strict mode", () => {
      const v = vars([]);
      const options = { strictMode: true };
      expect(() => resolve("${{missing}}", v, options)).toThrow(/not found/i);
    });

    test("allows missing variable in lenient mode", () => {
      const v = vars([]);
      const options = { strictMode: false };
      expect(resolve("${{missing}}", v, options)).toBe("");
    });
  });

  describe("error messages", () => {
    test("includes line and column", () => {
      try {
        resolve("Line 1\n{{IF x}}\nLine 3", vars([]));
        fail("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toMatch(/line\s*\d+/i);
        expect((error as Error).message).toMatch(/col\s*\d+/i);
      }
    });

    test("includes helpful suggestion", () => {
      const v = vars([["name", "Alice"]]);
      try {
        resolve("{{IF name > 18}}text{{END_IF}}", v);
        fail("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toMatch(/suggestion|try|use/i);
      }
    });

    test("shows available variables on missing", () => {
      const v = vars([
        ["username", "Alice"],
        ["email", "alice@example.com"],
      ]);
      try {
        resolve("${{name}}", v, { strictMode: true });
        fail("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toMatch(/available.*username.*email/i);
      }
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Integration Tests with Enhanced Coercion", () => {
  test("LLM response with comma-separated tags", () => {
    const v = vars([
      [
        "post_idea",
        {
          final_topic: "Machine Learning Basics",
          target_audience: "Beginners",
          tags: "AI,ML,tutorial,beginner-friendly",
        },
      ],
    ]);

    const template = `# \${{post_idea.final_topic}}

**Target Audience**: \${{post_idea.target_audience}}

**Tags**: {{FOR post_idea.tags AS tag}}#\${{tag}} {{END_FOR}}

{{IF post_idea.final_topic}}Topic selected!{{END_IF}}`;

    const result = resolve(template, v);
    expect(result).toContain("# Machine Learning Basics");
    expect(result).toContain("**Target Audience**: Beginners");
    expect(result).toContain("#AI #ML #tutorial #beginner-friendly");
    expect(result).toContain("Topic selected!");
  });

  test("API response with missing nested properties", () => {
    const v = vars([
      [
        "api_response",
        {
          status: "success",
          data: {
            title: "Article Title",
            // Note: author, tags, description missing
          },
        },
      ],
    ]);

    const template = `# \${{api_response.data.title}}

{{IF api_response.data.author}}
**Author**: \${{api_response.data.author}}
{{ELSE}}
**Author**: Anonymous
{{END_IF}}

{{IF api_response.data.description isNotEmpty}}
\${{api_response.data.description}}
{{ELSE}}
No description available.
{{END_IF}}

{{IF api_response.data.tags isArray}}
**Tags**: {{FOR api_response.data.tags AS tag}}\${{tag}}, {{END_FOR}}
{{ELSE}}
**Tags**: None
{{END_IF}}`;

    const result = resolve(template, v);
    expect(result).toContain("# Article Title");
    expect(result).toContain("**Author**: Anonymous");
    expect(result).toContain("No description available");
    expect(result).toContain("**Tags**: None");
  });

  test("LLM output with trailing commas in JSON", () => {
    const v = vars([
      [
        "llm_output",
        '{"suggestions":["idea1","idea2","idea3",],"status":"complete",}',
      ],
    ]);

    const template = `Status: \${{llm_output.status}}

Suggestions:
{{FOR llm_output.suggestions AS idea}}
- \${{idea}}
{{END_FOR}}`;

    const result = resolve(template, v);
    expect(result).toContain("Status: complete");
    expect(result).toContain("- idea1");
    expect(result).toContain("- idea2");
    expect(result).toContain("- idea3");
  });

  test("single value iteration in list context", () => {
    const v = vars([["single_tag", "important"]]);

    const template = `Tags:
{{FOR single_tag AS tag}}
- \${{tag}}
{{END_FOR}}`;

    const result = resolve(template, v);
    expect(result).toContain("- important");
  });

  test("mixed array formats in same template", () => {
    const v = vars([
      ["json_array", "[1,2,3]"],
      ["csv_array", "4,5,6"],
      ["single_item", 7],
      ["native_array", [8, 9, 10]],
    ]);

    const template = `All items:
{{FOR json_array AS item}}\${{item}}, {{END_FOR}}
{{FOR csv_array AS item}}\${{item}}, {{END_FOR}}
{{FOR single_item AS item}}\${{item}}, {{END_FOR}}
{{FOR native_array AS item}}\${{item}}, {{END_FOR}}`;

    const result = resolve(template, v);
    expect(result).toContain("1, 2, 3,");
    expect(result).toContain("4, 5, 6,");
    expect(result).toContain("7,");
    expect(result).toContain("8, 9, 10,");
  });

  test("graceful handling of deeply missing properties", () => {
    const v = vars([
      [
        "response",
        {
          // Very sparse object
          meta: {
            timestamp: "2024-01-01",
          },
        },
      ],
    ]);

    const template = `Timestamp: \${{response.meta.timestamp ?? "Unknown"}}
User: \${{response.data.user.name ?? "Anonymous"}}
Email: \${{response.data.user.email ?? "No email"}}
Posts: {{IF response.data.user.posts isArray}}{{FOR response.data.user.posts AS post}}\${{post.title}} {{END_FOR}}{{ELSE}}No posts{{END_IF}}`;

    const result = resolve(template, v);
    expect(result).toContain("Timestamp: 2024-01-01");
    expect(result).toContain("User: Anonymous");
    expect(result).toContain("Email: No email");
    expect(result).toContain("No posts");
  });
});

// ============================================================================
// EDGE CASES AND REGRESSION TESTS
// ============================================================================

describe("Edge Cases", () => {
  test("empty template", () => {
    expect(resolve("", vars([]))).toBe("");
  });

  test("only whitespace", () => {
    expect(resolve("   \n\t  ", vars([]))).toBe("   \n\t  ");
  });

  test("unicode characters", () => {
    const v = vars([["emoji", "ðŸŽ‰"]]);
    expect(resolve("Celebration: ${{emoji}}", v)).toBe("Celebration: ðŸŽ‰");
  });

  test("unicode in variable names", () => {
    const v = vars([["ç”¨æˆ·å", "Alice"]]);
    expect(resolve("${{ç”¨æˆ·å}}", v)).toBe("Alice");
  });

  test("emoji in content", () => {
    const v = vars([]);
    expect(resolve("Status: âœ… Done ðŸŽ¯", v)).toBe("Status: âœ… Done ðŸŽ¯");
  });

  test("very long variable name", () => {
    const longName = "a".repeat(100);
    const v = vars([[longName, "value"]]);
    expect(resolve(`\${{${longName}}}`, v)).toBe("value");
  });

  test("deeply nested structures", () => {
    const v = vars([]);
    const template =
      "{{IF a}}{{IF b}}{{IF c}}{{IF d}}{{IF e}}deep{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}{{END_IF}}";
    // Should parse without hitting depth limit
    expect(() => resolve(template, v)).not.toThrow();
  });

  test("special characters in text", () => {
    const v = vars([]);
    expect(resolve("Special: @#$%^&*()", v)).toBe("Special: @#$%^&*()");
  });

  test("HTML-like tags in text", () => {
    const v = vars([]);
    expect(resolve("<div>Not HTML</div>", v)).toBe("<div>Not HTML</div>");
  });

  test("markdown syntax in text", () => {
    const v = vars([]);
    expect(resolve("# Header\n**bold** *italic* `code`", v)).toBe(
      "# Header\n**bold** *italic* `code`"
    );
  });

  test("quotes in text", () => {
    const v = vars([]);
    expect(resolve("He said \"hello\" and 'goodbye'", v)).toBe(
      "He said \"hello\" and 'goodbye'"
    );
  });

  test("backslashes in text", () => {
    const v = vars([]);
    expect(resolve("Path: C:\\Users\\Desktop", v)).toBe(
      "Path: C:\\Users\\Desktop"
    );
  });

  test("newlines in text", () => {
    const v = vars([]);
    expect(resolve("Line 1\nLine 2\r\nLine 3", v)).toBe(
      "Line 1\nLine 2\nLine 3"
    );
  });

  test("tabs in text", () => {
    const v = vars([]);
    expect(resolve("Col1\tCol2\tCol3", v)).toBe("Col1\tCol2\tCol3");
  });

  test("very long text", () => {
    const v = vars([]);
    const longText = "x".repeat(10000);
    expect(resolve(longText, v)).toBe(longText);
  });

  test("empty variable value", () => {
    const v = vars([["empty", ""]]);
    expect(resolve("Value: [${{empty}}]", v)).toBe("Value: []");
  });

  test("variable with spaces in value", () => {
    const v = vars([["text", "  spaced  "]]);
    expect(resolve("[${{text}}]", v)).toBe("[  spaced  ]");
  });

  test("variable with newlines in value", () => {
    const v = vars([["multiline", "Line 1\nLine 2\nLine 3"]]);
    expect(resolve("${{multiline}}", v)).toBe("Line 1\nLine 2\nLine 3");
  });

  test("multiple adjacent variables", () => {
    const v = vars([
      ["a", "A"],
      ["b", "B"],
      ["c", "C"],
    ]);
    expect(resolve("${{a}}${{b}}${{c}}", v)).toBe("ABC");
  });

  test("variable at start and end", () => {
    const v = vars([
      ["start", "S"],
      ["end", "E"],
    ]);
    expect(resolve("${{start}} middle ${{end}}", v)).toBe("S middle E");
  });

  test("same variable multiple times", () => {
    const v = vars([["x", "X"]]);
    expect(resolve("${{x}} and ${{x}} and ${{x}}", v)).toBe("X and X and X");
  });

  test("case sensitivity in variable names", () => {
    const v = vars([
      ["Name", "Upper"],
      ["name", "lower"],
    ]);
    expect(resolve("${{Name}} vs ${{name}}", v)).toBe("Upper vs lower");
  });

  test("numbers in variable names", () => {
    const v = vars([
      ["var1", "one"],
      ["var2", "two"],
      ["var123", "many"],
    ]);
    expect(resolve("${{var1}} ${{var2}} ${{var123}}", v)).toBe("one two many");
  });

  test("underscores in variable names", () => {
    const v = vars([
      ["user_name", "Alice"],
      ["_private", "hidden"],
    ]);
    expect(resolve("${{user_name}} ${{_private}}", v)).toBe("Alice hidden");
  });

  test("deeply nested dot notation", () => {
    const v = vars([["a", { b: { c: { d: { e: { f: "deep" } } } } }]]);
    expect(resolve("${{a.b.c.d.e.f}}", v)).toBe("deep");
  });

  test("array index at multiple levels", () => {
    const v = vars([["data", [[["nested"]]]]]);
    expect(resolve("${{data.0.0.0}}", v)).toBe("nested");
  });

  test("mixed object and array access", () => {
    const v = vars([["data", { users: [{ name: "Alice" }, { name: "Bob" }] }]]);
    expect(
      resolve("${{data.users.0.name}} and ${{data.users.1.name}}", v)
    ).toBe("Alice and Bob");
  });

  test("null in various positions", () => {
    const v = vars([
      ["nullVal", null],
      ["obj", { nested: null }],
      ["arr", [null, "value", null]],
    ]);
    expect(
      resolve("${{nullVal}}|${{obj.nested}}|${{arr.0}}|${{arr.1}}", v)
    ).toBe("|||value");
  });

  test("undefined in various positions", () => {
    const v = vars([
      ["undefinedVal", undefined],
      ["obj", { nested: undefined }],
    ]);
    expect(
      resolve("${{undefinedVal}}|${{obj.nested}}", v, { strictMode: false })
    ).toBe("|");
  });

  test("boolean values in text", () => {
    const v = vars([
      ["t", true],
      ["f", false],
    ]);
    expect(resolve("True: ${{t}}, False: ${{f}}", v)).toBe(
      "True: true, False: false"
    );
  });

  test("zero values", () => {
    const v = vars([
      ["zero", 0],
      ["zeroStr", "0"],
    ]);
    expect(resolve("Num: ${{zero}}, Str: ${{zeroStr}}", v)).toBe(
      "Num: 0, Str: 0"
    );
  });

  test("NaN value", () => {
    const v = vars([["nan", NaN]]);
    expect(resolve("${{nan}}", v)).toBe("NaN");
  });

  test("Infinity values", () => {
    const v = vars([
      ["inf", Infinity],
      ["negInf", -Infinity],
    ]);
    expect(resolve("${{inf}} ${{negInf}}", v)).toBe("Infinity -Infinity");
  });

  test("empty array", () => {
    const v = vars([["arr", []]]);
    expect(resolve("${{arr}}", v)).toBe("[]");
  });

  test("empty object", () => {
    const v = vars([["obj", {}]]);
    expect(resolve("${{obj}}", v)).toBe("{}");
  });

  test("array with mixed types", () => {
    const v = vars([["mixed", [1, "two", true, null, { key: "value" }]]]);
    expect(resolve("${{mixed}}", v)).toBe(
      '[1,"two",true,null,{"key":"value"}]'
    );
  });

  test("object with array values", () => {
    const v = vars([["obj", { nums: [1, 2, 3], words: ["a", "b"] }]]);
    expect(resolve("${{obj.nums.0}} ${{obj.words.1}}", v)).toBe("1 b");
  });

  test("consecutive conditionals", () => {
    const v = vars([
      ["a", true],
      ["b", false],
      ["c", true],
    ]);
    const template =
      "{{IF a}}A{{END_IF}}{{IF b}}B{{END_IF}}{{IF c}}C{{END_IF}}";
    expect(resolve(template, v)).toBe("AC");
  });

  test("nested conditionals with same variable", () => {
    const v = vars([["x", true]]);
    const template = "{{IF x}}outer{{IF x}}inner{{END_IF}}{{END_IF}}";
    expect(resolve(template, v)).toBe("outerinner");
  });

  test("FOR loop with single item", () => {
    const v = vars([["items", ["only"]]]);
    expect(resolve("{{FOR items AS i}}${{i}}{{END_FOR}}", v)).toBe("only");
  });

  test("nested FOR with same item name", () => {
    const v = vars([
      ["outer", [1, 2]],
      ["inner", [3, 4]],
    ]);
    const template =
      "{{FOR outer AS i}}{{FOR inner AS i}}${{i}}{{END_FOR}}{{END_FOR}}";
    // Inner 'i' should shadow outer 'i'
    expect(resolve(template, v)).toBe("3434");
  });

  test("CASE with single WHEN", () => {
    const v = vars([["status", "active"]]);
    const template =
      '{{CASE status}}{{WHEN "active"}}Active{{END_WHEN}}{{END_CASE}}';
    expect(resolve(template, v)).toBe("Active");
  });

  test("CASE with no match and no DEFAULT", () => {
    const v = vars([["status", "unknown"]]);
    const template =
      '{{CASE status}}{{WHEN "active"}}Active{{END_WHEN}}{{END_CASE}}';
    expect(resolve(template, v)).toBe("");
  });

  test("default operator with all falsy types", () => {
    const v = vars([
      ["null", null],
      ["undef", undefined],
      ["empty", ""],
      ["zero", 0],
      ["false", false],
      ["emptyArr", []],
      ["emptyObj", {}],
    ]);
    const template = `\${{null ?? "N"}}|\${{undef ?? "U"}}|\${{empty ?? "E"}}|\${{zero ?? "Z"}}|\${{false ?? "F"}}|\${{emptyArr ?? "A"}}|\${{emptyObj ?? "O"}}`;
    expect(resolve(template, v)).toBe("N|U|E|Z|F|A|O");
  });

  test("filter on empty string", () => {
    const v = vars([["empty", ""]]);
    expect(resolve("${{empty | trim}}", v)).toBe("");
  });

  test("multiple filters with no effect", () => {
    const v = vars([["text", "short"]]);
    expect(resolve("${{text | head=100 | tail=100 | trim}}", v)).toBe("short");
  });

  test("list with single item", () => {
    const v = vars([]);
    const template =
      "{{LIST}}{{LIST_ITEM}}Only item{{END_LIST_ITEM}}{{END_LIST}}";
    expect(resolve(template, v)).toContain("1. Only item");
  });

  test("table with single column", () => {
    const v = vars([]);
    const template =
      "{{TABLE}}{{HEADER}}Name{{END_HEADER}}{{ROW}}Alice{{END_ROW}}{{END_TABLE}}";
    expect(resolve(template, v)).toContain("| Name |");
    expect(resolve(template, v)).toContain("| Alice |");
  });

  test("table with single row", () => {
    const v = vars([]);
    const template =
      "{{TABLE}}{{HEADER}}A|B|C{{END_HEADER}}{{ROW}}1|2|3{{END_ROW}}{{END_TABLE}}";
    const result = resolve(template, v);
    expect(result).toContain("| A | B | C |");
    expect(result).toContain("| 1 | 2 | 3 |");
  });

  test("comment between variables", () => {
    const v = vars([
      ["a", "A"],
      ["b", "B"],
    ]);
    expect(resolve("${{a}}{{# comment #}}${{b}}", v)).toBe("AB");
  });

  test("multiple consecutive comments", () => {
    const v = vars([]);
    expect(resolve("{{# comment 1 #}}{{# comment 2 #}}text", v)).toBe("text");
  });

  test("comment with special characters", () => {
    const v = vars([]);
    expect(resolve("{{# <div>@#$%^&*() #}}", v)).toBe("");
  });

  test("math with zero", () => {
    const v = vars([["x", 0]]);
    expect(resolve("${{x + 5}}", v)).toBe("5");
    expect(resolve("${{x * 10}}", v)).toBe("0");
  });

  test("math with negative numbers", () => {
    const v = vars([["x", -5]]);
    expect(resolve("${{x + 10}}", v)).toBe("5");
    expect(resolve("${{x * 2}}", v)).toBe("-10");
  });

  test("math with decimals", () => {
    const v = vars([["x", 3.14]]);
    expect(resolve("${{x * 2}}", v)).toBe("6.28");
  });

  test("division by zero", () => {
    const v = vars([
      ["x", 10],
      ["zero", 0],
    ]);
    expect(resolve("${{x / zero}}", v)).toBe("Infinity");
  });

  test("modulo operations", () => {
    const v = vars([["x", 10]]);
    expect(resolve("${{x % 3}}", v)).toBe("1");
    expect(resolve("${{x % 5}}", v)).toBe("0");
  });

  test("loop special variables with empty array", () => {
    const v = vars([["items", []]]);
    const template = "{{FOR items AS item}}${{@index0}}{{END_FOR}}";
    expect(resolve(template, v)).toBe("");
  });

  test("loop special variables with single item", () => {
    const v = vars([["items", ["only"]]]);
    const template =
      "{{FOR items AS item}}${{@index0}}:${{@first}}:${{@last}}{{END_FOR}}";
    expect(resolve(template, v)).toBe("0:true:true");
  });

  test("comparison with string numbers", () => {
    const v = vars([
      ["a", "10"],
      ["b", "5"],
    ]);
    expect(resolve("{{IF a > b}}yes{{END_IF}}", v)).toBe("yes");
  });

  test("comparison edge: equal values", () => {
    const v = vars([
      ["a", 10],
      ["b", 10],
    ]);
    expect(resolve("{{IF a >= b}}yes{{END_IF}}", v)).toBe("yes");
    expect(resolve("{{IF a <= b}}yes{{END_IF}}", v)).toBe("yes");
  });

  test("string comparison with numbers", () => {
    const v = vars([["a", "abc"]]);
    expect(() => resolve("{{IF a > 5}}yes{{END_IF}}", v)).toThrow();
  });

  test("isEmpty with various whitespace", () => {
    const v = vars([
      ["spaces", "   "],
      ["tabs", "\t\t"],
      ["newlines", "\n\n"],
      ["mixed", " \t\n "],
    ]);
    expect(resolve("{{IF spaces isEmpty}}Y{{END_IF}}", v)).toBe("Y");
    expect(resolve("{{IF tabs isEmpty}}Y{{END_IF}}", v)).toBe("Y");
    expect(resolve("{{IF newlines isEmpty}}Y{{END_IF}}", v)).toBe("Y");
    expect(resolve("{{IF mixed isEmpty}}Y{{END_IF}}", v)).toBe("Y");
  });

  test("contains with empty string", () => {
    const v = vars([["text", "hello"]]);
    expect(resolve('{{IF text contains ""}}yes{{END_IF}}', v)).toBe("yes");
  });

  test("startsWith with empty string", () => {
    const v = vars([["text", "hello"]]);
    expect(resolve('{{IF text startsWith ""}}yes{{END_IF}}', v)).toBe("yes");
  });

  test("endsWith with empty string", () => {
    const v = vars([["text", "hello"]]);
    expect(resolve('{{IF text endsWith ""}}yes{{END_IF}}', v)).toBe("yes");
  });

  test("NOT with comparison", () => {
    const v = vars([["age", 15]]);
    expect(resolve("{{IF NOT(age >= 18)}}minor{{END_IF}}", v)).toBe("minor");
  });

  test("double NOT", () => {
    const v = vars([["active", true]]);
    expect(resolve("{{IF NOT(NOT(active))}}yes{{END_IF}}", v)).toBe("yes");
  });

  test("complex nested logic", () => {
    const v = vars([
      ["a", true],
      ["b", false],
      ["c", true],
      ["d", false],
    ]);
    const template = "{{IF (a AND NOT(b)) OR (c AND NOT(d))}}complex{{END_IF}}";
    expect(resolve(template, v)).toBe("complex");
  });

  test("deeply nested property with all valid", () => {
    const v = vars([["a", { b: { c: { d: { e: { f: { g: "deep" } } } } } }]]);
    expect(resolve("${{a.b.c.d.e.f.g}}", v)).toBe("deep");
  });

  test("deeply nested property breaks early", () => {
    const v = vars([["a", { b: { c: null } }]]);
    expect(resolve("${{a.b.c.d.e.f.g}}", v)).toBe("");
  });

  test("JSON string deeply nested", () => {
    const v = vars([["data", '{"a":{"b":{"c":"deep"}}}']]);
    expect(resolve("${{data.a.b.c}}", v)).toBe("deep");
  });

  test("malformed JSON graceful failure", () => {
    const v = vars([["bad", "{invalid json"]]);
    expect(resolve("${{bad.property}}", v)).toBe("");
  });

  test("array in comma-separated format", () => {
    const v = vars([["items", "a,b,c,d,e"]]);
    const template = "{{FOR items AS item}}${{item}}{{END_FOR}}";
    expect(resolve(template, v)).toBe("abcde");
  });

  test("comma-separated with quoted commas", () => {
    expect(tryCoerceToArray('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });

  test("single-item coercion to array", () => {
    const v = vars([["single", "value"]]);
    expect(resolve("{{IF single isArray}}yes{{END_IF}}", v)).toBe("yes");
  });

  test("number coercion to array", () => {
    const v = vars([["num", 42]]);
    expect(resolve("{{FOR num AS n}}${{n}}{{END_FOR}}", v)).toBe("42");
  });

  test("whitespace normalization", () => {
    const v = vars([]);
    const template = "Line 1\n\n\n\nLine 2";
    const result = resolve(template, v);
    // Template resolver preserves whitespace as-is (important for markdown)
    expect(result).toBe("Line 1\n\n\n\nLine 2");
  });

  test("preserves intentional whitespace in conditions", () => {
    const v = vars([["show", true]]);
    const template = "{{IF show}}  spaced  {{END_IF}}";
    expect(resolve(template, v)).toBe("  spaced  ");
  });

  test("variable name with maximum allowed characters", () => {
    const name = "a_b1.c_d2.e_f3";
    const v = vars([[name.split(".")[0], { c_d2: { e_f3: "nested" } }]]);
    expect(resolve(`\${{${name}}}`, v)).toBe("nested");
  });

  test("template with all features combined", () => {
    const v = vars([
      ["title", "Report"],
      ["author", "Alice"],
      ["showDetails", true],
      ["status", "complete"],
      ["items", ["item1", "item2", "item3"]],
      ["count", 3],
      ["data", { nested: { value: "deep" } }],
    ]);

    const template = `# \${{title}}
{{# Author info #}}
{{IF author}}By \${{author}}{{END_IF}}

{{IF showDetails}}
Status: {{CASE status}}{{WHEN "complete"}}✓ Complete{{END_WHEN}}{{DEFAULT}}Pending{{END_DEFAULT}}{{END_CASE}}
Total: \${{count}}

Items:
{{FOR items AS item}}
- \${{item}}
{{END_FOR}}

Nested: \${{data.nested.value ?? "N/A"}}
{{END_IF}}`;

    const result = resolve(template, v);
    expect(result).toContain("# Report");
    expect(result).toContain("By Alice");
    expect(result).toContain("✓ Complete");
    expect(result).toContain("Total: 3");
    expect(result).toContain("- item1");
    expect(result).toContain("Nested: deep");
  });
});

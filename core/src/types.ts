/**
 * Template value type - supports primitives, arrays, objects, and nested structures
 * Matches JSON structure for LLM output compatibility
 */
export type TemplateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | TemplateValue[]
  | { [key: string]: TemplateValue };

/**
 * Map of variable names to their values
 */
export type VariableMap = Map<string, TemplateValue>;

/**
 * Read-only variable lookup; a Map satisfies it, and so does a loop frame
 * over a parent lookup
 */
export interface VariableLookup {
  has(name: string): boolean;
  get(name: string): TemplateValue | undefined;
}

/**
 * Filter call structure
 */
export interface FilterCall {
  name: string;
  params: Record<string, string>;
}

/**
 * Token types for lexer
 */
export enum TokenType {
  TEXT = "TEXT",
  VARIABLE = "VARIABLE",
  IF = "IF",
  ELSEIF = "ELSEIF",
  ELSE = "ELSE",
  END_IF = "END_IF",
  CASE = "CASE",
  WHEN = "WHEN",
  END_WHEN = "END_WHEN",
  DEFAULT = "DEFAULT",
  END_DEFAULT = "END_DEFAULT",
  END_CASE = "END_CASE",
  FOR = "FOR",
  END_FOR = "END_FOR",
  LIST = "LIST",
  LIST_ITEM = "LIST_ITEM",
  END_LIST_ITEM = "END_LIST_ITEM",
  END_LIST = "END_LIST",
  TABLE = "TABLE",
  HEADER = "HEADER",
  END_HEADER = "END_HEADER",
  ROW = "ROW",
  END_ROW = "END_ROW",
  END_TABLE = "END_TABLE",
  RAW = "RAW",
  END_RAW = "END_RAW",
  SECTION = "SECTION",
  END_SECTION = "END_SECTION",
  FENCE = "FENCE",
  END_FENCE = "END_FENCE",
  COMMENT = "COMMENT",
  EOF = "EOF",
}

/**
 * Token with position tracking
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  /** A minus marker after the opening braces: trim all whitespace before the tag */
  trimBefore?: boolean;
  /** A minus marker before the closing braces: trim all whitespace after the tag */
  trimAfter?: boolean;
}

/**
 * Whitespace handling. With standaloneLines on, a line holding only block
 * tags and whitespace is removed together with its line break.
 */
export interface WhitespaceOptions {
  standaloneLines?: boolean;
}

/**
 * Base AST node with position tracking
 */
export interface ASTNode {
  type: string;
  line: number;
  column: number;
}

/**
 * Root program node
 */
export interface ProgramNode extends ASTNode {
  type: "Program";
  body: ASTNode[];
}

/**
 * Plain text node
 */
export interface TextNode extends ASTNode {
  type: "Text";
  content: string;
}

/**
 * Variable substitution node
 */
export interface VariableNode extends ASTNode {
  type: "Variable";
  path: string[];
  defaultValue?: string;
  filters?: FilterCall[];
}

/**
 * Ternary operator node
 */
export interface TernaryNode extends ASTNode {
  type: "Ternary";
  condition: string;
  trueValue: string | TernaryNode;
  falseValue: string | TernaryNode;
}

/**
 * Conditional node (IF/ELSEIF/ELSE)
 */
export interface IfNode extends ASTNode {
  type: "If";
  condition: string;
  consequent: ASTNode[];
  alternate: ASTNode[] | IfNode | null;
}

/**
 * CASE statement node
 */
export interface CaseNode extends ASTNode {
  type: "Case";
  expression: string;
  cases: WhenNode[];
  default: DefaultNode | null;
}

/**
 * WHEN clause in CASE
 */
export interface WhenNode extends ASTNode {
  type: "When";
  /** The text of the first matcher when it is a quoted text, otherwise "" */
  value: string;
  /** What the clause matches: a list of matchers or one comparison */
  match: WhenMatch;
  body: ASTNode[];
}

/**
 * One matcher of a WHEN: a literal (its text and whether it was written in
 * quotes) or a variable path
 */
export type WhenItem =
  | { kind: "literal"; text: string; quoted: boolean }
  | { kind: "path"; path: string[] };

/** The comparison operators a WHEN accepts */
export type WhenOperator = "==" | "!=" | ">" | "<" | ">=" | "<=";

/**
 * What a WHEN matches: any item of a list, or the CASE value compared with
 * one item
 */
export type WhenMatch =
  | { kind: "list"; items: WhenItem[] }
  | { kind: "comparison"; operator: WhenOperator; item: WhenItem };

/**
 * DEFAULT clause in CASE
 */
export interface DefaultNode extends ASTNode {
  type: "Default";
  body: ASTNode[];
}

/**
 * FOR loop node
 */
export interface ForNode extends ASTNode {
  type: "For";
  iterable: string[];
  itemName: string;
  body: ASTNode[];
  /** limit= argument, set only when written */
  limit?: ForWindowArg;
  /** offset= argument, set only when written */
  offset?: ForWindowArg;
  /** Body of the {{ELSE}} branch, set only when written */
  elseBody?: ASTNode[];
}

/**
 * A FOR window argument: a number written in the tag or a variable path
 */
export type ForWindowArg =
  | { kind: "literal"; value: number }
  | { kind: "path"; path: string[] };

/**
 * SECTION title: a quoted string or a variable path
 */
export type SectionTitle =
  | { kind: "literal"; text: string }
  | { kind: "path"; path: string[] };

/**
 * SECTION block: a markdown heading over its body, dropped when the body
 * renders empty
 */
export interface SectionNode extends ASTNode {
  type: "Section";
  title: SectionTitle;
  level: number;
  skipEmpty: boolean;
  body: ASTNode[];
}

/**
 * FENCE language: a quoted string or a variable path
 */
export type FenceLang =
  | { kind: "literal"; text: string }
  | { kind: "path"; path: string[] };

/**
 * FENCE block: its rendered body in a code fence longer than any backtick
 * run inside it
 */
export interface FenceNode extends ASTNode {
  type: "Fence";
  lang: FenceLang | null;
  body: ASTNode[];
}

/**
 * List container node
 */
export interface ListNode extends ASTNode {
  type: "List";
  items: ListChild[];
}

/**
 * A child of a LIST: an item, or a FOR or IF whose bodies hold more children
 * of the same kind
 */
export type ListChild = ListItemNode | ForNode | IfNode;

/**
 * List item node
 */
export interface ListItemNode extends ASTNode {
  type: "ListItem";
  content: ASTNode[];
  condition?: string;
  fallback?: string;
}

/**
 * Table node
 */
export interface TableNode extends ASTNode {
  type: "Table";
  header: TableHeaderNode | null;
  rows: TableChild[];
  hasHeader: boolean;
  alignment?: string[];
}

/**
 * A child of a TABLE: a row, or a FOR or IF that builds rows
 */
export type TableChild = TableRowNode | ForNode | IfNode;

/**
 * Table header node
 */
export interface TableHeaderNode extends ASTNode {
  type: "Header";
  cells: ASTNode[][];
}

/**
 * Table row node
 */
export interface TableRowNode extends ASTNode {
  type: "TableRow";
  cells: ASTNode[][];
}

/**
 * Comment node (removed from output)
 */
export interface CommentNode extends ASTNode {
  type: "Comment";
  content: string;
}

/**
 * Template metadata for debugging
 */
export interface TemplateMetadata {
  detected_variables: string[];
  mapped_variables: string[];
  missing_variables: string[];
  variable_count: number;
}

/**
 * Variable mappings from n8n node config
 */
export interface VariableMappingsCollection {
  mappings?: Array<{
    variableName: string;
    value: string;
  }>;
}

/**
 * Work limits for one render
 */
export interface Limits {
  maxIterations: number;
  maxOutputChars: number;
  maxDepth: number;
  maxNodes: number;
}

/**
 * Default limits: total FOR iterations across the render, output length,
 * and nesting of blocks
 */
export const DEFAULT_LIMITS: Limits = {
  maxIterations: 10000,
  maxOutputChars: 1000000,
  maxDepth: 32,
  maxNodes: 20000,
};

/**
 * The given limits, with every limit left out taking its default
 */
export function withDefaultLimits(limits?: Partial<Limits>): Limits {
  return {
    maxIterations: limits?.maxIterations ?? DEFAULT_LIMITS.maxIterations,
    maxOutputChars: limits?.maxOutputChars ?? DEFAULT_LIMITS.maxOutputChars,
    maxDepth: limits?.maxDepth ?? DEFAULT_LIMITS.maxDepth,
    maxNodes: limits?.maxNodes ?? DEFAULT_LIMITS.maxNodes,
  };
}

/**
 * One filter in the registry that render, spec and analyze all read.
 */
export interface FilterDefinition {
  name: string;
  params: string;
  description: string;
  paramNames: string[];
  apply(input: unknown, params: Record<string, string>): unknown;
}

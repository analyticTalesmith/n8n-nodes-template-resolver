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
  value: string;
  body: ASTNode[];
}

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
}

/**
 * List container node
 */
export interface ListNode extends ASTNode {
  type: "List";
  items: ListItemNode[];
}

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
  rows: TableRowNode[];
  hasHeader: boolean;
  alignment?: string[];
}

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

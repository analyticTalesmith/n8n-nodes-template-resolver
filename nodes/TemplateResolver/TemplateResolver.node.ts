import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

// ============================================================================
// EXPORTED TYPES (for testing)
// ============================================================================

export type TemplateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | TemplateValue[]
  | { [key: string]: TemplateValue };

export type VariableMap = Map<string, TemplateValue>;

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface VariableMapping {
  variableName: string;
  value: TemplateValue;
}

interface VariableMappingsCollection {
  mappings: VariableMapping[];
}

interface TemplateMetadata {
  detected_variables: string[];
  mapped_variables: string[];
  missing_variables: string[];
  variable_count: number;
}

interface ParsedIfBlock {
  fullMatch: string;
  expression: string;
  content: string;
}

interface ConditionalBranches {
  ifContent: string;
  elseIfBranches: Array<{ condition: string; content: string }>;
  elseContent: string | null;
}

interface BranchMarker {
  type: 'ELSEIF' | 'ELSE';
  position: number;
  length: number;
  condition: string | null;
}

interface WhenClause {
  value: string;
  content: string;
}

interface ParsedCaseBlock {
  whenClauses: WhenClause[];
  defaultContent: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_NESTING_DEPTH = 10;
const ENDIF_TAG = '{{ENDIF}}';

// ============================================================================
// VARIABLE EXTRACTION - Pure functions to find variables in templates
// ============================================================================

/**
 * Checks if a string is a valid variable name.
 * @param name - String to validate
 * @returns true if valid variable name
 */
export function isValidVariableName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(name);
}

/**
 * Adds a variable name to a Set, handling dot notation.
 * For "user.name", adds both "user" and "user.name".
 * @param varName - Variable name to add
 * @param variables - Set to add to
 */
export function addVariableToSet(varName: string, variables: Set<string>): void {
  if (!varName || !isValidVariableName(varName)) return;

  if (varName.includes('.')) {
    variables.add(varName.split('.')[0]);
  }
  variables.add(varName);
}

/**
 * Extracts variables from ${{varName}} syntax.
 * @param template - Template string
 * @returns Array of variable names
 */
export function extractSubstitutionVariables(template: string): string[] {
  const variables: string[] = [];
  const regex = /\$\{\{(\w+(?:\.\w+)*)\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1]);
  }
  return variables;
}

/**
 * Extracts variable name from a single condition like "varName" or "varName == value".
 * @param condition - Condition string
 * @returns Variable name or null
 */
export function extractVariableFromCondition(condition: string): string | null {
  if (!condition) return null;

  const withoutQuotes = condition.replace(/["']/g, '');
  const tokens = withoutQuotes.split(/\s+/);

  if (tokens.length > 0 && isValidVariableName(tokens[0])) {
    return tokens[0];
  }
  return null;
}

/**
 * Splits a condition expression by AND/OR operators.
 * @param expression - Expression like "(a AND b) OR c"
 * @returns Array of individual conditions
 */
export function splitConditionExpression(expression: string): string[] {
  const withoutParens = expression.replace(/[()]/g, ' ');
  return withoutParens
    .split(/\s+(?:AND|OR)\s+/i)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Extracts variables from IF/ELSEIF conditions.
 * @param template - Template string
 * @returns Array of variable names
 */
export function extractIfVariables(template: string): string[] {
  const variables: string[] = [];
  
  // IF conditions
  const ifRegex = /\{\{IF\s+([^}]*)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = ifRegex.exec(template)) !== null) {
    for (const condition of splitConditionExpression(match[1])) {
      const varName = extractVariableFromCondition(condition);
      if (varName) variables.push(varName);
    }
  }

  // ELSEIF conditions
  const elseIfRegex = /\{\{ELSE[\s_]?IF\s+(.*?)\}\}/gi;
  while ((match = elseIfRegex.exec(template)) !== null) {
    for (const condition of splitConditionExpression(match[1])) {
      const varName = extractVariableFromCondition(condition);
      if (varName) variables.push(varName);
    }
  }

  return variables;
}

/**
 * Extracts variables from CASE blocks.
 * @param template - Template string
 * @returns Array of variable names
 */
export function extractCaseVariables(template: string): string[] {
  const variables: string[] = [];
  const regex = /\{\{CASE\s+(\w+(?:\.\w+)*)\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1]);
  }
  return variables;
}

/**
 * Extracts iterable variables from FOR loops.
 * @param template - Template string
 * @returns Array of variable names
 */
export function extractForVariables(template: string): string[] {
  const variables: string[] = [];
  const regex = /\{\{FOR\s+(\w+(?:\.\w+)?)(?:\s+AS\s+\w+)?\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1]);
  }
  return variables;
}

/**
 * Extracts variables from LIST_ITEM conditions.
 * @param template - Template string
 * @returns Array of variable names
 */
export function extractListItemVariables(template: string): string[] {
  const variables: string[] = [];
  const regex = /\{\{LIST_ITEM\?(\w+(?:\.\w+)*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1]);
  }
  return variables;
}

/**
 * Extracts all unique variable names from a template.
 * @param template - Template string to analyze
 * @returns Sorted array of unique variable names
 */
export function extractAllVariables(template: string): string[] {
  const variables = new Set<string>();

  for (const v of extractSubstitutionVariables(template)) {
    addVariableToSet(v, variables);
  }
  for (const v of extractIfVariables(template)) {
    addVariableToSet(v, variables);
  }
  for (const v of extractCaseVariables(template)) {
    addVariableToSet(v, variables);
  }
  for (const v of extractForVariables(template)) {
    addVariableToSet(v, variables);
  }
  for (const v of extractListItemVariables(template)) {
    addVariableToSet(v, variables);
  }

  return Array.from(variables).sort();
}

// ============================================================================
// CONDITION EVALUATION - Pure functions to evaluate conditions
// ============================================================================

/**
 * Gets a variable value from the map.
 * @param variables - Variable map
 * @param name - Variable name
 * @returns Variable value or undefined
 */
export function getVariable(variables: VariableMap, name: string): TemplateValue {
  return variables.get(name);
}

/**
 * Checks if a variable exists and is non-empty.
 * @param variables - Variable map
 * @param name - Variable name
 * @returns true if variable exists and has non-empty value
 */
export function isVariableTruthy(variables: VariableMap, name: string): boolean {
  if (!variables.has(name)) return false;
  const value = variables.get(name);
  return value != null && String(value).trim() !== '';
}

/**
 * Evaluates a comparison between a variable and a value.
 * @param variables - Variable map
 * @param varName - Variable name
 * @param operator - Comparison operator
 * @param compareValue - Value to compare against
 * @returns Result of comparison
 */
export function evaluateComparison(
  variables: VariableMap,
  varName: string,
  operator: string,
  compareValue: string
): boolean {
  const rawValue = variables.get(varName);
  const strValue = rawValue != null ? String(rawValue) : '';

  switch (operator) {
    case '==':
    case 'equals':
    case 'is':
      return strValue === compareValue;
    case '!=':
    case 'not_equals':
    case 'is_not':
      return strValue !== compareValue;
    case 'not_empty':
    case 'exists':
      return strValue.trim() !== '';
    case 'empty':
    case 'missing':
      return strValue.trim() === '';
    case 'contains':
      return strValue.includes(compareValue);
    case 'not_contains':
      return !strValue.includes(compareValue);
    case 'starts_with':
      return strValue.startsWith(compareValue);
    case 'ends_with':
      return strValue.endsWith(compareValue);
    case 'length_gt':
      return strValue.length > parseInt(compareValue || '0', 10);
    case 'length_lt':
      return strValue.length < parseInt(compareValue || '0', 10);
    case 'is_array':
      return Array.isArray(rawValue);
    case 'is_number':
      return !isNaN(Number(strValue)) && strValue.trim() !== '';
    default:
      return strValue.trim() !== '';
  }
}

/**
 * Evaluates a single condition string.
 * @param variables - Variable map
 * @param condition - Condition like "varName" or "varName == value"
 * @returns true if condition is met
 */
export function evaluateSingleCondition(variables: VariableMap, condition: string): boolean {
  const tokens = condition.trim().split(/\s+/);

  if (tokens.length === 1) {
    return isVariableTruthy(variables, tokens[0]);
  }

  const varName = tokens[0];
  const operator = tokens[1];
  const compareValue = tokens.slice(2).join(' ').replace(/^["']|["']$/g, '');

  return evaluateComparison(variables, varName, operator, compareValue);
}

/**
 * Tokenizes a boolean expression into parts.
 * @param expression - Expression with AND/OR/parentheses
 * @returns Array of tokens
 */
export function tokenizeExpression(expression: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
      current += char;
    } else if (char === '(' && !inQuotes) {
      if (current.trim()) tokens.push(current.trim());
      tokens.push('(');
      current = '';
    } else if (char === ')' && !inQuotes) {
      if (current.trim()) tokens.push(current.trim());
      tokens.push(')');
      current = '';
    } else if (!inQuotes) {
      const remaining = expression.slice(i).toUpperCase();
      if (remaining.startsWith(' AND ')) {
        if (current.trim()) tokens.push(current.trim());
        tokens.push('AND');
        current = '';
        i += 4;
      } else if (remaining.startsWith(' OR ')) {
        if (current.trim()) tokens.push(current.trim());
        tokens.push('OR');
        current = '';
        i += 3;
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

/**
 * Evaluates a flat expression (no parentheses) with AND/OR.
 * @param variables - Variable map
 * @param tokens - Array of conditions and operators
 * @returns Boolean result
 */
export function evaluateFlatExpression(variables: VariableMap, tokens: string[]): boolean {
  const results: boolean[] = [];
  const operators: string[] = [];

  for (const token of tokens) {
    if (token === 'AND' || token === 'OR') {
      operators.push(token);
    } else if (token === 'true') {
      results.push(true);
    } else if (token === 'false') {
      results.push(false);
    } else {
      results.push(evaluateSingleCondition(variables, token));
    }
  }

  // Process AND first (higher precedence)
  let i = 0;
  while (i < operators.length) {
    if (operators[i] === 'AND') {
      results.splice(i, 2, results[i] && results[i + 1]);
      operators.splice(i, 1);
    } else {
      i++;
    }
  }

  // Process OR
  i = 0;
  while (i < operators.length) {
    if (operators[i] === 'OR') {
      results.splice(i, 2, results[i] || results[i + 1]);
      operators.splice(i, 1);
    } else {
      i++;
    }
  }

  return results[0] ?? false;
}

/**
 * Evaluates a complete boolean expression with parentheses.
 * @param variables - Variable map
 * @param expression - Expression like "(a AND b) OR c"
 * @returns Boolean result
 */
export function evaluateExpression(variables: VariableMap, expression: string): boolean {
  const tokens = tokenizeExpression(expression);
  const working = [...tokens];

  // Resolve parentheses from innermost outward
  while (working.includes('(')) {
    const open = working.lastIndexOf('(');
    const close = working.indexOf(')', open);
    const sub = working.slice(open + 1, close);
    const result = evaluateFlatExpression(variables, sub);
    working.splice(open, close - open + 1, String(result));
  }

  return evaluateFlatExpression(variables, working);
}

// ============================================================================
// IF BLOCK PROCESSING - Pure functions for conditional blocks
// ============================================================================

/**
 * Finds the position of the matching ENDIF for an IF block.
 * @param input - Template string
 * @param ifStart - Position of opening {{IF
 * @returns Position of matching {{ENDIF}} or -1
 */
export function findMatchingEndif(input: string, ifStart: number): number {
  let pos = ifStart;
  let depth = 0;

  while (pos < input.length) {
    const remaining = input.substring(pos);

    if (remaining.match(/^\{\{IF\s+[^}]*\}\}/)) {
      depth++;
      pos += remaining.match(/^\{\{IF\s+[^}]*\}\}/)![0].length;
    } else if (remaining.startsWith(ENDIF_TAG)) {
      if (depth === 1) return pos;
      depth--;
      pos += ENDIF_TAG.length;
    } else {
      pos++;
    }
  }

  return -1;
}

/**
 * Finds all IF blocks in a template.
 * @param input - Template string
 * @returns Array of parsed IF blocks
 */
export function findIfBlocks(input: string): ParsedIfBlock[] {
  const blocks: ParsedIfBlock[] = [];
  let pos = 0;

  while (pos < input.length) {
    const remaining = input.substring(pos);
    const ifMatch = remaining.match(/^\{\{IF\s+([^}]*)\}\}/);

    if (!ifMatch) {
      pos++;
      continue;
    }

    const start = pos;
    const expression = ifMatch[1];
    const contentStart = pos + ifMatch[0].length;
    const endifPos = findMatchingEndif(input, start);

    if (endifPos === -1) {
      pos += ifMatch[0].length;
      continue;
    }

    blocks.push({
      fullMatch: input.substring(start, endifPos + ENDIF_TAG.length),
      expression,
      content: input.substring(contentStart, endifPos),
    });

    pos = endifPos + ENDIF_TAG.length;
  }

  return blocks;
}

/**
 * Finds ELSEIF and ELSE markers at the top level of content.
 * @param content - Content between IF and ENDIF
 * @returns Array of branch markers
 */
export function findBranchMarkers(content: string): BranchMarker[] {
  const markers: BranchMarker[] = [];
  let pos = 0;
  let depth = 0;

  while (pos < content.length) {
    const remaining = content.substring(pos);

    if (remaining.match(/^\{\{IF\s+.*?\}\}/)) {
      depth++;
      pos += remaining.match(/^\{\{IF\s+.*?\}\}/)![0].length;
    } else if (remaining.startsWith(ENDIF_TAG)) {
      depth--;
      pos += ENDIF_TAG.length;
    } else if (depth === 0) {
      const elseIfMatch = remaining.match(/^\{\{ELSE[\s_]?IF\s+(.*?)\}\}/i);
      if (elseIfMatch) {
        markers.push({
          type: 'ELSEIF',
          position: pos,
          length: elseIfMatch[0].length,
          condition: elseIfMatch[1].trim(),
        });
        pos += elseIfMatch[0].length;
        continue;
      }

      const elseMatch = remaining.match(/^\{\{ELSE\}\}/i);
      if (elseMatch) {
        markers.push({
          type: 'ELSE',
          position: pos,
          length: elseMatch[0].length,
          condition: null,
        });
        pos += elseMatch[0].length;
        continue;
      }

      pos++;
    } else {
      pos++;
    }
  }

  return markers;
}

/**
 * Parses IF block content into branches.
 * @param content - Content between IF and ENDIF
 * @returns Parsed branches
 */
export function parseConditionalBranches(content: string): ConditionalBranches {
  const markers = findBranchMarkers(content);

  if (markers.length === 0) {
    return { ifContent: content, elseIfBranches: [], elseContent: null };
  }

  const result: ConditionalBranches = {
    ifContent: content.substring(0, markers[0].position),
    elseIfBranches: [],
    elseContent: null,
  };

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const start = marker.position + marker.length;
    const end = markers[i + 1]?.position ?? content.length;
    const branchContent = content.substring(start, end);

    if (marker.type === 'ELSEIF' && marker.condition) {
      result.elseIfBranches.push({ condition: marker.condition, content: branchContent });
    } else if (marker.type === 'ELSE') {
      result.elseContent = branchContent;
      break;
    }
  }

  return result;
}

/**
 * Evaluates a conditional block and returns the matching content.
 * @param variables - Variable map
 * @param expression - IF condition
 * @param content - Content between IF and ENDIF
 * @returns Content of matching branch
 */
export function evaluateConditionalBlock(
  variables: VariableMap,
  expression: string,
  content: string
): string {
  const branches = parseConditionalBranches(content);

  if (evaluateExpression(variables, expression)) {
    return branches.ifContent;
  }

  for (const branch of branches.elseIfBranches) {
    if (evaluateExpression(variables, branch.condition)) {
      return branch.content;
    }
  }

  return branches.elseContent ?? '';
}

/**
 * Processes all IF blocks in a template (handles nesting).
 * @param variables - Variable map
 * @param template - Template string
 * @returns Processed template
 */
export function processIfBlocks(variables: VariableMap, template: string): string {
  let result = template;
  let iterations = 0;

  while (iterations < MAX_NESTING_DEPTH) {
    const blocks = findIfBlocks(result);
    if (blocks.length === 0) break;

    // Process smallest (innermost) first
    blocks.sort((a, b) => a.content.length - b.content.length);

    let changed = false;
    for (const block of blocks) {
      const idx = result.indexOf(block.fullMatch);
      if (idx === -1) continue;

      const replacement = evaluateConditionalBlock(variables, block.expression, block.content);
      result = result.replace(block.fullMatch, replacement);
      changed = true;
    }

    if (!changed) break;
    iterations++;
  }

  return result;
}

// ============================================================================
// CASE BLOCK PROCESSING - Pure functions for switch blocks
// ============================================================================

/**
 * Parses WHEN and DEFAULT clauses from CASE content.
 * @param content - Content between CASE and ENDCASE
 * @returns Parsed clauses
 */
export function parseWhenClauses(content: string): ParsedCaseBlock {
  const markers: Array<{
    type: 'WHEN' | 'DEFAULT';
    value?: string;
    position: number;
    length: number;
  }> = [];

  const whenRegex = /\{\{WHEN\s+(?:"((?:[^"\\]|\\.)*)"|(\w+))\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = whenRegex.exec(content)) !== null) {
    markers.push({
      type: 'WHEN',
      value: match[1] !== undefined ? match[1].replace(/\\"/g, '"') : match[2],
      position: match.index,
      length: match[0].length,
    });
  }

  const defaultMatch = content.match(/\{\{DEFAULT\}\}/);
  if (defaultMatch?.index !== undefined) {
    markers.push({
      type: 'DEFAULT',
      position: defaultMatch.index,
      length: defaultMatch[0].length,
    });
  }

  markers.sort((a, b) => a.position - b.position);

  const whenClauses: WhenClause[] = [];
  let defaultContent: string | null = null;

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const start = marker.position + marker.length;
    const end = markers[i + 1]?.position ?? content.length;
    const clauseContent = content.substring(start, end);

    if (marker.type === 'WHEN' && marker.value !== undefined) {
      whenClauses.push({ value: marker.value, content: clauseContent });
    } else if (marker.type === 'DEFAULT') {
      defaultContent = clauseContent;
    }
  }

  return { whenClauses, defaultContent };
}

/**
 * Evaluates a CASE block and returns matching content.
 * @param varValue - Value of the CASE variable
 * @param content - Content between CASE and ENDCASE
 * @returns Content of matching WHEN or DEFAULT
 */
export function evaluateCaseBlock(varValue: string, content: string): string {
  const { whenClauses, defaultContent } = parseWhenClauses(content);

  for (const clause of whenClauses) {
    if (clause.value === varValue) {
      return clause.content.trim();
    }
  }

  return defaultContent?.trim() ?? '';
}

/**
 * Processes all CASE blocks in a template.
 * @param variables - Variable map
 * @param template - Template string
 * @returns Processed template
 */
export function processCaseBlocks(variables: VariableMap, template: string): string {
  const regex = /\{\{CASE\s+(\w+)\}\}([\s\S]*?)\{\{ENDCASE\}\}/g;

  return template.replace(regex, (_match, varName, content) => {
    const varValue = String(variables.get(varName) ?? '');
    return evaluateCaseBlock(varValue, content);
  });
}

// ============================================================================
// FOR LOOP PROCESSING - Pure functions for loops
// ============================================================================

/**
 * Resolves a dot-notation path to a value.
 * @param variables - Variable map
 * @param path - Path like "user.address.city"
 * @returns Resolved value
 */
export function resolveVariablePath(variables: VariableMap, path: string): TemplateValue {
  const parts = path.split('.');
  let current: TemplateValue = variables.get(parts[0]);

  // If it's a JSON string, try to parse it
  if (typeof current === 'string' && parts.length > 1) {
    const trimmed = current.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        current = JSON.parse(trimmed);
      } catch {
        // Not valid JSON, continue with string
      }
    }
  }

  for (let i = 1; i < parts.length && current != null; i++) {
    // Try to parse JSON strings at each level
    if (typeof current === 'string') {
      const trimmed = current.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          current = JSON.parse(trimmed);
        } catch {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
    
    if (typeof current === 'object' && !Array.isArray(current) && current !== null) {
      current = (current as Record<string, TemplateValue>)[parts[i]];
    } else if (Array.isArray(current)) {
      // Allow array index access like items.0
      const index = parseInt(parts[i], 10);
      if (!isNaN(index)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Expands a loop body for a single item.
 * @param item - Current item
 * @param placeholder - Loop variable name
 * @param body - Loop body template
 * @returns Expanded body
 */
export function expandLoopItem(item: TemplateValue, placeholder: string, body: string): string {
  let result = body;

  // Handle ${{placeholder.property}}
  const dotRegex = new RegExp(`\\$\\{\\{${placeholder}\\.(\\w+)\\}\\}`, 'g');
  result = result.replace(dotRegex, (_m, prop) => {
    if (typeof item === 'object' && item !== null && prop in item) {
      return String((item as Record<string, TemplateValue>)[prop] ?? '');
    }
    return '';
  });

  // Handle ${{placeholder}}
  const simpleRegex = new RegExp(`\\$\\{\\{${placeholder}\\}\\}`, 'g');
  result = result.replace(simpleRegex, 
    typeof item === 'object' ? JSON.stringify(item) : String(item)
  );

  return result;
}

/**
 * Processes a single FOR loop.
 * @param variables - Variable map
 * @param varPath - Path to the iterable
 * @param itemAlias - Loop variable alias (or null for "this")
 * @param body - Loop body
 * @returns Expanded content
 */
export function processForLoop(
  variables: VariableMap,
  varPath: string,
  itemAlias: string | null,
  body: string
): string {
  let list = resolveVariablePath(variables, varPath);
  
  // If it's a JSON array string, parse it
  if (typeof list === 'string') {
    const trimmed = list.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        list = JSON.parse(trimmed);
      } catch {
        return '';
      }
    }
  }
  
  if (!Array.isArray(list)) return '';

  const placeholder = itemAlias || 'this';
  return list.map(item => expandLoopItem(item, placeholder, body)).join('');
}

/**
 * Processes all FOR blocks in a template (handles nesting).
 * @param variables - Variable map
 * @param template - Template string
 * @returns Processed template
 */
export function processForBlocks(variables: VariableMap, template: string): string {
  let result = template;
  let changed = true;

  while (changed) {
    const before = result;
    const regex = /\{\{FOR\s+(\w+(?:\.\w+)?)(?:\s+AS\s+(\w+))?\}\}([\s\S]*?)\{\{END(?:FOR)?\}\}/g;
    
    result = result.replace(regex, (_m, path, alias, body) => 
      processForLoop(variables, path, alias, body)
    );
    
    changed = result !== before;
  }

  return result;
}

// ============================================================================
// LIST ITEM PROCESSING - Pure functions for numbered lists
// ============================================================================

/**
 * Processes a single LIST_ITEM line.
 * @param variables - Variable map
 * @param match - Regex match array
 * @param counter - Current list number
 * @returns Object with output string or null
 */
export function processListItemLine(
  variables: VariableMap,
  match: RegExpMatchArray,
  counter: number
): { output: string | null } {
  const [, indent, varName, operator, quotedVal, unquotedVal, quotedFallback, unquotedFallback, content] = match;

  let conditionMet = true;
  if (varName) {
    const compareVal = quotedVal !== undefined ? quotedVal.replace(/\\"/g, '"') : unquotedVal;
    conditionMet = evaluateSingleCondition(variables, 
      `${varName} ${operator || 'not_empty'} "${compareVal || ''}"`
    );
  }

  if (conditionMet && content.trim() !== '') {
    return { output: `${indent}${counter}. ${content.trim()}` };
  }

  if (!conditionMet) {
    const fallback = quotedFallback !== undefined ? quotedFallback.replace(/\\"/g, '"') : unquotedFallback;
    if (fallback?.trim()) {
      return { output: `${indent}${counter}. ${fallback}` };
    }
  }

  return { output: null };
}

/**
 * Processes all LIST_ITEM lines in a template.
 * @param variables - Variable map
 * @param template - Template string
 * @returns Processed template
 */
export function processListItems(variables: VariableMap, template: string): string {
  const listItemRegex = /^([ \t]*)\{\{LIST_ITEM(?:\?(\w+)(?:\s+([\w\s]+)(?:\s+(?:"((?:[^"\\]|\\.)*)"|([\w\d]+)))?)?(?:\|(?:"((?:[^"\\]|\\.)*)"|(.*)))?)?\}\}(.*)$/;
  
  const lines = template.split('\n');
  const output: string[] = [];
  let counter = 1;
  let inList = false;

  for (const line of lines) {
    const match = line.match(listItemRegex);

    if (match) {
      const result = processListItemLine(variables, match, counter);
      if (result.output) {
        output.push(result.output);
        counter++;
        inList = true;
      }
    } else {
      output.push(line);
      
      const isBullet = /^\s*[*+-]\s/.test(line);
      const isEmpty = line.trim() === '';
      
      if (inList && !isEmpty && !isBullet) {
        counter = 1;
        inList = false;
      }
    }
  }

  return output.join('\n');
}

// ============================================================================
// VARIABLE SUBSTITUTION - Pure function
// ============================================================================

/**
 * Substitutes all ${{varName}} with values.
 * @param variables - Variable map
 * @param template - Template string
 * @returns Processed template
 */
export function substituteVariables(variables: VariableMap, template: string): string {
  // Match ${{varName}} or ${{varName.property.nested}}
  return template.replace(/\$\{\{([\w.]+)\}\}/g, (_m, varPath: string) => {
    // Check if it's a simple variable or dot notation path
    if (varPath.includes('.')) {
      const value = resolveVariablePath(variables, varPath);
      return value != null ? String(value) : '';
    }
    const value = variables.get(varPath);
    return value != null ? String(value) : '';
  });
}

// ============================================================================
// WHITESPACE NORMALIZATION - Pure function
// ============================================================================

/**
 * Normalizes whitespace in processed template.
 * @param content - Content to normalize
 * @returns Normalized content
 */
export function normalizeWhitespace(content: string): string {
  return content
    .replace(/\n{2,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n\s*\n/g, '\n\n');
}

// ============================================================================
// MAIN TEMPLATE RESOLUTION - Orchestrates all processors
// ============================================================================

/**
 * Resolves a template with the given variables.
 * @param template - Template string
 * @param variables - Variable map
 * @returns Fully resolved string
 */
export function resolveTemplate(template: string, variables: VariableMap): string {
  if (!template || typeof template !== 'string') {
    return '';
  }

  let result = template.replace(/\r\n/g, '\n');

  // Process in order: conditionals -> case -> loops -> list items -> substitution
  result = processIfBlocks(variables, result);
  result = processCaseBlocks(variables, result);
  result = processForBlocks(variables, result);
  result = processListItems(variables, result);
  result = substituteVariables(variables, result);

  return normalizeWhitespace(result);
}

// ============================================================================
// LEGACY CLASS WRAPPERS (for backwards compatibility)
// ============================================================================

/**
 * Class wrapper for variable extraction.
 * @deprecated Use extractAllVariables() function directly
 */
export class TemplateVariableExtractor {
  extractVariableNames(template: string): string[] {
    return extractAllVariables(template);
  }
}

/**
 * Class wrapper for template resolution.
 * @deprecated Use resolveTemplate() function directly
 */
export class TemplateEngine {
  private variables: VariableMap;

  constructor(variables: VariableMap) {
    this.variables = variables;
  }

  resolve(template: string): string {
    return resolveTemplate(template, this.variables);
  }
}

// ============================================================================
// N8N NODE DEFINITION
// ============================================================================

export class TemplateResolver implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Template Resolver',
    name: 'templateResolver',
    // eslint-disable-next-line @n8n/community-nodes/icon-validation
    icon: 'fa:file-code', // format is valid icon reference and will display as expected, despite warning
    group: ['transform'],
    usableAsTool: true,
    version: 1,
    description: 'Resolves conditional markdown templates with variable substitution, conditionals, loops, and more',
    defaults: {
      name: 'Template Resolver',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Template',
        name: 'template',
        type: 'string',
        typeOptions: {
          rows: 10,
        },
        default: '',
        required: true,
        description: 'Template text with ${{variable}}, {{IF}}, {{CASE}}, {{FOR}}, and {{LIST_ITEM}} syntax',
        placeholder: `# \${{title}}

{{IF author}}
By \${{author}}
{{ENDIF}}

{{CASE status}}
{{WHEN "draft"}}Status: Draft
{{WHEN "published"}}Status: Published
{{DEFAULT}}Status: Unknown
{{ENDCASE}}

{{FOR items AS item}}
- \${{item}}
{{ENDFOR}}`,
      },
      {
        displayName: 'Variable Mappings',
        name: 'variableMappings',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        description: 'Map template variables to values. Use static, fixed values or n8n expressions like {{ $("NodeName").item.JSON.fieldName }}.',
        placeholder: 'Add mapping',
        options: [
          {
            name: 'mappings',
            displayName: 'Mapping',
            values: [
              {
                displayName: 'Variable Name',
                name: 'variableName',
                type: 'string',
                default: '',
                required: true,
                description: 'Name of the variable in the template (e.g., "title" for ${{title}})',
                placeholder: 'primary_keyword',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'Value to substitute (supports n8n expressions)',
                placeholder: '={{ $("Previous Node").item.json.primary_keyword }}',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Strict Mode',
        name: 'strictMode',
        type: 'boolean',
        default: true,
        description: 'Whether to throw an error if template variables are missing. If disabled, missing variables become empty strings.',
      },
      {
        displayName: 'Show Detected Variables',
        name: 'showDetectedVariables',
        type: 'boolean',
        default: false,
        description: 'Whether to include detected variables in the output (useful for debugging)',
      },
      {
        displayName: 'Output Field Name',
        name: 'outputField',
        type: 'string',
        default: 'resolved_prompt',
        description: 'Name of the field to store the resolved template',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        // Get parameters
        const template = this.getNodeParameter('template', itemIndex) as string;
        const variableMappings = this.getNodeParameter('variableMappings', itemIndex, {
          mappings: [],
        }) as VariableMappingsCollection;
        const strictMode = this.getNodeParameter('strictMode', itemIndex) as boolean;
        const showDetectedVariables = this.getNodeParameter('showDetectedVariables', itemIndex) as boolean;
        const outputField = this.getNodeParameter('outputField', itemIndex) as string;

        // Extract variables from template
        const detectedVariables = extractAllVariables(template);

        // Build variable map
        const variables: VariableMap = new Map();
        if (variableMappings.mappings?.length) {
          for (const mapping of variableMappings.mappings) {
            if (mapping.variableName && mapping.value !== undefined) {
              variables.set(mapping.variableName, mapping.value);
            }
          }
        }

        // Check for missing variables
        const missingVariables = detectedVariables.filter(v => !variables.has(v));

        if (strictMode && missingVariables.length > 0) {
          throw new NodeOperationError(
            this.getNode(),
            `Template requires unmapped variables: ${missingVariables.join(', ')}. ` +
            `Add mappings or disable "Strict Mode". ` +
            `All detected: ${detectedVariables.join(', ')}`
          );
        }

        // Fill missing with empty strings in non-strict mode
        if (!strictMode) {
          for (const v of missingVariables) {
            variables.set(v, '');
          }
        }

        // Resolve template
        const resolved = resolveTemplate(template, variables);

        // Build output
        const outputData: { [key: string]: string | TemplateMetadata } = {
          [outputField]: resolved,
        };

        if (showDetectedVariables) {
          outputData._template_metadata = {
            detected_variables: detectedVariables,
            mapped_variables: Array.from(variables.keys()),
            missing_variables: missingVariables,
            variable_count: detectedVariables.length,
          };
        }

        returnData.push({
          json: outputData,
          pairedItem: { item: itemIndex },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: itemIndex },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
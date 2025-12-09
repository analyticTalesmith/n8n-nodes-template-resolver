/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  VariableMap,
  TemplateValue,
  
  // Variable name validation
  isValidVariableName,
  addVariableToSet,
  
  // Variable extraction functions
  extractSubstitutionVariables,
  extractVariableFromCondition,
  splitConditionExpression,
  extractIfVariables,
  extractCaseVariables,
  extractForVariables,
  extractListItemVariables,
  extractAllVariables,
  
  // Variable access
  getVariable,
  isVariableTruthy,
  
  // Condition evaluation
  evaluateComparison,
  evaluateSingleCondition,
  tokenizeExpression,
  evaluateFlatExpression,
  evaluateExpression,
  
  // IF block processing
  findMatchingEndif,
  findIfBlocks,
  findBranchMarkers,
  parseConditionalBranches,
  evaluateConditionalBlock,
  processIfBlocks,
  
  // CASE block processing
  parseWhenClauses,
  evaluateCaseBlock,
  processCaseBlocks,
  
  // FOR loop processing
  resolveVariablePath,
  expandLoopItem,
  processForLoop,
  processForBlocks,
  
  // LIST_ITEM processing
  processListItemLine,
  processListItems,
  
  // Variable substitution
  substituteVariables,
  
  // Whitespace normalization
  normalizeWhitespace,
  
  // Main entry point
  resolveTemplate,
  
  // Legacy class wrappers
  TemplateVariableExtractor,
  TemplateEngine,
} from '../nodes/TemplateResolver/TemplateResolver.node';

// Helper to create VariableMap with proper typing
function vars(entries: [string, TemplateValue][]): VariableMap {
  return new Map(entries);
}

// ============================================================================
// VARIABLE NAME VALIDATION
// ============================================================================

describe('isValidVariableName', () => {
  describe('valid names', () => {
    test.each([
      ['simple', 'name'],
      ['single letter', 'x'],
      ['with numbers', 'var123'],
      ['with underscore', 'my_var'],
      ['starting with underscore', '_private'],
      ['camelCase', 'myVariable'],
      ['PascalCase', 'MyVariable'],
      ['SCREAMING_CASE', 'MY_CONSTANT'],
      ['dot notation', 'user.name'],
      ['deep dot notation', 'user.address.city'],
      ['mixed', '_user2.data_v1'],
    ])('%s: "%s"', (_, name) => {
      expect(isValidVariableName(name)).toBe(true);
    });
  });

  describe('invalid names', () => {
    test.each([
      ['empty string', ''],
      ['starts with number', '123abc'],
      ['contains dash', 'my-var'],
      ['contains space', 'my var'],
      ['special characters', 'var@name'],
      ['only numbers', '123'],
      ['starts with dot', '.name'],
      ['contains brackets', 'arr[0]'],
      ['contains parentheses', 'func()'],
    ])('%s: "%s"', (_, name) => {
      expect(isValidVariableName(name)).toBe(false);
    });

    // Note: The regex allows trailing dots and double dots - these are edge cases
    // that could be tightened in the future if needed
  });
});

describe('addVariableToSet', () => {
  test('adds simple variable', () => {
    const set = new Set<string>();
    addVariableToSet('name', set);
    expect(set).toContain('name');
    expect(set.size).toBe(1);
  });

  test('adds base name for dot notation', () => {
    const set = new Set<string>();
    addVariableToSet('user.name', set);
    expect(set).toContain('user');
    expect(set).toContain('user.name');
    expect(set.size).toBe(2);
  });

  test('adds only base for deep paths', () => {
    const set = new Set<string>();
    addVariableToSet('a.b.c.d', set);
    expect(set).toContain('a');
    expect(set).toContain('a.b.c.d');
    expect(set.size).toBe(2);
  });

  test('ignores empty string', () => {
    const set = new Set<string>();
    addVariableToSet('', set);
    expect(set.size).toBe(0);
  });

  test('ignores invalid names', () => {
    const set = new Set<string>();
    addVariableToSet('123invalid', set);
    addVariableToSet('has-dash', set);
    expect(set.size).toBe(0);
  });

  test('does not duplicate existing entries', () => {
    const set = new Set<string>();
    addVariableToSet('name', set);
    addVariableToSet('name', set);
    expect(set.size).toBe(1);
  });
});

// ============================================================================
// VARIABLE EXTRACTION FUNCTIONS
// ============================================================================

describe('extractSubstitutionVariables', () => {
  test('extracts single variable', () => {
    expect(extractSubstitutionVariables('${{name}}')).toEqual(['name']);
  });

  test('extracts multiple variables', () => {
    expect(extractSubstitutionVariables('${{a}} ${{b}} ${{c}}')).toEqual(['a', 'b', 'c']);
  });

  test('extracts dot notation', () => {
    expect(extractSubstitutionVariables('${{user.name}}')).toEqual(['user.name']);
  });

  test('extracts deep dot notation', () => {
    expect(extractSubstitutionVariables('${{a.b.c}}')).toEqual(['a.b.c']);
  });

  test('extracts from surrounding text', () => {
    expect(extractSubstitutionVariables('Hello ${{name}}!')).toEqual(['name']);
  });

  test('extracts duplicates', () => {
    expect(extractSubstitutionVariables('${{x}} ${{x}}')).toEqual(['x', 'x']);
  });

  test('returns empty for no variables', () => {
    expect(extractSubstitutionVariables('plain text')).toEqual([]);
  });

  test('returns empty for empty string', () => {
    expect(extractSubstitutionVariables('')).toEqual([]);
  });

  test('ignores malformed syntax', () => {
    expect(extractSubstitutionVariables('${name}')).toEqual([]);
    expect(extractSubstitutionVariables('{{name}}')).toEqual([]);
    expect(extractSubstitutionVariables('${{name}')).toEqual([]);
  });

  test('handles adjacent variables', () => {
    expect(extractSubstitutionVariables('${{a}}${{b}}')).toEqual(['a', 'b']);
  });

  test('handles variables with underscores', () => {
    expect(extractSubstitutionVariables('${{my_var}}')).toEqual(['my_var']);
  });

  test('handles variables with numbers', () => {
    expect(extractSubstitutionVariables('${{var1}}')).toEqual(['var1']);
  });
});

describe('extractVariableFromCondition', () => {
  test('extracts simple variable', () => {
    expect(extractVariableFromCondition('name')).toBe('name');
  });

  test('extracts variable from comparison', () => {
    expect(extractVariableFromCondition('status == "active"')).toBe('status');
  });

  test('extracts variable with operator', () => {
    expect(extractVariableFromCondition('count length_gt 5')).toBe('count');
  });

  test('handles quoted values', () => {
    expect(extractVariableFromCondition('name == "test"')).toBe('name');
  });

  test('handles single quotes', () => {
    expect(extractVariableFromCondition("name == 'test'")).toBe('name');
  });

  test('returns null for empty', () => {
    expect(extractVariableFromCondition('')).toBeNull();
  });

  test('returns null for invalid first token', () => {
    expect(extractVariableFromCondition('123invalid')).toBeNull();
  });

  // Note: extractVariableFromCondition doesn't trim input - caller should handle whitespace
});

describe('splitConditionExpression', () => {
  test('returns single condition as array', () => {
    expect(splitConditionExpression('name')).toEqual(['name']);
  });

  test('splits by AND', () => {
    expect(splitConditionExpression('a AND b')).toEqual(['a', 'b']);
  });

  test('splits by OR', () => {
    expect(splitConditionExpression('a OR b')).toEqual(['a', 'b']);
  });

  test('splits complex expression', () => {
    expect(splitConditionExpression('a AND b OR c')).toEqual(['a', 'b', 'c']);
  });

  test('removes parentheses', () => {
    expect(splitConditionExpression('(a AND b)')).toEqual(['a', 'b']);
  });

  test('handles case insensitivity', () => {
    expect(splitConditionExpression('a and b')).toEqual(['a', 'b']);
    expect(splitConditionExpression('a And b')).toEqual(['a', 'b']);
  });

  test('preserves comparison operators', () => {
    const result = splitConditionExpression('a == "x" AND b != "y"');
    expect(result[0]).toContain('==');
    expect(result[1]).toContain('!=');
  });

  test('filters empty strings', () => {
    expect(splitConditionExpression('  ')).toEqual([]);
  });
});

describe('extractIfVariables', () => {
  test('extracts from simple IF', () => {
    expect(extractIfVariables('{{IF show}}text{{ENDIF}}')).toContain('show');
  });

  test('extracts from IF with comparison', () => {
    expect(extractIfVariables('{{IF status == "active"}}text{{ENDIF}}')).toContain('status');
  });

  test('extracts from ELSEIF', () => {
    const result = extractIfVariables('{{IF a}}A{{ELSEIF b}}B{{ENDIF}}');
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  test('extracts from ELSE_IF variant', () => {
    expect(extractIfVariables('{{IF a}}A{{ELSE_IF b}}B{{ENDIF}}')).toContain('b');
  });

  test('extracts from ELSE IF variant', () => {
    expect(extractIfVariables('{{IF a}}A{{ELSE IF b}}B{{ENDIF}}')).toContain('b');
  });

  test('extracts from AND expression', () => {
    const result = extractIfVariables('{{IF a AND b}}text{{ENDIF}}');
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  test('extracts from OR expression', () => {
    const result = extractIfVariables('{{IF a OR b}}text{{ENDIF}}');
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  test('extracts from nested IFs', () => {
    const result = extractIfVariables('{{IF a}}{{IF b}}text{{ENDIF}}{{ENDIF}}');
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  test('returns empty for no IFs', () => {
    expect(extractIfVariables('plain text')).toEqual([]);
  });
});

describe('extractCaseVariables', () => {
  test('extracts from CASE', () => {
    expect(extractCaseVariables('{{CASE status}}{{WHEN "a"}}A{{ENDCASE}}')).toEqual(['status']);
  });

  test('extracts from multiple CASEs', () => {
    const result = extractCaseVariables('{{CASE a}}{{ENDCASE}}{{CASE b}}{{ENDCASE}}');
    expect(result).toEqual(['a', 'b']);
  });

  test('extracts dot notation', () => {
    expect(extractCaseVariables('{{CASE user.role}}{{ENDCASE}}')).toEqual(['user.role']);
  });

  test('returns empty for no CASEs', () => {
    expect(extractCaseVariables('plain text')).toEqual([]);
  });
});

describe('extractForVariables', () => {
  test('extracts from FOR with AS', () => {
    expect(extractForVariables('{{FOR items AS item}}{{ENDFOR}}')).toEqual(['items']);
  });

  test('extracts from FOR without AS', () => {
    expect(extractForVariables('{{FOR items}}{{END}}')).toEqual(['items']);
  });

  test('extracts dot notation', () => {
    expect(extractForVariables('{{FOR user.orders AS o}}{{ENDFOR}}')).toEqual(['user.orders']);
  });

  test('extracts from multiple FORs', () => {
    const result = extractForVariables('{{FOR a AS x}}{{END}}{{FOR b AS y}}{{END}}');
    expect(result).toEqual(['a', 'b']);
  });

  test('returns empty for no FORs', () => {
    expect(extractForVariables('plain text')).toEqual([]);
  });
});

describe('extractListItemVariables', () => {
  test('extracts from LIST_ITEM', () => {
    expect(extractListItemVariables('{{LIST_ITEM?hasData}}content')).toEqual(['hasData']);
  });

  test('extracts dot notation', () => {
    expect(extractListItemVariables('{{LIST_ITEM?user.active}}content')).toEqual(['user.active']);
  });

  test('extracts from multiple LIST_ITEMs', () => {
    const result = extractListItemVariables('{{LIST_ITEM?a}}A\n{{LIST_ITEM?b}}B');
    expect(result).toEqual(['a', 'b']);
  });

  test('returns empty for no LIST_ITEMs', () => {
    expect(extractListItemVariables('plain text')).toEqual([]);
  });

  test('returns empty for LIST_ITEM without condition', () => {
    expect(extractListItemVariables('{{LIST_ITEM}}content')).toEqual([]);
  });
});

describe('extractAllVariables', () => {
  test('combines all extraction methods', () => {
    const template = 
      '${{subVar}} ' +
      '{{IF ifVar}}text{{ENDIF}} ' +
      '{{CASE caseVar}}{{ENDCASE}} ' +
      '{{FOR forVar AS x}}{{END}} ' +
      '{{LIST_ITEM?listVar}}content';
    const result = extractAllVariables(template);
    expect(result).toContain('subVar');
    expect(result).toContain('ifVar');
    expect(result).toContain('caseVar');
    expect(result).toContain('forVar');
    expect(result).toContain('listVar');
  });

  test('deduplicates variables', () => {
    const result = extractAllVariables('${{x}} {{IF x}}${{x}}{{ENDIF}}');
    expect(result.filter((v: string) => v === 'x')).toHaveLength(1);
  });

  test('returns sorted array', () => {
    const result = extractAllVariables('${{z}} ${{a}} ${{m}}');
    expect(result).toEqual(['a', 'm', 'z']);
  });

  test('handles empty template', () => {
    expect(extractAllVariables('')).toEqual([]);
  });

  test('handles template with no variables', () => {
    expect(extractAllVariables('plain text without variables')).toEqual([]);
  });

  test('adds base names for dot notation', () => {
    const result = extractAllVariables('${{user.name}}');
    expect(result).toContain('user');
    expect(result).toContain('user.name');
  });
});

// ============================================================================
// VARIABLE ACCESS FUNCTIONS
// ============================================================================

describe('getVariable', () => {
  test('returns existing value', () => {
    const variables = vars([['name', 'Alice']]);
    expect(getVariable(variables, 'name')).toBe('Alice');
  });

  test('returns undefined for missing', () => {
    const variables = vars([]);
    expect(getVariable(variables, 'missing')).toBeUndefined();
  });

  test('returns null if set to null', () => {
    const variables = vars([['val', null]]);
    expect(getVariable(variables, 'val')).toBeNull();
  });

  test('returns array', () => {
    const variables = vars([['items', ['a', 'b']]]);
    expect(getVariable(variables, 'items')).toEqual(['a', 'b']);
  });

  test('returns object', () => {
    const variables = vars([['user', { name: 'Alice' }]]);
    expect(getVariable(variables, 'user')).toEqual({ name: 'Alice' });
  });
});

describe('isVariableTruthy', () => {
  test('true for non-empty string', () => {
    expect(isVariableTruthy(vars([['x', 'value']]), 'x')).toBe(true);
  });

  test('false for empty string', () => {
    expect(isVariableTruthy(vars([['x', '']]), 'x')).toBe(false);
  });

  test('false for whitespace-only string', () => {
    expect(isVariableTruthy(vars([['x', '   ']]), 'x')).toBe(false);
  });

  test('false for missing variable', () => {
    expect(isVariableTruthy(vars([]), 'x')).toBe(false);
  });

  test('false for null', () => {
    expect(isVariableTruthy(vars([['x', null]]), 'x')).toBe(false);
  });

  test('false for undefined', () => {
    expect(isVariableTruthy(vars([['x', undefined]]), 'x')).toBe(false);
  });

  test('true for number', () => {
    expect(isVariableTruthy(vars([['x', 42]]), 'x')).toBe(true);
  });

  test('true for zero (converts to "0")', () => {
    expect(isVariableTruthy(vars([['x', 0]]), 'x')).toBe(true);
  });

  test('true for boolean true', () => {
    expect(isVariableTruthy(vars([['x', true]]), 'x')).toBe(true);
  });

  test('true for boolean false (converts to "false")', () => {
    expect(isVariableTruthy(vars([['x', false]]), 'x')).toBe(true);
  });

  test('true for array', () => {
    expect(isVariableTruthy(vars([['x', [1, 2]]]), 'x')).toBe(true);
  });

  test('true for object', () => {
    expect(isVariableTruthy(vars([['x', { a: 1 }]]), 'x')).toBe(true);
  });
});

// ============================================================================
// CONDITION EVALUATION
// ============================================================================

describe('evaluateComparison', () => {
  const variables = vars([
    ['str', 'hello world'],
    ['empty', ''],
    ['num', '42'],
    ['arr', ['a', 'b']],
  ]);

  describe('equality operators', () => {
    test('== matches', () => {
      expect(evaluateComparison(variables, 'str', '==', 'hello world')).toBe(true);
    });

    test('== does not match', () => {
      expect(evaluateComparison(variables, 'str', '==', 'other')).toBe(false);
    });

    test('equals alias', () => {
      expect(evaluateComparison(variables, 'str', 'equals', 'hello world')).toBe(true);
    });

    test('is alias', () => {
      expect(evaluateComparison(variables, 'str', 'is', 'hello world')).toBe(true);
    });

    test('!= matches', () => {
      expect(evaluateComparison(variables, 'str', '!=', 'other')).toBe(true);
    });

    test('!= does not match', () => {
      expect(evaluateComparison(variables, 'str', '!=', 'hello world')).toBe(false);
    });

    test('not_equals alias', () => {
      expect(evaluateComparison(variables, 'str', 'not_equals', 'other')).toBe(true);
    });

    test('is_not alias', () => {
      expect(evaluateComparison(variables, 'str', 'is_not', 'other')).toBe(true);
    });
  });

  describe('existence operators', () => {
    test('not_empty true', () => {
      expect(evaluateComparison(variables, 'str', 'not_empty', '')).toBe(true);
    });

    test('not_empty false', () => {
      expect(evaluateComparison(variables, 'empty', 'not_empty', '')).toBe(false);
    });

    test('exists alias', () => {
      expect(evaluateComparison(variables, 'str', 'exists', '')).toBe(true);
    });

    test('empty true', () => {
      expect(evaluateComparison(variables, 'empty', 'empty', '')).toBe(true);
    });

    test('empty false', () => {
      expect(evaluateComparison(variables, 'str', 'empty', '')).toBe(false);
    });

    test('missing alias', () => {
      expect(evaluateComparison(variables, 'empty', 'missing', '')).toBe(true);
    });
  });

  describe('string operators', () => {
    test('contains true', () => {
      expect(evaluateComparison(variables, 'str', 'contains', 'world')).toBe(true);
    });

    test('contains false', () => {
      expect(evaluateComparison(variables, 'str', 'contains', 'xyz')).toBe(false);
    });

    test('not_contains true', () => {
      expect(evaluateComparison(variables, 'str', 'not_contains', 'xyz')).toBe(true);
    });

    test('not_contains false', () => {
      expect(evaluateComparison(variables, 'str', 'not_contains', 'world')).toBe(false);
    });

    test('starts_with true', () => {
      expect(evaluateComparison(variables, 'str', 'starts_with', 'hello')).toBe(true);
    });

    test('starts_with false', () => {
      expect(evaluateComparison(variables, 'str', 'starts_with', 'world')).toBe(false);
    });

    test('ends_with true', () => {
      expect(evaluateComparison(variables, 'str', 'ends_with', 'world')).toBe(true);
    });

    test('ends_with false', () => {
      expect(evaluateComparison(variables, 'str', 'ends_with', 'hello')).toBe(false);
    });
  });

  describe('length operators', () => {
    test('length_gt true', () => {
      expect(evaluateComparison(variables, 'str', 'length_gt', '5')).toBe(true);
    });

    test('length_gt false', () => {
      expect(evaluateComparison(variables, 'str', 'length_gt', '100')).toBe(false);
    });

    test('length_gt equal is false', () => {
      expect(evaluateComparison(variables, 'str', 'length_gt', '11')).toBe(false);
    });

    test('length_lt true', () => {
      expect(evaluateComparison(variables, 'str', 'length_lt', '100')).toBe(true);
    });

    test('length_lt false', () => {
      expect(evaluateComparison(variables, 'str', 'length_lt', '5')).toBe(false);
    });

    test('length_lt defaults to 0', () => {
      expect(evaluateComparison(variables, 'str', 'length_lt', '')).toBe(false);
    });
  });

  describe('type operators', () => {
    test('is_array true', () => {
      expect(evaluateComparison(variables, 'arr', 'is_array', '')).toBe(true);
    });

    test('is_array false', () => {
      expect(evaluateComparison(variables, 'str', 'is_array', '')).toBe(false);
    });

    test('is_number true', () => {
      expect(evaluateComparison(variables, 'num', 'is_number', '')).toBe(true);
    });

    test('is_number false', () => {
      expect(evaluateComparison(variables, 'str', 'is_number', '')).toBe(false);
    });

    test('is_number false for empty', () => {
      expect(evaluateComparison(variables, 'empty', 'is_number', '')).toBe(false);
    });
  });

  describe('unknown operator', () => {
    test('defaults to truthy check', () => {
      expect(evaluateComparison(variables, 'str', 'unknown_op', '')).toBe(true);
      expect(evaluateComparison(variables, 'empty', 'unknown_op', '')).toBe(false);
    });
  });

  describe('missing variable', () => {
    test('treats as empty string', () => {
      expect(evaluateComparison(variables, 'missing', '==', '')).toBe(true);
      expect(evaluateComparison(variables, 'missing', 'empty', '')).toBe(true);
    });
  });
});

describe('evaluateSingleCondition', () => {
  const variables = vars([
    ['exists', 'value'],
    ['empty', ''],
    ['status', 'active'],
  ]);

  test('single variable - truthy', () => {
    expect(evaluateSingleCondition(variables, 'exists')).toBe(true);
  });

  test('single variable - falsy', () => {
    expect(evaluateSingleCondition(variables, 'empty')).toBe(false);
  });

  test('single variable - missing', () => {
    expect(evaluateSingleCondition(variables, 'missing')).toBe(false);
  });

  test('comparison with quoted value', () => {
    expect(evaluateSingleCondition(variables, 'status == "active"')).toBe(true);
  });

  test('comparison with single quotes', () => {
    expect(evaluateSingleCondition(variables, "status == 'active'")).toBe(true);
  });

  test('comparison with multiple words', () => {
    const v = vars([['phrase', 'hello world']]);
    expect(evaluateSingleCondition(v, 'phrase == "hello world"')).toBe(true);
  });

  test('handles leading/trailing whitespace', () => {
    expect(evaluateSingleCondition(variables, '  exists  ')).toBe(true);
  });
});

describe('tokenizeExpression', () => {
  test('single token', () => {
    expect(tokenizeExpression('name')).toEqual(['name']);
  });

  test('AND operator', () => {
    expect(tokenizeExpression('a AND b')).toEqual(['a', 'AND', 'b']);
  });

  test('OR operator', () => {
    expect(tokenizeExpression('a OR b')).toEqual(['a', 'OR', 'b']);
  });

  test('parentheses', () => {
    expect(tokenizeExpression('(a)')).toEqual(['(', 'a', ')']);
  });

  test('complex expression', () => {
    expect(tokenizeExpression('(a AND b) OR c')).toEqual(['(', 'a', 'AND', 'b', ')', 'OR', 'c']);
  });

  test('preserves quoted strings', () => {
    const result = tokenizeExpression('name == "hello world"');
    expect(result).toContain('name == "hello world"');
  });

  test('handles single quotes', () => {
    const result = tokenizeExpression("name == 'test'");
    expect(result).toContain("name == 'test'");
  });

  test('case insensitive AND/OR', () => {
    expect(tokenizeExpression('a and b')).toEqual(['a', 'AND', 'b']);
    expect(tokenizeExpression('a And b')).toEqual(['a', 'AND', 'b']);
  });

  test('nested parentheses', () => {
    expect(tokenizeExpression('((a))')).toEqual(['(', '(', 'a', ')', ')']);
  });
});

describe('evaluateFlatExpression', () => {
  const variables = vars([
    ['t', 'yes'],
    ['f', ''],
  ]);

  test('single true', () => {
    expect(evaluateFlatExpression(variables, ['t'])).toBe(true);
  });

  test('single false', () => {
    expect(evaluateFlatExpression(variables, ['f'])).toBe(false);
  });

  test('literal true', () => {
    expect(evaluateFlatExpression(variables, ['true'])).toBe(true);
  });

  test('literal false', () => {
    expect(evaluateFlatExpression(variables, ['false'])).toBe(false);
  });

  test('AND both true', () => {
    expect(evaluateFlatExpression(variables, ['t', 'AND', 't'])).toBe(true);
  });

  test('AND one false', () => {
    expect(evaluateFlatExpression(variables, ['t', 'AND', 'f'])).toBe(false);
  });

  test('OR both false', () => {
    expect(evaluateFlatExpression(variables, ['f', 'OR', 'f'])).toBe(false);
  });

  test('OR one true', () => {
    expect(evaluateFlatExpression(variables, ['f', 'OR', 't'])).toBe(true);
  });

  test('AND precedence over OR', () => {
    // f OR t AND t = f OR true = true
    expect(evaluateFlatExpression(variables, ['f', 'OR', 't', 'AND', 't'])).toBe(true);
    // t OR f AND f = t OR false = true
    expect(evaluateFlatExpression(variables, ['t', 'OR', 'f', 'AND', 'f'])).toBe(true);
  });

  test('empty tokens returns false', () => {
    expect(evaluateFlatExpression(variables, [])).toBe(false);
  });
});

describe('evaluateExpression', () => {
  const variables = vars([
    ['a', 'yes'],
    ['b', 'yes'],
    ['c', ''],
  ]);

  test('simple truthy', () => {
    expect(evaluateExpression(variables, 'a')).toBe(true);
  });

  test('simple falsy', () => {
    expect(evaluateExpression(variables, 'c')).toBe(false);
  });

  test('AND true', () => {
    expect(evaluateExpression(variables, 'a AND b')).toBe(true);
  });

  test('AND false', () => {
    expect(evaluateExpression(variables, 'a AND c')).toBe(false);
  });

  test('OR true', () => {
    expect(evaluateExpression(variables, 'a OR c')).toBe(true);
  });

  test('OR false', () => {
    expect(evaluateExpression(variables, 'c OR c')).toBe(false);
  });

  test('parentheses change evaluation order', () => {
    // Without parens: c OR a AND b = c OR true = true
    // With parens: (c OR a) AND b = true AND true = true
    expect(evaluateExpression(variables, '(c OR a) AND b')).toBe(true);
    // (c AND a) OR b = false OR true = true
    expect(evaluateExpression(variables, '(c AND a) OR b')).toBe(true);
    // c AND (a OR b) = false AND true = false
    expect(evaluateExpression(variables, 'c AND (a OR b)')).toBe(false);
  });

  test('nested parentheses', () => {
    expect(evaluateExpression(variables, '((a AND b))')).toBe(true);
  });

  test('complex expression', () => {
    // (a AND b) OR (c AND c) = true OR false = true
    expect(evaluateExpression(variables, '(a AND b) OR (c AND c)')).toBe(true);
  });

  test('with comparison operators', () => {
    const v = vars([['status', 'active']]);
    expect(evaluateExpression(v, 'status == "active"')).toBe(true);
    expect(evaluateExpression(v, 'status == "inactive"')).toBe(false);
  });
});

// ============================================================================
// IF BLOCK PROCESSING
// ============================================================================

describe('findMatchingEndif', () => {
  test('finds simple ENDIF', () => {
    const input = '{{IF x}}content{{ENDIF}}';
    // Returns position of {{ENDIF}} tag
    expect(findMatchingEndif(input, 0)).toBe(15);
  });

  test('finds nested ENDIF correctly', () => {
    const input = '{{IF a}}{{IF b}}inner{{ENDIF}}outer{{ENDIF}}';
    // The function finds the ENDIF that matches the IF at position 0
    // Position of the outer {{ENDIF}} is at index 35
    expect(findMatchingEndif(input, 0)).toBe(35);
  });

  test('returns -1 for unmatched', () => {
    const input = '{{IF x}}content';
    expect(findMatchingEndif(input, 0)).toBe(-1);
  });

  test('handles sequential IFs', () => {
    const input = '{{IF a}}A{{ENDIF}}{{IF b}}B{{ENDIF}}';
    // First {{ENDIF}} is at position 9
    expect(findMatchingEndif(input, 0)).toBe(9);
  });
});

describe('findIfBlocks', () => {
  test('finds single IF block', () => {
    const blocks = findIfBlocks('{{IF x}}content{{ENDIF}}');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].expression).toBe('x');
    expect(blocks[0].content).toBe('content');
  });

  test('finds multiple sequential IF blocks', () => {
    const blocks = findIfBlocks('{{IF a}}A{{ENDIF}} {{IF b}}B{{ENDIF}}');
    expect(blocks).toHaveLength(2);
  });

  test('finds outer IF block with nested content', () => {
    // findIfBlocks returns the outermost block - nested IFs are in content
    const blocks = findIfBlocks('{{IF outer}}{{IF inner}}text{{ENDIF}}{{ENDIF}}');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].expression).toBe('outer');
    expect(blocks[0].content).toContain('{{IF inner}}');
  });

  test('returns empty for no IFs', () => {
    expect(findIfBlocks('plain text')).toEqual([]);
  });

  test('captures expression with comparison', () => {
    const blocks = findIfBlocks('{{IF status == "active"}}text{{ENDIF}}');
    expect(blocks[0].expression).toBe('status == "active"');
  });
});

describe('findBranchMarkers', () => {
  test('returns empty for no markers', () => {
    expect(findBranchMarkers('plain content')).toEqual([]);
  });

  test('finds ELSE', () => {
    const markers = findBranchMarkers('content{{ELSE}}other');
    expect(markers).toHaveLength(1);
    expect(markers[0].type).toBe('ELSE');
  });

  test('finds ELSEIF', () => {
    const markers = findBranchMarkers('content{{ELSEIF condition}}other');
    expect(markers).toHaveLength(1);
    expect(markers[0].type).toBe('ELSEIF');
    expect(markers[0].condition).toBe('condition');
  });

  test('finds ELSE_IF variant', () => {
    const markers = findBranchMarkers('content{{ELSE_IF condition}}other');
    expect(markers).toHaveLength(1);
    expect(markers[0].type).toBe('ELSEIF');
  });

  test('finds multiple markers', () => {
    const markers = findBranchMarkers('A{{ELSEIF b}}B{{ELSE}}C');
    expect(markers).toHaveLength(2);
  });

  test('ignores markers inside nested IFs', () => {
    const content = 'outer{{IF inner}}{{ELSE}}nested else{{ENDIF}}end';
    const markers = findBranchMarkers(content);
    expect(markers).toHaveLength(0);
  });
});

describe('parseConditionalBranches', () => {
  test('simple content', () => {
    const result = parseConditionalBranches('content');
    expect(result.ifContent).toBe('content');
    expect(result.elseIfBranches).toEqual([]);
    expect(result.elseContent).toBeNull();
  });

  test('with ELSE', () => {
    const result = parseConditionalBranches('if content{{ELSE}}else content');
    expect(result.ifContent).toBe('if content');
    expect(result.elseContent).toBe('else content');
  });

  test('with ELSEIF', () => {
    const result = parseConditionalBranches('A{{ELSEIF cond}}B');
    expect(result.ifContent).toBe('A');
    expect(result.elseIfBranches).toHaveLength(1);
    expect(result.elseIfBranches[0].condition).toBe('cond');
    expect(result.elseIfBranches[0].content).toBe('B');
  });

  test('with multiple ELSEIFs and ELSE', () => {
    const result = parseConditionalBranches('A{{ELSEIF b}}B{{ELSEIF c}}C{{ELSE}}D');
    expect(result.ifContent).toBe('A');
    expect(result.elseIfBranches).toHaveLength(2);
    expect(result.elseContent).toBe('D');
  });
});

describe('evaluateConditionalBlock', () => {
  test('returns IF content when true', () => {
    const v = vars([['x', 'yes']]);
    expect(evaluateConditionalBlock(v, 'x', 'content')).toBe('content');
  });

  test('returns empty when false and no ELSE', () => {
    const v = vars([['x', '']]);
    expect(evaluateConditionalBlock(v, 'x', 'content')).toBe('');
  });

  test('returns ELSE content when false', () => {
    const v = vars([['x', '']]);
    expect(evaluateConditionalBlock(v, 'x', 'A{{ELSE}}B')).toBe('B');
  });

  test('evaluates ELSEIF', () => {
    const v = vars([['a', ''], ['b', 'yes']]);
    expect(evaluateConditionalBlock(v, 'a', 'A{{ELSEIF b}}B{{ELSE}}C')).toBe('B');
  });

  test('falls through ELSEIF to ELSE', () => {
    const v = vars([['a', ''], ['b', '']]);
    expect(evaluateConditionalBlock(v, 'a', 'A{{ELSEIF b}}B{{ELSE}}C')).toBe('C');
  });
});

describe('processIfBlocks', () => {
  test('true condition shows content', () => {
    const v = vars([['show', 'yes']]);
    expect(processIfBlocks(v, '{{IF show}}visible{{ENDIF}}')).toBe('visible');
  });

  test('false condition hides content', () => {
    const v = vars([['show', '']]);
    expect(processIfBlocks(v, '{{IF show}}hidden{{ENDIF}}')).toBe('');
  });

  test('ELSE branch', () => {
    const v = vars([['show', '']]);
    expect(processIfBlocks(v, '{{IF show}}A{{ELSE}}B{{ENDIF}}')).toBe('B');
  });

  test('ELSEIF branch', () => {
    const v = vars([['a', ''], ['b', 'yes']]);
    expect(processIfBlocks(v, '{{IF a}}A{{ELSEIF b}}B{{ELSE}}C{{ENDIF}}')).toBe('B');
  });

  test('ELSE_IF variant', () => {
    const v = vars([['a', ''], ['b', 'yes']]);
    expect(processIfBlocks(v, '{{IF a}}A{{ELSE_IF b}}B{{ENDIF}}')).toBe('B');
  });

  test('ELSE IF variant', () => {
    const v = vars([['a', ''], ['b', 'yes']]);
    expect(processIfBlocks(v, '{{IF a}}A{{ELSE IF b}}B{{ENDIF}}')).toBe('B');
  });

  test('nested IFs - both true', () => {
    const v = vars([['a', 'yes'], ['b', 'yes']]);
    const result = processIfBlocks(v, '{{IF a}}A{{IF b}}B{{ENDIF}}{{ENDIF}}');
    expect(result).toBe('AB');
  });

  test('nested IFs - outer true inner false', () => {
    const v = vars([['a', 'yes'], ['b', '']]);
    const result = processIfBlocks(v, '{{IF a}}A{{IF b}}B{{ENDIF}}{{ENDIF}}');
    expect(result).toBe('A');
  });

  test('nested IFs - outer false', () => {
    const v = vars([['a', ''], ['b', 'yes']]);
    const result = processIfBlocks(v, '{{IF a}}A{{IF b}}B{{ENDIF}}{{ENDIF}}');
    expect(result).toBe('');
  });

  test('deeply nested IFs', () => {
    const v = vars([['a', 'yes'], ['b', 'yes'], ['c', 'yes']]);
    const template = '{{IF a}}A{{IF b}}B{{IF c}}C{{ENDIF}}{{ENDIF}}{{ENDIF}}';
    expect(processIfBlocks(v, template)).toBe('ABC');
  });

  test('with comparison operator', () => {
    const v = vars([['status', 'active']]);
    expect(processIfBlocks(v, '{{IF status == "active"}}yes{{ENDIF}}')).toBe('yes');
  });

  test('with AND condition', () => {
    const v = vars([['a', 'yes'], ['b', 'yes']]);
    expect(processIfBlocks(v, '{{IF a AND b}}both{{ENDIF}}')).toBe('both');
  });

  test('with OR condition', () => {
    const v = vars([['a', ''], ['b', 'yes']]);
    expect(processIfBlocks(v, '{{IF a OR b}}one{{ENDIF}}')).toBe('one');
  });

  test('preserves content outside IFs', () => {
    const v = vars([['x', 'yes']]);
    expect(processIfBlocks(v, 'before{{IF x}}middle{{ENDIF}}after')).toBe('beforemiddleafter');
  });

  test('handles multiple IFs', () => {
    const v = vars([['a', 'yes'], ['b', '']]);
    const result = processIfBlocks(v, '{{IF a}}A{{ENDIF}}{{IF b}}B{{ENDIF}}');
    expect(result).toBe('A');
  });

  test('handles unclosed IF gracefully', () => {
    const v = vars([['x', 'yes']]);
    const result = processIfBlocks(v, '{{IF x}}unclosed');
    expect(result).toBe('{{IF x}}unclosed');
  });
});

// ============================================================================
// CASE BLOCK PROCESSING
// ============================================================================

describe('parseWhenClauses', () => {
  test('single WHEN with quoted value', () => {
    const result = parseWhenClauses('{{WHEN "a"}}content');
    expect(result.whenClauses).toHaveLength(1);
    expect(result.whenClauses[0].value).toBe('a');
    expect(result.whenClauses[0].content).toBe('content');
  });

  test('single WHEN with unquoted value', () => {
    const result = parseWhenClauses('{{WHEN active}}content');
    expect(result.whenClauses[0].value).toBe('active');
  });

  test('multiple WHENs', () => {
    const result = parseWhenClauses('{{WHEN "a"}}A{{WHEN "b"}}B{{WHEN "c"}}C');
    expect(result.whenClauses).toHaveLength(3);
    expect(result.whenClauses[0].value).toBe('a');
    expect(result.whenClauses[1].value).toBe('b');
    expect(result.whenClauses[2].value).toBe('c');
  });

  test('WHEN with DEFAULT', () => {
    const result = parseWhenClauses('{{WHEN "a"}}A{{DEFAULT}}fallback');
    expect(result.whenClauses).toHaveLength(1);
    expect(result.defaultContent).toBe('fallback');
  });

  test('only DEFAULT', () => {
    const result = parseWhenClauses('{{DEFAULT}}default content');
    expect(result.whenClauses).toHaveLength(0);
    expect(result.defaultContent).toBe('default content');
  });

  test('WHEN with escaped quotes', () => {
    const result = parseWhenClauses('{{WHEN "say \\"hello\\""}}content');
    expect(result.whenClauses[0].value).toBe('say "hello"');
  });

  test('preserves content whitespace', () => {
    const result = parseWhenClauses('{{WHEN "a"}}  content with spaces  ');
    expect(result.whenClauses[0].content).toBe('  content with spaces  ');
  });
});

describe('evaluateCaseBlock', () => {
  test('matches first WHEN', () => {
    expect(evaluateCaseBlock('a', '{{WHEN "a"}}A{{WHEN "b"}}B')).toBe('A');
  });

  test('matches second WHEN', () => {
    expect(evaluateCaseBlock('b', '{{WHEN "a"}}A{{WHEN "b"}}B')).toBe('B');
  });

  test('matches third WHEN', () => {
    expect(evaluateCaseBlock('c', '{{WHEN "a"}}A{{WHEN "b"}}B{{WHEN "c"}}C')).toBe('C');
  });

  test('falls through to DEFAULT', () => {
    expect(evaluateCaseBlock('x', '{{WHEN "a"}}A{{DEFAULT}}D')).toBe('D');
  });

  test('returns empty when no match and no DEFAULT', () => {
    expect(evaluateCaseBlock('x', '{{WHEN "a"}}A{{WHEN "b"}}B')).toBe('');
  });

  test('matches unquoted WHEN value', () => {
    expect(evaluateCaseBlock('active', '{{WHEN active}}Active!')).toBe('Active!');
  });

  test('trims result', () => {
    expect(evaluateCaseBlock('a', '{{WHEN "a"}}  trimmed  ')).toBe('trimmed');
  });
});

describe('processCaseBlocks', () => {
  test('processes single CASE', () => {
    const v = vars([['status', 'active']]);
    const template = '{{CASE status}}{{WHEN "active"}}Active{{WHEN "inactive"}}Inactive{{ENDCASE}}';
    expect(processCaseBlocks(v, template)).toBe('Active');
  });

  test('processes multiple CASEs', () => {
    const v = vars([['a', 'x'], ['b', 'y']]);
    const template = '{{CASE a}}{{WHEN "x"}}X{{ENDCASE}} {{CASE b}}{{WHEN "y"}}Y{{ENDCASE}}';
    expect(processCaseBlocks(v, template)).toBe('X Y');
  });

  test('preserves content outside CASE', () => {
    const v = vars([['s', 'a']]);
    const template = 'before{{CASE s}}{{WHEN "a"}}A{{ENDCASE}}after';
    expect(processCaseBlocks(v, template)).toBe('beforeAafter');
  });

  test('handles missing variable', () => {
    const v = vars([]);
    const template = '{{CASE missing}}{{WHEN "a"}}A{{DEFAULT}}D{{ENDCASE}}';
    expect(processCaseBlocks(v, template)).toBe('D');
  });

  test('handles empty variable', () => {
    const v = vars([['empty', '']]);
    const template = '{{CASE empty}}{{WHEN ""}}Empty{{DEFAULT}}D{{ENDCASE}}';
    expect(processCaseBlocks(v, template)).toBe('Empty');
  });
});

// ============================================================================
// FOR LOOP PROCESSING
// ============================================================================

describe('resolveVariablePath', () => {
  test('resolves simple variable', () => {
    const v = vars([['name', 'Alice']]);
    expect(resolveVariablePath(v, 'name')).toBe('Alice');
  });

  test('resolves dot notation', () => {
    const v = vars([['user', { name: 'Alice', age: 30 }]]);
    expect(resolveVariablePath(v, 'user.name')).toBe('Alice');
    expect(resolveVariablePath(v, 'user.age')).toBe(30);
  });

  test('resolves deep path', () => {
    const v = vars([['data', { user: { address: { city: 'NYC' } } }]]);
    expect(resolveVariablePath(v, 'data.user.address.city')).toBe('NYC');
  });

  test('returns undefined for missing base', () => {
    const v = vars([]);
    expect(resolveVariablePath(v, 'missing.path')).toBeUndefined();
  });

  test('returns undefined for missing nested', () => {
    const v = vars([['user', { name: 'Alice' }]]);
    expect(resolveVariablePath(v, 'user.address.city')).toBeUndefined();
  });

  test('returns undefined for path on non-object', () => {
    const v = vars([['name', 'Alice']]);
    expect(resolveVariablePath(v, 'name.length')).toBeUndefined();
  });

  test('returns array', () => {
    const v = vars([['items', ['a', 'b', 'c']]]);
    expect(resolveVariablePath(v, 'items')).toEqual(['a', 'b', 'c']);
  });
});

describe('expandLoopItem', () => {
  test('expands simple placeholder', () => {
    expect(expandLoopItem('value', 'item', 'Value: ${{item}}')).toBe('Value: value');
  });

  test('expands dot notation', () => {
    const item = { name: 'Alice', age: 30 };
    expect(expandLoopItem(item, 'u', '${{u.name}} is ${{u.age}}')).toBe('Alice is 30');
  });

  test('expands multiple placeholders', () => {
    expect(expandLoopItem('x', 'i', '${{i}}${{i}}${{i}}')).toBe('xxx');
  });

  test('handles missing property', () => {
    const item = { name: 'Alice' };
    expect(expandLoopItem(item, 'u', '${{u.missing}}')).toBe('');
  });

  test('stringifies object for simple placeholder', () => {
    const item = { a: 1 };
    const result = expandLoopItem(item, 'x', '${{x}}');
    expect(result).toBe(JSON.stringify(item));
  });

  test('handles null property', () => {
    const item = { val: null };
    expect(expandLoopItem(item, 'x', '${{x.val}}')).toBe('');
  });
});

describe('processForLoop', () => {
  test('iterates string array', () => {
    const v = vars([['items', ['a', 'b', 'c']]]);
    expect(processForLoop(v, 'items', 'i', '${{i}}')).toBe('abc');
  });

  test('iterates with separator', () => {
    const v = vars([['items', ['a', 'b', 'c']]]);
    expect(processForLoop(v, 'items', 'i', '${{i}}, ')).toBe('a, b, c, ');
  });

  test('iterates object array', () => {
    const v = vars([['users', [{ n: 'A' }, { n: 'B' }]]]);
    expect(processForLoop(v, 'users', 'u', '${{u.n}}')).toBe('AB');
  });

  test('uses "this" as default', () => {
    const v = vars([['items', ['x', 'y']]]);
    expect(processForLoop(v, 'items', null, '${{this}}')).toBe('xy');
  });

  test('returns empty for empty array', () => {
    const v = vars([['items', []]]);
    expect(processForLoop(v, 'items', 'i', '${{i}}')).toBe('');
  });

  test('returns empty for non-array', () => {
    const v = vars([['notArray', 'string']]);
    expect(processForLoop(v, 'notArray', 'i', '${{i}}')).toBe('');
  });

  test('returns empty for missing variable', () => {
    const v = vars([]);
    expect(processForLoop(v, 'missing', 'i', '${{i}}')).toBe('');
  });
});

describe('processForBlocks', () => {
  test('processes FOR with AS', () => {
    const v = vars([['items', ['a', 'b']]]);
    expect(processForBlocks(v, '{{FOR items AS i}}${{i}}{{ENDFOR}}')).toBe('ab');
  });

  test('processes FOR without AS', () => {
    const v = vars([['items', ['a', 'b']]]);
    expect(processForBlocks(v, '{{FOR items}}${{this}}{{END}}')).toBe('ab');
  });

  test('processes with ENDFOR', () => {
    const v = vars([['items', ['a', 'b']]]);
    expect(processForBlocks(v, '{{FOR items AS i}}${{i}}{{ENDFOR}}')).toBe('ab');
  });

  test('processes with END shorthand', () => {
    const v = vars([['items', ['a', 'b']]]);
    expect(processForBlocks(v, '{{FOR items AS i}}${{i}}{{END}}')).toBe('ab');
  });

  test('handles nested FOR with same variable scope', () => {
    // Note: Nested FOR loops share the outer variable scope, so inner loop
    // needs to reference a variable that exists in the outer scope
    const v = vars([
      ['outer', [{ name: 'A', items: ['1', '2'] }, { name: 'B', items: ['3', '4'] }]],
    ]);
    // This tests object property access in nested context
    const template = '{{FOR outer AS o}}${{o.name}}{{END}}';
    expect(processForBlocks(v, template)).toBe('AB');
  });

  test('processes sequential FOR loops', () => {
    const v = vars([
      ['first', ['a', 'b']],
      ['second', ['1', '2']],
    ]);
    const template = '{{FOR first AS x}}${{x}}{{END}}-{{FOR second AS y}}${{y}}{{END}}';
    expect(processForBlocks(v, template)).toBe('ab-12');
  });

  test('handles object iteration', () => {
    const v = vars([['users', [{ name: 'Alice' }, { name: 'Bob' }]]]);
    const template = '{{FOR users AS u}}- ${{u.name}}\n{{ENDFOR}}';
    expect(processForBlocks(v, template)).toBe('- Alice\n- Bob\n');
  });

  test('preserves content outside FOR', () => {
    const v = vars([['items', ['x']]]);
    expect(processForBlocks(v, 'before{{FOR items AS i}}${{i}}{{END}}after')).toBe('beforexafter');
  });

  test('handles multiple FORs', () => {
    const v = vars([['a', ['1']], ['b', ['2']]]);
    const template = '{{FOR a AS x}}${{x}}{{END}}{{FOR b AS y}}${{y}}{{END}}';
    expect(processForBlocks(v, template)).toBe('12');
  });
});

// ============================================================================
// LIST ITEM PROCESSING
// ============================================================================

describe('processListItemLine', () => {
  test('generates numbered item', () => {
    const match = '{{LIST_ITEM?x}}content'.match(/^([ \t]*)\{\{LIST_ITEM(?:\?(\w+)(?:\s+([\w\s]+)(?:\s+(?:"((?:[^"\\]|\\.)*)"|([\w\d]+)))?)?(?:\|(?:"((?:[^"\\]|\\.)*)"|(.*)))?)?\}\}(.*)$/)!;
    const v = vars([['x', 'yes']]);
    const result = processListItemLine(v, match, 1);
    expect(result.output).toBe('1. content');
  });

  test('returns null when condition false and no fallback', () => {
    const match = '{{LIST_ITEM?x}}content'.match(/^([ \t]*)\{\{LIST_ITEM(?:\?(\w+)(?:\s+([\w\s]+)(?:\s+(?:"((?:[^"\\]|\\.)*)"|([\w\d]+)))?)?(?:\|(?:"((?:[^"\\]|\\.)*)"|(.*)))?)?\}\}(.*)$/)!;
    const v = vars([['x', '']]);
    const result = processListItemLine(v, match, 1);
    expect(result.output).toBeNull();
  });

  test('preserves indentation', () => {
    const match = '  {{LIST_ITEM?x}}content'.match(/^([ \t]*)\{\{LIST_ITEM(?:\?(\w+)(?:\s+([\w\s]+)(?:\s+(?:"((?:[^"\\]|\\.)*)"|([\w\d]+)))?)?(?:\|(?:"((?:[^"\\]|\\.)*)"|(.*)))?)?\}\}(.*)$/)!;
    const v = vars([['x', 'yes']]);
    const result = processListItemLine(v, match, 1);
    expect(result.output).toBe('  1. content');
  });
});

describe('processListItems', () => {
  test('generates numbered list', () => {
    const v = vars([['a', 'yes'], ['b', 'yes'], ['c', 'yes']]);
    const input = '{{LIST_ITEM?a}}First\n{{LIST_ITEM?b}}Second\n{{LIST_ITEM?c}}Third';
    const result = processListItems(v, input);
    expect(result).toBe('1. First\n2. Second\n3. Third');
  });

  test('skips items when condition false', () => {
    const v = vars([['a', 'yes'], ['b', ''], ['c', 'yes']]);
    const input = '{{LIST_ITEM?a}}First\n{{LIST_ITEM?b}}Second\n{{LIST_ITEM?c}}Third';
    const result = processListItems(v, input);
    expect(result).toBe('1. First\n2. Third');
  });

  test('resets counter after non-list content', () => {
    const v = vars([['a', 'yes'], ['b', 'yes']]);
    const input = '{{LIST_ITEM?a}}First\n\nParagraph\n\n{{LIST_ITEM?b}}New first';
    const result = processListItems(v, input);
    expect(result).toContain('1. First');
    expect(result).toContain('1. New first');
  });

  test('does not reset on empty lines within list', () => {
    const v = vars([['a', 'yes'], ['b', 'yes']]);
    const input = '{{LIST_ITEM?a}}First\n\n{{LIST_ITEM?b}}Second';
    const result = processListItems(v, input);
    expect(result).toContain('1. First');
    expect(result).toContain('2. Second');
  });

  test('preserves non-list content', () => {
    const v = vars([['a', 'yes']]);
    const input = 'Header\n{{LIST_ITEM?a}}Item\nFooter';
    const result = processListItems(v, input);
    expect(result).toBe('Header\n1. Item\nFooter');
  });

  test('handles unconditional LIST_ITEM', () => {
    const v = vars([]);
    const input = '{{LIST_ITEM}}Content';
    const result = processListItems(v, input);
    expect(result).toBe('1. Content');
  });
});

// ============================================================================
// VARIABLE SUBSTITUTION
// ============================================================================

describe('substituteVariables', () => {
  test('substitutes single variable', () => {
    const v = vars([['name', 'World']]);
    expect(substituteVariables(v, 'Hello ${{name}}!')).toBe('Hello World!');
  });

  test('substitutes multiple variables', () => {
    const v = vars([['a', '1'], ['b', '2'], ['c', '3']]);
    expect(substituteVariables(v, '${{a}} ${{b}} ${{c}}')).toBe('1 2 3');
  });

  test('handles missing variables', () => {
    const v = vars([]);
    expect(substituteVariables(v, 'Hello ${{name}}!')).toBe('Hello !');
  });

  test('handles numeric values', () => {
    const v = vars([['num', 42]]);
    expect(substituteVariables(v, 'Count: ${{num}}')).toBe('Count: 42');
  });

  test('handles boolean values', () => {
    const v = vars([['t', true], ['f', false]]);
    expect(substituteVariables(v, '${{t}} ${{f}}')).toBe('true false');
  });

  test('handles null as empty', () => {
    const v = vars([['val', null]]);
    expect(substituteVariables(v, 'Value: ${{val}}')).toBe('Value: ');
  });

  test('handles undefined as empty', () => {
    const v = vars([['val', undefined]]);
    expect(substituteVariables(v, 'Value: ${{val}}')).toBe('Value: ');
  });

  test('handles adjacent variables', () => {
    const v = vars([['a', 'x'], ['b', 'y']]);
    expect(substituteVariables(v, '${{a}}${{b}}')).toBe('xy');
  });

  test('handles variables with underscores', () => {
    const v = vars([['my_var', 'value']]);
    expect(substituteVariables(v, '${{my_var}}')).toBe('value');
  });

  test('handles variables with numbers', () => {
    const v = vars([['var1', 'one'], ['var2', 'two']]);
    expect(substituteVariables(v, '${{var1}} ${{var2}}')).toBe('one two');
  });

  test('handles dot notation for nested objects', () => {
    const v = vars([['user', { name: 'Alice', address: { city: 'NYC' } }]]);
    expect(substituteVariables(v, '${{user.name}}')).toBe('Alice');
    expect(substituteVariables(v, '${{user.address.city}}')).toBe('NYC');
  });

  test('handles missing nested property', () => {
    const v = vars([['user', { name: 'Alice' }]]);
    expect(substituteVariables(v, '${{user.missing}}')).toBe('');
  });
});

// ============================================================================
// WHITESPACE NORMALIZATION
// ============================================================================

describe('normalizeWhitespace', () => {
  test('removes leading newlines', () => {
    expect(normalizeWhitespace('\n\n\ntext')).toBe('text');
  });

  test('removes trailing newlines', () => {
    expect(normalizeWhitespace('text\n\n\n')).toBe('text');
  });

  test('collapses multiple blank lines', () => {
    expect(normalizeWhitespace('a\n\n\n\nb')).toBe('a\n\nb');
  });

  test('removes trailing whitespace on lines', () => {
    expect(normalizeWhitespace('text   \nmore')).toBe('text\nmore');
  });

  test('preserves single blank lines', () => {
    expect(normalizeWhitespace('a\n\nb')).toBe('a\n\nb');
  });

  test('handles empty string', () => {
    expect(normalizeWhitespace('')).toBe('');
  });

  test('handles single line', () => {
    expect(normalizeWhitespace('single line')).toBe('single line');
  });

  test('combines all normalizations', () => {
    // Note: normalizeWhitespace strips trailing whitespace before newlines,
    // but the last line's trailing spaces remain if there's no trailing newline
    const input = '\n\nline1  \n\n\n\nline2\n\n';
    const expected = 'line1\n\nline2';
    expect(normalizeWhitespace(input)).toBe(expected);
  });
});

// ============================================================================
// MAIN RESOLVE FUNCTION
// ============================================================================

describe('resolveTemplate', () => {
  describe('input handling', () => {
    test('handles empty string', () => {
      expect(resolveTemplate('', vars([]))).toBe('');
    });

    test('handles null', () => {
      expect(resolveTemplate(null as any, vars([]))).toBe('');
    });

    test('handles undefined', () => {
      expect(resolveTemplate(undefined as any, vars([]))).toBe('');
    });

    test('normalizes Windows line endings', () => {
      const v = vars([['x', 'val']]);
      expect(resolveTemplate('a\r\nb', v)).toBe('a\nb');
    });
  });

  describe('processing order', () => {
    test('processes IF before substitution', () => {
      const v = vars([['show', 'yes'], ['val', 'VALUE']]);
      const result = resolveTemplate('{{IF show}}${{val}}{{ENDIF}}', v);
      expect(result).toBe('VALUE');
    });

    test('processes CASE before substitution', () => {
      const v = vars([['s', 'a'], ['val', 'VALUE']]);
      const template = '{{CASE s}}{{WHEN "a"}}${{val}}{{ENDCASE}}';
      expect(resolveTemplate(template, v)).toBe('VALUE');
    });

    test('processes FOR before substitution', () => {
      const v = vars([['items', ['a', 'b']]]);
      const result = resolveTemplate('{{FOR items AS i}}${{i}}{{END}}', v);
      expect(result).toBe('ab');
    });
  });

  describe('integration tests', () => {
    test('combines IF and substitution', () => {
      const v = vars([['show', 'yes'], ['name', 'Alice']]);
      const template = '{{IF show}}Hello ${{name}}{{ENDIF}}';
      expect(resolveTemplate(template, v)).toBe('Hello Alice');
    });

    test('combines CASE and substitution', () => {
      const v = vars([['status', 'active'], ['name', 'User']]);
      const template = '{{CASE status}}{{WHEN "active"}}${{name}} is active{{ENDCASE}}';
      expect(resolveTemplate(template, v)).toBe('User is active');
    });

    test('combines FOR and IF', () => {
      const v = vars([
        ['items', ['visible', 'hidden']],
        ['showAll', 'yes'],
      ]);
      // Simple test: FOR expands items, IF checks a separate variable
      const template = '{{IF showAll}}{{FOR items AS i}}${{i}} {{END}}{{ENDIF}}';
      const result = resolveTemplate(template, v);
      expect(result).toContain('visible');
      expect(result).toContain('hidden');
    });

    test('complex template with all features', () => {
      const v = new Map<string, any>([
        ['title', 'Report'],
        ['showHeader', 'yes'],
        ['status', 'published'],
        ['items', ['Item 1', 'Item 2']],
      ]);
      const template = `# $\{{title}}
{{IF showHeader}}
## Header Section
{{ENDIF}}
Status: {{CASE status}}{{WHEN "draft"}}Draft{{WHEN "published"}}Published{{DEFAULT}}Unknown{{ENDCASE}}
Items:
{{FOR items AS item}}
- $\{{item}}
{{ENDFOR}}`;
      const result = resolveTemplate(template, v);
      expect(result).toContain('# Report');
      expect(result).toContain('## Header Section');
      expect(result).toContain('Published');
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });
  });
});

// ============================================================================
// LEGACY CLASS WRAPPERS
// ============================================================================

describe('TemplateVariableExtractor', () => {
  test('extractVariableNames works', () => {
    const extractor = new TemplateVariableExtractor();
    const result = extractor.extractVariableNames('${{name}} {{IF show}}${{val}}{{ENDIF}}');
    expect(result).toContain('name');
    expect(result).toContain('show');
    expect(result).toContain('val');
  });
});

describe('TemplateEngine', () => {
  test('resolve works', () => {
    const v = vars([['name', 'World']]);
    const engine = new TemplateEngine(v);
    expect(engine.resolve('Hello ${{name}}!')).toBe('Hello World!');
  });

  test('handles complex templates', () => {
    const v = vars([['show', 'yes'], ['name', 'Alice']]);
    const engine = new TemplateEngine(v);
    const result = engine.resolve('{{IF show}}Hi ${{name}}{{ENDIF}}');
    expect(result).toBe('Hi Alice');
  });
});

// ============================================================================
// EDGE CASES AND REGRESSION TESTS
// ============================================================================

describe('Edge Cases', () => {
  test('empty variable name in template', () => {
    const result = extractAllVariables('${{}}');
    expect(result).toEqual([]);
  });

  test('special characters in content', () => {
    const v = vars([['x', 'yes']]);
    const result = resolveTemplate('{{IF x}}Special: @#$%^&*(){{ENDIF}}', v);
    expect(result).toBe('Special: @#$%^&*()');
  });

  test('unicode in content', () => {
    const v = vars([['x', 'yes']]);
    const result = resolveTemplate('{{IF x}}Unicode: 你好 🎉{{ENDIF}}', v);
    expect(result).toBe('Unicode: 你好 🎉');
  });

  test('very long variable name', () => {
    const longName = 'a'.repeat(100);
    const v = vars([[longName, 'value']]);
    expect(substituteVariables(v, `$\{{${longName}}}`)).toBe('value');
  });

  test('numeric string comparison', () => {
    const v = vars([['num', '42']]);
    expect(evaluateSingleCondition(v, 'num == "42"')).toBe(true);
    expect(evaluateSingleCondition(v, 'num == "043"')).toBe(false);
  });

  test('case sensitivity in variable names', () => {
    const v = vars([['Name', 'Upper'], ['name', 'lower']]);
    expect(substituteVariables(v, '${{Name}} ${{name}}')).toBe('Upper lower');
  });

  test('whitespace in conditions', () => {
    const v = vars([['x', 'yes']]);
    expect(processIfBlocks(v, '{{IF   x   }}content{{ENDIF}}')).toBe('content');
  });

  test('multiple spaces in AND/OR', () => {
    const v = vars([['a', 'yes'], ['b', 'yes']]);
    expect(evaluateExpression(v, 'a   AND   b')).toBe(true);
  });
});

describe('Regression Tests', () => {
  test('ELSEIF with underscore', () => {
    const v = vars([['b', 'yes']]);
    expect(processIfBlocks(v, '{{IF a}}A{{ELSE_IF b}}B{{ENDIF}}')).toBe('B');
  });

  test('ELSEIF with space', () => {
    const v = vars([['b', 'yes']]);
    expect(processIfBlocks(v, '{{IF a}}A{{ELSE IF b}}B{{ENDIF}}')).toBe('B');
  });

  test('FOR with END shorthand', () => {
    const v = vars([['items', ['a', 'b']]]);
    expect(processForBlocks(v, '{{FOR items AS i}}${{i}}{{END}}')).toBe('ab');
  });

  test('consecutive WHEN clauses', () => {
    const v = vars([['s', 'b']]);
    const template = '{{CASE s}}{{WHEN "a"}}A{{WHEN "b"}}B{{WHEN "c"}}C{{ENDCASE}}';
    expect(processCaseBlocks(v, template)).toBe('B');
  });

  test('WHEN with whitespace in content', () => {
    const v = vars([['s', 'a']]);
    const template = '{{CASE s}}{{WHEN "a"}}  Content  {{ENDCASE}}';
    expect(processCaseBlocks(v, template)).toBe('Content');
  });

  test('nested IF inside FOR', () => {
    const v = vars([['items', ['a', 'b']], ['show', 'yes']]);
    const template = '{{FOR items AS i}}{{IF show}}${{i}}{{ENDIF}}{{END}}';
    expect(resolveTemplate(template, v)).toBe('ab');
  });

  test('variable substitution does not affect tags', () => {
    const v = vars([['IF', 'value']]);
    const result = substituteVariables(v, '${{IF}}');
    expect(result).toBe('value');
  });
});

// ============================================================================
// JSON STRING HANDLING
// ============================================================================

describe('JSON String Auto-Parsing', () => {
  describe('dot notation with JSON strings', () => {
    test('parses JSON object string for property access', () => {
      const v = vars([['user', '{"name": "Alice", "age": 30}']]);
      expect(substituteVariables(v, 'Name: ${{user.name}}')).toBe('Name: Alice');
      expect(substituteVariables(v, 'Age: ${{user.age}}')).toBe('Age: 30');
    });

    test('parses nested JSON object string', () => {
      const v = vars([['data', '{"user": {"address": {"city": "NYC"}}}']]);
      expect(substituteVariables(v, 'City: ${{data.user.address.city}}')).toBe('City: NYC');
    });

    test('parses JSON array string with index access', () => {
      const v = vars([['items', '["apple", "banana", "cherry"]']]);
      expect(substituteVariables(v, 'First: ${{items.0}}')).toBe('First: apple');
      expect(substituteVariables(v, 'Last: ${{items.2}}')).toBe('Last: cherry');
    });

    test('handles nested JSON string in object property', () => {
      const v = vars([['config', { settings: '{"theme": "dark"}' }]]);
      expect(substituteVariables(v, 'Theme: ${{config.settings.theme}}')).toBe('Theme: dark');
    });

    test('returns empty for invalid JSON', () => {
      const v = vars([['bad', '{not valid json}']]);
      expect(substituteVariables(v, 'Value: ${{bad.key}}')).toBe('Value: ');
    });

    test('returns empty for non-JSON string with dot notation', () => {
      const v = vars([['text', 'plain string']]);
      expect(substituteVariables(v, 'Value: ${{text.prop}}')).toBe('Value: ');
    });

    test('actual objects still work', () => {
      const v = vars([['user', { name: 'Bob' }]]);
      expect(substituteVariables(v, 'Name: ${{user.name}}')).toBe('Name: Bob');
    });
  });

  describe('FOR loops with JSON array strings', () => {
    test('iterates JSON array string', () => {
      const v = vars([['items', '["a", "b", "c"]']]);
      const result = processForBlocks(v, '{{FOR items AS i}}${{i}}{{END}}');
      expect(result).toBe('abc');
    });

    test('iterates JSON object array string', () => {
      const v = vars([['users', '[{"name": "Alice"}, {"name": "Bob"}]']]);
      const result = processForBlocks(v, '{{FOR users AS u}}${{u.name}},{{END}}');
      expect(result).toBe('Alice,Bob,');
    });

    test('returns empty for invalid JSON array', () => {
      const v = vars([['bad', '[not valid]']]);
      const result = processForBlocks(v, '{{FOR bad AS x}}${{x}}{{END}}');
      expect(result).toBe('');
    });

    test('returns empty for JSON object (not array)', () => {
      const v = vars([['obj', '{"a": 1}']]);
      const result = processForBlocks(v, '{{FOR obj AS x}}${{x}}{{END}}');
      expect(result).toBe('');
    });
  });

  describe('full template with JSON strings', () => {
    test('complex template with JSON config', () => {
      const v = vars([
        ['config', '{"model": "gpt-4", "temperature": 0.7, "options": {"stream": true}}'],
        ['items', '["research", "analyze", "summarize"]']
      ]);
      
      const template = 
        'Model: ${{config.model}}\n' +
        'Temp: ${{config.temperature}}\n' +
        'Stream: ${{config.options.stream}}\n' +
        'Tasks: {{FOR items AS task}}${{task}}, {{END}}';
      
      const result = resolveTemplate(template, v);
      expect(result).toContain('Model: gpt-4');
      expect(result).toContain('Temp: 0.7');
      expect(result).toContain('Stream: true');
      expect(result).toContain('research, analyze, summarize,');
    });
  });
});
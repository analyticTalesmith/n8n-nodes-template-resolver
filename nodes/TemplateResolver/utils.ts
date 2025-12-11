/**
 * Extract all variable names from a template string
 *
 * Finds all instances of:
 * - ${{varName}}
 * - ${{user.name}}
 * - {{IF varName}}
 * - {{FOR items AS item}}
 * - {{CASE status}}
 *
 * Returns unique variable names (root level only)
 */
export function extractAllVariables(template: string): string[] {
  const variables = new Set<string>();

  // Match ${{varName}} and ${{user.name}}
  const varPattern = /\$\{\{([a-zA-Z_@][a-zA-Z0-9_@.]*)/g;
  let match;
  while ((match = varPattern.exec(template)) !== null) {
    const rootVar = match[1].split(".")[0].split("|")[0].split("??")[0].trim();
    if (rootVar && !rootVar.startsWith("@")) {
      variables.add(rootVar);
    }
  }

  // Match {{IF varName}}, {{CASE varName}}, etc.
  const controlPattern = /\{\{(IF|CASE|FOR)\s+([a-zA-Z_][a-zA-Z0-9_@.]*)/gi;
  while ((match = controlPattern.exec(template)) !== null) {
    const rootVar = match[2].split(".")[0].split(" ")[0].trim();
    if (rootVar && !rootVar.startsWith("@")) {
      variables.add(rootVar);
    }
  }

  // Match ternary conditions: {{varName ? ... : ...}}
  const ternaryPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_@.]*)\s*\?/g;
  while ((match = ternaryPattern.exec(template)) !== null) {
    const rootVar = match[1].split(".")[0].trim();
    if (rootVar && !rootVar.startsWith("@")) {
      variables.add(rootVar);
    }
  }

  return Array.from(variables).sort();
}

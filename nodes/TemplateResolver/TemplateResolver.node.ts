import { VariableMap } from "./types";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";
import { extractAllVariables } from "./utils";
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from "n8n-workflow";

/**
 * Main template resolution entry point
 *
 * @param template - Template string with conditional markdown syntax
 * @param variables - Variable mappings (name → value)
 * @param options - Configuration options (strictMode)
 * @returns Resolved markdown string
 */
export function resolveTemplate(
  template: string,
  variables: VariableMap,
  options?: { strictMode?: boolean }
): string {
  // Tokenize
  const lexer = new Lexer(template);
  const tokens = lexer.tokenize();

  // Parse to AST
  const parser = new Parser(tokens);
  const ast = parser.parse();

  // Interpret
  const interpreter = new Interpreter(variables, options);
  return interpreter.interpret(ast);
}

/**
 * Template metadata for debugging
 */
interface TemplateMetadata {
  detected_variables: string[];
  mapped_variables: string[];
  missing_variables: string[];
  variable_count: number;
}

/**
 * Variable mappings from n8n node config
 */
interface VariableMappingsCollection {
  mappings?: Array<{
    variableName: string;
    value: string;
  }>;
}

/**
 * Template Resolver Node for n8n
 *
 * Provides powerful conditional markdown templating for LLM-first workflows.
 * Uses AST-based parsing for clean recursion and precise error reporting.
 */
export class TemplateResolver implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Template Resolver",
    name: "templateResolver",
    // eslint-disable-next-line @n8n/community-nodes/icon-validation
    icon: "fa:file-code",
    group: ["transform"],
    usableAsTool: true,
    version: 1,
    description:
      "Resolves conditional markdown templates with variable substitution, conditionals, loops, tables, lists, and filters",
    defaults: {
      name: "Template Resolver",
    },
    inputs: ["main"],
    outputs: ["main"],
    properties: [
      {
        displayName: "Template",
        name: "template",
        type: "string",
        typeOptions: {
          rows: 10,
        },
        default: "",
        required: true,
        description:
          "Template text with ${{variable}}, {{IF}}, {{CASE}}, {{FOR}}, {{TABLE}}, and {{LIST}} syntax",
        placeholder: `# \${{title}}

{{IF author}}
By \${{author}}
{{END_IF}}

{{CASE status}}
{{WHEN "draft"}}Status: Draft{{END_WHEN}}
{{WHEN "published"}}Status: Published{{END_WHEN}}
{{DEFAULT}}Status: Unknown{{END_DEFAULT}}
{{END_CASE}}

{{FOR items AS item}}
- \${{item}}
{{END_FOR}}`,
      },
      {
        displayName: "Variable Mappings",
        name: "variableMappings",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        description:
          "Map template variables to values. Use static values or n8n expressions like {{ $JSON.fieldName }}.",
        placeholder: "Add mapping",
        options: [
          {
            name: "mappings",
            displayName: "Mapping",
            values: [
              {
                displayName: "Variable Name",
                name: "variableName",
                type: "string",
                default: "",
                required: true,
                description:
                  'Name of the variable in the template (e.g., "title" for ${{title}})',
                placeholder: "title",
              },
              {
                displayName: "Value",
                name: "value",
                type: "string",
                default: "",
                description: "Value to substitute (supports n8n expressions)",
                placeholder: "={{ $json.title }}",
              },
            ],
          },
        ],
      },
      {
        displayName: "Strict Mode",
        name: "strictMode",
        type: "boolean",
        default: true,
        description:
          "Whether to throw an error if template variables are missing. If disabled, missing variables become empty strings.",
      },
      {
        displayName: "Show Detected Variables",
        name: "showDetectedVariables",
        type: "boolean",
        default: false,
        description:
          "Whether to include detected variables in the output (useful for debugging)",
      },
      {
        displayName: "Output Field Name",
        name: "outputField",
        type: "string",
        default: "resolved_prompt",
        description: "Name of the field to store the resolved template",
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        // Get parameters
        const template = this.getNodeParameter("template", itemIndex) as string;
        const variableMappings = this.getNodeParameter(
          "variableMappings",
          itemIndex,
          {
            mappings: [],
          }
        ) as VariableMappingsCollection;
        const strictMode = this.getNodeParameter(
          "strictMode",
          itemIndex
        ) as boolean;
        const showDetectedVariables = this.getNodeParameter(
          "showDetectedVariables",
          itemIndex
        ) as boolean;
        const outputField = this.getNodeParameter(
          "outputField",
          itemIndex
        ) as string;

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
        const mappedVariables = Array.from(variables.keys());
        const missingVariables = detectedVariables.filter(
          (v) => !variables.has(v)
        );

        if (strictMode && missingVariables.length > 0) {
          throw new NodeOperationError(
            this.getNode(),
            `Template requires unmapped variables: ${missingVariables.join(", ")}. ` +
              `Add mappings or disable "Strict Mode". ` +
              `Detected variables: ${detectedVariables.join(", ")}`,
            { itemIndex }
          );
        }

        // Fill missing with empty strings in non-strict mode
        if (!strictMode) {
          for (const v of missingVariables) {
            variables.set(v, "");
          }
        }

        // Resolve template
        const resolved = resolveTemplate(template, variables, { strictMode });

        // Build output
        const outputData: { [key: string]: string | TemplateMetadata } = {
          [outputField]: resolved,
        };

        if (showDetectedVariables) {
          outputData._template_metadata = {
            detected_variables: detectedVariables,
            mapped_variables: mappedVariables,
            missing_variables: missingVariables,
            variable_count: detectedVariables.length,
          };
        }

        returnData.push({
          json: outputData,
          pairedItem: { item: itemIndex },
        });
      } catch (error) {
        // Handle template errors gracefully
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
              error_type: (error as Error).name,
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }

        // Re-throw with n8n context
        if (error instanceof NodeOperationError) {
          throw error;
        }

        throw new NodeOperationError(this.getNode(), (error as Error).message, {
          itemIndex,
        });
      }
    }

    return [returnData];
  }
}

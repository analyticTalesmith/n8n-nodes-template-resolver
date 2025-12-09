/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock n8n-workflow types for testing

export interface IExecuteFunctions {
  getInputData(): any[];
  getNodeParameter(name: string, index: number, defaultValue?: any): any;
  continueOnFail(): boolean;
  getNode(): any;
}

export interface INodeExecutionData {
  json: any;
  pairedItem?: { item: number };
}

export interface INodeType {
  description: INodeTypeDescription;
  execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}

export interface INodeTypeDescription {
  displayName: string;
  name: string;
  group: string[];
  version: number;
  description: string;
  defaults: { name: string };
  inputs: string[];
  outputs: string[];
  properties: any[];
}

export class NodeOperationError extends Error {
  constructor(node: any, message: string) {
    super(message);
    this.name = 'NodeOperationError';
  }
}
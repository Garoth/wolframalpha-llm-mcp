export interface ToolContent {
  type: "text";
  text: string;
}

export interface ToolResponse {
  content: ToolContent[];
  [key: string]: any; // Allow additional properties for MCP SDK compatibility
}

export interface QuestionArgs {
  question: string;
}

export interface EmptyArgs {}

export type ToolArgs = QuestionArgs | EmptyArgs;

export interface Tool<T = any> {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
  handler: (args: T) => Promise<ToolResponse>;
}

export interface ListToolsResponse {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Tool["inputSchema"];
  }>;
}

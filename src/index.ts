#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools/index.js";
import { Tool, ToolResponse, QuestionArgs, EmptyArgs } from "./types/index.js";

// Initialize MCP server
const server = new Server(
  {
    name: "wolframalpha-llm",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        ask_llm: true,
        get_simple_answer: true,
        validate_key: true
      },
    },
  }
);

/**
 * Handler that lists available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }))
}));

/**
 * Handler for tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request, _extra) => {
  try {
    const tool = tools.find(t => t.name === request.params.name);
    if (!tool) {
      return {
        content: [{
          type: "text" as const,
          text: `Unknown tool: ${request.params.name}`
        }]
      } as ToolResponse;
    }

    // Only validate arguments if the tool requires them
    if (tool.inputSchema.required && tool.inputSchema.required.length > 0) {
      const args = request.params.arguments || {};
      const missingArgs = tool.inputSchema.required.filter(
        arg => !(arg in args)
      );
      if (missingArgs.length > 0) {
        return {
          content: [{
            type: "text" as const,
            text: `Missing required arguments: ${missingArgs.join(', ')}`
          }]
        } as ToolResponse;
      }
    }

    // Execute tool with appropriate argument type based on tool name
    let response: ToolResponse;
    const args = request.params.arguments || {};
    
    if (tool.name === 'validate_key') {
      response = await (tool as Tool<EmptyArgs>).handler({});
    } else {
      // Convert args to QuestionArgs, ensuring question property exists
      const questionArgs = {
        question: (args as any).question
      } as QuestionArgs;
      response = await (tool as Tool<QuestionArgs>).handler(questionArgs);
    }

    // Add metadata if provided
    if (request.params._meta) {
      return {
        ...response,
        _meta: request.params._meta
      };
    }

    return response;

  } catch (error) {
    console.error('Tool execution error:', error);
    return {
      content: [{
        type: "text" as const,
        text: error instanceof Error ? error.message : 'An unexpected error occurred'
      }]
    } as ToolResponse;
  }
}) as any; // Type assertion for MCP SDK compatibility

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('WolframAlpha MCP server running on stdio');
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

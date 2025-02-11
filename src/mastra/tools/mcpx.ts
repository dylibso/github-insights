import { Session } from '@dylibso/mcpx';
import { createTool } from '@mastra/core';
import { z } from 'zod';
import { convertToZodSchema } from '@dylibso/json-schema-to-zod-openai';

// Define consistent types across both implementations
interface MCPXTool {
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
}

// Align with the more detailed content type structure
interface MCPXCallResult {
  content?: Array<{
    type: 'text' | 'image' | 'resource';
    data?: string;
    mimeType?: string;
    text: string;
  }>;
  isError?: boolean;
}

// Define the content type enum
const ContentTypeEnum = z.enum(["text", "image", "resource"]);

// Define consistent content schema
const Content = z.object({
  data: z.string().nullable().describe("The base64-encoded data"),
  mimeType: z.string().nullable().describe("The MIME type of the content"),
  text: z.string().nullable().describe("The text content of the message"),
  type: ContentTypeEnum
});

// Define consistent call result schema
const CallToolResult = z.object({
  content: z.array(Content),
  isError: z.boolean().nullable().describe("Whether the tool call ended in an error")
});

export async function getMcpxTools(session: Session) {
  try {
    const { tools: mcpxTools } = await session.handleListTools({
      method: 'tools/list'
    }, {} as any);

    const tools = mcpxTools.map((mcpxTool: MCPXTool) => {
      const zodSchema = convertToZodSchema(mcpxTool.inputSchema);
      
      return createTool({
        id: mcpxTool.name,
        description: mcpxTool.description || '',
        inputSchema: zodSchema,
        outputSchema: CallToolResult,
        execute: async ({ context }) => {
          try {
            const response = await session.handleCallTool({
              method: 'tools/call',
              params: {
                name: mcpxTool.name,
                arguments: context
              }
            }, {} as any) as MCPXCallResult;

            console.log('called tool', mcpxTool.name, 'with context', context, 'succcss?', !response.isError);

            if (!response) {
              return {
                content: [{
                  type: 'text',
                  text: 'No response received from tool',
                  data: null,
                  mimeType: null
                }],
                isError: true
              };
            }

            return {
              content: response.content?.map(item => ({
                type: item.type,
                text: item.text,
                data: item.data,
                mimeType: item.mimeType
              })) ?? [],
              isError: response.isError
            } as any;
          } catch (error) {
            console.error(`Error executing tool ${mcpxTool.name}:`, error);
            return {
              content: [{
                type: 'text',
                text: `An error occurred while executing ${mcpxTool.name}: ${error}.`,
                data: null,
                mimeType: null
              }],
              isError: true
            };
          }
        }
      });
    });

    return tools.reduce((acc, tool) => ({
      ...acc,
      [tool.id]: tool
    }), {});

  } catch (error) {
    console.error('Error getting MCPX tools:', error);
    throw error;
  }
}
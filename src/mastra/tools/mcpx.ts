import { Session } from '@dylibso/mcpx';
import { createTool } from '@mastra/core';
import { convertToZodSchema } from 'json-schema-to-zod-openai';

interface MCPXTool {
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
}

interface MCPXCallResult {
  content?: Array<{
    type: string;
    text: string;
  }>;
}

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
        execute: async ({ context }) => {
          try {
            const result = await session.handleCallTool({
              method: 'tools/call',
              params: {
                name: mcpxTool.name,
                arguments: context
              }
            }, {} as any) as MCPXCallResult;

            console.log('tool call', mcpxTool.name, context, result);

            if (!result) return null;

            if (result.content) {
              return result.content.reduce((acc, item) => {
                if (item.type === 'text') {
                  try {
                    return { ...acc, ...JSON.parse(item.text) };
                  } catch {
                    return { ...acc, text: item.text };
                  }
                }
                return acc;
              }, {});
            }

            return result;
          } catch (error) {
            console.error(`Error executing tool ${mcpxTool.name}:`, error);
            throw error;
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
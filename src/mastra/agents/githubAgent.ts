import { Agent } from "@mastra/core";
import { Session } from '@dylibso/mcpx';
import { getMcpxTools } from '../tools/mcpx';

export async function createGitHubAgent(session: Session) {
  const tools = await getMcpxTools(session);
  
  return new Agent({
    name: "GitHub Assistant",
    instructions: `You are a helpful GitHub assistant that can help users with repository management tasks.
    You can:
    - List and create issues
    - Get repository details and contributors
    - Create and update files
    - Handle pull requests
    Always provide clear explanations of the actions you take.`,
    model: {
      provider: "OPEN_AI",
      name: "gpt-4o-mini",
      toolChoice: "required",
    },
    tools
  });
}
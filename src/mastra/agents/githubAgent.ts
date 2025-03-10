import { Agent } from "@mastra/core";
import { Session } from '@dylibso/mcpx';
import { getMcpxTools } from '../tools/mcpx';
import { openai } from "@ai-sdk/openai";

if (!process.env.MCPX_SESSION_ID) {
  throw new Error("MCPX_SESSION_ID environment variable is required");
}

const session = new Session({
  authentication: [
    ["cookie", `sessionId=${process.env.MCPX_SESSION_ID}`],
  ],
  activeProfile: "default",
});

const tools = await getMcpxTools(session);

export const githubAgent = new Agent({
  name: "GitHub Assistant",
  instructions: `You are a helpful GitHub assistant that can help users with repository management tasks.
    You can:
    - List and create issues
    - Get repository details and contributors
    - Create and update files
    - Handle pull requests
    Always provide clear explanations of the actions you take.
    Rules: 
      - Be mindful of your context window limits.
      - Tools can easily overload you with information.
      - Use only what you need. 
      - Limit pages sizes to 10. 
      - Don't paginate unless the user asks for it.
      - Don't use more than 3 tools in a single response. Unless the user asks for it.`,
  model: openai("gpt-4o-mini"),
  tools: tools,
});

import { Mastra } from "@mastra/core";
import { Session } from '@dylibso/mcpx';
import { createGitHubAgent } from "./agents/githubAgent";

if (!process.env.MCPX_SESSION_ID) {
    throw new Error('MCPX_SESSION_ID environment variable is required');
}

const session = new Session({
    authentication: [
        ["cookie", `sessionId=${process.env.MCPX_SESSION_ID}`]
    ],
    activeProfile: 'default'
});

const githubAgent = await createGitHubAgent(session);

export const mastra = new Mastra({
    agents: { githubAgent },
});
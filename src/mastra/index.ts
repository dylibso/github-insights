import { Mastra } from "@mastra/core";
import { Session } from '@dylibso/mcpx';
import { createGitHubAgent } from "./agents/githubAgent";
import { contributorEngagementWorkflow } from "./workflows/repoInsights";

if (!process.env.MCPX_SESSION_ID) {
    throw new Error('MCPX_SESSION_ID environment variable is required');
}

const session = new Session({
    authentication: [
        ["cookie", `sessionId=${process.env.MCPX_SESSION_ID}`]
    ],
    activeProfile: 'mastra-ai'
});

const githubAgent = await createGitHubAgent(session);

export const mastra = new Mastra({
    agents: { githubAgent },
    workflows: { contributorEngagementWorkflow },
});
import { Step, Workflow, Mastra, Agent } from "@mastra/core";
import { z } from "zod";
import { WorkflowContext } from "@mastra/core";

interface AnalyzeOutput {
    repoName: string;
    newContributors: Array<{
        login: string;
        firstPrDate: string;
        prCount: number;
        prTypes: string[];
        expertise: string[];
    }>;
    returningContributors: Array<{
        login: string;
        lastActive: string;
        totalPrs: number;
        recentPrs: number;
        topAreas: string[];
    }>;
    inactiveContributors: Array<{
        login: string;
        lastActive: string;
        historicalImpact: string;
        expertise: string[];
    }>;
}

// Analyze contributor patterns and identify engagement opportunities
const analyzeContributors = new Step({
    id: "analyzeContributors",
    inputSchema: z.object({
        owner: z.string(),
        repo: z.string()
    }),
    outputSchema: z.object({
        repoName: z.string(),
        newContributors: z.array(z.object({
            login: z.string(),
            firstPrDate: z.string(),
            prCount: z.number(),
            prTypes: z.array(z.string()),
            expertise: z.array(z.string())
        })),
        returningContributors: z.array(z.object({
            login: z.string(),
            lastActive: z.string(),
            totalPrs: z.number(),
            recentPrs: z.number(),
            topAreas: z.array(z.string())
        })),
        inactiveContributors: z.array(z.object({
            login: z.string(),
            lastActive: z.string(),
            historicalImpact: z.string(),
            expertise: z.array(z.string())
        }))
    }),
    execute: async ({ context, mastra }) => {
        if (!mastra?.agents?.githubAgent) {
            throw new Error("Required dependencies not available");
        }

        console.log('agent:', mastra.agents.githubAgent.tools);

        const response = await mastra.agents.githubAgent.generate([{
            role: "user",
            content: `Analyze contributor engagement patterns for ${context.owner}/${context.repo}.
                
                Focus on:
                1. New contributors from the last 30 days - their first PR date, number of PRs, and types of contributions
                2. Regular contributors who are actively contributing - their recent activity and areas of expertise
                3. Previously active contributors who haven't contributed in the last 90 days
                
                For each contributor, analyze their PRs and issues to infer their technical interests and expertise.
                Categorize contributions into types (bug fixes, features, documentation, etc.).
                
                Return the data structured according to the output schema.`
        }], {
            output: z.object({
                repoName: z.string(),
                newContributors: z.array(z.object({
                    login: z.string(),
                    firstPrDate: z.string(),
                    prCount: z.number(),
                    prTypes: z.array(z.string()),
                    expertise: z.array(z.string())
                })),
                returningContributors: z.array(z.object({
                    login: z.string(),
                    lastActive: z.string(),
                    totalPrs: z.number(),
                    recentPrs: z.number(),
                    topAreas: z.array(z.string())
                })),
                inactiveContributors: z.array(z.object({
                    login: z.string(),
                    lastActive: z.string(),
                    historicalImpact: z.string(),
                    expertise: z.array(z.string())
                }))
            })
        });

        console.log('Analysis results:', response.object);

        return response.object;
    }
});

// Trigger Task to send engagement suggestions to Slack
const triggerEngagementTask = new Step({
    id: "triggerEngagementTask",
    inputSchema: z.object({
        analysisResults: z.object({
            repoName: z.string(),
            newContributors: z.array(z.object({
                login: z.string(),
                firstPrDate: z.string(),
                prCount: z.number(),
                prTypes: z.array(z.string()),
                expertise: z.array(z.string())
            })),
            returningContributors: z.array(z.object({
                login: z.string(),
                lastActive: z.string(),
                totalPrs: z.number(),
                recentPrs: z.number(),
                topAreas: z.array(z.string())
            })),
            inactiveContributors: z.array(z.object({
                login: z.string(),
                lastActive: z.string(),
                historicalImpact: z.string(),
                expertise: z.array(z.string())
            }))
        })
    }),
    outputSchema: z.object({
        taskRunId: z.string()
    }),
    execute: async ({ context }) => {
        const taskUrl = 'https://www.mcp.run/api/runs/mhmd-azeez/mastra-ai/send-github-alert';

        const runId = crypto.randomUUID();
        const response = await fetch(`${taskUrl}/${runId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: `sessionId=${process.env.MCP_SESSION_ID}`
            },
            body: JSON.stringify({
                parameters: {
                    repoName: context.analysisResults.repoName,
                    newContributors: JSON.stringify(context.analysisResults.newContributors),
                    returningContributors: JSON.stringify(context.analysisResults.returningContributors),
                    inactiveContributors: JSON.stringify(context.analysisResults.inactiveContributors),
                    slackChannel: context.machineContext?.triggerData.slackChannel
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to trigger engagement task: ' + await response.text());
        }

        return { taskRunId: runId };
    }
});

// Create and configure workflow
export const contributorEngagementWorkflow = new Workflow({
    name: "contributor-engagement",
    triggerSchema: z.object({
        owner: z.string(),
        repo: z.string(),
        slackChannel: z.string(),
    })
});

contributorEngagementWorkflow
    .step(analyzeContributors, {
        variables: {
            owner: { step: "trigger", path: "owner" },
            repo: { step: "trigger", path: "repo" }
        }
    })
    .then(triggerEngagementTask, {
        variables: {
            analysisResults: { step: analyzeContributors, path: "" }
        }
    });

contributorEngagementWorkflow.commit();
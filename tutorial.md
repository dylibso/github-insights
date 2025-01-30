# Integrating mcp.run Tools with Mastra AI

This tutorial will guide you through integrating mcp.run tools with Mastra AI for building intelligent agents and workflows. We'll explore two scenarios: creating a GitHub agent and building a repository insights workflow.

## Prerequisites

Before starting, ensure you have:
- Node.js v20.0 or higher
- A GitHub account for mcp.run authentication
- An OpenAI API key
- The `@dylibso/mcpx` package installed

## Step 1: Set up mcp.run

Generate a session ID for mcp.run:

```bash
npx --yes -p @dylibso/mcpx@latest gen-session
```

Install the required mcp.run tools:

1. Visit https://mcp.run/tools/github
2. Click "Install" to add GitHub tools to your profile. Make sure your PAT has access to the repo you are interested in.
3. Visit https://mcp.run/tools/slack
4. Click "Install" to add Slack tools to your profile. Make sure your mcp.run app is added to the channel you intend to send the messages to.

## Step 2: Create a New Mastra Project

Let's start by creating a new Mastra project using the create-mastra tool:

```bash
npx create-mastra@latest
```

You'll be prompted for the following:
```
What do you want to name your project? github-insights
Choose components to install:
  ✓ Agents (recommended)
  ✓ Tools
  ✓ Workflows
Select default provider:
  ✓ OpenAI (recommended)
Would you like to include example code? No
```

After the project is created, add your OpenAI API key to the `.env` file:

```
OPENAI_API_KEY=<your-openai-key>
MCPX_SESSION_ID=<your-mcp.run-session-id>
```

Then set `module` to `ES2022` in your `tsconfig.json` file and `type` to `module` in your `package.json` file.

## Step 3: Add mcp.run Integration

First, install the mcpx library:
```bash
npm install @dylibso/mcpx json-schema-to-zod-openai
```

Create a new file `src/mastra/tools/mcpx.ts` and add the provided `getMcpxTools` function.

```typescript
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
```



## Scenario 1: Building a GitHub Assistant Agent

### Step 1: Create the GitHub Agent

Create a new file `src/mastra/agents/githubAgent.ts`:

```typescript
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
      toolChoice: "auto",
    },
    tools
  });
}
```

### Step 2: Register the Agent

Update `src/mastra/index.ts`:

```typescript
import { Mastra } from "@mastra/core";
import { Session } from '@dylibso/mcpx';
import { createGitHubAgent } from "./agents/githubAgent";

export async function createMastra(session: Session) {
  const githubAgent = await createGitHubAgent(session);
  
  return new Mastra({
    agents: { githubAgent }
  });
}
```

### Step 3: Using the GitHub Agent

Create `src/index.ts`:

```typescript
import { Session } from '@dylibso/mcpx';
import { createMastra } from './mastra';

async function main() {
  const session = new Session();
  const mastra = await createMastra(session);
  
  const githubAgent = mastra.getAgent("githubAgent");
  
  // Example: List issues in a repository
  const response = await githubAgent.generate([
    { 
      role: "user", 
      content: "List the open issues in the repository 'anthropics/claude-3'" 
    }
  ]);
  
  console.log(response.text);
}

main();
```

## Scenario 2: Repository Insights Workflow

### Step 1: Create the Workflow Steps

Create a new file `src/mastra/workflows/repoInsights.ts`:

```typescript
import { Step, Workflow } from "@mastra/core";
import { z } from "zod";
import { Session } from '@dylibso/mcpx';
import { getMcpxTools } from '../utils/getMcpxTools';

export async function createRepoInsightsWorkflow(session: Session) {
  const tools = await getMcpxTools(session);

  // Step 1: Gather Repository Data
  const gatherRepoData = new Step({
    id: "gatherRepoData",
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string()
    }),
    outputSchema: z.object({
      repoDetails: z.any(),
      contributors: z.array(z.any()),
      issues: z.array(z.any())
    }),
    execute: async ({ context, tools }) => {
      const repoDetails = await tools.gh_get_repo_details({
        owner: context.owner,
        repo: context.repo
      });
      
      const contributors = await tools.gh_get_repo_contributors({
        owner: context.owner,
        repo: context.repo
      });
      
      const issues = await tools.gh_list_issues({
        owner: context.owner,
        repo: context.repo,
        state: "open"
      });
      
      return {
        repoDetails,
        contributors,
        issues
      };
    }
  });

  // Step 2: Generate Insights
  const generateInsights = new Step({
    id: "generateInsights",
    outputSchema: z.object({
      insights: z.string()
    }),
    execute: async ({ context, llm }) => {
      const prompt = `
        Analyze this repository data and generate key insights:
        Repository: ${JSON.stringify(context.machineContext.stepResults.gatherRepoData.payload)}
        
        Focus on:
        1. Active contributors and their impact
        2. Current issue status and trends
        3. Repository activity level
        
        Format as a concise Slack message.
      `;
      
      const response = await llm.generate(prompt);
      return {
        insights: response.text
      };
    }
  });

  // Step 3: Send to Slack using mcp.run Task
  const sendToSlack = new Step({
    id: "sendToSlack",
    inputSchema: z.object({
      slackChannel: z.string()
    }),
    outputSchema: z.object({
      sent: z.boolean()
    }),
    execute: async ({ context, session }) => {
      // First ensure our Slack notification task exists
      await session.handleCreateTask({
        method: 'tasks/create',
        params: {
          name: 'repo-insights-slack-notification',
          runner: 'openai',
          openai: {
            prompt: `You are a GitHub insights assistant. Send this message to Slack:
            
            {{message}}
            
            Use the slack_slack_post_message tool to send this to channel {{channel}}.`,
            model: 'gpt-4o'
          }
        }
      });
      
      // Trigger the task with our insights
      const runResponse = await session.handleTriggerRun({
        method: 'tasks/trigger',
        params: {
          task: 'repo-insights-slack-notification',
          run: `insights-${Date.now()}`, // Unique run ID
          parameters: {
            message: context.machineContext.stepResults.generateInsights.payload.insights,
            channel: context.slackChannel
          }
        }
      });
      
      // Poll for completion
      let status = 'pending';
      while (status === 'pending' || status === 'running') {
        const runStatus = await session.handleGetRun({
          method: 'tasks/status',
          params: {
            task: 'repo-insights-slack-notification',
            run: runResponse.run
          }
        });
        
        status = runStatus.status;
        if (status === 'error') {
          throw new Error('Failed to send Slack notification');
        }
        
        if (status !== 'ready') {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before polling again
        }
      }
      
      return { sent: true };
    }
  });

  // Create and configure workflow with parameters
  const workflow = new Workflow({
    name: "repo-insights",
    triggerSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      slackChannel: z.string(), // Add Slack channel as a parameter
      schedule: z.enum(['daily', 'weekly', 'monthly']).optional()
    })
  });

  // Chain the steps
  workflow
    .step(gatherRepoData, {
      input: (context) => ({
        owner: context.triggerData.owner,
        repo: context.triggerData.repo
      })
    })
    .then(generateInsights)
    .then(sendToSlack, {
      input: (context) => ({
        slackChannel: context.triggerData.slackChannel
      })
    });

  workflow.commit();

  return workflow;
}
```

### Step 2: Create the Task for Scheduling

Create `src/mastra/tasks/repoInsights.ts`:

```typescript
import { Session } from '@dylibso/mcpx';

export async function createRepoInsightsTask(session: Session) {
  await session.handleCreateTask({
    method: 'tasks/create',
    params: {
      name: 'repo-insights-task',
      runner: 'openai',
      openai: {
        prompt: `Run repository insights for {{owner}}/{{repo}}. 
                Generate insights and post them to the Slack channel {{slackChannel}}.
                
                Schedule: {{schedule}}
                
                Use the following tools to accomplish this:
                1. gh_get_repo_details
                2. gh_get_repo_contributors
                3. gh_list_issues
                4. slack_slack_post_message`,
        model: 'gpt-4o'
      }
    }
  });

  // Create a scheduled version of the task
  await session.handleCreateTask({
    method: 'tasks/create',
    params: {
      name: 'scheduled-repo-insights',
      runner: 'openai',
      openai: {
        prompt: `Run repository insights for {{owner}}/{{repo}}. 
                Post to Slack channel {{slackChannel}}.`,
        model: 'gpt-4o'
      },
      schedule: '0 9 * * MON' // Run every Monday at 9 AM
    }
  });
}
```

### Step 3: Running Everything

Create `src/index.ts`:

```typescript
import { Session } from '@dylibso/mcpx';
import { createMastra } from './mastra';
import { createRepoInsightsWorkflow } from './workflows/repoInsights';
import { createRepoInsightsTask } from './tasks/repoInsights';

async function main() {
  const session = new Session();
  
  // Create and run workflow
  const workflow = await createRepoInsightsWorkflow(session);
  const { runId, start } = workflow.createRun();
  
  const result = await start({
    triggerData: {
      owner: "anthropics",
      repo: "claude-3",
      slackChannel: "github-insights",
      schedule: "weekly"
    }
  });

  console.log("Workflow result:", result);

  // Set up scheduled task
  await createRepoInsightsTask(session);
}

main();
```

## Running the Application

1. Start the Mastra development server:
```bash
npm run dev
```

2. In another terminal, run your application:
```bash
npx tsx src/index.ts
```

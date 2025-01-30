import { mastra } from './mastra';

const githubAgent = mastra.getAgent("githubAgent");

const response = await githubAgent.generate([
    {
        role: "user",
        content: "List the open issues in the repository 'anthropics/claude-3'"
    }
]);

console.log(response.text);
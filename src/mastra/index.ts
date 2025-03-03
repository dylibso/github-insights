import { Mastra } from "@mastra/core";
import { githubAgent } from "./agents/githubAgent";

export const mastra = new Mastra({
  agents: { githubAgent },
});

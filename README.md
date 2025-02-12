# Integrating mcp.run Tools with Mastra AI

Mastra is an open-source TypeScript framework for building sophisticated AI applications and features. It provides the core building blocks needed to create, manage, and deploy AI systems with a focus on practical application development. Think of it as a toolkit that bridges the gap between raw LLM capabilities and production-ready AI features.
The framework is built around four main components:

 - **LLM Integration** - A unified interface to work with multiple LLM providers (OpenAI, Anthropic, Google Gemini) through a consistent API, eliminating the need to handle different provider-specific implementations.
 - **Agents** - Autonomous AI systems that can maintain memory, execute tools (functions), and handle complex interactions. These agents can be developed and tested in Mastra's local development environment.
 - **Workflows** - A graph-based system for orchestrating complex LLM operations with features like branching, parallel execution, and state management. Workflows provide deterministic control over AI operations through a simple syntax for defining steps and control flow.
 - **RAG System** - A comprehensive retrieval-augmented generation pipeline that handles document processing, embedding generation, vector storage, and context retrieval, supporting multiple vector stores and embedding providers.

What sets Mastra apart is its focus on developer experience and production readiness. It includes built-in support for deployment (compatible with React, Next.js, Node.js, and serverless platforms), comprehensive evaluation metrics for assessing LLM outputs, and observability features for monitoring and debugging AI systems in production.
The framework is designed to handle the complex infrastructure needs of AI applications while letting developers focus on building features that matter to their users.

Full tutorial is here: https://docs.mcp.run/tutorials/mcpx-mastra-ts

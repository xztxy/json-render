import { ToolLoopAgent, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { explorerCatalog } from "./render/catalog";
import { getWeather } from "./tools/weather";
import { getGitHubRepo } from "./tools/github";
import { getCryptoPrice } from "./tools/crypto";
import { getHackerNewsTop } from "./tools/hackernews";

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

const AGENT_INSTRUCTIONS = `You are a data explorer assistant. You help users look up information and build visual dashboards.

WORKFLOW:
1. Call the appropriate tools to gather the data the user requested.
2. Respond with a brief, conversational summary of what you found.
3. Then output the JSONL UI spec to render a visual dashboard.

RULES:
- Always call tools FIRST to get real data. Never make up data.
- Embed the fetched data directly in /state paths so components can reference it.
- Use Card components to group related information.
- Use Grid for multi-column layouts.
- Use Metric for key numeric values (temperature, stars, price, etc.).
- Use Table for lists of items (stories, forecasts, languages, etc.).
- Use BarChart or LineChart for numeric data that benefits from visualization.
- Use Tabs when showing multiple categories of data side by side.
- Use Badge for status indicators.

${explorerCatalog.prompt({
  mode: "chat",
  customRules: [
    "NEVER use viewport height classes (min-h-screen, h-screen) — the UI renders inside a fixed-size container.",
    "Prefer Grid with columns='2' or columns='3' for side-by-side layouts.",
    "Use Metric components for key numbers instead of plain Text.",
    "Put chart data arrays in /state and reference them with statePath.",
    "Keep the UI clean and information-dense — no excessive padding or empty space.",
  ],
})}`;

export const agent = new ToolLoopAgent({
  model: gateway(process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL),
  instructions: AGENT_INSTRUCTIONS,
  tools: {
    getWeather,
    getGitHubRepo,
    getCryptoPrice,
    getHackerNewsTop,
  },
  stopWhen: stepCountIs(5),
  temperature: 0.7,
});

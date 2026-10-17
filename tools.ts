// tools.ts
import type Anthropic from "@anthropic-ai/sdk";

// A tool is a name, a description, a JSON schema for its input,
// and the function that actually does the work.
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool.InputSchema;
  run: (input: Record<string, unknown>) => Promise<string>;
}

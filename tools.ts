// tools.ts
import type Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";

// A tool is a name, a description, a JSON schema for its input,
// and the function that actually does the work.
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool.InputSchema;
  run: (input: Record<string, unknown>) => Promise<string>;
}

export const readFileTool: ToolDefinition = {
  name: "read_file",
  description:
    "Return the contents of a file, given its path relative to the working directory. Only use it on files, not directories.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path of the file to read." },
    },
    required: ["path"],
    additionalProperties: false,
  },
  run: async (input) => readFile(String(input.path), "utf8"),
};

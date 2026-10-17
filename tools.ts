// tools.ts
import type Anthropic from "@anthropic-ai/sdk";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// A tool is a name, a description, a JSON schema for its input,
// and the function that actually does the work.
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Anthropic.Beta.BetaTool.InputSchema;
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

export const listFilesTool: ToolDefinition = {
  name: "list_files",
  description:
    "List every file and directory under a path, recursively. Directories end with a slash. With no path it lists the working directory.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Optional relative directory to list. Defaults to the working directory.",
      },
    },
    additionalProperties: false,
  },
  run: async (input) => {
    const dir = typeof input.path === "string" && input.path !== "" ? input.path : ".";
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    const files = entries.map((entry) => {
      const rel = path.relative(dir, path.join(entry.parentPath, entry.name));
      return entry.isDirectory() ? `${rel}/` : rel;
    });
    return JSON.stringify(files.sort());
  },
};

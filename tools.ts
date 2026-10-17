// tools.ts
import type Anthropic from "@anthropic-ai/sdk";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

export const editFileTool: ToolDefinition = {
  name: "edit_file",
  description: [
    "Edit a text file by replacing old_str with new_str.",
    "old_str and new_str must be different.",
    "To create a new file, pass a path that doesn't exist yet and an empty old_str.",
  ].join("\n"),
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path of the file to edit or create." },
      old_str: {
        type: "string",
        description: "Exact text to find. It should appear exactly once in the file.",
      },
      new_str: { type: "string", description: "Text to put in place of old_str." },
    },
    required: ["path", "old_str", "new_str"],
    additionalProperties: false,
  },
  run: async (input) => {
    const filePath = String(input.path ?? "");
    const oldStr = String(input.old_str ?? "");
    const newStr = String(input.new_str ?? "");

    if (filePath === "" || oldStr === newStr) {
      throw new Error("invalid input parameters");
    }

    let original: string;
    try {
      original = await readFile(filePath, "utf8");
    } catch (err) {
      const missing = (err as NodeJS.ErrnoException).code === "ENOENT";
      if (missing && oldStr === "") return createNewFile(filePath, newStr);
      throw err;
    }

    // An empty old_str would match between every character of the file.
    if (oldStr === "" && original !== "") {
      throw new Error("file already exists, so old_str can't be empty");
    }

    // Like Go's strings.Replace(..., -1), this replaces every match.
    const updated = original.replaceAll(oldStr, newStr);
    if (updated === original) {
      throw new Error("old_str not found in file");
    }

    await writeFile(filePath, updated, "utf8");
    return "OK";
  },
};

async function createNewFile(filePath: string, content: string): Promise<string> {
  const dir = path.dirname(filePath);
  if (dir !== ".") await mkdir(dir, { recursive: true });
  await writeFile(filePath, content, "utf8");
  return `Successfully created file ${filePath}`;
}

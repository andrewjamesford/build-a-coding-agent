// main.ts
import Anthropic from "@anthropic-ai/sdk";
import { createInterface } from "node:readline/promises";
import { readFileTool, type ToolDefinition } from "./tools.ts";

type Message = Anthropic.Message;
type MessageParam = Anthropic.MessageParam;
type ToolResult = Anthropic.ToolResultBlockParam;

const MODEL = "claude-opus-5-5";

const colour = {
  you: (s: string) => `\u001b[94m${s}\u001b[0m`,
  claude: (s: string) => `\u001b[93m${s}\u001b[0m`,
  tool: (s: string) => `\u001b[92m${s}\u001b[0m`,
};

class Agent {
  constructor(
    private client: Anthropic,
    private getUserMessage: () => Promise<string | null>,
    private tools: ToolDefinition[],
  ) {}

  async run(): Promise<void> {
    const conversation: MessageParam[] = [];
    console.log("Chat with Claude (use 'ctrl-c' to quit)");

    let readUserInput = true;
    while (true) {
      if (readUserInput) {
        const userInput = await this.getUserMessage();
        if (userInput === null) break;
        conversation.push({ role: "user", content: userInput });
      }

      const message = await this.runInference(conversation);
      // Append the full content, not just the text, so tool_use and
      // thinking blocks go back to the API unchanged on the next turn.
      conversation.push({ role: "assistant", content: message.content });

      if (message.stop_reason === "refusal") {
        console.log(colour.claude("Claude") + ": (declined to answer)");
        readUserInput = true;
        continue;
      }

      const toolResults: ToolResult[] = [];
      for (const block of message.content) {
        if (block.type === "text") {
          console.log(`${colour.claude("Claude")}: ${block.text}`);
        } else if (block.type === "tool_use") {
          toolResults.push(await this.executeTool(block.id, block.name, block.input));
        }
      }

      if (toolResults.length === 0) {
        readUserInput = true;
        continue;
      }

      // Send every tool result back in a single user message,
      // then call the model again without asking the user for input.
      readUserInput = false;
      conversation.push({ role: "user", content: toolResults });
    }
  }

  private runInference(conversation: MessageParam[]): Promise<Message> {
    return this.client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      messages: conversation,
      tools: this.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      })),
    });
  }

  private async executeTool(id: string, name: string, input: unknown): Promise<ToolResult> {
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      return { type: "tool_result", tool_use_id: id, content: "tool not found", is_error: true };
    }

    console.log(`${colour.tool("tool")}: ${name}(${JSON.stringify(input)})`);
    try {
      const output = await tool.run(input as Record<string, unknown>);
      return { type: "tool_result", tool_use_id: id, content: output };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { type: "tool_result", tool_use_id: id, content: msg, is_error: true };
    }
  }
}

async function main() {
  // Reads ANTHROPIC_API_KEY (or an `ant auth login` profile) from the environment.
  const client = new Anthropic();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let closed = false;
  rl.on("close", () => (closed = true));

  const getUserMessage = async (): Promise<string | null> => {
    if (closed) return null;
    try {
      return await rl.question(`${colour.you("You")}: `);
    } catch {
      return null; // stdin closed (ctrl-d or end of piped input)
    }
  };

  const tools = [readFileTool];
  const agent = new Agent(client, getUserMessage, tools);

  try {
    await agent.run();
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    rl.close();
  }
}

main();

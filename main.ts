// main.ts
import Anthropic from "@anthropic-ai/sdk";
import { createInterface } from "node:readline/promises";

type Message = Anthropic.Message;
type MessageParam = Anthropic.MessageParam;

const MODEL = "claude-opus-5-5";

const colour = {
  you: (s: string) => `\u001b[94m${s}\u001b[0m`,
  claude: (s: string) => `\u001b[93m${s}\u001b[0m`,
};

class Agent {
  constructor(
    private client: Anthropic,
    private getUserMessage: () => Promise<string | null>,
  ) {}

  async run(): Promise<void> {
    const conversation: MessageParam[] = [];
    console.log("Chat with Claude (use 'ctrl-c' to quit)");

    while (true) {
      const userInput = await this.getUserMessage();
      if (userInput === null) break;
      conversation.push({ role: "user", content: userInput });

      const message = await this.runInference(conversation);
      // Append the full content, not just the text, so tool_use and
      // thinking blocks go back to the API unchanged on the next turn.
      conversation.push({ role: "assistant", content: message.content });

      if (message.stop_reason === "refusal") {
        console.log(colour.claude("Claude") + ": (declined to answer)");
        continue;
      }

      for (const block of message.content) {
        if (block.type === "text") {
          console.log(`${colour.claude("Claude")}: ${block.text}`);
        }
      }
    }
  }

  private runInference(conversation: MessageParam[]): Promise<Message> {
    return this.client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      messages: conversation,
    });
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

  const agent = new Agent(client, getUserMessage);

  try {
    await agent.run();
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    rl.close();
  }
}

main();

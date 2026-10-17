# Build a coding agent in TypeScript

Companion code for the video "Build a coding agent in TypeScript".

This is a terminal chat with Claude that can read, list, edit and run code in the folder you start it from. It's about 330 lines across two files, `main.ts` and `tools.ts`, with no agent framework. The model only asks for a tool by name. This program decides whether to run it, runs it, and sends the result back.

## Follow along with the tags

Each step from the video has its own commit and tag. Check one out to catch up, or diff two to see exactly what a step added.

| Tag | What it adds |
| --- | --- |
| `step-1` | The chat loop. No tools. Each turn prints Claude's reply. |
| `step-2` | The `ToolDefinition` interface, tools sent to the API, and `executeTool`. The tools list is still empty. |
| `step-3` | `read_file`, and the `readUserInput` flag that sends tool results back to Claude without waiting for you. |
| `step-4` | `list_files`, so Claude can look around before it reads. |
| `step-5` | `edit_file`, which creates files and replaces text. |
| `step-6` | `bash`, with an approval prompt, a 30-second limit, no stdin and a 4,000-character output limit. This is the finished agent. |

```bash
git checkout step-3
git diff step-2 step-3 -- main.ts tools.ts
```

Run `git checkout main` to get back to the latest code.

## Setup

You need Node 20.12 or later. The recursive `list_files` relies on `parentPath`, which arrived in 20.12. I recorded with Node 24.

```bash
npm install
```

Create an API key in the [Claude Console](https://platform.claude.com/) and put it in an environment variable in your shell:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Keep the key out of the code and out of git. `.env` is in `.gitignore`, and `.env.example` shows the variable name, but the agent doesn't read `.env` files by itself. If you'd rather use one, pass it to Node: `npx tsx --env-file=.env main.ts`.

## Running it safely

The agent works in whatever folder you start it from. It can overwrite any file it reaches there, and `bash` can reach a lot more. So start it in an empty practice folder, never in a real project and never in this repo. That also means `npm start` is only safe for step 1 and step 2, because it runs the agent with this repo as the working folder.

For the demos, this script deletes and recreates `~/agent-practice` from the files in `fixtures/`. It refuses to touch any other path.

```bash
npm run demo:reset
```

Then start the agent there. The second path is wherever you cloned this repo:

```bash
cd ~/agent-practice && npx tsx ~/Developer/demos/build-a-coding-agent/main.ts
```

Every `bash` command stops and asks `Run it? [y/N]`. Read the whole command before you type `y`. The time limit stops a command from hanging the loop, but it does nothing to stop a command that deletes or changes files. You are the safety check. Anything other than `y` declines, and Claude gets told you said no.

Quit with Ctrl-C, or Ctrl-D to end the loop.

## Cost

Using the API costs money. The API keeps no memory between calls, so every turn sends the whole conversation again, including every file Claude has read and every command output. A long session gets more expensive with each message. Start a fresh session when you change topic, and keep an eye on usage in the Console.

## The demo fixtures

`npm run demo:reset` copies these into `~/agent-practice`:

- `fixtures/part-1/` is the failing test from part 1, "How coding agents work". `total.js` ignores quantity, so `npm test` reports 9 where the test expects 12.
- `fixtures/riddle.txt` is a riddle for the `read_file` demo.
- `fixtures/notes.txt` is a throwaway file for the demo where you decline a delete.

## Tests

The tests run offline. They never call the API, and each test file runs in its own temp folder.

```bash
npm test
npm run typecheck
```

The 30-second timeout test is skipped by default because it takes 30 seconds. Run it with:

```bash
SLOW=1 npm test
```

## Credits

The step order and the three file tools follow Thorsten Ball's [How to Build an Agent](https://ampcode.com/notes/how-to-build-an-agent), which builds the same agent in Go. The `bash` tool comes from Geoffrey Huntley's [How to build a coding agent](https://ghuntley.com/agent/) workshop. This version adds the approval prompt and the limits. Both articles are worth reading in full. The TypeScript port and the explanations here are mine.

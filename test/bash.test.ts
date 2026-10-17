import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";
import { makeBashTool } from "../tools.ts";
import { useTempDir } from "./helpers.ts";

useTempDir();

const approveAll = makeBashTool(async () => true);

test("bash returns exit code 0 and the output", async () => {
  assert.equal(await approveAll.run({ command: "echo hello" }), "Exit code 0\nhello\n");
});

test("bash runs in the working directory", async () => {
  assert.equal(await approveAll.run({ command: "pwd" }), `Exit code 0\n${process.cwd()}\n`);
});

test("a declined command never runs", async () => {
  const asked: string[] = [];
  const declineAll = makeBashTool(async (command) => {
    asked.push(command);
    return false;
  });
  await assert.rejects(declineAll.run({ command: "touch ran.txt" }), /The user declined to run this command\./);
  assert.deepEqual(asked, ["touch ran.txt"]);
  await assert.rejects(access("ran.txt"), { code: "ENOENT" });
});

test("a non-zero exit code comes back as an error, with stderr", async () => {
  await assert.rejects(approveAll.run({ command: "echo oops >&2; exit 3" }), {
    message: "Exit code 3\noops\n",
  });
});

test("an empty command is rejected without asking", async () => {
  let asked = false;
  const tool = makeBashTool(async () => (asked = true));
  await assert.rejects(tool.run({ command: "   " }), /command is empty/);
  assert.equal(asked, false);
});

test("cat gets no stdin, so it ends at once", async () => {
  const start = Date.now();
  assert.equal(await approveAll.run({ command: "cat" }), "Exit code 0\n");
  assert.ok(Date.now() - start < 5_000);
});

test("long output keeps only the last 4,000 characters", async () => {
  // 16,000 a's then 4,000 b's: only the b's should survive.
  const command = "head -c 16000 /dev/zero | tr '\\0' a; head -c 4000 /dev/zero | tr '\\0' b";
  const result = await approveAll.run({ command });
  assert.equal(result, `Exit code 0\n[16000 earlier characters cut]\n${"b".repeat(4000)}`);
});

test("a command is stopped after 30 seconds", { skip: !process.env.SLOW && "set SLOW=1 to run" }, async () => {
  const start = Date.now();
  await assert.rejects(approveAll.run({ command: "sleep 40" }), /Command stopped after 30s\./);
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 29_000 && elapsed < 35_000, `took ${elapsed}ms`);
});

test("a timeout also stops processes the command started", { skip: !process.env.SLOW && "set SLOW=1 to run" }, async () => {
  // bash starts sleep as a child and waits for it, like `npm run dev` would.
  const start = Date.now();
  await assert.rejects(
    approveAll.run({ command: "sleep 40 & echo $! > sleep.pid; wait" }),
    /Command stopped after 30s\./,
  );
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 35_000, `took ${elapsed}ms`);

  const pid = Number(await readFile("sleep.pid", "utf8"));
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
});

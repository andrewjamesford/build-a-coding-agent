import { mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before } from "node:test";

// The tools work relative to process.cwd(), so every test file runs
// inside its own empty temp folder and never touches the repo.
export function useTempDir(): void {
  const startDir = process.cwd();
  let dir = "";

  before(async () => {
    dir = await realpath(await mkdtemp(path.join(os.tmpdir(), "agent-test-")));
    process.chdir(dir);
  });

  after(async () => {
    process.chdir(startDir);
    await rm(dir, { recursive: true, force: true });
  });
}

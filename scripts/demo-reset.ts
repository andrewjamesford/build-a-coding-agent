// Deletes and recreates ~/agent-practice from the fixtures folder.
// It only ever touches that one folder and takes no arguments.
import { cp, lstat, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRACTICE_DIR_NAME = "agent-practice";

function fail(message: string): never {
  console.error(`demo:reset refused: ${message}`);
  process.exit(1);
}

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDir = path.join(repoDir, "fixtures");
const home = os.homedir();

if (process.argv.length > 2) {
  fail("it takes no arguments and only resets ~/agent-practice.");
}
if (!path.isAbsolute(home) || path.resolve(home) === path.parse(home).root) {
  fail(`home directory "${home}" doesn't look safe.`);
}

const target = path.join(home, PRACTICE_DIR_NAME);

// Belt and braces: the target must be exactly ~/agent-practice.
if (path.dirname(target) !== path.resolve(home) || path.basename(target) !== PRACTICE_DIR_NAME) {
  fail(`unexpected target "${target}".`);
}
const relToRepo = path.relative(repoDir, target);
if (relToRepo === "" || !relToRepo.startsWith("..")) {
  fail("the practice folder can't be inside this repo.");
}

const existing = await lstat(target).catch(() => null);
if (existing && !existing.isDirectory()) {
  fail(`${target} exists but isn't a plain directory (symlink or file). Remove it yourself.`);
}

await rm(target, { recursive: true, force: true });
await mkdir(target);
await cp(path.join(fixturesDir, "part-1"), target, { recursive: true });
await cp(path.join(fixturesDir, "riddle.txt"), path.join(target, "riddle.txt"));
await cp(path.join(fixturesDir, "notes.txt"), path.join(target, "notes.txt"));

// Show paths under the home folder with ~, and quote any that contain spaces.
// The ~ stays outside the quotes so the shell still expands it.
function display(p: string): string {
  const quote = (s: string) => (/\s/.test(s) ? JSON.stringify(s) : s);
  const rel = path.relative(home, p);
  return rel.startsWith("..") || path.isAbsolute(rel) ? quote(p) : `~/${quote(rel)}`;
}

console.log(`Reset ${target}`);
console.log("Run the agent there with:");
console.log("");
console.log(`  cd ${display(target)} && npx tsx ${display(path.join(repoDir, "main.ts"))}`);

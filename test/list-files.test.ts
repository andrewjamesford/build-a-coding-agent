import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { listFilesTool } from "../tools.ts";
import { useTempDir } from "./helpers.ts";

useTempDir();

test("list_files lists recursively, with a slash on folders", async () => {
  await mkdir("src/utils", { recursive: true });
  await writeFile("README.md", "");
  await writeFile("src/index.ts", "");
  await writeFile("src/utils/math.ts", "");

  const all = JSON.parse(await listFilesTool.run({}));
  assert.deepEqual(all, ["README.md", "src/", "src/index.ts", "src/utils/", "src/utils/math.ts"]);

  const sub = JSON.parse(await listFilesTool.run({ path: "src" }));
  assert.deepEqual(sub, ["index.ts", "utils/", "utils/math.ts"]);
});

test("list_files on a missing folder is an error", async () => {
  await assert.rejects(listFilesTool.run({ path: "missing" }), { code: "ENOENT" });
});

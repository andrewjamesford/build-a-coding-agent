import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { readFileTool } from "../tools.ts";
import { useTempDir } from "./helpers.ts";

useTempDir();

test("read_file returns the file contents", async () => {
  await writeFile("hello.txt", "hello\nworld\n");
  assert.equal(await readFileTool.run({ path: "hello.txt" }), "hello\nworld\n");
});

test("read_file on a missing file is an error", async () => {
  await assert.rejects(readFileTool.run({ path: "nope.txt" }), { code: "ENOENT" });
});

test("read_file on a directory is an error", async () => {
  await mkdir("a-folder");
  await assert.rejects(readFileTool.run({ path: "a-folder" }), { code: "EISDIR" });
});

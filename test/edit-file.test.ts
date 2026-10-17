import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { editFileTool } from "../tools.ts";
import { useTempDir } from "./helpers.ts";

useTempDir();

test("edit_file creates a new file and any missing folders", async () => {
  const result = await editFileTool.run({ path: "a/b/new.txt", old_str: "", new_str: "first line\n" });
  assert.equal(result, "Successfully created file a/b/new.txt");
  assert.equal(await readFile("a/b/new.txt", "utf8"), "first line\n");
});

test("edit_file replaces old_str with new_str", async () => {
  await writeFile("greet.txt", "Hello world\n");
  assert.equal(await editFileTool.run({ path: "greet.txt", old_str: "world", new_str: "there" }), "OK");
  assert.equal(await readFile("greet.txt", "utf8"), "Hello there\n");
});

test("edit_file errors when old_str isn't in the file", async () => {
  await writeFile("same.txt", "unchanged\n");
  await assert.rejects(
    editFileTool.run({ path: "same.txt", old_str: "Goodbye", new_str: "Hello" }),
    /old_str not found in file/,
  );
  assert.equal(await readFile("same.txt", "utf8"), "unchanged\n");
});

test("edit_file rejects identical old_str and new_str", async () => {
  await writeFile("x.txt", "x\n");
  await assert.rejects(editFileTool.run({ path: "x.txt", old_str: "x", new_str: "x" }), /invalid input parameters/);
});

test("edit_file rejects an empty path", async () => {
  await assert.rejects(editFileTool.run({ path: "", old_str: "", new_str: "x" }), /invalid input parameters/);
});

test("edit_file on a missing file with a non-empty old_str is an error", async () => {
  await assert.rejects(editFileTool.run({ path: "ghost.txt", old_str: "a", new_str: "b" }), { code: "ENOENT" });
});

test("edit_file refuses an empty old_str on a file that has content", async () => {
  await writeFile("existing.txt", "abc\n");
  await assert.rejects(
    editFileTool.run({ path: "existing.txt", old_str: "", new_str: "X" }),
    /file already exists, so old_str can't be empty/,
  );
  assert.equal(await readFile("existing.txt", "utf8"), "abc\n");
});

test("edit_file fills an existing empty file when old_str is empty", async () => {
  await writeFile("empty.txt", "");
  assert.equal(await editFileTool.run({ path: "empty.txt", old_str: "", new_str: "filled\n" }), "OK");
  assert.equal(await readFile("empty.txt", "utf8"), "filled\n");
});

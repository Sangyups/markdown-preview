import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveTarget } from "../../src/cli/resolve-target";

const tempPaths: string[] = [];

afterEach(async () => {
    await Promise.all(
        tempPaths
            .splice(0)
            .map((target) => rm(target, { force: true, recursive: true }))
    );
});

describe("resolveTarget", () => {
    test("uses cwd when no args are provided", async () => {
        const cwd = await makeTempDir();

        const resolved = await resolveTarget([], cwd);

        expect(resolved).toEqual({ kind: "directory", directoryPath: cwd });
    });

    test("returns a file target when the argument points to a file", async () => {
        const cwd = await makeTempDir();
        const filePath = path.join(cwd, "README.md");
        await writeFile(filePath, "# demo");

        const resolved = await resolveTarget([filePath], cwd);

        expect(resolved).toEqual({ kind: "file", filePath });
    });

    test("throws when more than one arg is provided", async () => {
        const cwd = await makeTempDir();

        await expect(resolveTarget(["a", "b"], cwd)).rejects.toThrow(
            /Expected zero or one path argument/
        );
    });
});

async function makeTempDir() {
    const directoryPath = await mkdir(
        path.join(
            os.tmpdir(),
            `markdown-preview-${Date.now()}-${Math.random()}`
        ),
        {
            recursive: true,
        }
    );

    tempPaths.push(directoryPath);

    return directoryPath;
}

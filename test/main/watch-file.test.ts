import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { watchFile } from "../../src/main/watch-file";

const tempPaths: string[] = [];

afterEach(async () => {
    await Promise.all(
        tempPaths
            .splice(0)
            .map((target) => rm(target, { force: true, recursive: true }))
    );
});

describe("watchFile", () => {
    test("emits a single change after debounce", async () => {
        const tempDir = await makeTempDir();
        const filePath = path.join(tempDir, "README.md");
        await writeFile(filePath, "initial");

        const events: string[] = [];

        const stopWatching = watchFile(
            filePath,
            () => {
                events.push("change");
            },
            20
        );

        await writeFile(filePath, "first");
        await writeFile(filePath, "second");
        await Bun.sleep(80);

        stopWatching();

        expect(events).toEqual(["change"]);
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

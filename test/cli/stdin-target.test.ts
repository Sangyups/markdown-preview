import { afterEach, describe, expect, test } from "bun:test";
import { access, readFile, rm } from "node:fs/promises";
import { Readable } from "node:stream";

import {
    createStdinTarget,
    shouldUseStdinTarget,
} from "../../src/cli/stdin-target";

const createdPaths: string[] = [];

afterEach(async () => {
    await Promise.all(
        createdPaths.splice(0).map((target) =>
            rm(target, {
                force: true,
                recursive: true,
            })
        )
    );
});

describe("shouldUseStdinTarget", () => {
    test("uses stdin only when no path args are provided and stdin is not a TTY", () => {
        expect(shouldUseStdinTarget([], makeReadable("demo", false))).toBe(
            true
        );
    });

    test("does not use stdin when a path arg is provided", () => {
        expect(
            shouldUseStdinTarget(["README.md"], makeReadable("demo", false))
        ).toBe(false);
    });

    test("does not use stdin when stdin is a TTY", () => {
        expect(shouldUseStdinTarget([], makeReadable("demo", true))).toBe(
            false
        );
    });
});

describe("createStdinTarget", () => {
    test("writes stdin source to a temporary Markdown file", async () => {
        const target = await createStdinTarget(
            makeReadable("# 안녕\n\n```mermaid\ngraph TD\n```\n", false)
        );
        createdPaths.push(target.directoryPath);

        expect(target.filePath).toEndWith("stdin.md");
        await expect(readFile(target.filePath, "utf8")).resolves.toBe(
            "# 안녕\n\n```mermaid\ngraph TD\n```\n"
        );
    });

    test("allows empty stdin", async () => {
        const target = await createStdinTarget(makeReadable("", false));
        createdPaths.push(target.directoryPath);

        await expect(readFile(target.filePath, "utf8")).resolves.toBe("");
    });

    test("removes the temporary directory during cleanup", async () => {
        const target = await createStdinTarget(makeReadable("# demo", false));

        await target.cleanup();

        await expect(access(target.directoryPath)).rejects.toThrow();
    });
});

function makeReadable(source: string, isTTY: boolean) {
    const readable = Readable.from([source]);

    Object.defineProperty(readable, "isTTY", {
        value: isTTY,
    });

    return readable;
}

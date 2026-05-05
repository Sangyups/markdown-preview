import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { scanMarkdownFiles } from "../../src/cli/scan-markdown-files";

const tempPaths: string[] = [];

afterEach(async () => {
    await Promise.all(
        tempPaths
            .splice(0)
            .map((target) => rm(target, { force: true, recursive: true }))
    );
});

describe("scanMarkdownFiles", () => {
    test("recursively finds markdown files and skips ignored directories", async () => {
        const rootDir = await makeTempDir();

        await mkdir(path.join(rootDir, "nested", "docs"), { recursive: true });
        await mkdir(path.join(rootDir, ".git", "objects"), { recursive: true });
        await mkdir(path.join(rootDir, "node_modules", "pkg"), {
            recursive: true,
        });
        await mkdir(path.join(rootDir, ".hidden", "notes"), {
            recursive: true,
        });
        await writeFile(path.join(rootDir, "README.md"), "# root");
        await writeFile(
            path.join(rootDir, "nested", "docs", "guide.md"),
            "# nested"
        );
        await writeFile(
            path.join(rootDir, ".git", "objects", "ignored.md"),
            "# ignored"
        );
        await writeFile(
            path.join(rootDir, "node_modules", "pkg", "ignored.md"),
            "# ignored"
        );
        await writeFile(
            path.join(rootDir, ".hidden", "notes", "ignored.md"),
            "# ignored"
        );

        const files = await scanMarkdownFiles(rootDir, false);

        expect(files).toEqual([
            path.join(rootDir, "README.md"),
            path.join(rootDir, "nested", "docs", "guide.md"),
        ]);
    });

    test("includes hidden directories when includeHidden is enabled but still skips .git and node_modules", async () => {
        const rootDir = await makeTempDir();

        await mkdir(path.join(rootDir, ".hidden", "notes"), {
            recursive: true,
        });
        await mkdir(path.join(rootDir, ".git", "objects"), { recursive: true });
        await mkdir(path.join(rootDir, "node_modules", "pkg"), {
            recursive: true,
        });
        await writeFile(path.join(rootDir, "README.md"), "# root");
        await writeFile(
            path.join(rootDir, ".hidden", "notes", "secret.md"),
            "# secret"
        );
        await writeFile(
            path.join(rootDir, ".git", "objects", "ignored.md"),
            "# ignored"
        );
        await writeFile(
            path.join(rootDir, "node_modules", "pkg", "ignored.md"),
            "# ignored"
        );

        const files = await scanMarkdownFiles(rootDir, true);

        expect(files).toEqual([
            path.join(rootDir, "README.md"),
            path.join(rootDir, ".hidden", "notes", "secret.md"),
        ]);
    });

    test("sorts files by depth first and then by relative path", async () => {
        const rootDir = await makeTempDir();

        await mkdir(path.join(rootDir, "guides"), { recursive: true });
        await writeFile(path.join(rootDir, "b.md"), "# b");
        await writeFile(path.join(rootDir, "a.md"), "# a");
        await writeFile(path.join(rootDir, "guides", "z.md"), "# z");
        await writeFile(path.join(rootDir, "guides", "a.md"), "# a");

        const files = await scanMarkdownFiles(rootDir, false);

        expect(files).toEqual([
            path.join(rootDir, "a.md"),
            path.join(rootDir, "b.md"),
            path.join(rootDir, "guides", "a.md"),
            path.join(rootDir, "guides", "z.md"),
        ]);
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

import { readdir } from "node:fs/promises";
import path from "node:path";

const IGNORED_DIRECTORY_NAMES = new Set([".git", "node_modules"]);

export async function scanMarkdownFiles(
    rootDirectory: string
): Promise<string[]> {
    const files: string[] = [];

    await walkDirectory(rootDirectory, files);

    return files.sort((left, right) =>
        compareMarkdownPaths(rootDirectory, left, right)
    );
}

async function walkDirectory(directoryPath: string, files: string[]) {
    const entries = await readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
            if (shouldIgnoreDirectory(entry.name)) {
                continue;
            }

            await walkDirectory(entryPath, files);
            continue;
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
            files.push(entryPath);
        }
    }
}

function shouldIgnoreDirectory(directoryName: string) {
    return (
        IGNORED_DIRECTORY_NAMES.has(directoryName) ||
        directoryName.startsWith(".")
    );
}

function compareMarkdownPaths(
    rootDirectory: string,
    left: string,
    right: string
) {
    const leftRelativePath = path.relative(rootDirectory, left);
    const rightRelativePath = path.relative(rootDirectory, right);
    const depthDifference =
        pathDepth(leftRelativePath) - pathDepth(rightRelativePath);

    if (depthDifference !== 0) {
        return depthDifference;
    }

    return leftRelativePath.localeCompare(rightRelativePath);
}

function pathDepth(relativePath: string) {
    return relativePath.split(path.sep).length;
}

import { readdir } from "node:fs/promises";
import path from "node:path";

const IGNORED_DIRECTORY_NAMES = new Set([".git", "node_modules"]);

export async function scanMarkdownFiles(
    rootDirectory: string
): Promise<string[]> {
    const files = await walkDirectory(rootDirectory);

    return files
        .map((filePath) => {
            const relativePath = path.relative(rootDirectory, filePath);
            return {
                depth: relativePath.split(path.sep).length,
                filePath,
                relativePath,
            };
        })
        .sort((left, right) => {
            const depthDifference = left.depth - right.depth;

            if (depthDifference !== 0) {
                return depthDifference;
            }

            return left.relativePath.localeCompare(right.relativePath);
        })
        .map((entry) => entry.filePath);
}

async function walkDirectory(directoryPath: string): Promise<string[]> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const files: string[] = [];
    const subdirectoryWalks: Promise<string[]>[] = [];

    for (const entry of entries) {
        const entryPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
            if (shouldIgnoreDirectory(entry.name)) {
                continue;
            }

            subdirectoryWalks.push(walkDirectory(entryPath));
            continue;
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
            files.push(entryPath);
        }
    }

    const subdirectoryResults = await Promise.all(subdirectoryWalks);

    for (const subdirectoryFiles of subdirectoryResults) {
        files.push(...subdirectoryFiles);
    }

    return files;
}

function shouldIgnoreDirectory(directoryName: string) {
    return (
        IGNORED_DIRECTORY_NAMES.has(directoryName) ||
        directoryName.startsWith(".")
    );
}

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface StdinTarget {
    cleanup: () => Promise<void>;
    directoryPath: string;
    filePath: string;
}

export interface StdinLike extends NodeJS.ReadableStream {
    isTTY?: boolean;
}

export function shouldUseStdinTarget(args: string[], stdin: StdinLike) {
    return args.length === 0 && stdin.isTTY !== true;
}

export async function createStdinTarget(
    stdin: StdinLike = process.stdin
): Promise<StdinTarget> {
    const directoryPath = await mkdtemp(
        path.join(os.tmpdir(), "markdown-preview-stdin-")
    );
    const filePath = path.join(directoryPath, "stdin.md");

    try {
        const source = await readUtf8Stream(stdin);
        await writeFile(filePath, source, "utf8");
    } catch (error) {
        await rm(directoryPath, { force: true, recursive: true });
        throw error;
    }

    return {
        cleanup: () => rm(directoryPath, { force: true, recursive: true }),
        directoryPath,
        filePath,
    };
}

async function readUtf8Stream(stream: NodeJS.ReadableStream) {
    stream.setEncoding("utf8");

    let source = "";

    for await (const chunk of stream) {
        source += chunk;
    }

    return source;
}

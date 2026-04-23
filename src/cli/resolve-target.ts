import { stat } from "node:fs/promises";
import path from "node:path";

export type ResolvedTarget =
    | { directoryPath: string; kind: "directory" }
    | { filePath: string; kind: "file" };

export async function resolveTarget(
    args: string[],
    cwd: string
): Promise<ResolvedTarget> {
    if (args.length > 1) {
        throw new Error("Expected zero or one path argument.");
    }

    const candidatePath = path.resolve(cwd, args[0] ?? cwd);
    const candidateStats = await stat(candidatePath);

    if (candidateStats.isDirectory()) {
        return { directoryPath: candidatePath, kind: "directory" };
    }

    if (candidateStats.isFile()) {
        return { filePath: candidatePath, kind: "file" };
    }

    throw new Error(`Unsupported target: ${candidatePath}`);
}

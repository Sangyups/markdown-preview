import path from "node:path";

import type { FzfCandidate } from "./run-fzf";

export function toFilePathCandidates(
    rootDirectory: string,
    filePaths: string[]
): FzfCandidate<string>[] {
    return filePaths.map((filePath) => ({
        label: path.relative(rootDirectory, filePath),
        value: filePath,
    }));
}

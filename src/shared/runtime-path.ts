import path from "node:path";

export function resolveRuntimePath(argv: string[], relativePath: string) {
    const entryScriptPath = argv[1];

    if (!entryScriptPath) {
        throw new Error(
            "Unable to resolve runtime path without an entry script."
        );
    }

    return path.resolve(path.dirname(entryScriptPath), relativePath);
}

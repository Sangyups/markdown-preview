const INCLUDE_HIDDEN_FLAG = "--include-hidden";
const NO_HIDDEN_FLAG = "--no-hidden";

export interface ScanOptionsParseResult {
    includeHiddenOverride: boolean | null;
    remainingArgs: string[];
}

export function parseScanOptions(args: string[]): ScanOptionsParseResult {
    const remainingArgs: string[] = [];
    let includeHiddenOverride: boolean | null = null;

    for (const arg of args) {
        if (arg === INCLUDE_HIDDEN_FLAG) {
            includeHiddenOverride = true;
            continue;
        }

        if (arg === NO_HIDDEN_FLAG) {
            includeHiddenOverride = false;
            continue;
        }

        remainingArgs.push(arg);
    }

    return { includeHiddenOverride, remainingArgs };
}

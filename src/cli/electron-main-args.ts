import type { AppTheme } from "../shared/config";

export function buildElectronMainArgs(
    mainEntryPath: string,
    targetPath: string,
    themeOverride: AppTheme | null
) {
    const args = [mainEntryPath, "--target", targetPath];

    if (themeOverride) {
        args.push(`--theme=${themeOverride}`);
    }

    return args;
}

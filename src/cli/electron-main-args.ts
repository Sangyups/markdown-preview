import type { AppTheme } from "../shared/config";
import type { PreviewSource } from "../shared/preview-source";

export function buildElectronMainArgs(
    mainEntryPath: string,
    targetPath: string,
    previewSource: PreviewSource,
    themeOverride: AppTheme | null
) {
    const args = [
        mainEntryPath,
        "--target",
        targetPath,
        `--source=${previewSource}`,
    ];

    if (themeOverride) {
        args.push(`--theme=${themeOverride}`);
    }

    return args;
}

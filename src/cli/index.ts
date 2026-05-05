import { spawn } from "node:child_process";

import electronPath from "electron";

import type { AppTheme } from "../shared/config";
import { toErrorMessage } from "../shared/error-message";
import type { PreviewSource } from "../shared/preview-source";
import { resolveRuntimePath } from "../shared/runtime-path";
import { parseThemeOverrideOption } from "../shared/theme-override";
import { buildElectronMainArgs } from "./electron-main-args";
import { toFilePathCandidates } from "./fzf-candidates";
import { formatHelpText, shouldShowHelp, shouldShowVersion } from "./help";
import { resolveTarget } from "./resolve-target";
import { runFzf } from "./run-fzf";
import { scanMarkdownFiles } from "./scan-markdown-files";
import {
    createStdinTarget,
    type StdinLike,
    shouldUseStdinTarget,
} from "./stdin-target";

const ARGUMENT_ERROR_EXIT_CODE = 1;

interface SelectedTarget {
    cleanup: () => Promise<void>;
    filePath: string;
    source: PreviewSource;
}

const NOOP_CLEANUP = async () => {};

function getVersion(): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const packageJson = require("../../package.json");
    return packageJson.version || "unknown";
}

async function main() {
    if (shouldShowHelp(process.argv.slice(2))) {
        console.log(formatHelpText());
        process.exit(0);
    }

    if (shouldShowVersion(process.argv.slice(2))) {
        console.log(`markdown-preview ${getVersion()}`);
        process.exit(0);
    }

    let selectedTarget: SelectedTarget | null = null;
    let exitCode = 0;

    try {
        const { remainingArgs, themeOverride } = parseThemeOverrideOption(
            process.argv.slice(2)
        );
        selectedTarget = await selectTarget(remainingArgs, process.cwd());

        if (!selectedTarget) {
            return;
        }

        exitCode = await openPreviewWindow(
            selectedTarget.filePath,
            selectedTarget.source,
            themeOverride
        );
    } catch (error) {
        console.error(toErrorMessage(error));
        exitCode = ARGUMENT_ERROR_EXIT_CODE;
    } finally {
        await selectedTarget?.cleanup();
    }

    process.exit(exitCode);
}

async function selectTarget(
    args: string[],
    cwd: string,
    stdin: StdinLike = process.stdin
): Promise<SelectedTarget | null> {
    if (shouldUseStdinTarget(args, stdin)) {
        const stdinTarget = await createStdinTarget(stdin);

        return {
            cleanup: stdinTarget.cleanup,
            filePath: stdinTarget.filePath,
            source: "stdin",
        };
    }

    const resolvedTarget = await resolveTarget(args, cwd);

    if (resolvedTarget.kind === "file") {
        return {
            cleanup: NOOP_CLEANUP,
            filePath: resolvedTarget.filePath,
            source: "file",
        };
    }

    const markdownFiles = await scanMarkdownFiles(resolvedTarget.directoryPath);

    if (markdownFiles.length === 0) {
        throw new Error(
            "No Markdown files were found in the target directory."
        );
    }

    const selection = await runFzf(
        toFilePathCandidates(resolvedTarget.directoryPath, markdownFiles)
    );

    switch (selection.kind) {
        case "selected":
            return {
                cleanup: NOOP_CLEANUP,
                filePath: selection.value,
                source: "file",
            };
        case "cancelled":
            return null;
        case "missing":
            throw new Error("fzf is required but was not found in PATH.");
        case "error":
            throw new Error(selection.message);
    }
}

function openPreviewWindow(
    targetPath: string,
    previewSource: PreviewSource,
    themeOverride: AppTheme | null
) {
    return new Promise<number>((resolve, reject) => {
        const mainEntryPath = resolveRuntimePath(
            process.argv,
            "../main/index.js"
        );
        const electronProcess = spawn(
            electronPath,
            buildElectronMainArgs(
                mainEntryPath,
                targetPath,
                previewSource,
                themeOverride
            ),
            {
                env: process.env,
                stdio: "inherit",
            }
        );

        electronProcess.on("error", reject);
        electronProcess.on("exit", (code) => {
            resolve(code ?? 0);
        });
    });
}

void main();

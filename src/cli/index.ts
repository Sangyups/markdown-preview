import { spawn } from "node:child_process";

import electronPath from "electron";

import type { AppTheme } from "../shared/config";
import { resolveRuntimePath } from "../shared/runtime-path";
import { parseThemeOverrideOption } from "../shared/theme-override";
import { buildElectronMainArgs } from "./electron-main-args";
import { toFilePathCandidates } from "./fzf-candidates";
import { resolveTarget } from "./resolve-target";
import { runFzf } from "./run-fzf";
import { scanMarkdownFiles } from "./scan-markdown-files";

const ARGUMENT_ERROR_EXIT_CODE = 1;

async function main() {
    try {
        const { remainingArgs, themeOverride } = parseThemeOverrideOption(
            process.argv.slice(2)
        );
        const targetPath = await selectTargetPath(remainingArgs, process.cwd());

        if (!targetPath) {
            process.exit(0);
        }

        const exitCode = await openPreviewWindow(targetPath, themeOverride);
        process.exit(exitCode);
    } catch (error) {
        console.error(toErrorMessage(error));
        process.exit(ARGUMENT_ERROR_EXIT_CODE);
    }
}

async function selectTargetPath(args: string[], cwd: string) {
    const resolvedTarget = await resolveTarget(args, cwd);

    if (resolvedTarget.kind === "file") {
        return resolvedTarget.filePath;
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

    if (selection.kind === "selected") {
        return selection.value;
    }

    if (selection.kind === "missing") {
        throw new Error("fzf is required but was not found in PATH.");
    }

    if (selection.kind === "error") {
        throw new Error(selection.message);
    }

    return null;
}

function openPreviewWindow(targetPath: string, themeOverride: AppTheme | null) {
    return new Promise<number>((resolve, reject) => {
        const mainEntryPath = resolveRuntimePath(
            process.argv,
            "../main/index.js"
        );
        const electronProcess = spawn(
            electronPath,
            buildElectronMainArgs(mainEntryPath, targetPath, themeOverride),
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

function toErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Unknown error.";
}

void main();

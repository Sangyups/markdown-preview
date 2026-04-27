# stdin Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `mdp` preview Markdown piped through stdin when no path argument is provided.

**Architecture:** The CLI detects non-TTY stdin, reads it as UTF-8, writes it to a temporary `.md` file, and launches Electron through the existing `--target <filePath>` path. Electron main receives a small `--source=stdin` metadata flag so the preview status can say the content came from stdin.

**Tech Stack:** Bun, TypeScript, Node streams/filesystem APIs, Electron, Biome, `bun:test`.

---

## File Structure

- Create `src/shared/preview-source.ts`: parse `--source=file|stdin` for Electron main and define the shared `PreviewSource` type.
- Create `test/shared/preview-source.test.ts`: verify source parsing defaults and errors.
- Create `src/main/preview-status.ts`: map preview source to the renderer status message.
- Create `test/main/preview-status.test.ts`: verify file and stdin status messages.
- Create `src/cli/stdin-target.ts`: read stdin, create a temporary Markdown file, and expose cleanup.
- Create `test/cli/stdin-target.test.ts`: verify stdin detection, UTF-8 preservation, empty input, path precedence, and cleanup.
- Modify `src/cli/electron-main-args.ts`: include `--source=<source>` in Electron main args.
- Modify `test/cli/electron-main-args.test.ts`: cover file and stdin source args.
- Modify `src/cli/index.ts`: select stdin target before directory scanning when no path args exist.
- Modify `src/main/index.ts`: parse `--source`, pass it to payload construction, and use source-aware status.
- Modify `README.md`: document `cat README.md | mdp`.
- Modify `docs/project-architecture.md`: document stdin source flow.

Commits are intentionally deferred until the feature is complete, per user instruction.

### Task 1: Shared Preview Source Parsing

**Files:**
- Create: `src/shared/preview-source.ts`
- Create: `test/shared/preview-source.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/shared/preview-source.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { parsePreviewSourceOption } from "../../src/shared/preview-source";

describe("parsePreviewSourceOption", () => {
    test("defaults to file source when the option is omitted", () => {
        expect(parsePreviewSourceOption(["--target", "/docs/README.md"])).toBe(
            "file"
        );
    });

    test("extracts an equals-style stdin source option", () => {
        expect(
            parsePreviewSourceOption([
                "--target",
                "/tmp/stdin.md",
                "--source=stdin",
            ])
        ).toBe("stdin");
    });

    test("extracts a space-separated source option", () => {
        expect(parsePreviewSourceOption(["--source", "file"])).toBe("file");
    });

    test("rejects unsupported source values", () => {
        expect(() => parsePreviewSourceOption(["--source=clipboard"])).toThrow(
            /Expected file or stdin/
        );
    });

    test("rejects a missing source value", () => {
        expect(() => parsePreviewSourceOption(["--source"])).toThrow(
            /Missing value for --source/
        );
    });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `bun test test/shared/preview-source.test.ts`

Expected: FAIL because `src/shared/preview-source.ts` does not exist.

- [ ] **Step 3: Add the shared parser**

Create `src/shared/preview-source.ts`:

```ts
const SOURCE_FLAG = "--source";
const SOURCE_FLAG_PREFIX = `${SOURCE_FLAG}=`;
const EXPECTED_SOURCE_MESSAGE = "Expected file or stdin.";

export type PreviewSource = "file" | "stdin";

export function parsePreviewSourceOption(args: string[]): PreviewSource {
    let previewSource: PreviewSource = "file";

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];

        if (arg === SOURCE_FLAG) {
            const value = args[index + 1];

            if (!value || value.startsWith("--")) {
                throw new Error(
                    `Missing value for --source. ${EXPECTED_SOURCE_MESSAGE}`
                );
            }

            previewSource = parsePreviewSourceValue(value);
            index += 1;
            continue;
        }

        if (arg.startsWith(SOURCE_FLAG_PREFIX)) {
            previewSource = parsePreviewSourceValue(
                arg.slice(SOURCE_FLAG_PREFIX.length)
            );
        }
    }

    return previewSource;
}

function parsePreviewSourceValue(value: string): PreviewSource {
    if (value === "file" || value === "stdin") {
        return value;
    }

    throw new Error(
        `Unsupported preview source "${value}". ${EXPECTED_SOURCE_MESSAGE}`
    );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test test/shared/preview-source.test.ts`

Expected: PASS.

### Task 2: Source-Aware Preview Status

**Files:**
- Create: `src/main/preview-status.ts`
- Create: `test/main/preview-status.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/main/preview-status.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { buildPreviewStatus } from "../../src/main/preview-status";

describe("buildPreviewStatus", () => {
    test("uses the existing watch message for file targets", () => {
        expect(buildPreviewStatus("file")).toEqual({
            message: "Watching for file changes.",
            tone: "info",
        });
    });

    test("uses a stdin-specific message for stdin targets", () => {
        expect(buildPreviewStatus("stdin")).toEqual({
            message: "Previewing stdin input.",
            tone: "info",
        });
    });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `bun test test/main/preview-status.test.ts`

Expected: FAIL because `src/main/preview-status.ts` does not exist.

- [ ] **Step 3: Add the status helper**

Create `src/main/preview-status.ts`:

```ts
import type { PreviewSource } from "../shared/preview-source";
import type { PreviewStatus } from "../shared/types";

export function buildPreviewStatus(source: PreviewSource): PreviewStatus {
    if (source === "stdin") {
        return {
            message: "Previewing stdin input.",
            tone: "info",
        };
    }

    return {
        message: "Watching for file changes.",
        tone: "info",
    };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test test/main/preview-status.test.ts`

Expected: PASS.

### Task 3: stdin Temporary Target Helper

**Files:**
- Create: `src/cli/stdin-target.ts`
- Create: `test/cli/stdin-target.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/cli/stdin-target.test.ts`:

```ts
import { afterEach, describe, expect, test } from "bun:test";
import { access, readFile, rm } from "node:fs/promises";
import { Readable } from "node:stream";

import {
    createStdinTarget,
    shouldUseStdinTarget,
} from "../../src/cli/stdin-target";

const createdPaths: string[] = [];

afterEach(async () => {
    await Promise.all(
        createdPaths.splice(0).map((target) =>
            rm(target, {
                force: true,
                recursive: true,
            })
        )
    );
});

describe("shouldUseStdinTarget", () => {
    test("uses stdin only when no path args are provided and stdin is not a TTY", () => {
        expect(shouldUseStdinTarget([], makeReadable("demo", false))).toBe(
            true
        );
    });

    test("does not use stdin when a path arg is provided", () => {
        expect(
            shouldUseStdinTarget(["README.md"], makeReadable("demo", false))
        ).toBe(false);
    });

    test("does not use stdin when stdin is a TTY", () => {
        expect(shouldUseStdinTarget([], makeReadable("demo", true))).toBe(
            false
        );
    });
});

describe("createStdinTarget", () => {
    test("writes stdin source to a temporary Markdown file", async () => {
        const target = await createStdinTarget(
            makeReadable("# 안녕\n\n```mermaid\ngraph TD\n```\n", false)
        );
        createdPaths.push(target.directoryPath);

        expect(target.filePath).toEndWith("stdin.md");
        await expect(readFile(target.filePath, "utf8")).resolves.toBe(
            "# 안녕\n\n```mermaid\ngraph TD\n```\n"
        );
    });

    test("allows empty stdin", async () => {
        const target = await createStdinTarget(makeReadable("", false));
        createdPaths.push(target.directoryPath);

        await expect(readFile(target.filePath, "utf8")).resolves.toBe("");
    });

    test("removes the temporary directory during cleanup", async () => {
        const target = await createStdinTarget(makeReadable("# demo", false));

        await target.cleanup();

        await expect(access(target.directoryPath)).rejects.toThrow();
    });
});

function makeReadable(source: string, isTTY: boolean) {
    const readable = Readable.from([source]);

    Object.defineProperty(readable, "isTTY", {
        value: isTTY,
    });

    return readable;
}
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `bun test test/cli/stdin-target.test.ts`

Expected: FAIL because `src/cli/stdin-target.ts` does not exist.

- [ ] **Step 3: Add the stdin helper**

Create `src/cli/stdin-target.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test test/cli/stdin-target.test.ts`

Expected: PASS.

### Task 4: Electron Argument Source Metadata

**Files:**
- Modify: `src/cli/electron-main-args.ts`
- Modify: `test/cli/electron-main-args.test.ts`

- [ ] **Step 1: Update the tests first**

Replace `test/cli/electron-main-args.test.ts` with:

```ts
import { describe, expect, test } from "bun:test";

import { buildElectronMainArgs } from "../../src/cli/electron-main-args";

describe("buildElectronMainArgs", () => {
    test("passes the selected file target, source, and theme override to Electron main", () => {
        expect(
            buildElectronMainArgs(
                "/app/dist/main/index.js",
                "/docs/README.md",
                "file",
                "dark"
            )
        ).toEqual([
            "/app/dist/main/index.js",
            "--target",
            "/docs/README.md",
            "--source=file",
            "--theme=dark",
        ]);
    });

    test("passes stdin source metadata", () => {
        expect(
            buildElectronMainArgs(
                "/app/dist/main/index.js",
                "/tmp/stdin.md",
                "stdin",
                null
            )
        ).toEqual([
            "/app/dist/main/index.js",
            "--target",
            "/tmp/stdin.md",
            "--source=stdin",
        ]);
    });

    test("defaults to file source and omits the theme flag when no override is provided", () => {
        expect(
            buildElectronMainArgs(
                "/app/dist/main/index.js",
                "/docs/README.md",
                "file",
                null
            )
        ).toEqual([
            "/app/dist/main/index.js",
            "--target",
            "/docs/README.md",
            "--source=file",
        ]);
    });
});
```

- [ ] **Step 2: Run the updated test to verify it fails**

Run: `bun test test/cli/electron-main-args.test.ts`

Expected: FAIL because `buildElectronMainArgs` still accepts three parameters.

- [ ] **Step 3: Update Electron argument construction**

Replace `src/cli/electron-main-args.ts` with:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test test/cli/electron-main-args.test.ts`

Expected: PASS.

### Task 5: CLI stdin Selection Integration

**Files:**
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Update CLI selection types and imports**

In `src/cli/index.ts`, add imports:

```ts
import type { PreviewSource } from "../shared/preview-source";
import {
    createStdinTarget,
    shouldUseStdinTarget,
    type StdinLike,
} from "./stdin-target";
```

Add these types and constants near `ARGUMENT_ERROR_EXIT_CODE`:

```ts
interface SelectedTarget {
    cleanup: () => Promise<void>;
    filePath: string;
    source: PreviewSource;
}

const NOOP_CLEANUP = async () => {};
```

- [ ] **Step 2: Route main through the selected source**

Replace the body of `main()` with:

```ts
async function main() {
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
```

- [ ] **Step 3: Replace `selectTargetPath` with `selectTarget`**

Replace the current `selectTargetPath()` function with:

```ts
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

    if (selection.kind === "selected") {
        return {
            cleanup: NOOP_CLEANUP,
            filePath: selection.value,
            source: "file",
        };
    }

    if (selection.kind === "missing") {
        throw new Error("fzf is required but was not found in PATH.");
    }

    if (selection.kind === "error") {
        throw new Error(selection.message);
    }

    return null;
}
```

- [ ] **Step 4: Pass source metadata to Electron**

Change `openPreviewWindow` to:

```ts
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
```

- [ ] **Step 5: Run focused CLI tests**

Run: `bun test test/cli/stdin-target.test.ts test/cli/electron-main-args.test.ts test/cli/resolve-target.test.ts`

Expected: PASS.

### Task 6: Main Process Source Parsing And Status

**Files:**
- Modify: `src/main/index.ts`
- Test: `test/shared/preview-source.test.ts`
- Test: `test/main/preview-status.test.ts`

- [ ] **Step 1: Add imports**

In `src/main/index.ts`, add:

```ts
import {
    parsePreviewSourceOption,
    type PreviewSource,
} from "../shared/preview-source";
import { buildPreviewStatus } from "./preview-status";
```

- [ ] **Step 2: Parse source metadata in bootstrap**

In `bootstrap()`, add `previewSource` next to `themeOverride`:

```ts
let previewSource: PreviewSource;
let themeOverride: AppTheme | null;

try {
    previewSource = parsePreviewSourceOption(process.argv.slice(2));
    themeOverride = parseThemeOverrideOption(
        process.argv.slice(2)
    ).themeOverride;
} catch (error) {
    console.error(toErrorMessage(error));
    app.exit(1);
    return;
}
```

- [ ] **Step 3: Pass source into payload construction**

Update the payload calls:

```ts
let currentPreview = await buildPreviewPayload(
    targetPath,
    appConfig,
    previewSource
);
```

and in the watcher callback:

```ts
currentPreview = await buildPreviewPayload(
    targetPath,
    appConfig,
    previewSource
);
```

- [ ] **Step 4: Make payload status source-aware**

Change the `buildPreviewPayload` signature:

```ts
async function buildPreviewPayload(
    filePath: string,
    appConfig: AppConfig,
    previewSource: PreviewSource
): Promise<PreviewPayload> {
```

Replace the success status object with:

```ts
status: buildPreviewStatus(previewSource),
```

Leave the error status as the error message so read/render failures remain visible.

- [ ] **Step 5: Run focused tests**

Run: `bun test test/shared/preview-source.test.ts test/main/preview-status.test.ts`

Expected: PASS.

### Task 7: Documentation Updates

**Files:**
- Modify: `README.md`
- Modify: `docs/project-architecture.md`

- [ ] **Step 1: Update README usage**

In `README.md`, add this usage block after “Open a specific file”:

````md
Preview Markdown from stdin:

```bash
cat README.md | mdp
```
````

- [ ] **Step 2: Update architecture docs**

In `docs/project-architecture.md`, update the CLI target rules to include:

```md
1. 인자가 없고 stdin이 파이프되어 있으면 stdin을 임시 Markdown 파일로 저장해 target으로 사용합니다.
2. 인자가 없고 stdin이 TTY이면 현재 작업 디렉터리를 target으로 사용합니다.
```

Also update the Electron handoff sentence to mention:

```md
stdin 입력은 `dist/main/index.js --target <tempFilePath> --source=stdin`으로 전달하고,
파일 입력은 `--source=file`로 전달합니다.
```

- [ ] **Step 3: Run documentation formatting check**

Run: `bun run check`

Expected: PASS.

### Task 8: Full Verification

**Files:**
- Verify all modified source, tests, and docs.

- [ ] **Step 1: Run the full test suite**

Run: `bun test`

Expected: PASS.

- [ ] **Step 2: Run static checks**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 3: Run the production build**

Run: `bun run build`

Expected: PASS and `dist/` is regenerated.

- [ ] **Step 4: Inspect git status**

Run: `git status --short`

Expected: only intended source, test, docs, and build-output changes if build output is tracked. The design and implementation plan docs remain uncommitted until this verification is complete.

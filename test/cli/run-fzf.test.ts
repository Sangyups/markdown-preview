import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { executeFzf, runFzf } from "../../src/cli/run-fzf";

describe("runFzf", () => {
    test("returns the mapped value when fzf succeeds", async () => {
        const result = await runFzf(
            [
                { label: "a.md", value: "/docs/a.md" },
                { label: "nested/b.md", value: "/docs/nested/b.md" },
            ],
            async () => ({
                code: 0,
                stdout: "nested/b.md\n",
                stderr: "",
            })
        );

        expect(result).toEqual({
            kind: "selected",
            value: "/docs/nested/b.md",
        });
    });

    test("returns an error when fzf returns a label that is not in the candidates", async () => {
        const result = await runFzf(
            [{ label: "a.md", value: "/docs/a.md" }],
            async () => ({
                code: 0,
                stdout: "missing.md\n",
                stderr: "",
            })
        );

        expect(result).toEqual({
            kind: "error",
            message: "fzf returned an unknown selection: missing.md",
        });
    });

    test("returns cancelled when fzf exits without a selection", async () => {
        const result = await runFzf(
            [{ label: "a.md", value: "/docs/a.md" }],
            async () => ({
                code: 130,
                stdout: "",
                stderr: "",
            })
        );

        expect(result).toEqual({ kind: "cancelled" });
    });

    test("returns missing when fzf is unavailable", async () => {
        const result = await runFzf(
            [{ label: "a.md", value: "/docs/a.md" }],
            async () => {
                const error = new Error("spawn fzf ENOENT");
                (error as NodeJS.ErrnoException).code = "ENOENT";
                throw error;
            }
        );

        expect(result).toEqual({ kind: "missing" });
    });

    test("returns stderr when fzf exits with an error", async () => {
        const result = await runFzf(
            [{ label: "a.md", value: "/docs/a.md" }],
            async () => ({
                code: 1,
                stdout: "",
                stderr: "fzf failed to start",
            })
        );

        expect(result).toEqual({
            kind: "error",
            message: "fzf failed to start",
        });
    });

    test("returns a fallback message when fzf exits with an error and no stderr", async () => {
        const result = await runFzf(
            [{ label: "a.md", value: "/docs/a.md" }],
            async () => ({
                code: 2,
                stdout: "",
                stderr: "   ",
            })
        );

        expect(result).toEqual({
            kind: "error",
            message: "fzf exited with code 2.",
        });
    });

    test("passes newline-separated candidates to the fzf subprocess input", async () => {
        let receivedInput = "";

        const result = await executeFzf(["a.md", "b.md"], (stdin) => {
            receivedInput = new TextDecoder().decode(stdin);

            return {
                exited: Promise.resolve(0),
                stderr: new ReadableStream({
                    start(controller) {
                        controller.close();
                    },
                }),
                stdout: new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode("b.md\n"));
                        controller.close();
                    },
                }),
            };
        });

        expect(receivedInput).toBe("a.md\nb.md\n");
        expect(result).toEqual({ code: 0, stderr: "", stdout: "b.md\n" });
    });

    test("works when the compiled helper is executed by Node", async () => {
        const tempDirectoryPath = await mkdir(
            path.join(
                os.tmpdir(),
                `markdown-preview-fzf-${Date.now()}-${Math.random()}`
            ),
            { recursive: true }
        );
        const fzfPath = path.join(tempDirectoryPath, "fzf");
        const originalPath = process.env.PATH;
        const outdir = path.join(tempDirectoryPath, "build");
        const builtEntryPath = path.join(outdir, "run-fzf.js");

        await writeFile(
            fzfPath,
            [
                "#!/bin/sh",
                "read first_line",
                "read second_line",
                "printf '%s\\n' \"$second_line\"",
            ].join("\n")
        );
        await chmod(fzfPath, 0o755);

        const buildResult = await Bun.build({
            entrypoints: [
                path.join(import.meta.dir, "../../src/cli/run-fzf.ts"),
            ],
            format: "cjs",
            minify: false,
            outdir,
            sourcemap: "none",
            target: "node",
        });

        expect(buildResult.success).toBe(true);

        try {
            const result = await executeBuiltModuleWithNode(
                builtEntryPath,
                [tempDirectoryPath, originalPath].filter(Boolean).join(":")
            );

            expect(result).toEqual({
                code: 0,
                stderr: "",
                stdout: "b.md\n",
            });
        } finally {
            process.env.PATH = originalPath;
            await rm(tempDirectoryPath, { force: true, recursive: true });
        }
    });
});

async function executeBuiltModuleWithNode(
    modulePath: string,
    pathValue: string
) {
    return new Promise<{ code: number; stderr: string; stdout: string }>(
        (resolve, reject) => {
            const child = spawn(
                "node",
                [
                    "-e",
                    [
                        `const { executeFzf } = require(${JSON.stringify(
                            modulePath
                        )});`,
                        'executeFzf(["a.md", "b.md"]).then((result) => {',
                        "  process.stdout.write(JSON.stringify(result));",
                        "}).catch((error) => {",
                        "  process.stderr.write(String(error));",
                        "  process.exit(1);",
                        "});",
                    ].join("\n"),
                ],
                {
                    env: { ...process.env, PATH: pathValue },
                    stdio: ["ignore", "pipe", "pipe"],
                }
            );

            let stdout = "";
            let stderr = "";

            child.stdout.on("data", (chunk) => {
                stdout += chunk.toString();
            });
            child.stderr.on("data", (chunk) => {
                stderr += chunk.toString();
            });
            child.on("error", reject);
            child.on("exit", (code) => {
                if (code !== 0) {
                    reject(
                        new Error(
                            `Node execution failed with code ${code}: ${stderr}`
                        )
                    );
                    return;
                }

                resolve(JSON.parse(stdout));
            });
        }
    );
}

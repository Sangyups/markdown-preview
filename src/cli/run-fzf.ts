import { spawn } from "node:child_process";
import { Readable } from "node:stream";

interface FzfExecutionResult {
    code: number;
    stderr: string;
    stdout: string;
}

interface SpawnedFzfProcess {
    exited: Promise<number>;
    stderr: ReadableStream;
    stdout: ReadableStream;
}

export type FzfExecutor = (input: string[]) => Promise<FzfExecutionResult>;
export type FzfSpawner = (stdin: Uint8Array) => SpawnedFzfProcess;
export interface FzfCandidate<T> {
    label: string;
    value: T;
}

export type FzfResult<T> =
    | { kind: "selected"; value: T }
    | { kind: "cancelled" }
    | { kind: "missing" }
    | { kind: "error"; message: string };

export async function runFzf<T>(
    candidates: FzfCandidate<T>[],
    execute: FzfExecutor = executeFzf
): Promise<FzfResult<T>> {
    try {
        const result = await execute(candidates.map(({ label }) => label));
        const selectedLabel = result.stdout.trim();

        if (result.code === 0 && selectedLabel) {
            const selectedCandidate = candidates.find(
                ({ label }) => label === selectedLabel
            );

            if (!selectedCandidate) {
                return {
                    kind: "error",
                    message: `fzf returned an unknown selection: ${selectedLabel}`,
                };
            }

            return { kind: "selected", value: selectedCandidate.value };
        }

        if (
            result.code === 130 ||
            (result.code === 0 && selectedLabel.length === 0)
        ) {
            return { kind: "cancelled" };
        }

        return {
            kind: "error",
            message:
                result.stderr.trim() || `fzf exited with code ${result.code}.`,
        };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return { kind: "missing" };
        }

        throw error;
    }
}

export async function executeFzf(
    input: string[],
    spawnFzf: FzfSpawner = defaultSpawnFzf
): Promise<FzfExecutionResult> {
    const process = spawnFzf(new TextEncoder().encode(`${input.join("\n")}\n`));

    const [stdout, stderr, code] = await Promise.all([
        new Response(process.stdout).text(),
        new Response(process.stderr).text(),
        process.exited,
    ]);

    return { code, stderr, stdout };
}

function defaultSpawnFzf(stdin: Uint8Array): SpawnedFzfProcess {
    const process = spawn("fzf", [], {
        stdio: ["pipe", "pipe", "pipe"],
    });

    process.stdin?.end(stdin);

    return {
        exited: new Promise<number>((resolve, reject) => {
            process.on("error", reject);
            process.on("exit", (code) => {
                resolve(code ?? 1);
            });
        }),
        stderr: toWebReadableStream(process.stderr),
        stdout: toWebReadableStream(process.stdout),
    };
}

function toWebReadableStream(
    stream: NodeJS.ReadableStream | null
): ReadableStream {
    if (!stream) {
        return new ReadableStream({
            start(controller) {
                controller.close();
            },
        });
    }

    return Readable.toWeb(stream as Readable);
}

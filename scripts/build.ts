import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dir, "..");
const distRoot = path.join(projectRoot, "dist");

await rm(distRoot, { force: true, recursive: true });
await Promise.all([
    mkdir(path.join(distRoot, "cli"), { recursive: true }),
    mkdir(path.join(distRoot, "main"), { recursive: true }),
    mkdir(path.join(distRoot, "preload"), { recursive: true }),
    mkdir(path.join(distRoot, "renderer"), { recursive: true }),
]);

const results = await Promise.all([
    buildTarget(["src/cli/index.ts"], path.join(distRoot, "cli"), "node", [
        "electron",
    ]),
    buildTarget(["src/main/index.ts"], path.join(distRoot, "main"), "node", [
        "electron",
    ]),
    buildTarget(
        ["src/preload/index.ts"],
        path.join(distRoot, "preload"),
        "node",
        ["electron"]
    ),
    buildTarget(
        ["src/renderer/index.ts"],
        path.join(distRoot, "renderer"),
        "browser"
    ),
]);

if (results.some((result) => !result.success)) {
    for (const result of results) {
        for (const log of result.logs) {
            console.error(log);
        }
    }

    process.exit(1);
}

await Promise.all([
    copyFile(
        path.join(projectRoot, "src/renderer/index.html"),
        path.join(distRoot, "renderer/index.html")
    ),
    copyFile(
        path.join(projectRoot, "src/renderer/preview.css"),
        path.join(distRoot, "renderer/preview.css")
    ),
]);

async function buildTarget(
    entrypoints: string[],
    outdir: string,
    target: "browser" | "node",
    external: string[] = []
) {
    return Bun.build({
        entrypoints: entrypoints.map((entrypoint) =>
            path.join(projectRoot, entrypoint)
        ),
        external,
        format: target === "browser" ? "esm" : "cjs",
        minify: false,
        outdir,
        sourcemap: "linked",
        target,
    });
}

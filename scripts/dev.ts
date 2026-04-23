import path from "node:path";

const projectRoot = path.resolve(import.meta.dir, "..");

await runCommand(["bun", "run", "build"]);
await runCommand([
    "bun",
    "run",
    path.join(projectRoot, "dist/cli/index.js"),
    ...process.argv.slice(2),
]);

async function runCommand(command: string[]) {
    const child = Bun.spawn({
        cmd: command,
        cwd: projectRoot,
        env: process.env,
        stderr: "inherit",
        stdin: "inherit",
        stdout: "inherit",
    });

    const exitCode = await child.exited;

    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}

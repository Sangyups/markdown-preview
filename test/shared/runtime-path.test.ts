import { describe, expect, test } from "bun:test";

import { resolveRuntimePath } from "../../src/shared/runtime-path";

const mockBunExecutablePath = "/mock/tools/bun/bin/bun";
const mockProjectRootPath = "/mock/project/markdown-preview";
const mockCliEntryPath = `${mockProjectRootPath}/dist/cli/index.js`;
const mockMainEntryPath = `${mockProjectRootPath}/dist/main/index.js`;
const mockPreloadEntryPath = `${mockProjectRootPath}/dist/preload/index.js`;
const mockElectronExecutablePath =
    "/mock/project/markdown-preview/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron";

describe("resolveRuntimePath", () => {
    test("resolves sibling build artifacts from a built cli entrypoint", () => {
        const resolvedPath = resolveRuntimePath(
            [mockBunExecutablePath, mockCliEntryPath],
            "../main/index.js"
        );

        expect(resolvedPath).toBe(mockMainEntryPath);
    });

    test("resolves preload assets from a built electron main entrypoint", () => {
        const resolvedPath = resolveRuntimePath(
            [mockElectronExecutablePath, mockMainEntryPath],
            "../preload/index.js"
        );

        expect(resolvedPath).toBe(mockPreloadEntryPath);
    });

    test("throws when argv does not include an entry script", () => {
        expect(() => resolveRuntimePath([], "../main/index.js")).toThrow(
            /Unable to resolve runtime path without an entry script/
        );
    });
});

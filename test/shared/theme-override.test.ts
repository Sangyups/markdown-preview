import { describe, expect, test } from "bun:test";

import { DEFAULT_APP_CONFIG } from "../../src/shared/config";
import {
    applyThemeOverride,
    parseThemeOverrideOption,
} from "../../src/shared/theme-override";

describe("parseThemeOverrideOption", () => {
    test("extracts an equals-style theme option and leaves path args untouched", () => {
        expect(parseThemeOverrideOption(["--theme=dark", "README.md"])).toEqual(
            {
                remainingArgs: ["README.md"],
                themeOverride: "dark",
            }
        );
    });

    test("extracts a space-separated theme option", () => {
        expect(parseThemeOverrideOption(["--theme", "light"])).toEqual({
            remainingArgs: [],
            themeOverride: "light",
        });
    });

    test("rejects unsupported theme values", () => {
        expect(() => parseThemeOverrideOption(["--theme=sepia"])).toThrow(
            /Expected auto, dark, or light/
        );
    });
});

describe("applyThemeOverride", () => {
    test("overrides only the configured theme when provided", () => {
        expect(applyThemeOverride(DEFAULT_APP_CONFIG, "dark")).toEqual({
            ...DEFAULT_APP_CONFIG,
            theme: "dark",
        });
    });

    test("keeps the loaded config when no theme override is provided", () => {
        expect(applyThemeOverride(DEFAULT_APP_CONFIG, null)).toEqual(
            DEFAULT_APP_CONFIG
        );
    });
});

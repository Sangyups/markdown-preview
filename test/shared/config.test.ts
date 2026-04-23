import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
    DEFAULT_APP_CONFIG,
    loadAppConfig,
    resolveConfigFilePath,
    serializeAppConfig,
    toCssFontFamilyValue,
} from "../../src/shared/config";

const tempPaths: string[] = [];

afterEach(async () => {
    await Promise.all(
        tempPaths
            .splice(0)
            .map((target) => rm(target, { force: true, recursive: true }))
    );
});

describe("resolveConfigFilePath", () => {
    test("stores the config under $HOME/.config/markdown-preview/config.toml", () => {
        expect(resolveConfigFilePath("/mock/home")).toBe(
            "/mock/home/.config/markdown-preview/config.toml"
        );
    });
});

describe("loadAppConfig", () => {
    test("returns defaults when the config file does not exist", async () => {
        const homeDirectory = await makeTempDir();
        const configFilePath = resolveConfigFilePath(homeDirectory);

        const appConfig = await loadAppConfig(configFilePath);
        const writtenConfig = await readFile(configFilePath, "utf8");

        expect(appConfig).toEqual(DEFAULT_APP_CONFIG);
        expect(writtenConfig).toContain(
            'font-family = ["Apple SD Gothic Neo", "Avenir Next", "Segoe UI", "sans-serif"]'
        );
        expect(writtenConfig).toContain("font-size = 16");
        expect(writtenConfig).toContain(
            'monospace-font-family = ["SFMono-Regular", "JetBrains Mono", "monospace"]'
        );
        expect(writtenConfig).toContain("monospace-font-size = 16");
        expect(writtenConfig).toContain("width = 1560");
        expect(writtenConfig).toContain("height = 1560");
    });

    test("loads preview settings from TOML config", async () => {
        const homeDirectory = await makeTempDir();
        const configFilePath = resolveConfigFilePath(homeDirectory);

        await mkdir(path.dirname(configFilePath), { recursive: true });
        await writeFile(
            configFilePath,
            [
                'font-family = ["Iosevka Aile", "Pretendard", "sans-serif"]',
                "font-size = 18",
                'monospace-font-family = ["Iosevka Term", "monospace"]',
                "monospace-font-size = 15",
                "width = 1440",
                "height = 960",
            ].join("\n")
        );

        const appConfig = await loadAppConfig(configFilePath);

        expect(appConfig).toEqual({
            fontFamily: ["Iosevka Aile", "Pretendard", "sans-serif"],
            fontSize: 18,
            height: 960,
            monospaceFontFamily: ["Iosevka Term", "monospace"],
            monospaceFontSize: 15,
            width: 1440,
        });
    });

    test("falls back to defaults for unsupported values", async () => {
        const homeDirectory = await makeTempDir();
        const configFilePath = resolveConfigFilePath(homeDirectory);

        await mkdir(path.dirname(configFilePath), { recursive: true });
        await writeFile(
            configFilePath,
            [
                "font-family = 17",
                'font-size = "large"',
                'monospace-font-family = ["", 17]',
                "monospace-font-size = -1",
                "width = -50",
                "height = 0",
            ].join("\n")
        );

        const appConfig = await loadAppConfig(configFilePath);

        expect(appConfig).toEqual(DEFAULT_APP_CONFIG);
    });
});

describe("toCssFontFamilyValue", () => {
    test("quotes named fonts and keeps generic family names unquoted", () => {
        expect(
            toCssFontFamilyValue([
                "Iosevka Term",
                "JetBrains Mono",
                "monospace",
            ])
        ).toBe('"Iosevka Term", "JetBrains Mono", monospace');
    });
});

describe("serializeAppConfig", () => {
    test("writes the default config as TOML", () => {
        expect(serializeAppConfig(DEFAULT_APP_CONFIG)).toContain(
            'font-family = ["Apple SD Gothic Neo", "Avenir Next", "Segoe UI", "sans-serif"]'
        );
        expect(serializeAppConfig(DEFAULT_APP_CONFIG)).toContain(
            'monospace-font-family = ["SFMono-Regular", "JetBrains Mono", "monospace"]'
        );
    });
});

async function makeTempDir() {
    const directoryPath = await mkdir(
        path.join(
            os.tmpdir(),
            `markdown-preview-config-${Date.now()}-${Math.random()}`
        ),
        {
            recursive: true,
        }
    );

    tempPaths.push(directoryPath);

    return directoryPath;
}

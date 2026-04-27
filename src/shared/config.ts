import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { load } from "js-toml";

export interface AppConfig {
    fontFamily: string[];
    fontSize: number;
    monospaceFontFamily: string[];
    monospaceFontSize: number;
    theme: AppTheme;
    height: number;
    width: number;
}

export type AppTheme = "auto" | "dark" | "light";
export type ElectronThemeSource = "dark" | "light" | "system";

export const DEFAULT_APP_CONFIG: AppConfig = {
    fontFamily: [
        "Apple SD Gothic Neo",
        "Avenir Next",
        "Segoe UI",
        "sans-serif",
    ],
    fontSize: 16,
    height: 1560,
    monospaceFontFamily: ["SFMono-Regular", "JetBrains Mono", "monospace"],
    monospaceFontSize: 16,
    theme: "auto",
    width: 1560,
};

export function resolveConfigFilePath(homeDirectory = os.homedir()) {
    return path.join(
        homeDirectory,
        ".config",
        "markdown-preview",
        "config.toml"
    );
}

export async function loadAppConfig(
    configFilePath = resolveConfigFilePath()
): Promise<AppConfig> {
    try {
        const configSource = await readFile(configFilePath, "utf8");

        return parseAppConfig(configSource);
    } catch (error) {
        if (isMissingFileError(error)) {
            await writeDefaultConfig(configFilePath);
            return DEFAULT_APP_CONFIG;
        }

        console.warn(
            `Failed to load config at ${configFilePath}. Falling back to defaults.`
        );

        return DEFAULT_APP_CONFIG;
    }
}

function parseAppConfig(configSource: string): AppConfig {
    const parsedConfig = load(configSource);

    if (!isRecord(parsedConfig)) {
        return DEFAULT_APP_CONFIG;
    }

    return {
        fontFamily: readFontFamilyStack(
            parsedConfig["font-family"],
            DEFAULT_APP_CONFIG.fontFamily
        ),
        fontSize: readPositiveNumber(parsedConfig["font-size"], "fontSize"),
        monospaceFontFamily: readFontFamilyStack(
            parsedConfig["monospace-font-family"],
            DEFAULT_APP_CONFIG.monospaceFontFamily
        ),
        monospaceFontSize: readPositiveNumber(
            parsedConfig["monospace-font-size"],
            "monospaceFontSize"
        ),
        theme: readTheme(parsedConfig.theme),
        height: readPositiveInteger(parsedConfig.height, "height"),
        width: readPositiveInteger(parsedConfig.width, "width"),
    };
}

export function toCssFontFamilyValue(fontFamily: string[]) {
    return fontFamily.map(formatFontFamilyName).join(", ");
}

export function serializeAppConfig(appConfig: AppConfig) {
    return [
        `font-family = ${toTomlStringArray(appConfig.fontFamily)}`,
        `font-size = ${appConfig.fontSize}`,
        `monospace-font-family = ${toTomlStringArray(
            appConfig.monospaceFontFamily
        )}`,
        `monospace-font-size = ${appConfig.monospaceFontSize}`,
        `theme = ${toTomlString(appConfig.theme)}`,
        `width = ${appConfig.width}`,
        `height = ${appConfig.height}`,
        "",
    ].join("\n");
}

export function toElectronThemeSource(appTheme: AppTheme): ElectronThemeSource {
    return appTheme === "auto" ? "system" : appTheme;
}

function readFontFamilyStack(value: unknown, fallback: string[]) {
    if (typeof value !== "string") {
        if (!Array.isArray(value) || value.length === 0) {
            return fallback;
        }

        const normalizedValues = value
            .map((familyName) =>
                typeof familyName === "string" ? familyName.trim() : null
            )
            .filter((familyName): familyName is string => familyName !== null);

        if (
            normalizedValues.length !== value.length ||
            normalizedValues.some((familyName) => familyName.length === 0)
        ) {
            return fallback;
        }

        return normalizedValues;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? [trimmedValue] : fallback;
}

function readPositiveInteger(value: unknown, key: "height" | "width") {
    return Number.isInteger(value) && value > 0
        ? value
        : DEFAULT_APP_CONFIG[key];
}

function readPositiveNumber(
    value: unknown,
    key: "fontSize" | "monospaceFontSize"
) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : DEFAULT_APP_CONFIG[key];
}

function readTheme(value: unknown) {
    return typeof value === "string" && isAppTheme(value)
        ? value
        : DEFAULT_APP_CONFIG.theme;
}

export function isAppTheme(value: string): value is AppTheme {
    return APP_THEMES.has(value as AppTheme);
}

function formatFontFamilyName(fontFamilyName: string) {
    return GENERIC_FONT_FAMILIES.has(fontFamilyName)
        ? fontFamilyName
        : `"${fontFamilyName.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

async function writeDefaultConfig(configFilePath: string) {
    try {
        await mkdir(path.dirname(configFilePath), { recursive: true });
        await writeFile(
            configFilePath,
            serializeAppConfig(DEFAULT_APP_CONFIG),
            {
                flag: "wx",
            }
        );
    } catch (error) {
        if (isAlreadyExistsError(error)) {
            return;
        }

        console.warn(
            `Failed to write default config at ${configFilePath}. Continuing with in-memory defaults.`
        );
    }
}

function toTomlStringArray(values: string[]) {
    return `[${values.map((value) => toTomlString(value)).join(", ")}]`;
}

function toTomlString(value: string) {
    return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isMissingFileError(
    error: unknown
): error is NodeJS.ErrnoException & { code: "ENOENT" } {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isAlreadyExistsError(
    error: unknown
): error is NodeJS.ErrnoException & { code: "EEXIST" } {
    return error instanceof Error && "code" in error && error.code === "EEXIST";
}

const GENERIC_FONT_FAMILIES = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
    "math",
    "emoji",
    "fangsong",
]);

const APP_THEMES = new Set<AppTheme>(["auto", "dark", "light"]);

import { type AppConfig, type AppTheme, isAppTheme } from "./config";

const THEME_FLAG = "--theme";
const THEME_FLAG_PREFIX = `${THEME_FLAG}=`;
const EXPECTED_THEME_MESSAGE = "Expected auto, dark, or light.";

export interface ThemeOverrideOptions {
    remainingArgs: string[];
    themeOverride: AppTheme | null;
}

export function parseThemeOverrideOption(args: string[]): ThemeOverrideOptions {
    const remainingArgs: string[] = [];
    let themeOverride: AppTheme | null = null;

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];

        if (arg === THEME_FLAG) {
            const value = args[index + 1];

            if (!value || value.startsWith("--")) {
                throw new Error(
                    `Missing value for --theme. ${EXPECTED_THEME_MESSAGE}`
                );
            }

            themeOverride = parseThemeOverrideValue(value);
            index += 1;
            continue;
        }

        if (arg.startsWith(THEME_FLAG_PREFIX)) {
            themeOverride = parseThemeOverrideValue(
                arg.slice(THEME_FLAG_PREFIX.length)
            );
            continue;
        }

        remainingArgs.push(arg);
    }

    return { remainingArgs, themeOverride };
}

export function applyThemeOverride(
    appConfig: AppConfig,
    themeOverride: AppTheme | null
): AppConfig {
    if (!themeOverride) {
        return appConfig;
    }

    return {
        ...appConfig,
        theme: themeOverride,
    };
}

function parseThemeOverrideValue(value: string): AppTheme {
    if (isAppTheme(value)) {
        return value;
    }

    throw new Error(`Unsupported theme "${value}". ${EXPECTED_THEME_MESSAGE}`);
}

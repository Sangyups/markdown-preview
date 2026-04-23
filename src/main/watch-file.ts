import { watchFile as startWatchFile, unwatchFile } from "node:fs";

export function watchFile(
    filePath: string,
    onChange: () => void | Promise<void>,
    debounceMs = 120
) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const interval = Math.max(25, Math.floor(debounceMs / 2));

    const listener = (currentStats: Bun.Stats, previousStats: Bun.Stats) => {
        if (didFileStayTheSame(currentStats, previousStats)) {
            return;
        }

        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => {
            void onChange();
        }, debounceMs);
    };

    startWatchFile(filePath, { interval }, listener);

    return () => {
        if (timer) {
            clearTimeout(timer);
        }

        unwatchFile(filePath, listener);
    };
}

function didFileStayTheSame(currentStats: Bun.Stats, previousStats: Bun.Stats) {
    return (
        currentStats.mtimeMs === previousStats.mtimeMs &&
        currentStats.size === previousStats.size &&
        currentStats.nlink === previousStats.nlink
    );
}

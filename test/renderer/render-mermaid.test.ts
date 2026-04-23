import { describe, expect, test } from "bun:test";

import { normalizeMermaidSvg } from "../../src/renderer/render-mermaid";

describe("normalizeMermaidSvg", () => {
    test("preserves Mermaid sizing and only normalizes height", () => {
        const style = {
            width: "100%",
            maxWidth: "480px",
            height: "320px",
        };
        const svgElement = {
            removeAttributeCalls: [] as string[],
            style,
            removeAttribute(attribute: string) {
                this.removeAttributeCalls.push(attribute);
            },
        };
        const diagramContainer = {
            querySelector(selector: string) {
                if (selector === "svg") {
                    return svgElement;
                }

                return null;
            },
        } as unknown as HTMLElement;

        normalizeMermaidSvg(diagramContainer);

        expect(svgElement.removeAttributeCalls).toEqual([]);
        expect(style.width).toBe("100%");
        expect(style.maxWidth).toBe("480px");
        expect(style.height).toBe("auto");
    });
});

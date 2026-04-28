import { describe, expect, it } from "bun:test";
import { formatHelpText, shouldShowHelp } from "../../src/cli/help";

describe("Help flag detection", () => {
    it("detects --help flag", () => {
        expect(shouldShowHelp(["--help"])).toBe(true);
    });

    it("detects -h flag", () => {
        expect(shouldShowHelp(["-h"])).toBe(true);
    });

    it("detects --help in any position", () => {
        expect(shouldShowHelp(["file.md", "--help"])).toBe(true);
        expect(shouldShowHelp(["--help", "file.md"])).toBe(true);
    });

    it("returns false when help flag is not present", () => {
        expect(shouldShowHelp(["file.md"])).toBe(false);
        expect(shouldShowHelp(["--theme=dark"])).toBe(false);
        expect(shouldShowHelp([])).toBe(false);
    });

    it("distinguishes --help from similar flags", () => {
        expect(shouldShowHelp(["--helpful"])).toBe(false);
        expect(shouldShowHelp(["--help-me"])).toBe(false);
        expect(shouldShowHelp(["help"])).toBe(false);
    });
});

describe("Help text formatting", () => {
    it("includes product name in help text", () => {
        const help = formatHelpText();
        expect(help).toContain("markdown-preview");
    });

    it("includes usage section", () => {
        const help = formatHelpText();
        expect(help).toContain("Usage:");
    });

    it("documents help and theme flags", () => {
        const help = formatHelpText();
        expect(help).toContain("--help");
        expect(help).toContain("--theme");
    });

    it("produces non-empty help text", () => {
        const help = formatHelpText();
        expect(help.length).toBeGreaterThan(0);
    });
});

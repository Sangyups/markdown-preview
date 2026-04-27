# Markdown Preview

A focused desktop previewer for people who write Markdown from the terminal.

Open a file, keep editing in your favorite editor, and let `markdown-preview`
hold a clean, live-updating reading window next to it. It renders standard
Markdown, supports Mermaid diagrams out of the box, and keeps the workflow
small: choose a file, preview it, save, repeat.

```bash
mdp ~/notes/architecture.md
```

## Why It Exists

Most Markdown preview flows are either tied to an editor pane or hidden behind a
browser tab. `markdown-preview` gives local Markdown its own desktop window, so
long notes, specs, runbooks, and diagram-heavy docs can stay readable while the
source file remains wherever you want to edit it.

## Highlights

- **Terminal-first launch** - open a file directly, scan the current directory,
  or pass a directory and pick from matching Markdown files with `fzf`.
- **Dedicated preview window** - Electron provides a standalone desktop surface
  instead of another editor split.
- **Live reload on save** - the preview updates when the target file changes.
- **Mermaid included** - fenced `mermaid` blocks render as diagrams without a
  separate browser setup.
- **Readable defaults, local preferences** - configure theme, font stacks, font
  sizes, and window dimensions in a small TOML file.
- **Conservative renderer boundary** - the renderer gets a limited API surface,
  external links open outside the preview, and unsupported raw HTML is escaped.

## Quick Start

### Requirements

- `mise`
- `bun` - pinned by `mise.toml`
- `fzf` - required when selecting a file from a directory

### Install

```bash
mise install
bun install
bun run build
```

Link the CLI if you want to run `mdp` from any directory:

```bash
bun link
```

If `mdp` is not found after linking, add Bun's global bin directory to your
shell path:

```sh
# ~/.zshrc
export PATH="$HOME/.bun/bin:$PATH"
```

```bash
source ~/.zshrc
command -v mdp
```

## Usage

Open a specific file:

```bash
mdp ~/notes/demo.md
```

Scan a directory, then pick a Markdown file with `fzf`:

```bash
mdp ~/notes
```

Scan the current directory:

```bash
mdp
```

Override the configured theme for one run:

```bash
mdp --theme=dark ~/notes/demo.md
```

During development, run the same flow through the source entrypoint:

```bash
bun run dev -- README.md
bun run dev -- docs
```

When a directory is scanned, `.git`, `node_modules`, and hidden directories are
excluded by default.

## Configuration

User preferences live at:

```text
~/.config/markdown-preview/config.toml
```

The file is created automatically on first run if it does not already exist.

```toml
font-family = ["Apple SD Gothic Neo", "Avenir Next", "Segoe UI", "sans-serif"]
font-size = 16
monospace-font-family = ["SFMono-Regular", "JetBrains Mono", "monospace"]
monospace-font-size = 16
theme = "auto"
width = 1560
height = 1560
```

`theme` accepts `auto`, `light`, or `dark`. `auto` follows the operating system
theme. Invalid or missing values fall back to the built-in defaults. Passing
`--theme=auto`, `--theme=light`, or `--theme=dark` on the CLI overrides the
configured theme for that launch only.

## What It Renders

- Common Markdown syntax through `markdown-it`
- Tables with horizontal scrolling
- Footnotes through standard `[^1]` and `^[inline]` syntax
- `mermaid` fenced code blocks
- A small raw HTML allowlist for practical Markdown authoring, including
  `br`, `img`, `kbd`, `sub`, `sup`, `summary`, and `details`

Unsupported raw HTML is escaped so the document remains readable instead of
breaking the preview.

## Development

```bash
bun test
bun run check
bun run build
```

Build output is written to `dist/`. The CLI wrapper in `bin/markdown-preview.js`
expects that built entrypoint to exist.

## Current Scope

`markdown-preview` is intentionally preview-only. It does not edit files, manage
tabs, restore sessions, or emulate the full VS Code extension environment.

Planned extension points include relative image/link handling, file glob options,
and richer window reuse behavior.

## Remove The Local CLI Link

```bash
bun unlink
```

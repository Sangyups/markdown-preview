export function shouldShowHelp(args: string[]): boolean {
    return args.includes("-h") || args.includes("--help");
}

export function shouldShowVersion(args: string[]): boolean {
    return args.includes("-v") || args.includes("--version");
}

export function formatHelpText(): string {
    return `markdown-preview - Terminal-first Markdown previewer

Usage:
  mdp [OPTIONS] [PATH]
  cat FILE | mdp

Arguments:
  PATH                  Path to a Markdown file or directory
                        If omitted, previews the current directory
                        If a directory, opens fzf to select a file

Options:
  -h, --help           Show this help message and exit
  -v, --version        Show version and exit
  --theme=THEME        Override the configured theme (auto, light, dark)
  --include-hidden     Include hidden directories (those starting with ".")
                       when scanning a directory; overrides include-hidden
                       in config.toml
  --no-hidden          Skip hidden directories regardless of the
                       include-hidden config value

Examples:
  mdp ~/notes/demo.md         Open a specific file
  mdp ~/notes                 Browse and select from ~/notes
  mdp                         Browse and select from current directory
  cat README.md | mdp             Preview from stdin
  mdp --theme=dark README.md      Override theme for one session
  mdp --include-hidden ~/notes    Include hidden directories while scanning
  mdp --no-hidden ~/notes         Force-skip hidden directories

For more information and configuration, see:
  https://github.com/Sangyups/markdown-preview
`;
}

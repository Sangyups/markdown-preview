# Markdown Preview

터미널에서 Markdown을 작성하는 사람을 위한 데스크톱 미리보기 도구입니다.

파일을 열어두고 원하는 편집기에서 계속 작업하면, `markdown-preview`가 깔끔하게
실시간으로 갱신되는 읽기 창을 옆에 띄워줍니다. 표준 Markdown을 렌더링하고,
Mermaid 다이어그램을 기본으로 지원하며, 워크플로는 간결합니다. 파일을 고르고,
미리 보고, 저장하고, 반복하면 됩니다.

```bash
mdp ~/notes/architecture.md
```

## 만든 이유

대부분의 Markdown 미리보기 방식은 편집기 패널에 묶여 있거나 브라우저 탭 뒤에
숨겨져 있습니다. `markdown-preview`는 로컬 Markdown 파일에 전용 데스크톱 창을
제공하므로, 긴 노트, 스펙 문서, 런북, 다이어그램이 많은 문서를 소스 파일이 있는
곳과 상관없이 편리하게 읽을 수 있습니다.

## 주요 기능

- **터미널 우선 실행** - 파일을 직접 열거나, 현재 디렉터리를 탐색하거나, 디렉터리를
  지정해 `fzf`로 Markdown 파일을 선택할 수 있습니다.
- **전용 미리보기 창** - Electron이 편집기 분할 화면 대신 독립적인 데스크톱 창을
  제공합니다.
- **저장 시 즉시 갱신** - 대상 파일이 변경되면 미리보기가 자동으로 업데이트됩니다.
- **Mermaid 기본 내장** - 별도의 브라우저 설정 없이 `` ` `` `mermaid` `` ` `` 코드 블록이 다이어그램으로 렌더링됩니다.
- **읽기 좋은 기본값, 개인 설정 지원** - 작은 TOML 파일 하나로 테마, 폰트, 폰트
  크기, 창 크기를 설정할 수 있습니다.
- **안전한 렌더러 경계** - 렌더러에는 제한된 API만 노출되고, 외부 링크는 미리보기
  밖에서 열리며, 지원하지 않는 원시 HTML은 이스케이프 처리됩니다.

## 빠른 시작

### 요구 사항

- 공유 패키지를 설치할 경우: Bun 1.3.1 이상, 또는 Node.js 20 이상과 npm 9 이상
- 소스에서 빌드할 경우: `mise`와 `mise.toml`에 명시된 Bun 버전
- `fzf` - 디렉터리에서 파일을 선택할 때만 필요

### 공유 패키지로 설치

`markdown-preview-*.tgz` 패키지 파일을 받았다면 Bun으로 전역 설치하세요.
Bun의 전역 설치는 tarball의 절대 경로가 필요하므로, 파일이 있는 디렉터리에서
명령어를 실행하세요:

```bash
bun install -g "$PWD/markdown-preview-0.1.0.tgz"
command -v mdp
```

같은 tarball을 npm으로도 설치할 수 있습니다:

```bash
npm install -g ./markdown-preview-0.1.0.tgz
command -v mdp
```

설치 후 Markdown 파일을 열어보세요:

```bash
mdp ~/notes/architecture.md
```

새 버전으로 업데이트하려면, 새 `.tgz` 파일로 같은 설치 명령어를 다시 실행하면
됩니다.

### 공유 패키지 만들기

개발 및 패키징은 Bun을 사용하세요:

```bash
mise install
bun install
bun pm pack
```

`bun pm pack`은 패키지의 `prepare` 스크립트를 실행하고, `dist/`를 빌드한 뒤,
프로젝트 디렉터리에 npm 호환 `markdown-preview-<version>.tgz` 파일을 생성합니다.
이 tarball을 팀원에게 공유하면, Bun이나 npm으로 설치할 수 있습니다.

### 소스에서 설치

소스 개발은 Bun 전용입니다. 어느 디렉터리에서든 `mdp`를 실행하려면 CLI를
링크하세요:

```bash
bun link
```

링크 후 `mdp`를 찾을 수 없다면, Bun의 전역 bin 디렉터리를 셸 경로에 추가하세요:

```sh
# ~/.zshrc
export PATH="$HOME/.bun/bin:$PATH"
```

```bash
source ~/.zshrc
command -v mdp
```

## 사용법

특정 파일 열기:

```bash
mdp ~/notes/demo.md
```

표준 입력에서 Markdown 미리보기:

```bash
cat README.md | mdp
```

디렉터리를 탐색하고 `fzf`로 Markdown 파일 선택:

```bash
mdp ~/notes
```

현재 디렉터리 탐색:

```bash
mdp
```

한 번 실행 시 설정된 테마 덮어쓰기:

```bash
mdp --theme=dark ~/notes/demo.md
```

개발 중에는 소스 엔트리포인트로 동일한 흐름을 실행할 수 있습니다:

```bash
bun run dev -- README.md
bun run dev -- docs
```

디렉터리 탐색 시 `.git`, `node_modules`, 숨김 디렉터리는 기본적으로 제외됩니다.

## 설정

사용자 설정 파일의 위치:

```text
~/.config/markdown-preview/config.toml
```

처음 실행 시 파일이 없으면 자동으로 생성됩니다.

```toml
font-family = ["Apple SD Gothic Neo", "Avenir Next", "Segoe UI", "sans-serif"]
font-size = 16
monospace-font-family = ["SFMono-Regular", "JetBrains Mono", "monospace"]
monospace-font-size = 16
theme = "auto"
width = 1560
height = 1560
```

`theme`은 `auto`, `light`, `dark`를 지원합니다. `auto`는 운영체제 테마를
따릅니다. 잘못되거나 누락된 값은 기본값으로 대체됩니다. CLI에서
`--theme=auto`, `--theme=light`, `--theme=dark`를 전달하면 해당 실행에 한해서만
설정된 테마를 덮어씁니다.

## 렌더링 지원 항목

- `markdown-it`을 통한 일반 Markdown 문법
- 가로 스크롤이 지원되는 표
- `[^1]` 및 `^[인라인]` 문법을 통한 각주
- `mermaid` 펜스드 코드 블록
- 실용적인 Markdown 작성을 위한 원시 HTML 허용 목록 (일반적인 인라인 서식,
  접기/펼치기 블록, 단순 레이아웃 태그, 표 구조 포함)

지원하지 않는 원시 HTML은 이스케이프 처리되어, 미리보기가 깨지는 대신 문서를
읽을 수 있는 상태로 유지됩니다.

## 개발

```bash
bun test
bun run check
bun run build
```

빌드 결과물은 `dist/`에 생성됩니다. `bin/markdown-preview.js`의 CLI 래퍼는
해당 빌드 엔트리포인트가 존재해야 동작합니다.

## 현재 범위

`markdown-preview`는 의도적으로 미리보기 전용입니다. 파일 편집, 탭 관리, 세션
복원, VS Code 확장 환경 에뮬레이션은 지원하지 않습니다.

추후 확장 예정인 기능으로는 상대 경로 이미지/링크 처리, 파일 글로브 옵션, 더
풍부한 창 재사용 동작이 있습니다.

## 로컬 CLI 링크 제거

```bash
bun unlink
```

## 릴리즈 및 패키징

### 로컬 릴리즈

```bash
# 버전 업데이트 (유일한 기준)
vi package.json
"version": "1.0.2"

# 릴리즈 패키징
bun run pack

# Git 푸시 (CI/CD 자동 실행)
git add package.json
git commit -m "Release 1.0.2"
git push
```

### 자동 릴리즈 (CI/CD)

`package.json`이 `main`에 푸시되면 GitHub Actions가 자동으로:
1. 검사 및 테스트 실행
2. 릴리즈 패키징
3. `v{version}` 태그로 GitHub Release 생성
4. `.tgz` 아티팩트 업로드

필요한 경우 GitHub Actions UI의 `workflow_dispatch`를 통해 수동 실행도
가능합니다.

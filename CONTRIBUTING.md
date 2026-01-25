# Contributing to Headless Hunter

So, you want to help us hunt? Welcome.

We are building a cynical, autonomous agent to cut through the noise of modern recruiting. If you share our disdain for "Ghost Jobs" and inefficient aggregators, you're in the right place.

## The Tech Stack

We use a specific, bleeding-edge stack. Please stick to it.

- **Runtime**: [Bun](https://bun.sh) (Speed is feature #1).
- **Environment**: [Nix](https://nixos.org) (Reproducibility is feature #2).
- **Language**: TypeScript (Strict mode).
- **AI**: LangChain + Ollama (Local-first privacy).

## Getting Started

1.  **Fork & Clone**:

    ```bash
    git clone https://github.com/YOUR_USERNAME/headless-hunter.git
    cd headless-hunter
    ```

2.  **Environment**:
    We use Nix flakes. Enter the dev shell:

    ```bash
    nix develop
    ```

    _No Nix? You can try using just Bun, but we don't guarantee it works._

3.  **Install Deps**:
    ```bash
    bun install
    ```

## Development Workflow

1.  **Branching**:
    Create a feature branch.

    ```bash
    git checkout -b feature/my-cynical-feature
    ```

2.  **Coding Standards**:
    - **Linting**: We are strict. Run `bun run lint` before committing.
    - **Formatting**: `bun run format`.
    - **Tests**: If you break it, you buy it. Run `bun test` to ensure regressions are zero.

3.  **Commit Messages**:
    Use [Conventional Commits](https://www.conventionalcommits.org/).
    - `feat: add glassdoor scraper`
    - `fix: handle null salary ranges`
    - `docs: update readme`

## Legal (The Boring Part)

By contributing to **Headless Hunter**, you agree that:

1.  Your code becomes part of the project under the **GNU AGPLv3** license.
2.  You have the right to contribute this code (it's yours, not your employer's).
3.  The project owner (Alexandr Timchenko) retains the right to re-license the project for commercial use (Dual Licensing model), while your contribution remains AGPLv3 in the open-source version.

## What We Need

- **Scrapers**: More sources (Indeed, StackOverflow Jobs, remote-only boards).
- **Analysis**: Better prompts for "Cynical Analysis" of job descriptions.
- **Stealth**: Improvements to `puppeteer-extra-plugin-stealth` configs to avoid detection.

Happy Hunting.

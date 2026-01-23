# Headless Hunter

Stop hunting. Start matching.

[![CI](https://github.com/tmythicator/headless-hunter/actions/workflows/ci.yml/badge.svg)](https://github.com/tmythicator/headless-hunter/actions/workflows/ci.yml)
![Nix](https://img.shields.io/badge/Built_with-Nix-5277C3.svg?logo=nixos&logoColor=white)

**Headless Hunter** is a terminal-first, autonomous agent that cuts through the noise of modern job boards. It doesn't just search; it **scouts, scrapes, and analyzes** with a cynical eye to find only the roles that actually fit your profile.

## Demo

https://github.com/user-attachments/assets/59ae443a-76a5-42eb-92dc-3794791c35ff

## Why?

1.  **Aggregator Hell**: Skip the "Ghost Jobs" and sponsored clutter of job boards.
2.  **Deep Intelligence**: Scrapes past the "Show More" buttons to analyze the full job description.
3.  **Privacy First**: Run the entire reasoning engine locally with Ollama. No data leaks.
4.  **Cynical Analysis**: The agent is trained to be skeptical, filtering out roles that don't match your technical depth.

## Quick Start

1. **Env**: `nix develop`
2. **Config**: Copy `.env-example` to `.env` and add API keys.
3. **Input**: Drop your `resume.md` (or `.pdf` / `.txt`) in the root.
4. **Run**: `bun run src/index.tsx`

## Workflow & Architecture

```text
[Resume + User Prompt] -> (Profiler) -> (Scout) -> (Analyst) -> (Reporter) -> [Report]
```

- **Profiler**: Extracts search criteria (JSON) from resume.
- **Scout**: Finds targets via Tavily (Prod) or DuckDuckGo (Test).
- **Analyst**: Deeply scrapes job pages (Puppeteer).
- **Reporter**: Synthesizes final cynical report.
- **Recovery**: Repairs malformed LLM outputs, if needed.

## Configuration (.env)

| Var                   | Description                                         |
| --------------------- | --------------------------------------------------- |
| `LLM_PROVIDER`        | Default provider (`local` or `google`).             |
| `LLM_PROVIDER_{ROLE}` | Override specific node (e.g. `LLM_PROVIDER_SCOUT`). |
| `GOOGLE_API_KEY`      | Required for Google provider.                       |
| `TAVILY_API_KEY`      | Required for Production Search.                     |

## Dev & Test

- **Lint/Format**: `bun run lint` / `bun run format`
- **Test**: `bun test` (Switches to Free Mode: DDG + Local Scraper).

## License

MIT

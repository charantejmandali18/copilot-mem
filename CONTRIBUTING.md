# Contributing to Copilot-Mem

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/charantejmandali18/copilot-mem.git
cd copilot-mem
npm install
npm run build
npm test
```

## Project Structure

This is a Turborepo monorepo with 3 packages:

- `packages/core/` — Storage, search, and configuration
- `packages/mcp-server/` — MCP tools and HTTP API
- `packages/vscode/` — VS Code extension

## Making Changes

1. Fork the repo and create a feature branch
2. Make your changes
3. Run `npm run format` to format code
4. Run `npm test` to ensure all tests pass
5. Run `npm run build` to verify the build
6. Commit with a descriptive message
7. Open a Pull Request

## Code Style

- TypeScript with strict mode
- Prettier formatting (see `.prettierrc`)
- No `console.log` in mcp-server package (use the file-based Logger)

## Testing

Tests use [Vitest](https://vitest.dev/). Run with:

```bash
npm test                                    # all packages
npx turbo run test --filter=@copilot-mem/core   # core only
npx turbo run test --filter=@copilot-mem/mcp-server  # server only
```

## Reporting Bugs

Use the [bug report template](https://github.com/charantejmandali18/copilot-mem/issues/new?template=bug_report.md).

## Feature Requests

Use the [feature request template](https://github.com/charantejmandali18/copilot-mem/issues/new?template=feature_request.md).

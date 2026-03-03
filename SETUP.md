# AI Job Fit Analyzer

Angular 18 application that analyzes job descriptions and CVs using LLMs (Gemini, OpenAI, Anthropic).  This repository is intended for development, testing, and deployment of the solution.

## Getting Started

1. Install dependencies using Yarn.  All packages are pinned to exact versions for reproducibility; do not upgrade them unless you intend to update the lockfile.
   ```bash
   yarn install --frozen-lockfile
   ```
2. **Run the development server**:
   ```bash
   yarn start
   ```
   - Defaults to `localhost:4200`.
   - If you encounter an error like `mixin.stripAnsi is not a function`, ensure the `resolutions` block in `package.json` is applied and run `yarn install`.
3. **Run unit tests**:
   ```bash
   yarn test
   yarn test:watch
   ```
   Tests use Jest with the `jest-preset-angular` configuration.
4. **Lint and type-check**:
   ```bash
   yarn lint
   ```

## Project Structure
- `src/app/components` – standalone UI components and templates.
- `src/app/services` – business logic, parsers, AI providers, state persistence.
- `src/app/models` – TypeScript interfaces for analysis results and inputs.
- `docs/` – design docs, agent specs, architecture plans.
- `tools/proxy` – simple Express proxy for handling API keys securely.

## Development Best Practices

- Use Git for version control; branch from `main` for features/bugs.
- Commit frequently with clear messages; use `git rebase` to keep history clean.
- A CI workflow (`.github/workflows/ci.yml`) runs on each push/PR to lint, test, and build.
- Add ESLint/Prettier for consistent formatting (configs are included).
- Avoid committing secrets; store API keys in environment variables or use the proxy.
- When adding new features, update or add tests and documentation.

## Building & Deployment

- `yarn build` produces a production bundle in `dist/`.
- Deploy static files to any host (e.g. Azure Static Web Apps, GitHub Pages).

For more details, see the documentation in `docs/` such as `architecture-plan.md` and agent specifications.

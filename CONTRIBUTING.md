# CONTRIBUTING

## Workflow

1. **Create a branch** for your work from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Commit regularly** with descriptive messages:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve issue #123"
   git commit -m "test: add unit tests for feature"
   ```

3. **Run tests and lint** before committing:
   ```bash
   yarn lint
   yarn test
   ```

4. **Push your branch** and create a pull request:
   ```bash
   git push origin feature/my-feature
   ```
   The GitHub Actions CI will run lint, test, and build automatically.

5. **Address feedback** and rebase if needed:
   ```bash
   git rebase -i main
   ```

## Code Style

- ESLint and Prettier are configured. Run before committing:
  ```bash
  yarn lint --fix
  ```
- Follow the Angular style guide for components, services, and module organization.
- Write clear JSDoc comments for public APIs.

## Adding Tests

- Add `*.spec.ts` files alongside the component/service being tested.
- Tests should cover happy paths, edge cases, and error scenarios.
- Run `yarn test:watch` during development.

## Documentation

- Update `docs/` when adding features or significant changes.
- Update the README if adding new scripts or setup steps.

## Commit Message Conventions

Use conventional commits for clarity:
- `feat:` – new feature
- `fix:` – bug fix
- `test:` – test additions/changes
- `docs:` – documentation
- `refactor:` – code refactoring without feature changes
- `chore:` – tooling, dependencies, etc.

Example:
```
feat(analysis): add new AI provider integration

- Integrate provider XYZ
- Update AnalysisServiceProvider factory
- Add unit tests
```

Thank you for contributing!

# Agent Testing & Runbook

This document outlines how to verify and validate the AI "analysis orchestrator" agent and associated services.

## Manual Tests

## Automated Unit Tests
- A basic spec for `PdfParserService` exists, mocking `pdfjsLib`. Run with `ng test` (see README).

### Example test case
```ts
it('builds master prompt properly', () => {
  const svc = TestBed.inject(OpenAiAnalyzerService);
  const data = { 'CANDIDATE CV': 'foo' };
  const prompt = svc['_buildMasterPrompt'](data, CV_ANALYSIS_SCHEMA);
  expect(prompt.systemPrompt).toContain('You are a world-class HR analyst');
});
```

## Regression Checks
- Ensure schemas in `ai-schemas.ts` are synced with spec templates above.
- After any update to `AnalysisResult` types, regenerate or manually verify specs.

## CI Integration
- Add `ng test --watch=false` in CI pipeline.
- Optionally run Cypress/Playwright for end-to-end testing of upload/analysis flows.

## Maintaining the Agent
- When modifying schemas or prompting rules, update both the TypeScript constant and the markdown spec.
- Review the `docs/agents/analysis-orchestrator.md` during each release.

## Troubleshooting
- If `ng serve` fails with port conflict, kill existing Angular process or change port via `--port`.
- If PDF parsing fails, ensure `pdfjs-dist` version matches and no 404 occurs for `pdf.worker.min.js` (use network tab).


---


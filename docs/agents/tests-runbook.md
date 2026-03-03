# Agent Testing & Runbook

This document outlines how to verify and validate the AI "analysis orchestrator" agent and associated services.

## Manual Tests
1. **Start proxy backend** (in separate terminal):
   ```bash
   cd tools/proxy
   cp .env.example .env
   # fill OPENAI_API_KEY or ANTHROPIC_API_KEY
   yarn install
   yarn start
   ```
2. **Start frontend**:
   ```bash
   cd ..  # project root
   yarn start
   ```
3. **Open app** at http://localhost:4200 and enter a short job description and CV text.
   - Use a simple PDF (e.g., one-page resume) and a .docx file to test parsing.
   - Highlight skills and click Analyze.
   - Observe that the UI shows results without console errors.
4. **Check browser console** for network requests to `/api/openai` or `/api/anthropic`.
   - Confirm 200 responses containing valid JSON.
5. **Check proxy logs** for received requests and any errors.

## Automated Unit Tests
- A basic spec for `PdfParserService` exists, mocking `pdfjsLib`. Run with `ng test` (see README).
- To add tests for analyzer services, create spec files in `src/app/services/analysis/ai` that mock network calls to the proxy and assert prompt generation.

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

## Observability Tests
- Use `curl` or Postman to call proxy health endpoint:
  `curl http://localhost:4000/health` should return `{ "ok": true }`.

## Maintaining the Agent
- When modifying schemas or prompting rules, update both the TypeScript constant and the markdown spec.
- Review the `docs/agents/analysis-orchestrator.md` during each release.

## Troubleshooting
- If `ng serve` fails with port conflict, kill existing Angular process or change port via `--port`.
- If PDF parsing fails, ensure `pdfjs-dist` version matches and no 404 occurs for `pdf.worker.min.js` (use network tab).


---


# Analysis Orchestrator Agent

## Title
Analysis Orchestrator — coordinate document parsing and AI-based analysis.

## One-line Purpose
Take user inputs (CV, JD, highlighted skills), run document-specific analyzers (CV, JD, Fit), and return a combined `AnalysisResult` for the UI.

## Context / Background
The front-end uses `CacheableAnalysisService` which orchestrates `analyzeCv`, `analyzeJd`, and `analyzeFit`. The provider factory (`AnalysisServiceProvider`) picks the concrete worker (OpenAI, Anthropic, Gemini).

## Goals / Success Criteria
- Produce a valid `AnalysisResult` object as defined in `src/app/models/analysis.model.ts`.
- Responses should be deterministic for identical inputs (sort arrays, fixed seeds/temperature=0).
- Handle transient provider errors with a limited retry (2 retries, exponential backoff).

## Inputs
- `cvText` (string)
- `jdText` (string)
- `highlightedSkills` (string[])
- Optional salary inputs and user-edits

## Outputs
Return an object matching `AnalysisResult` (see `src/app/models/analysis.model.ts`) containing:
- `dimensionalAnalysis`, `strengths`, `concerns`, `jobSummary`, `candidateSummary`, `overallScore`, etc.

## Tools & Interfaces
- `POST /api/openai` — server-side proxy to call OpenAI (accepts model, messages/prompt, and returns model output JSON).
- `POST /api/anthropic` — server-side proxy to call Anthropic.
- Local parsers: `PdfParserService`, `DocxParserService`, `TxtParserService`.
- Persistence (caching) via `PERSISTENCE_SERVICE`.

Example proxy payload (OpenAI):
```
POST /api/openai
{ "model": "gpt-4o", "messages": [ {"role":"system","content":"..."}, {"role":"user","content":"..."} ] }
```

## Prompting & Parameters
- Use structured prompts that request strict JSON output according to schemas defined in `src/app/services/analysis/ai/ai-schemas.ts`.
- Temperature: 0; top_p: 1; max_tokens: tuned per schema size.

## Failure Modes & Retries
- On provider network error: retry up to 2 times with 500ms -> 1500ms backoff.
- On malformed JSON: attempt a single "fixup" prompt asking model to return valid JSON; if still invalid, surface an error to UI.

## Safety & Privacy
- API keys MUST NOT be placed in frontend code. Use the proxy to store secrets in env vars.
- Redact or omit PII when logging.

## Tests / QA
- Test case 1: small CV + JD -> expect `candidateSummary` & `jobSummary` non-empty and `overallScore` between 0-100.
- Test case 2: empty CV -> agent returns structured error explaining missing CV.

## Observability
- Log request id, provider used, model, latency, and success/failure status.

## Deployment Notes
- Run proxy as a small Node service or serverless function; store keys in secret manager.
- Enforce CORS only for your frontend origin.

## Open Questions
- Which providers/models will be permitted in production?
- Budgeting/cost caps per analysis job.

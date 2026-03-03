# Agent Spec Template

## Title
Short, descriptive title.

## One-line Purpose
What this agent should accomplish in one sentence.

## Context / Background
Why this agent exists and where it fits in the system.

## Goals / Success Criteria
- Measurable outcomes (e.g., "Produce valid JSON matching schema X" or "Return within 10s").

## Inputs
- Types and examples (CV text, JD text, highlighted skills, user options).

## Outputs
- Exact JSON schema or TypeScript type expected (refer to `src/app/models/analysis.model.ts`).

## Tools & Interfaces
- Internal APIs (e.g., `POST /api/openai`, `POST /api/anthropic`, persistence endpoints)
- Local utilities (parsers, salary estimator)
- Describe function signatures and rate limits.

## Prompting / System Instructions
- System-level instructions to the LLM.
- Example user prompt(s).
- Temperature / max tokens suggestions.

## Failure Modes & Retries
- What to do on API errors, malformed responses, timeouts.
- Retry policy and backoff.

## Safety & Privacy
- Where API keys must live (server-side only).
- PII handling rules, redaction policy.

## Tests / QA
- Example inputs and expected outputs.
- Edge cases (empty CV, scanned PDF with no extractable text).

## Observability
- Important logs, metrics, and tracing points.

## Deployment Notes
- Recommended infra (serverless / small Node service), secrets management, env variables.

## Open Questions / TODOs
- Anything you want the team to decide later.

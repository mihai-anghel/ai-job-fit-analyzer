# AI Job Fit Analyzer – Architecture & Plan

## 1. Project Overview
*Short description…*  
AI Job Fit Analyzer is a small Angular 18 application that allows users to upload a job description and a CV, then runs those documents through an LLM‑based analysis pipeline. The goal is to suggest skills, salary estimates and candidate/job fit details using OpenAI, Anthropic or Google Gemini models.

*Main directories…*  
- `src/app` – core application source (components, services, models, config).
- `src/app/components` – all UI pieces (standalone components).
- `src/app/services` – business logic, parsers, persistence and AI integrations.
- `src/app/models` – TypeScript interfaces used across the app.
- `docs/agents` – design/spec documentation for AI agents.

---

## 2. Modules & Component Hierarchy
```
AppComponent
├─ InputFormComponent
│  └─ DocumentInputComponent
├─ LoadingIndicatorComponent
├─ SkillConfirmationComponent
│   ├─ JobSalaryInfoComponent
│   └─ CandidateSalaryInfoComponent
├─ AnalysisResultsComponent
│   ├─ JobSummaryComponent
│   ├─ ConcernsComponent
│   ├─ DimensionalAnalysisComponent
│   ├─ UniqueStrengthsComponent
│   ├─ StrengthsComponent
│   ├─ QuestionsForCandidateComponent
│   ├─ QuestionsToAskComponent
│   ├─ HighlightedSkillsComponent
│   └─ EvaluationSummaryComponent
└─ (utility: CollapsiblePanel, InfoList, MetricItem)
```

- Each component is standalone and uses inputs/outputs to communicate with its parent.
- Templates bind to signals and use Tailwind for styling.

## 3. Services & Data Flow
- **AppStateService** – central reactive store, persisted.
- **Parser services** for converting files to text.
- **AnalysisService** hierarchy handles provider-specific logic.
- Data flows: user → AppState → AppComponent → AnalysisService → LLM API → back to signals → UI.

![Data Flow](text-diagram)
```
[User] → form components → AppStateService (signals)
      ↘ analysisService.analyze() → provider → external LLM
      ← result, cached by CacheableAnalysisService
      → signals update UI components
```

## 4. Routing Map
_No routing; conditional rendering via `view` signal._

## 5. Dependencies & Environment Summary
- Angular 18, Tailwind, pdfjs-dist, mammoth.
- AI SDKs: `openai`, `@anthropic-ai/sdk`.
- Development: Yarn, Jest, ts‑jest, jest‑preset‑angular.

## 6. Build & Env
- `yarn start`, `yarn test`, `tsconfig.json` etc.
- Environments handled by Angular CLI; persistent state in localStorage.

## 7. Next Steps & Recommendations
- Document component contracts and service interfaces.
- Expand automated tests.
- Plan CI/CD pipeline with build, test, and (optionally) deploy steps.
- Consider adding a router if multi‑page flows are required.

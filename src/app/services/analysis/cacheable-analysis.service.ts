import { computed, Injectable, Inject, Signal } from '@angular/core';
import { AnalysisService } from './analysis.service';
import { PERSISTENCE_SERVICE, type PersistenceService } from '../persistence/persistence.service';
import { 
  AiProvider,
  AnalysisInput,
  AnalysisResult,
  CvAnalysisInput,
  CvAnalysisData,
  JdAnalysisInput,
  JdAnalysisData,
  FitAnalysisInput,
  FitAnalysisData
} from '../../models/analysis.model';
import { 
  CachedCvAnalysisData,
  CachedJdAnalysisData,
  CachedFitAnalysisData
} from './cacheable-analysis.model';
import { AppStateService } from '../state/app-state.service';
import { AnalysisServiceProvider } from './analysis-service.provider';

@Injectable({ providedIn: 'root' })
export class CacheableAnalysisService extends AnalysisService {
  private static readonly ANALYSIS_TIMEOUT_MS = 90000;


  // currently active worker service, provided by the factory.
  public readonly activeWorker: Signal<AnalysisService>;
  
  public readonly error = computed(() => this.activeWorker().error());
  public get provider(): AiProvider { return (this.serviceProvider.activeService && this.serviceProvider.activeService()) ? this.serviceProvider.activeService().provider : 'gemini'; }
  public get model() { return (this.serviceProvider.activeService && this.serviceProvider.activeService()) ? this.serviceProvider.activeService().model : null; }


  constructor(
    private serviceProvider: AnalysisServiceProvider,
    @Inject(PERSISTENCE_SERVICE) private cache: PersistenceService,
    private appState: AppStateService
  ) {
    super();
    this.activeWorker = computed(() => this.serviceProvider.activeService());
  }

  public clearError(): void { 
    this.activeWorker()?.clearError();
  }

  // --- Lifecycle methods ---
  // These are part of the contract but are managed by the provider for the underlying
  // services. This top-level service does not need to implement lifecycle logic.
  override initialize(_apiKey: string): void { }
  override configure(_model: string): void { }

  private async withTimeout<T>(operation: Promise<T>, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${label} timed out after ${CacheableAnalysisService.ANALYSIS_TIMEOUT_MS / 1000}s`));
      }, CacheableAnalysisService.ANALYSIS_TIMEOUT_MS);

      operation
        .then((value) => resolve(value))
        .catch((error) => reject(error))
        .finally(() => clearTimeout(timeoutId));
    });
  }

  private canonicalizeDocumentText(text: string): string {
    const normalized = (text ?? '').replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const dedupedConsecutive: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const previous = dedupedConsecutive[dedupedConsecutive.length - 1];
      if (previous && previous.trim().toLowerCase() === line.trim().toLowerCase()) {
        continue;
      }
      dedupedConsecutive.push(line);
    }

    return dedupedConsecutive
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private normalizeOptionalText(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private normalizeSkills(skills: string[] | undefined): string[] {
    if (!skills || skills.length === 0) return [];
    return [...new Set(skills.map(s => s.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(v => this.stableStringify(v)).join(',')}]`;
    }
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${this.stableStringify(obj[k])}`).join(',')}}`;
  }



  // --- Granular Caching Implementation (Now state-aware) ---
  
  override async analyzeCv(input: CvAnalysisInput): Promise<CvAnalysisData | null> {
    const normalizedInput: CvAnalysisInput = {
      ...input,
      cvText: this.canonicalizeDocumentText(input.cvText),
    };
    const cacheKey = `cv-analysis-${this.provider}-${this.model}-${this.stableStringify(normalizedInput)}`;
    const cached = this.cache.load<CachedCvAnalysisData>(cacheKey);
    if (cached) return cached;

    const result = await this.withTimeout(
      this.activeWorker().analyzeCv(normalizedInput),
      'CV analysis'
    );
    if (result) {
      this.cache.save(cacheKey, result);
    }
    return result;
  }
  
  override async analyzeJd(input: JdAnalysisInput): Promise<JdAnalysisData | null> {
    const normalizedInput: JdAnalysisInput = {
      ...input,
      jdText: this.canonicalizeDocumentText(input.jdText),
      fallbackLocation: this.normalizeOptionalText(input.fallbackLocation),
    };
    const cacheKey = `jd-analysis-${this.provider}-${this.model}-${this.stableStringify(normalizedInput)}`;
    const cached = this.cache.load<CachedJdAnalysisData>(cacheKey);
    if (cached) return cached;

    const result = await this.withTimeout(
      this.activeWorker().analyzeJd(normalizedInput),
      'JD analysis'
    );
    if (result) {
      this.cache.save(cacheKey, result);
    }
    return result;
  }

  override async analyzeFit(input: FitAnalysisInput): Promise<FitAnalysisData | null> {
    const normalizedInput: FitAnalysisInput = {
      ...input,
      jdText: this.canonicalizeDocumentText(input.jdText),
      cvText: this.canonicalizeDocumentText(input.cvText),
      highlightedSkills: this.normalizeSkills(input.highlightedSkills),
      expectedSalary: this.normalizeOptionalText(input.expectedSalary),
      editedJobSalary: this.normalizeOptionalText(input.editedJobSalary),
      initialEstimatedJobSalary: this.normalizeOptionalText(input.initialEstimatedJobSalary),
      initialEstimatedCandidateSalary: this.normalizeOptionalText(input.initialEstimatedCandidateSalary),
    };
    const cacheKey = `fit-analysis-${this.provider}-${this.model}-${this.stableStringify(normalizedInput)}`;
    const cached = this.cache.load<CachedFitAnalysisData>(cacheKey);
    if (cached) return cached;

    const result = await this.withTimeout(
      this.activeWorker().analyzeFit(normalizedInput),
      'Fit analysis'
    );
    if (result) {
      this.cache.save(cacheKey, result);
    }
    return result;
  }

  /**
   * Implements the orchestration logic for the full analysis.
   * It calls the cache-aware granular methods of this class.
   */
  override async analyze(input: AnalysisInput): Promise<AnalysisResult | null> {

    this.activeWorker().initialize(this.appState.currentApiKey());
    this.activeWorker().configure(this.appState.currentModel());

    let cvAnalysis: CvAnalysisData | null;
    let jdAnalysis: JdAnalysisData | null;
    let fitAnalysis: FitAnalysisData | null;

    if (this.provider === 'gemini') {
      // Gemini free-tier limits are sensitive to bursts; run sequentially.
      cvAnalysis = await this.analyzeCv(input);
      if (!cvAnalysis) return null;
      jdAnalysis = await this.analyzeJd(input);
      if (!jdAnalysis) return null;
      fitAnalysis = await this.analyzeFit(input);
    } else {
      // Parallelize to reduce total runtime for other providers.
      [cvAnalysis, jdAnalysis, fitAnalysis] = await Promise.all([
        this.analyzeCv(input),
        this.analyzeJd(input),
        this.analyzeFit(input),
      ]);
    }

    if (!cvAnalysis || !jdAnalysis || !fitAnalysis) return null;

    return {
      ...fitAnalysis,
      candidateSummary: cvAnalysis.candidateSummary,
      candidateInfo: cvAnalysis.candidateInfo,
      jobSummary: jdAnalysis.jobSummary,
      jobInfo: jdAnalysis.jobInfo,
      documentQualityAnalysis: {
        cvAnalysis: cvAnalysis.cvAnalysis,
        jdAnalysis: jdAnalysis.jdAnalysis,
      }
    };
  }
}

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


  // Proxy properties from the currently active worker service, provided by the factory.
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



  // --- Granular Caching Implementation (Now state-aware) ---
  
  override async analyzeCv(input: CvAnalysisInput): Promise<CvAnalysisData | null> {
    const normalizedCvText = this.canonicalizeDocumentText(input.cvText);
    const normalizedInput: CvAnalysisInput = { ...input, cvText: normalizedCvText };
    const cacheKey = `cv-analysis-${this.provider}-${this.model}-${normalizedCvText}`;
    const cached = this.cache.load<CachedCvAnalysisData>(cacheKey);
    if (cached) return cached;

    const result = await this.activeWorker().analyzeCv(normalizedInput);
    if (result) {
      this.cache.save(cacheKey, result);
    }
    return result;
  }
  
  override async analyzeJd(input: JdAnalysisInput): Promise<JdAnalysisData | null> {
    const normalizedJdText = this.canonicalizeDocumentText(input.jdText);
    const normalizedInput: JdAnalysisInput = { ...input, jdText: normalizedJdText };
    const cacheKey = `jd-analysis-${this.provider}-${this.model}-${normalizedJdText}`;
    const cached = this.cache.load<CachedJdAnalysisData>(cacheKey);
    if (cached) return cached;

    const result = await this.activeWorker().analyzeJd(normalizedInput);
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
    };
    const skillsKey = input.highlightedSkills?.join(',');
    const cacheKey = `fit-analysis-${this.provider}-${this.model}-${normalizedInput.jdText}-${normalizedInput.cvText}-${skillsKey}`;
    const cached = this.cache.load<CachedFitAnalysisData>(cacheKey);
    if (cached) return cached;

    const result = await this.activeWorker().analyzeFit(normalizedInput);
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

    // Parallelize the three analyses to reduce total runtime
    const [cvAnalysis, jdAnalysis, fitAnalysis] = await Promise.all([
      this.analyzeCv(input),
      this.analyzeJd(input),
      this.analyzeFit(input),
    ]);

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

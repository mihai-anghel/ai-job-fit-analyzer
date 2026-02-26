import { Signal } from '@angular/core';
import { 
  AnalysisResult,
  AnalysisInput,
  CvAnalysisInput,
  CvAnalysisData,
  JdAnalysisInput,
  JdAnalysisData,
  FitAnalysisInput,
  FitAnalysisData,
  AiProvider
} from '../../models/analysis.model';

export abstract class AnalysisService {
  abstract readonly error: Signal<string | null>;
  abstract readonly provider: AiProvider;
  abstract model: string | null;
  
  abstract clearError(): void;
  
  // Lifecycle methods
  abstract initialize(apiKey: string): void;
  abstract configure(model: string): void;

  // Granular, document-specific methods
  abstract analyzeCv(input: CvAnalysisInput): Promise<CvAnalysisData | null>;
  abstract analyzeJd(input: JdAnalysisInput): Promise<JdAnalysisData | null>;
  abstract analyzeFit(input: FitAnalysisInput): Promise<FitAnalysisData | null>;
  
  /**
   * Orchestrates the full analysis by calling the granular, document-specific methods.
   */
  abstract analyze(input: AnalysisInput): Promise<AnalysisResult | null>;
}



import { computed, effect, inject, Injectable, Signal } from '@angular/core';
import { AnalysisService } from './analysis.service';
import { GeminiAnalyzerService } from './ai/gemini-analyzer.service';
import { OpenAiAnalyzerService } from './ai/openai-analyzer.service';
import { AppStateService } from '../state/app-state.service';
import { AnthropicAnalyzerService } from './ai/anthropic-analyzer.service';

/**
 * Acts as a state-aware factory for AI analysis services.
 * It does not perform any analysis itself. Instead, it:
 * 1. Watches for changes in the application's AI configuration (provider, model, API key).
 * 2. Initializes and configures the correct underlying AI "worker" service whenever the config changes.
 * 3. Provides the currently active, fully configured worker service via a reactive signal.
 */
@Injectable({ providedIn: 'root' })
export class AnalysisServiceProvider {
  private appState = inject(AppStateService);
  private geminiService = inject(GeminiAnalyzerService);
  private openaiService = inject(OpenAiAnalyzerService);
  private anthropicService = inject(AnthropicAnalyzerService);

  // A signal that provides the currently active and configured worker service.
  public activeService: Signal<AnalysisService>;
  
  constructor() {
    this.activeService = computed<AnalysisService>(() => {
        const provider = this.appState.provider();
        switch (provider) {
            case 'openai': return this.openaiService;
            case 'anthropic': return this.anthropicService;
            case 'gemini': default: return this.geminiService;
        }
    });

    // Effect to INITIALIZE the client when the provider or API key changes.
    // This effect is more expensive as it creates a new AI client instance.
    effect(() => {
      const service = this.activeService();
      const apiKey = this.appState.currentApiKey();
      service.initialize(apiKey);
    });
    
    // A separate, more lightweight effect to CONFIGURE the model when it changes.
    effect(() => {
      const service = this.activeService();
      const model = this.appState.currentModel();
      service.configure(model);
    });
  }
}
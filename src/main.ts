import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/components/app.component';
import { AnalysisService } from './app/services/analysis/analysis.service';
import { GeminiAnalyzerService } from './app/services/analysis/ai/gemini-analyzer.service';
import { PERSISTENCE_SERVICE, PersistenceService } from './app/services/persistence/persistence.service';
import { LocalStoragePersistenceService } from './app/services/persistence/local-storage-persistence.service';
import { FILE_PARSER_SERVICE } from './app/services/parsers/file-parser.service';
import { DefaultFileParserService } from './app/services/parsers/default-file-parser.service';
import { CacheableAnalysisService } from './app/services/analysis/cacheable-analysis.service';
import { AppStateService } from './app/services/state/app-state.service';
import { AnalysisServiceProvider } from './app/services/analysis/analysis-service.provider';
import { OpenAiAnalyzerService } from './app/services/analysis/ai/openai-analyzer.service';
import { AnthropicAnalyzerService } from './app/services/analysis/ai/anthropic-analyzer.service';

console.log('Bootstrapping AI Job Fit Analyzer...');
bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    { provide: DefaultFileParserService, useClass: DefaultFileParserService },
    { provide: GeminiAnalyzerService, useClass: GeminiAnalyzerService },
    { provide: OpenAiAnalyzerService, useClass: OpenAiAnalyzerService },
    { provide: AnthropicAnalyzerService, useClass: AnthropicAnalyzerService },
    { provide: AnalysisServiceProvider, useClass: AnalysisServiceProvider },
    { provide: AppStateService, useClass: AppStateService },
    { provide: PERSISTENCE_SERVICE, useClass: LocalStoragePersistenceService },
    { provide: AnalysisService, useFactory: (analysisServiceProvider: AnalysisServiceProvider, persistenceService: PersistenceService, appState: AppStateService) => {
      return new CacheableAnalysisService(analysisServiceProvider, persistenceService, appState);
    }, deps: [AnalysisServiceProvider, PERSISTENCE_SERVICE, AppStateService] },
    { provide: FILE_PARSER_SERVICE, useClass: DefaultFileParserService },
  ],
}).catch(err => {
  console.error('BOOTSTRAP ERROR:', err);
  const errorDiv = document.createElement('div');
  errorDiv.style.padding = '20px';
  errorDiv.style.color = 'white';
  errorDiv.style.background = 'red';
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.zIndex = '9999';
  errorDiv.innerHTML = `<h1>Bootstrap Error</h1><p>The application failed to start. Please check the console for details.</p><pre style="white-space: pre-wrap;">${err.message}\n${err.stack}</pre>`;
  document.body.appendChild(errorDiv);
});

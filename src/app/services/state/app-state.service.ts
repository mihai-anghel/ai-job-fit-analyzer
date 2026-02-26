import { computed, effect, Injectable, signal, WritableSignal, Inject } from '@angular/core';
import { PERSISTENCE_SERVICE, type PersistenceService } from '../persistence/persistence.service';
import { APP_STATE_KEYS } from './app-state.keys';
import { AiProvider } from '../../models/analysis.model';
import { AVAILABLE_PROVIDERS, AVAILABLE_MODELS, DEFAULT_MODELS } from '../../config/ai-providers.config';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  // JD State
  jdText: WritableSignal<string>;
  jdFileName: WritableSignal<string>;

  // CV State
  cvText: WritableSignal<string>;
  cvFileName: WritableSignal<string>;

  // Highlighted Skills & Salary State
  highlightedSkills: WritableSignal<string[]>;
  expectedSalary: WritableSignal<string>;
  jobSalaryInfo: WritableSignal<string>;

  // API Configuration
  readonly availableProviders = signal<AiProvider[]>(AVAILABLE_PROVIDERS);
  readonly availableModels = signal<{ [key in AiProvider]: readonly string[] }>(AVAILABLE_MODELS);
  
  provider: WritableSignal<AiProvider>;
  
  models: WritableSignal<{ [key in AiProvider]: string }>;

  apiKeys: WritableSignal<{ [key in AiProvider]?: string }>;
  readonly hasEnvironmentKey = typeof process !== 'undefined' && !!process.env?.['API_KEY'];

  constructor(
    @Inject(PERSISTENCE_SERVICE) private persistenceService: PersistenceService
  ) {
    this.jdText = signal(this.persistenceService.load<string>(APP_STATE_KEYS.JD_TEXT) ?? '');
    this.jdFileName = signal(this.persistenceService.load<string>(APP_STATE_KEYS.JD_FILE_NAME) ?? '');
    this.cvText = signal(this.persistenceService.load<string>(APP_STATE_KEYS.CV_TEXT) ?? '');
    this.cvFileName = signal(this.persistenceService.load<string>(APP_STATE_KEYS.CV_FILE_NAME) ?? '');
    this.highlightedSkills = signal(this.persistenceService.load<string[]>(APP_STATE_KEYS.HIGHLIGHTED_SKILLS) ?? []);
    this.expectedSalary = signal(this.persistenceService.load<string>(APP_STATE_KEYS.EXPECTED_SALARY) ?? '');
    this.jobSalaryInfo = signal(this.persistenceService.load<string>(APP_STATE_KEYS.JOB_SALARY_INFO) ?? '');
    this.provider = signal(this.persistenceService.load<AiProvider>(APP_STATE_KEYS.PROVIDER) ?? 'gemini');
    this.models = signal(
      this.persistenceService.load<{ [key in AiProvider]: string }>(APP_STATE_KEYS.MODELS) ?? DEFAULT_MODELS
    );
    const initialApiKeys = this.persistenceService.load<{ [key in AiProvider]?: string }>(APP_STATE_KEYS.API_KEYS, { obfuscate: true }) ?? { gemini: '', openai: '', anthropic: '' };
    if (this.hasEnvironmentKey) {
      initialApiKeys.gemini = (typeof process !== 'undefined' ? (process as any).env?.['API_KEY'] : undefined);
    }
    this.apiKeys = signal(initialApiKeys);

    // --- Auto-persistence effects ---
    effect(() => this.persistenceService.save(APP_STATE_KEYS.JD_TEXT, this.jdText()));
    effect(() => this.persistenceService.save(APP_STATE_KEYS.JD_FILE_NAME, this.jdFileName()));
    effect(() => this.persistenceService.save(APP_STATE_KEYS.CV_TEXT, this.cvText()));
    effect(() => this.persistenceService.save(APP_STATE_KEYS.CV_FILE_NAME, this.cvFileName()));
    effect(() => this.persistenceService.save(APP_STATE_KEYS.HIGHLIGHTED_SKILLS, this.highlightedSkills()));
    effect(() => this.persistenceService.save(APP_STATE_KEYS.EXPECTED_SALARY, this.expectedSalary()));
    effect(() => this.persistenceService.save(APP_STATE_KEYS.JOB_SALARY_INFO, this.jobSalaryInfo()));
    effect(() => this.persistenceService.save(APP_STATE_KEYS.MODELS, this.models()));
    effect(() => this.persistenceService.save(APP_STATE_KEYS.PROVIDER, this.provider()));
    effect(() => {
      const keysToSave = { ...this.apiKeys() };
      if (this.hasEnvironmentKey) {
        // Do not persist the environment key for Gemini if it's from the environment
        delete keysToSave.gemini;
      }
      this.persistenceService.save(APP_STATE_KEYS.API_KEYS, keysToSave, { obfuscate: true });
    });
  }
  
  // Computed signals for easy consumption of the current provider's settings
  currentModel = computed(() => this.models()[this.provider()]);
  currentApiKey = computed(() => this.apiKeys()[this.provider()] ?? '');

  // State modification methods
  setJd(text: string, fileName: string = '') {
    this.jdText.set(text);
    this.jdFileName.set(fileName);
  }

  setCv(text: string, fileName: string = '') {
    this.cvText.set(text);
    this.cvFileName.set(fileName);
  }

  clearJd() {
    this.jdText.set('');
    this.jdFileName.set('');
  }

  clearCv() {
    this.cvText.set('');
    this.cvFileName.set('');
  }

  clearJobSalary() {
    this.jobSalaryInfo.set('');
  }

  clearCandidateSalary() {
    this.expectedSalary.set('');
  }

  resetForm() {
    this.jdText.set('');
    this.jdFileName.set('');
    this.cvText.set('');
    this.cvFileName.set('');
    this.highlightedSkills.set([]);
    this.jobSalaryInfo.set('');
    this.expectedSalary.set('');
  }
}

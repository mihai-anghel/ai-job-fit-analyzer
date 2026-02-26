import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, WritableSignal } from '@angular/core';
import { AppStateService } from '../services/state/app-state.service';
import { AnalysisService } from '../services/analysis/analysis.service';
import { FILE_PARSER_SERVICE } from '../services/parsers/file-parser.service';
import { AiProvider, AnalysisResult, ViewState, SalarySource } from '../models/analysis.model';
import { InputFormComponent } from './input-form/input-form.component';
import { LoadingIndicatorComponent } from './loading-indicator/loading-indicator.component';
import { SkillConfirmationComponent } from './skill-confirmation/skill-confirmation.component';
import { AnalysisResultsComponent } from './analysis-results/analysis-results.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    InputFormComponent,
    LoadingIndicatorComponent,
    SkillConfirmationComponent,
    AnalysisResultsComponent,
  ],
  templateUrl: './app.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  appState = inject(AppStateService);
  analysisService = inject(AnalysisService);
  fileParserService = inject(FILE_PARSER_SERVICE);

  view: WritableSignal<ViewState> = signal('input');
  loadingText: WritableSignal<string> = signal('Analyzing...');
  userError: WritableSignal<string | null> = signal(null);

  analysisResult: WritableSignal<AnalysisResult | null> = signal(null);
  suggestedSkills: WritableSignal<string[]> = signal([]);

  // Job Salary Estimation
  estimatedJobSalary: WritableSignal<string> = signal('');
  jobSalarySource: WritableSignal<SalarySource> = signal('estimated');
  jobSalaryJustification: WritableSignal<string> = signal('');

  // Candidate Salary Estimation
  initialEstimatedCandidateSalary: WritableSignal<string> = signal('');
  candidateSalarySource: WritableSignal<SalarySource> = signal('estimated');
  candidateSalaryJustification: WritableSignal<string> = signal('');

  // Computed for disabling analyze button
  availableModels = computed(() => [...this.appState.availableModels()[this.appState.provider()]]);

  isAnalyzeDisabled = computed(() => {
    const jd = this.appState.jdText();
    const cv = this.appState.cvText();
    return !jd || !cv;
  });

  constructor() {
    effect(() => {
      // Clear analysis results if JD or CV changes
      const jd = this.appState.jdText();
      const cv = this.appState.cvText();
      if (jd || cv) {
        this.analysisResult.set(null);
        this.suggestedSkills.set([]);
        this.estimatedJobSalary.set('');
        this.jobSalarySource.set('estimated');
        this.jobSalaryJustification.set('');
        this.initialEstimatedCandidateSalary.set('');
        this.candidateSalarySource.set('estimated');
        this.candidateSalaryJustification.set('');
      }

      // If view is results and JD/CV is cleared, go to input view
      if (this.view() === 'results' && !jd && !cv) {
        this.view.set('input');
      }
    });
  }

  // Event Handlers
  handleTextChange(type: 'jd' | 'cv', text: string) {
    if (type === 'jd') {
      this.appState.setJd(text);
    } else {
      this.appState.setCv(text);
    }
  }

  handleProviderChange(provider: AiProvider) {
    this.appState.provider.set(provider);
  }

  handleModelChange(model: string) {
    this.appState.models.update(models => ({ ...models, [this.appState.provider()]: model }));
  }

  handleApiKeyChange(apiKey: string) {
    this.appState.apiKeys.update(keys => ({ ...keys, [this.appState.provider()]: apiKey }));
  }

  async handleFileChange(event: { file: File, type: 'jd' | 'cv' }) {
    this.userError.set(null);
    try {
      const text = await this.fileParserService.parse(event.file);
      if (event.type === 'jd') {
        this.appState.setJd(text, event.file.name);
      } else {
        this.appState.setCv(text, event.file.name);
      }
    } catch (error: any) {
      this.userError.set(`Error parsing file: ${error.message}`);
    }
  }

  clearFile(type: 'jd' | 'cv') {
    if (type === 'jd') {
      this.appState.clearJd();
    } else {
      this.appState.clearCv();
    }
  }

  resetForm() {
    this.appState.resetForm();
    this.view.set('input');
    this.userError.set(null);
  }

  async startAnalysis() {
    this.view.set('analyzing');
    this.loadingText.set('Analyzing job description and CV...');
    this.userError.set(null);
    this.analysisResult.set(null);

    try {
      const result = await this.analysisService.analyze({
        jdText: this.appState.jdText(),
        cvText: this.appState.cvText(),
        highlightedSkills: [],
      });
      if (result) {
        this.analysisResult.set(result);
        this.view.set('results');
      }
    } catch (error: any) {
      this.userError.set(`Analysis failed: ${error.message}`);
      this.view.set('input');
    }
  }

  async runFinalAnalysis() {
    this.view.set('analyzing');
    this.loadingText.set('Refining analysis with selected skills...');
    this.userError.set(null);

    try {
      const result = await this.analysisService.analyze({
        jdText: this.appState.jdText(),
        cvText: this.appState.cvText(),
        highlightedSkills: this.appState.highlightedSkills(),
        expectedSalary: this.appState.expectedSalary(),
        editedJobSalary: this.appState.jobSalaryInfo(),
      });
      if (result) {
        this.analysisResult.set(result);
        this.view.set('results');
      }
    } catch (error: any) {
      this.userError.set(`Refined analysis failed: ${error.message}`);
      this.view.set('confirmingSkills');
    }
  }

  cancelSkillConfirmation() {
    this.view.set('input');
  }

  startOver() {
    this.resetForm();
  }

  refineAnalysis() {
    this.view.set('confirmingSkills');
  }

  handleJobSalaryChange(salary: string) {
    this.appState.jobSalaryInfo.set(salary);
  }

  handleExpectedSalaryChange(salary: string) {
    this.appState.expectedSalary.set(salary);
  }
}
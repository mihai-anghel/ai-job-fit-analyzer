import { ChangeDetectionStrategy, Component, computed, inject, signal, WritableSignal } from '@angular/core';
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

  constructor() {}

  private normalizeMaybeText(value: string | null | undefined): string {
    const normalized = (value ?? '').trim();
    if (!normalized) return '';

    const lowered = normalized.toLowerCase();
    if (
      lowered === 'null' ||
      lowered === 'undefined' ||
      lowered === 'n/a' ||
      lowered === 'na' ||
      lowered === 'none' ||
      lowered === 'unknown' ||
      lowered === '-'
    ) {
      return '';
    }

    return normalized;
  }

  private normalizeSalaryText(value: string | null | undefined): string {
    const normalized = this.normalizeMaybeText(value);
    if (!normalized) return '';

    const lowered = normalized.toLowerCase();
    if (
      lowered === 'not specified' ||
      lowered === 'not provided' ||
      lowered === 'not available' ||
      lowered === 'not mentioned' ||
      lowered === 'salary not specified'
    ) {
      return '';
    }

    // Market/extracted salary values should contain at least one digit.
    if (!/\d/.test(normalized)) {
      return '';
    }

    return normalized;
  }

  private isSkillMentionedInCv(skill: string, cvText: string): boolean {
    const normalizedSkill = skill.trim().toLowerCase();
    if (!normalizedSkill) return false;

    const normalizedCv = cvText.toLowerCase();
    return normalizedCv.includes(normalizedSkill);
  }

  private resetAnalysisStateAfterInputChange(type: 'jd' | 'cv') {
    this.analysisResult.set(null);
    this.suggestedSkills.set([]);
    this.estimatedJobSalary.set('');
    this.jobSalarySource.set('estimated');
    this.jobSalaryJustification.set('');
    this.initialEstimatedCandidateSalary.set('');
    this.candidateSalarySource.set('estimated');
    this.candidateSalaryJustification.set('');
    this.appState.highlightedSkills.set([]);
    if (type === 'jd') {
      this.appState.clearJobSalary();
    } else {
      this.appState.clearCandidateSalary();
    }
  }

  // Event Handlers
  handleTextChange(type: 'jd' | 'cv', text: string) {
    if (type === 'jd') {
      this.appState.setJd(text);
    } else {
      this.appState.setCv(text);
    }
    this.resetAnalysisStateAfterInputChange(type);
  }

  handleProviderChange(provider: AiProvider) {
    this.appState.setProvider(provider);
  }

  handleModelChange(model: string) {
    this.appState.models.update(models => ({ ...models, [this.appState.provider()]: model }));
  }

  handleApiKeyChange(apiKey: string) {
    if (this.appState.currentHasEnvironmentKey()) {
      return;
    }
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
      this.resetAnalysisStateAfterInputChange(event.type);
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
    this.resetAnalysisStateAfterInputChange(type);

    if (this.view() === 'results' && !this.appState.jdText() && !this.appState.cvText()) {
      this.view.set('input');
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
      const isGemini = this.appState.provider() === 'gemini';
      let cvAnalysis;
      let jdAnalysis;
      if (isGemini) {
        cvAnalysis = await this.analysisService.analyzeCv({ cvText: this.appState.cvText() });
        if (!cvAnalysis) {
          throw new Error(this.analysisService.error() ?? 'CV analysis failed.');
        }
        jdAnalysis = await this.analysisService.analyzeJd({ jdText: this.appState.jdText() });
      } else {
        [cvAnalysis, jdAnalysis] = await Promise.all([
          this.analysisService.analyzeCv({ cvText: this.appState.cvText() }),
          this.analysisService.analyzeJd({ jdText: this.appState.jdText() }),
        ]);
      }

      if (!cvAnalysis || !jdAnalysis) {
        throw new Error(this.analysisService.error() ?? 'Initial analysis failed.');
      }

      const suggestedSkills = [...new Set(
        (jdAnalysis.requirements ?? [])
          .map(skill => this.normalizeMaybeText(skill))
          .filter(Boolean)
      )];
      this.suggestedSkills.set(suggestedSkills);
      const cvText = this.appState.cvText();
      const cachedSkillsForCv = this.appState.getSkillsForCv(cvText);
      const preselectedSkills = cachedSkillsForCv.length > 0
        ? [...new Set(cachedSkillsForCv)]
        : suggestedSkills.filter(skill => this.isSkillMentionedInCv(skill, cvText));
      this.appState.highlightedSkills.set(preselectedSkills);
      this.appState.setSkillsForCv(cvText, preselectedSkills);

      const estimatedJobSalary = this.normalizeSalaryText(jdAnalysis.estimatedJobSalary);
      this.estimatedJobSalary.set(estimatedJobSalary);
      this.jobSalaryJustification.set(this.normalizeMaybeText(jdAnalysis.jobSalaryJustification));
      const extractedJobSalary = this.normalizeSalaryText(jdAnalysis.jobInfo?.salaryRange);
      const cachedJobSalary = this.normalizeSalaryText(this.appState.jobSalaryInfo());
      if (extractedJobSalary) {
        this.jobSalarySource.set('extracted');
        this.appState.jobSalaryInfo.set(extractedJobSalary);
      } else if (cachedJobSalary) {
        this.jobSalarySource.set('cached-manual');
        this.appState.jobSalaryInfo.set(cachedJobSalary);
      } else {
        this.jobSalarySource.set('estimated');
        this.appState.jobSalaryInfo.set('');
      }

      const estimatedCandidateSalary = this.normalizeSalaryText(cvAnalysis.estimatedCandidateSalary);
      this.initialEstimatedCandidateSalary.set(estimatedCandidateSalary);
      this.candidateSalaryJustification.set(this.normalizeMaybeText(cvAnalysis.candidateSalaryJustification));
      const extractedCandidateSalary = this.normalizeSalaryText(cvAnalysis.candidateInfo?.expectedSalaryFromCv);
      const cachedCandidateSalary = this.normalizeSalaryText(this.appState.expectedSalary());
      if (extractedCandidateSalary) {
        this.candidateSalarySource.set('extracted');
        this.appState.expectedSalary.set(extractedCandidateSalary);
      } else if (cachedCandidateSalary) {
        this.candidateSalarySource.set('cached-manual');
        this.appState.expectedSalary.set(cachedCandidateSalary);
      } else {
        this.candidateSalarySource.set('estimated');
        this.appState.expectedSalary.set('');
      }

      this.view.set('confirmingSkills');
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
        initialEstimatedJobSalary: this.estimatedJobSalary(),
        initialEstimatedCandidateSalary: this.initialEstimatedCandidateSalary(),
      });
      if (!result) {
        throw new Error(this.analysisService.error() ?? 'Refined analysis failed.');
      }
      this.analysisResult.set(result);
      this.view.set('results');
    } catch (error: any) {
      const detail = this.analysisService.error() ?? error.message;
      this.userError.set(`Refined analysis failed: ${detail}`);
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

  handleHighlightedSkillsChange(skills: string[]) {
    this.appState.highlightedSkills.set(skills);
    this.appState.setSkillsForCv(this.appState.cvText(), skills);
  }
}

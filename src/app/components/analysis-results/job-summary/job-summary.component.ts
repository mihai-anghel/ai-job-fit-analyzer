import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../../models/analysis.model';
import { SalarySource } from '../../../models/analysis.model';
import { DimensionalAnalysisComponent, DisplayableMetric } from '../dimensional-analysis/dimensional-analysis.component';
import { InfoListComponent } from '../../info-list/info-list.component';
import { InfoItem } from '../../../models/info-item.model';

@Component({
  selector: 'app-job-summary',
  standalone: true,
  imports: [CommonModule, DimensionalAnalysisComponent, InfoListComponent],
  templateUrl: './job-summary.component.html',
  styleUrl: './job-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobSummaryComponent {
  result = input.required<AnalysisResult>();
  finalJobSalary = input.required<string>();
  initialEstimatedJobSalary = input.required<string>();
  source = input.required<SalarySource>();

  private normalizeMaybeText(value: string | null | undefined): string {
    const normalized = (value ?? '').trim();
    return normalized && normalized.toLowerCase() !== 'null' ? normalized : '';
  }

  companyName = computed(() => {
    return this.normalizeMaybeText(this.result()?.jobInfo?.companyName) || null;
  });

  recruiterInfo = computed(() => {
    return this.normalizeMaybeText(this.result()?.jobInfo?.recruitingAgency) || null;
  });

  companyDescription = computed(() => this.normalizeMaybeText(this.result()?.jobInfo?.companyDescription));

  jobInfoItems = computed((): InfoItem[] => {
    const info: InfoItem[] = [];
    const job = this.result()?.jobInfo;

    const title = this.normalizeMaybeText(job?.title);
    if (title) {
      info.push({ iconClass: 'fa-solid fa-briefcase', primaryText: title });
    }

    const company = this.companyName();
    if (company) {
      info.push({ iconClass: 'fa-solid fa-building-user', primaryText: company });
    }

    const recruiter = this.recruiterInfo();
    if (recruiter) {
      info.push({
        iconClass: 'fa-solid fa-handshake',
        primaryText: recruiter,
        secondaryText: '(Recruiter)'
      });
    }

    const location = this.normalizeMaybeText(job?.location);
    if (location) {
      info.push({ iconClass: 'fa-solid fa-location-dot', primaryText: location });
    }

    const finalSalary = this.finalJobSalary();
    const initialSalary = this.initialEstimatedJobSalary();
    const salarySource = this.source();

    if (finalSalary || initialSalary) {
      let primaryText = '';
      let primaryTextClass: string | undefined = undefined;
      let secondaryText = '';

      if (salarySource === 'estimated' && finalSalary) {
        primaryText = `(Est: ${finalSalary})`;
        primaryTextClass = 'text-slate-400';
      } else if (finalSalary) {
        primaryText = finalSalary;
        if (initialSalary && finalSalary !== initialSalary) {
          secondaryText = `(Est: ${initialSalary})`;
        }
      } else {
        primaryText = `(Est: ${initialSalary})`;
        primaryTextClass = 'text-slate-400';
      }

      info.push({
        iconClass: 'fa-solid fa-circle-dollar-to-slot',
        primaryText: primaryText,
        ...(primaryTextClass && { primaryTextClass }),
        ...(secondaryText && { secondaryText })
      });
    }

    const employmentType = this.normalizeMaybeText(job?.employmentType);
    if (employmentType) {
      info.push({ iconClass: 'fa-solid fa-clock', primaryText: employmentType });
    }

    const workModel = this.normalizeMaybeText(job?.workModel);
    if (workModel) {
      info.push({ iconClass: 'fa-solid fa-house', primaryText: workModel });
    }

    return info;
  });

  jdAnalysisItems = computed((): DisplayableMetric[] => {
    const data = this.result()?.documentQualityAnalysis?.jdAnalysis;
    if (!data) return [];
    const items: DisplayableMetric[] = [];

    if (data.clarityOfRole) {
      items.push({ label: 'Clarity of Role', ...data.clarityOfRole, explanation: "Evaluates how clearly the role, responsibilities, and expectations are defined." });
    }
    if (data.specificityOfRequirements) {
      items.push({ label: 'Specificity of Requirements', ...data.specificityOfRequirements, explanation: "Assesses whether the requirements are specific and unambiguous, avoiding vague language." });
    }
    if (data.focusAndRealism) {
      items.push({ label: 'Focus & Realism', ...data.focusAndRealism, explanation: "Scores how focused and realistic the requirements are, flagging 'unicorn' job posts that demand expertise across too many distinct domains." });
    }
    if (data.languageRequirementJustification) {
      items.push({ label: 'Language Justification', ...data.languageRequirementJustification, explanation: "Evaluates if language requirements are justified by the role's function, penalizing overly restrictive demands for non-client-facing roles." });
    }
    if (data.inclusiveLanguage) {
      items.push({ label: 'Inclusive Language', ...data.inclusiveLanguage, explanation: "Assesses the use of inclusive, bias-free language and the avoidance of corporate jargon." });
    }
    if (data.discriminationRisk) {
      items.push({ label: 'Discrimination Risk', ...data.discriminationRisk, explanation: "Scrutinizes the text for subtle biases related to age, gender, disability, etc. A high score indicates low risk." });
    }
    if (data.toneAndCulture) {
      items.push({ label: 'Tone & Company Culture', ...data.toneAndCulture, explanation: "Evaluates if the tone is consistent and provides a clear sense of the company culture." });
    }
    if (data.jobSalaryAlignment) {
      items.push({ label: 'Salary Alignment', ...data.jobSalaryAlignment, explanation: "Compares the salary mentioned in the JD to the AI's objective market-rate estimate for the role. A high score means the offered salary is competitive." });
    }
    
    return items.filter(item => typeof item.score === 'number');
  });
}

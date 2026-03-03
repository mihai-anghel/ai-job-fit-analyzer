import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../../models/analysis.model';
import { SalarySource } from '../../../models/analysis.model';
import { DimensionalAnalysisComponent, DisplayableMetric } from '../dimensional-analysis/dimensional-analysis.component';
import { InfoListComponent } from '../../info-list/info-list.component';
import { InfoItem } from '../../../models/info-item.model';

@Component({
  selector: 'app-candidate-profile',
  standalone: true,
  imports: [CommonModule, DimensionalAnalysisComponent, InfoListComponent],
  templateUrl: './candidate-profile.component.html',
  styleUrl: './candidate-profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateProfileComponent {
  result = input.required<AnalysisResult>();
  expectedSalary = input.required<string>();
  initialEstimatedCandidateSalary = input.required<string>();
  source = input.required<SalarySource>();

  private normalizeMaybeText(value: string | null | undefined): string {
    const normalized = (value ?? '').trim();
    return normalized && normalized.toLowerCase() !== 'null' ? normalized : '';
  }

  candidateInfoItems = computed((): InfoItem[] => {
    const info: InfoItem[] = [];
    const candidate = this.result()?.candidateInfo;

    const currentRole = this.normalizeMaybeText(candidate?.currentRole);
    if (currentRole) {
      info.push({ iconClass: 'fa-solid fa-briefcase', primaryText: currentRole });
    }
    const currentCompany = this.normalizeMaybeText(candidate?.currentCompany);
    if (currentCompany) {
      info.push({ iconClass: 'fa-solid fa-building', primaryText: currentCompany });
    }
    const currentCompanyLocation = this.normalizeMaybeText(candidate?.currentCompanyLocation);
    if (currentCompanyLocation) {
      info.push({ iconClass: 'fa-solid fa-map-marker-alt', primaryText: currentCompanyLocation });
    }
    
    const finalSalary = this.expectedSalary();
    const initialSalary = this.initialEstimatedCandidateSalary();
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
        primaryText,
        ...(primaryTextClass && { primaryTextClass }),
        ...(secondaryText && { secondaryText })
      });
    }

    const duration = this.currentRoleDuration();
    if (duration) {
      info.push({ iconClass: 'fa-solid fa-calendar-alt', primaryText: `${duration} in role` });
    }

    const homeLocation = this.normalizeMaybeText(candidate?.homeLocation);
    if (homeLocation) {
      info.push({ iconClass: 'fa-solid fa-house-user', primaryText: homeLocation });
    }
    
    return info;
  });

  cvAnalysisItems = computed((): DisplayableMetric[] => {
    const data = this.result()?.documentQualityAnalysis?.cvAnalysis;
    if (!data) return [];
    const items: DisplayableMetric[] = [];
    
    if (data.clarityAndConciseness) {
      items.push({ label: 'Clarity & Conciseness', ...data.clarityAndConciseness, explanation: "Evaluates the CV for clear, scannable language, and freedom from jargon." });
    }
    if (data.actionOrientedLanguage) {
      items.push({ label: 'Action-Oriented Language', ...data.actionOrientedLanguage, explanation: "Assesses the use of strong, active verbs to describe accomplishments." });
    }
    if (data.quantifiableAchievements) {
      items.push({ label: 'Quantifiable Achievements', ...data.quantifiableAchievements, explanation: "Scores the use of metrics and data to demonstrate the candidate's impact." });
    }
    if (data.professionalismAndFormatting) {
      items.push({ label: 'Professionalism & Formatting', ...data.professionalismAndFormatting, explanation: "Checks for typos, grammatical errors, and consistent, professional formatting." });
    }
    if (data.careerNarrativeCohesion) {
      items.push({ label: 'Career Narrative Cohesion', ...data.careerNarrativeCohesion, explanation: "Evaluates how well the CV tells a clear and compelling story of professional growth and focus." });
    }
    if (data.candidateSalaryAlignment) {
      items.push({ label: 'Expected Salary Alignment', ...data.candidateSalaryAlignment, explanation: "How realistic the candidate's expected salary is compared to the AI's objective market-rate estimate." });
    }
    
    return items.filter(item => typeof item.score === 'number');
  });

  currentRoleDuration = computed(() => {
    const startDateStr = this.normalizeMaybeText(this.result()?.candidateInfo?.currentRoleStartDate);
    const endDateStr = this.normalizeMaybeText(this.result()?.candidateInfo?.currentRoleEndDate);

    if (!startDateStr) {
      return '';
    }

    try {
      const startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) return '';

      let endDate: Date;
      if (!endDateStr || ['present', 'now', 'current'].includes(endDateStr.trim().toLowerCase())) {
        endDate = new Date();
      } else {
        endDate = new Date(endDateStr);
        if (isNaN(endDate.getTime())) return '';
      }

      let years = endDate.getFullYear() - startDate.getFullYear();
      let months = endDate.getMonth() - startDate.getMonth();

      if (months < 0 || (months === 0 && endDate.getDate() < startDate.getDate())) {
        years--;
        months = (months + 12) % 12;
      }
      
      // If the day of the month suggests we haven't completed a full month, adjust.
      // This is a simple approximation.
      if (endDate.getDate() < startDate.getDate()) {
        months--;
        if (months < 0) {
            years--;
            months += 12;
        }
      }

      // Handle cases where the duration is 0 months but spans a few days.
      if (years === 0 && months === 0) {
        const dayDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        if (dayDiff > 0 && dayDiff < 30) {
          months = 1;
        }
      }

      const yearText = years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '';
      const monthText = months > 0 ? `${months} month${months > 1 ? 's' : ''}` : '';

      if (yearText && monthText) {
        return `${yearText} ${monthText}`;
      }
      return yearText || monthText || 'Less than a month';

    } catch (e) {
      console.error("Error parsing role duration dates:", startDateStr, endDateStr, e);
      return '';
    }
  });
}

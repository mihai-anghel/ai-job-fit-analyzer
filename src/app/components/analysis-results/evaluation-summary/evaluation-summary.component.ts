import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../../models/analysis.model';
import { MetricItemComponent } from '../../metric-item/metric-item.component';
import { DimensionalAnalysisComponent, DisplayableMetric } from '../dimensional-analysis/dimensional-analysis.component';

@Component({
  selector: 'app-evaluation-summary',
  standalone: true,
  imports: [CommonModule, MetricItemComponent, DimensionalAnalysisComponent],
  templateUrl: './evaluation-summary.component.html',
  styleUrl: './evaluation-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationSummaryComponent {
  result = input.required<AnalysisResult>();

  private normalizeMaybeText(value: string | null | undefined): string {
    const normalized = (value ?? '').trim();
    return normalized && normalized.toLowerCase() !== 'null' ? normalized : '';
  }

  candidateDisplayName = computed(() => this.normalizeMaybeText(this.result()?.candidateInfo?.name) || 'The Candidate');
  candidateDisplayRole = computed(() => this.normalizeMaybeText(this.result()?.candidateInfo?.currentRole) || 'Current Role Unavailable');
  jobDisplayTitle = computed(() => this.normalizeMaybeText(this.result()?.jobInfo?.title) || 'The Role');

  dimensionalAnalysisItems = computed((): DisplayableMetric[] => {
      const data = this.result()?.dimensionalAnalysis;
      if (!data) return [];
      const items = [
        { label: 'Qualification Match', metric: data.qualificationMatch, explanation: "The on-paper, 'checklist' match of the candidate's skills and experience against the job's explicit requirements." },
        { label: 'Capability Confidence', metric: data.capabilityConfidence, explanation: "Proven impact and execution. Assesses the candidate's track record of using their skills to deliver quantifiable results and achievements." },
        { label: 'Situational Stability', metric: data.situationalStability, explanation: "Likelihood the candidate will accept and remain in the role, based on career progression and job tenure." },
        { label: 'Reward Potential', metric: data.rewardPotential, explanation: "The candidate's potential for long-term growth and value to the company, based on their trajectory and unique skills." },
        { label: 'Culture Fit', metric: data.cultureFit, explanation: "Alignment with the likely company culture (e.g., startup vs. enterprise) inferred from the CV's language and experience." },
        { label: 'Career Trajectory', metric: data.careerTrajectory, explanation: "The candidate's pattern of increasing responsibility and skill acquisition over time." },
        { label: 'Compensation Fit', metric: data.compensationFit, explanation: "Alignment of the candidate's expected salary with the job's salary range or market rates." },
        { label: 'Learning Velocity', metric: data.learningVelocity, explanation: "The candidate's demonstrated ability to learn and adapt, evidenced by certifications or adoption of new technologies." },
        { label: 'Tech Stack Modernity', metric: data.techStackModernity, explanation: "How up-to-date the candidate's skills are, based on recent experience with modern tools and frameworks." }
      ];
      return items
        .filter(item => item.metric && typeof item.metric.score === 'number')
        .map(item => ({
            label: item.label,
            score: item.metric.score,
            feedback: item.metric.feedback,
            explanation: item.explanation
        }));
  });

  companyDisplay = computed(() => {
    const jobInfo = this.result()?.jobInfo;
    if (!jobInfo) return 'the Company';

    const sanitizedEmployer = this.normalizeMaybeText(jobInfo.companyName);
    const sanitizedRecruiter = this.normalizeMaybeText(jobInfo.recruitingAgency);

    return sanitizedEmployer || sanitizedRecruiter || 'the Company';
  });
}

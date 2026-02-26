import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../../models/analysis.model';

@Component({
  selector: 'app-questions-for-candidate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './questions-for-candidate.component.html',
  styleUrl: './questions-for-candidate.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionsForCandidateComponent {
  result = input.required<AnalysisResult>();
}

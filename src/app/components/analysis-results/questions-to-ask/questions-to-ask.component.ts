import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../../models/analysis.model';

@Component({
  selector: 'app-questions-to-ask',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './questions-to-ask.component.html',
  styleUrl: './questions-to-ask.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionsToAskComponent {
  result = input.required<AnalysisResult>();
}

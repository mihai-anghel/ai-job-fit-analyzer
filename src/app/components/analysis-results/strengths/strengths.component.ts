import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../../models/analysis.model';

@Component({
  standalone: true,
  selector: 'app-strengths',
  imports: [CommonModule],
  templateUrl: './strengths.component.html',
  styleUrl: './strengths.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrengthsComponent {
  result = input.required<AnalysisResult>();
}

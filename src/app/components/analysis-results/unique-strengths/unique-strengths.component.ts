import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../../models/analysis.model';

@Component({
  selector: 'app-unique-strengths',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './unique-strengths.component.html',
  styleUrl: './unique-strengths.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UniqueStrengthsComponent {
  result = input.required<AnalysisResult>();
}

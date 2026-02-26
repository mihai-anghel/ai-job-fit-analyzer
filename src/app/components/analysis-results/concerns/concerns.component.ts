import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../../models/analysis.model';

@Component({
  standalone: true,
  selector: 'app-concerns',
  imports: [CommonModule],
  templateUrl: './concerns.component.html',
  styleUrl: './concerns.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConcernsComponent {
  result = input.required<AnalysisResult>();
}

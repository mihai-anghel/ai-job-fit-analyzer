import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricItemComponent } from '../../metric-item/metric-item.component';

export interface DisplayableMetric {
  label: string;
  score: number;
  feedback: string;
  explanation?: string;
}

@Component({
  selector: 'app-dimensional-analysis',
  standalone: true,
  imports: [CommonModule, MetricItemComponent],
  templateUrl: './dimensional-analysis.component.html',
  styleUrl: './dimensional-analysis.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DimensionalAnalysisComponent {
  description = input<string>();
  items = input.required<DisplayableMetric[]>();
}

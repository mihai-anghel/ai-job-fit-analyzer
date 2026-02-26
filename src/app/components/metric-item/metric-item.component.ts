import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metric-item.component.html',
  styleUrl: './metric-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricItemComponent {
  label = input.required<string>();
  score = input.required<number>();
  feedback = input<string>(); // For document quality and dimensional analysis
  explanation = input<string>(); // Static explanation for tooltips
  barHeight = input<'small' | 'medium'>('small'); // small = h-1.5, medium = h-2.5

  scoreSentiment = computed(() => {
    const s = this.score();
    if (s >= 80) return 'high';
    if (s >= 60) return 'medium';
    return 'low';
  });
}
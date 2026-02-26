import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfoItem } from '../../models/info-item.model';

@Component({
  selector: 'app-info-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './info-list.component.html',
  styleUrl: './info-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoListComponent {
  items = input.required<InfoItem[]>();
  iconColorClass = input<string>('text-slate-400');
  theme = input<'candidate' | 'job'>('job');
}

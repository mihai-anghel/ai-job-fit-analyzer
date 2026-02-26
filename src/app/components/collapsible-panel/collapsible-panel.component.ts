import { ChangeDetectionStrategy, Component, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-collapsible-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './collapsible-panel.component.html',
  styleUrl: './collapsible-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollapsiblePanelComponent implements OnInit {
  title = input.required<string>();
  iconClass = input.required<string>();
  panelClass = input<string>('');
  initialState = input<'open' | 'closed'>('open');

  isOpen = signal(true);

  ngOnInit() {
    this.isOpen.set(this.initialState() === 'open');
  }

  toggle() {
    this.isOpen.update(v => !v);
  }
}

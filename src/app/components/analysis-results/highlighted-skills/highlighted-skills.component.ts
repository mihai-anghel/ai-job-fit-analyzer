import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-highlighted-skills',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './highlighted-skills.component.html',
  styleUrl: './highlighted-skills.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HighlightedSkillsComponent {
  highlightedSkills = input.required<string[]>();
}

import { ChangeDetectionStrategy, Component, output, input, computed, signal, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalarySource } from '../../../models/analysis.model';

@Component({
  selector: 'app-job-salary-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-salary-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobSalaryInfoComponent {
  jobSalaryInfo = input.required<string>();
  source = input.required<SalarySource>();
  estimatedJobSalary = input.required<string>();
  jobSalaryJustification = input.required<string>();

  jobSalaryInfoChange = output<string>();

  private elementRef = inject(ElementRef);
  suggestionsVisible = signal(false);

  suggestions = computed((): string[] => {
    const estimated = this.estimatedJobSalary();
    if (typeof estimated !== 'string' || !estimated) {
      return [];
    }
    return [estimated];
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.suggestionsVisible.set(false);
    }
  }

  showSuggestions() {
    this.suggestionsVisible.set(true);
  }

  selectSuggestion(suggestion: string) {
    this.jobSalaryInfoChange.emit(suggestion);
    this.suggestionsVisible.set(false);
  }

  sourceInfo = computed(() => {
    switch (this.source()) {
      case 'extracted':
        return { icon: 'fa-file-lines', text: 'Value extracted from document. You can edit it.' };
      case 'estimated':
        return { icon: 'fa-lightbulb', text: 'Suggestions are based on the AI market-rate estimate.' };
      case 'manual':
        return { icon: 'fa-pen-to-square', text: 'Manually entered value.' };
      case 'cached-manual':
        return { icon: 'fa-floppy-disk', text: 'Using your previously entered value.' };
      default:
        return { icon: 'fa-question-circle', text: 'Data source is unknown.' };
    }
  });
}
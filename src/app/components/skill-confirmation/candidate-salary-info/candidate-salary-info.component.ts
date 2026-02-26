import { ChangeDetectionStrategy, Component, output, input, computed, signal, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalarySource } from '../../../models/analysis.model';

@Component({
  selector: 'app-candidate-salary-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './candidate-salary-info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateSalaryInfoComponent {
  expectedSalary = input.required<string>();
  source = input.required<SalarySource>();
  initialEstimatedCandidateSalary = input.required<string>();
  candidateSalaryJustification = input.required<string>();

  expectedSalaryChange = output<string>();

  private elementRef = inject(ElementRef);
  suggestionsVisible = signal(false);

  suggestions = computed((): string[] => {
    const estimatedSalary = this.initialEstimatedCandidateSalary();
    if (typeof estimatedSalary !== 'string' || !estimatedSalary) {
      return [];
    }

    // Regex to extract prefix, number, and suffix. e.g., "€", "95,000", " per year"
    const match = estimatedSalary.match(/^(\D*?)(\d{1,3}(?:,?\d{3})*)(.*)$/);
    if (!match) {
      return [estimatedSalary]; // Return as-is if format is unexpected
    }

    const [, prefix, numberStr, suffix] = match;
    const num = parseInt(numberStr.replace(/,/g, ''), 10);
    if (isNaN(num)) {
      return [estimatedSalary];
    }
    
    const formatter = new Intl.NumberFormat();
    
    // Generate a few suggestions around the estimate
    const step = num > 150000 ? 10000 : 5000;
    const suggestionsSet = new Set<string>();
    
    suggestionsSet.add(`${prefix.trim()}${formatter.format(num - step)}${suffix}`);
    suggestionsSet.add(estimatedSalary); // The original estimate
    suggestionsSet.add(`${prefix.trim()}${formatter.format(num + step)}${suffix}`);
    
    return Array.from(suggestionsSet);
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
    this.expectedSalaryChange.emit(suggestion);
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
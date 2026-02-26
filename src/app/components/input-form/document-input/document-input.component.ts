import { ChangeDetectionStrategy, Component, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentInputComponent {
  // Inputs
  title = input.required<string>();
  textValue = input.required<string>();
  fileName = input.required<string>();
  idPrefix = input.required<'jd' | 'cv'>();

  // Outputs
  textValueChange = output<string>();
  fileChange = output<File>();
  clearFile = output<void>();

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.fileChange.emit(input.files[0]);
    }
    // Reset the input so the same file can be selected again if cleared.
    input.value = '';
  }

  onClearFile(event: MouseEvent) {
    event.stopPropagation();
    this.clearFile.emit();
  }
}
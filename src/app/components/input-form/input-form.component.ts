import { ChangeDetectionStrategy, Component, output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentInputComponent } from './document-input/document-input.component';
import { AiProvider } from '../../models/analysis.model';

@Component({
  selector: 'app-input-form',
  standalone: true,
  imports: [
    CommonModule, 
    DocumentInputComponent,
  ],
  templateUrl: './input-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputFormComponent {
  // Inputs from parent
  jdText = input.required<string>();
  cvText = input.required<string>();
  jdFileName = input.required<string>();
  cvFileName = input.required<string>();
  isAnalyzeDisabled = input.required<boolean>();
  
  // Provider and model inputs
  availableProviders = input.required<AiProvider[]>();
  provider = input.required<AiProvider>();
  availableModels = input.required<string[]>();
  model = input.required<string>();

  // API Key inputs
  apiKey = input.required<string>();
  hasEnvironmentKey = input.required<boolean>();

  // Outputs to parent
  jdTextChange = output<string>();
  cvTextChange = output<string>();
  fileChange = output<{ file: File, type: 'jd' | 'cv' }>();
  clearFile = output<'jd' | 'cv'>();
  analyze = output<void>();
  reset = output<void>();
  providerChange = output<AiProvider>();
  modelChange = output<string>();
  apiKeyChange = output<string>();

  // Component-specific state
  showApiKey = signal(false);

  providerDisplayMap: Record<AiProvider, string> = {
    gemini: 'Gemini',
    openai: 'OpenAI',
    anthropic: 'Anthropic'
  };

  handleFileChange(file: File, type: 'jd' | 'cv') {
    if (file) {
      this.fileChange.emit({ file, type });
    }
  }

  toggleApiKeyVisibility() {
    this.showApiKey.update(v => !v);
  }
}
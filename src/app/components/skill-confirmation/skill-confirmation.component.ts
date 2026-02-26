import { ChangeDetectionStrategy, Component, output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobSalaryInfoComponent } from './job-salary-info/job-salary-info.component';
import { CandidateSalaryInfoComponent } from './candidate-salary-info/candidate-salary-info.component';
import { SalarySource } from '../../models/analysis.model';

@Component({
  selector: 'app-skill-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    JobSalaryInfoComponent,
    CandidateSalaryInfoComponent
  ],
  templateUrl: './skill-confirmation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillConfirmationComponent {
  // Inputs from parent
  suggestedSkills = input.required<string[]>();
  highlightedSkills = input.required<string[]>();
  
  jobSalaryInfo = input.required<string>();
  jobSalarySource = input.required<SalarySource>();
  estimatedJobSalary = input.required<string>();
  jobSalaryJustification = input.required<string>();
  
  expectedSalary = input.required<string>();
  candidateSalarySource = input.required<SalarySource>();
  initialEstimatedCandidateSalary = input.required<string>();
  candidateSalaryJustification = input.required<string>();

  // Outputs to parent
  highlightedSkillsChange = output<string[]>();
  expectedSalaryChange = output<string>();
  jobSalaryInfoChange = output<string>();
  runAnalysis = output<void>();
  cancel = output<void>();
  
  // Component-specific state
  newSkill = signal('');

  addSkill() {
    const skill = this.newSkill().trim();
    if (skill && !this.highlightedSkills().includes(skill)) {
      this.highlightedSkillsChange.emit([...this.highlightedSkills(), skill]);
      this.newSkill.set('');
    }
  }

  removeSkill(index: number) {
    const updatedSkills = [...this.highlightedSkills()];
    updatedSkills.splice(index, 1);
    this.highlightedSkillsChange.emit(updatedSkills);
  }
  
  toggleSkill(skill: string) {
    const currentSkills = this.highlightedSkills();
    if (currentSkills.includes(skill)) {
      this.highlightedSkillsChange.emit(currentSkills.filter(s => s !== skill));
    } else {
      this.highlightedSkillsChange.emit([...currentSkills, skill]);
    }
  }
}
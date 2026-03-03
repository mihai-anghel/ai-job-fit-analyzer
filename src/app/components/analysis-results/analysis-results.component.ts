import { ChangeDetectionStrategy, Component, output, input, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../models/analysis.model';
import { SalarySource } from '../../models/analysis.model';

// Import shared and sub-components
import { CollapsiblePanelComponent } from '../collapsible-panel/collapsible-panel.component';
import { EvaluationSummaryComponent } from './evaluation-summary/evaluation-summary.component';
import { JobSummaryComponent } from './job-summary/job-summary.component';
import { HighlightedSkillsComponent } from './highlighted-skills/highlighted-skills.component';
import { UniqueStrengthsComponent } from './unique-strengths/unique-strengths.component';
import { QuestionsToAskComponent } from './questions-to-ask/questions-to-ask.component';
import { QuestionsForCandidateComponent } from './questions-for-candidate/questions-for-candidate.component';
import { CandidateProfileComponent } from './candidate-profile/candidate-profile.component';

declare var jspdf: any;
declare var html2canvas: any;

@Component({
  selector: 'app-analysis-results',
  standalone: true,
  imports: [
    CommonModule,
    CollapsiblePanelComponent,
    EvaluationSummaryComponent,
    JobSummaryComponent,
    HighlightedSkillsComponent,
    UniqueStrengthsComponent,
    QuestionsToAskComponent,
    QuestionsForCandidateComponent,
    CandidateProfileComponent
  ],
  templateUrl: './analysis-results.component.html',
  styleUrl: './analysis-results.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisResultsComponent {
  // Inputs from parent
  result = input.required<AnalysisResult | null>();
  highlightedSkills = input.required<string[]>();
  expectedSalary = input.required<string>();
  initialEstimatedCandidateSalary = input.required<string>();
  finalJobSalary = input.required<string>();
  initialEstimatedJobSalary = input.required<string>();
  jobSalarySource = input.required<SalarySource>();
  candidateSalarySource = input.required<SalarySource>();

  // Outputs to parent
  startOver = output<void>();
  refine = output<void>();
  
  @ViewChild('printArea') printArea!: ElementRef<HTMLDivElement>;
  isExporting = signal(false);

  private normalizeMaybeText(value: string | null | undefined): string {
    const normalized = (value ?? '').trim();
    return normalized && normalized.toLowerCase() !== 'null' ? normalized : '';
  }

  private sanitizeFilename(name: string): string {
    // Replace spaces and invalid characters with underscores to create a valid filename.
    return name.replace(/[^a-z0-9._-]/gi, '_').replace(/_+/g, '_');
  }

  async exportToPdf() {
    const resultData = this.result();
    if (!resultData || this.isExporting() || !this.printArea) return;

    this.isExporting.set(true);

    const jobInfo = resultData.jobInfo;
    const candidateName = this.normalizeMaybeText(resultData.candidateInfo?.name) || 'Candidate';
    const jobTitle = this.normalizeMaybeText(jobInfo?.title) || 'Job';
    const score = resultData.overallScore;
    
    // Sanitize and determine company name with fallback logic
    const sanitizedCompanyName = this.normalizeMaybeText(jobInfo?.companyName);
    const sanitizedRecruiterName = this.normalizeMaybeText(jobInfo?.recruitingAgency);
    const companyName = sanitizedCompanyName || sanitizedRecruiterName || 'Company';

    let candidatePart = candidateName;
    const nameParts = candidateName.split(' ').filter(p => p);
    if (nameParts.length > 1 && nameParts[0].length > 0) {
        candidatePart = `${nameParts[0].charAt(0)}. ${nameParts[nameParts.length - 1]}`;
    }

    const baseFilename = `${candidatePart} - ${score}_${jobTitle} at ${companyName}`;
    const filename = `${this.sanitizeFilename(baseFilename)}.pdf`;

    try {
      // Ensure web fonts (including Font Awesome) are fully loaded before rasterizing.
      const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
      if (fonts?.ready) {
        await fonts.ready;
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

      const { jsPDF } = jspdf;
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pdfWidth - margin * 2;
      let cursorY = margin;

      const printContainer = this.printArea.nativeElement;
      printContainer.classList.add('print-mode'); // Apply print styles
      
      const panels: HTMLElement[] = Array.from(printContainer.querySelectorAll<HTMLElement>('.print-panel'));

      for (const panel of panels) {
        const panelCanvas = await html2canvas(panel, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false
        });
        
        const atomicSelectors = '.print-atomic-item, .print-list-item, .print-summary-item, .print-question-item';
        const atomicItems: HTMLElement[] = Array.from(panel.querySelectorAll<HTMLElement>(atomicSelectors));
        
        const panelOffsetTop = panel.offsetTop; 
        let currentSliceTop = 0; 

        const boundaries = atomicItems.map(item => (item.offsetTop - panelOffsetTop) + item.offsetHeight);
        
        const lastBoundary = boundaries.length > 0 ? boundaries[boundaries.length - 1] : 0;
        if (lastBoundary < panel.offsetHeight) {
            boundaries.push(panel.offsetHeight);
        }

        for (const boundary of boundaries) {
          const sliceHeight = boundary - currentSliceTop;
          if (sliceHeight <= 1) continue; 

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = panelCanvas.width;
          
          const sourceSliceHeight = sliceHeight * (panelCanvas.height / panel.offsetHeight);
          sliceCanvas.height = sourceSliceHeight;
          
          const ctx = sliceCanvas.getContext('2d');
          if (!ctx) continue;
          
          const sourceSliceY = currentSliceTop * (panelCanvas.height / panel.offsetHeight);

          ctx.drawImage(panelCanvas, 0, sourceSliceY, panelCanvas.width, sourceSliceHeight, 0, 0, panelCanvas.width, sourceSliceHeight);
          
          const imgData = sliceCanvas.toDataURL('image/png');
          const imgHeight = sliceCanvas.height * contentWidth / sliceCanvas.width;

          if (cursorY + imgHeight > pdfHeight - margin && cursorY > margin) {
            pdf.addPage();
            cursorY = margin;
          }

          pdf.addImage(imgData, 'PNG', margin, cursorY, contentWidth, imgHeight);
          cursorY += imgHeight;
          
          currentSliceTop = boundary;
        }
        cursorY += 10;
      }

      pdf.save(filename);

    } catch (error) {
        console.error('Error exporting to PDF:', error);
    } finally {
        this.isExporting.set(false);
        if (this.printArea?.nativeElement) {
            this.printArea.nativeElement.classList.remove('print-mode');
        }
    }
  }
}

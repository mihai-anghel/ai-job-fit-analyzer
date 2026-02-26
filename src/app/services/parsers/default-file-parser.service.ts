import { Injectable, inject } from '@angular/core';
import { FileParserService } from './file-parser.service';
import { PdfParserService } from './pdf-parser.service';
import { DocxParserService } from './docx-parser.service';
import { TxtParserService } from './txt-parser.service';

@Injectable({ providedIn: 'root' })
export class DefaultFileParserService implements FileParserService {
  private pdfParser = inject(PdfParserService);
  private docxParser = inject(DocxParserService);
  private txtParser = inject(TxtParserService);

  constructor() {}

  parse(file: File): Promise<string> {
    const fileType = file.type;

    switch (fileType) {
      case 'application/pdf':
        return this.pdfParser.parse(file);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.docxParser.parse(file);
      case 'text/plain':
        return this.txtParser.parse(file);
      default:
        // Try to parse based on extension for robustness
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') return this.pdfParser.parse(file);
        if (extension === 'docx') return this.docxParser.parse(file);
        if (extension === 'txt') return this.txtParser.parse(file);
        
        return Promise.reject(new Error('Unsupported file type. Please use PDF, DOCX, or TXT.'));
    }
  }
}
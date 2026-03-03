import { ParserService } from './parser.service';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PdfParserService implements ParserService {
  private pdfjsLib: any | null = null;

  private async ensurePdfJs(): Promise<any> {
    if (this.pdfjsLib) return this.pdfjsLib;
    // Use the legacy build which works in browsers
    const mod = await import('pdfjs-dist/legacy/build/pdf');
    this.pdfjsLib = (mod && (mod as any).default) || mod;

    // Set worker src relative to this module so dev server serves it correctly
    // PDF.js worker needs to be served from the app root.  In dev the
    // assets configuration copies the build folder to `/pdfjs-dist/build`.
    // The package ships only ES modules, so the worker file has a `.mjs`
    // extension; we hardcode that name here to match the copied asset.
    this.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs-dist/build/pdf.worker.min.mjs';
    
    // Note: we purposely do not wrap this in a try/catch because if the asset
    // is missing we want the failure to show up during development rather than
    // silently continue.

    return this.pdfjsLib;
  }

  async parse(file: File): Promise<string> {
    const pdfjs = await this.ensurePdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      if (!textContent.items || textContent.items.length === 0) {
        continue;
      }

      // Reconstruct the text by joining items. The `hasEOL` property indicates
      // the end of a line, allowing us to preserve paragraph structure.
      const pageText = textContent.items.reduce((acc: string, item: any) => {
          acc += item.str;
          if (item.hasEOL) {
              acc += '\n';
          } else {
              acc += ' ';
          }
          return acc;
      }, '');

      // Clean up extra spaces before newlines and trim the result.
      fullText += pageText.replace(/ \n/g, '\n').trim();
      
      if (i < numPages) {
        fullText += '\n\n'; // Add two newlines between pages for readability
      }
    }
    return fullText;
  }
}

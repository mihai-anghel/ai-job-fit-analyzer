import { Injectable } from '@angular/core';
import { ParserService } from './parser.service';

declare var pdfjsLib: any;

@Injectable({ providedIn: 'root' })
export class PdfParserService implements ParserService {
  constructor() {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js`;
    }
  }

  async parse(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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

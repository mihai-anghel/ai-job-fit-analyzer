import { Injectable } from '@angular/core';
import { ParserService } from './parser.service';

declare var mammoth: any;

@Injectable({ providedIn: 'root' })
export class DocxParserService implements ParserService {
  async parse(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
  }
}
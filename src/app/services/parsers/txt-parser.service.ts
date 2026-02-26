import { Injectable } from '@angular/core';
import { ParserService } from './parser.service';

@Injectable({ providedIn: 'root' })
export class TxtParserService implements ParserService {
  async parse(file: File): Promise<string> {
    return file.text();
  }
}
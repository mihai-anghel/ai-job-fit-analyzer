import { InjectionToken } from '@angular/core';

export interface FileParserService {
  parse(file: File): Promise<string>;
}

export const FILE_PARSER_SERVICE = new InjectionToken<FileParserService>('FILE_PARSER_SERVICE');

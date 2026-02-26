export interface ParserService {
  parse(file: File): Promise<string>;
}
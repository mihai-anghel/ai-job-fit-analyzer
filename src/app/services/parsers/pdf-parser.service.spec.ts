import { TestBed } from '@angular/core/testing';
import { PdfParserService } from './pdf-parser.service';

describe('PdfParserService', () => {
  let service: PdfParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PdfParserService] });
    service = TestBed.inject(PdfParserService);
  });

  it('parses simple pdf text using mocked pdfjsLib', async () => {
    // set up a fake global pdfjsLib that returns predictable content
    (window as any).pdfjsLib = {
      GlobalWorkerOptions: {},
      getDocument: ({ data }: any) => ({
        promise: Promise.resolve({
          numPages: 1,
          getPage: async (i: number) => ({
            getTextContent: async () => ({ items: [{ str: 'hello', hasEOL: true }] })
          })
        })
      })
    };

    const dummyFile = {
      arrayBuffer: async () => new ArrayBuffer(0),
    } as File;
    const text = await service.parse(dummyFile);
    expect(text).toBe('hello');
  });
});

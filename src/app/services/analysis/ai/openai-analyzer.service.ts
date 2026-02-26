import { Injectable, signal } from '@angular/core';
import { 
  DimensionalAnalysis,
  CvAnalysisData,
  JdAnalysisData,
  FitAnalysisData,
  CvAnalysisInput,
  JdAnalysisInput,
  FitAnalysisInput,
  AnalysisResult
} from '../../../models/analysis.model';
import { AnalysisService } from '../analysis.service';
import { 
  CV_ANALYSIS_SCHEMA,
  JD_ANALYSIS_SCHEMA,
  FIT_ANALYSIS_SCHEMA,
  MASTER_PROMPT_RULES
} from './ai-schemas';
import { SCORING_WEIGHTS } from '../analysis-logic';

declare var OpenAI: any; // From CDN

@Injectable({ providedIn: 'root' })
export class OpenAiAnalyzerService extends AnalysisService {
  private readonly _error = signal<string | null>(null);
  public readonly error = this._error.asReadonly();
  public readonly provider = 'openai';
  
  private openai: any | null = null;
  public model: string | null = null;

  constructor() {
    super();
  }
  
  override initialize(apiKey: string): void {
    if (apiKey && apiKey.trim() && typeof OpenAI !== 'undefined') {
      try {
        this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        this._error.set(null);
      } catch (e: any) {
        this.openai = null;
        this._error.set(`Failed to initialize OpenAI client: ${e.message}`);
      }
    } else if (apiKey && apiKey.trim() && typeof OpenAI === 'undefined') {
      this.openai = null;
      this._error.set("OpenAI SDK failed to load. Please check your internet connection or try refreshing.");
    } else {
      this.openai = null;
    }
  }

  override configure(model: string): void {
    this.model = model;
  }
  
  clearError(): void {
    this._error.set(null);
  }

  private _buildMasterPrompt(dataSections: { [key: string]: string }, schema: object): { systemPrompt: string, userPrompt: string } {
    const systemPrompt = MASTER_PROMPT_RULES;

    const dataString = Object.entries(dataSections)
      .filter(([, value]) => value && value.trim())
      .map(([key, value]) => `------------------------------------------------------------
[[ ${key} ]]
${value}
[[ END ${key} ]]`)
      .join('\n');

    const schemaString = JSON.stringify(schema, null, 2);

    const userPrompt = `${dataString}
------------------------------------------------------------
Now produce:
- A STRICT deterministic JSON object
- Following this exact schema:
${schemaString}`;
    
    return { systemPrompt, userPrompt };
  }

  private async _generateJsonContent<T>(prompt: { systemPrompt: string, userPrompt: string }): Promise<T | null> {
    if (!this.openai) {
        this._error.set("AI service is not initialized. Please configure the OpenAI API Key.");
        return null;
    }
    if (!this.model) {
        this._error.set("AI model is not configured.");
        return null;
    }

    let response;
    try {
        response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                { role: "system", content: prompt.systemPrompt },
                { role: "user", content: prompt.userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0,
            seed: 42,
            top_p: 1,
        });
    } catch (e: any) {
        console.error("Error during OpenAI API call:", e);
        let userFriendlyMessage = "An unexpected API error occurred during analysis.";
        // The OpenAI SDK throws structured errors
        if (e.status) {
            switch(e.status) {
                case 401:
                    userFriendlyMessage = "OpenAI API Error: Invalid API Key. Please check your key and try again.";
                    break;
                case 429:
                    userFriendlyMessage = "OpenAI API Error: Rate limit or quota exceeded. Please check your plan and billing details.";
                    break;
                case 500:
                    userFriendlyMessage = "OpenAI API Error: The server had an error while processing your request. Please try again later.";
                    break;
                default:
                    userFriendlyMessage = `OpenAI API Error: ${e.message || 'An unknown error occurred.'} (Status: ${e.status})`;
            }
        } else if (e.message) {
            userFriendlyMessage = e.message;
        }
        
        this._error.set(userFriendlyMessage);
        return null;
    }

    const jsonString = response.choices?.[0]?.message?.content?.trim();

    if (!jsonString) {
        const finishReason = response.choices?.[0]?.finish_reason;
        if (finishReason === 'content_filter') {
            this._error.set('The response was blocked due to OpenAI\'s safety system. Please review your input documents for sensitive content.');
        } else {
            this._error.set(`The AI returned an empty response. Finish Reason: ${finishReason || 'Unknown'}.`);
        }
        return null;
    }

    try {
        return JSON.parse(jsonString) as T;
    } catch (e: any) {
        console.error("Failed to parse OpenAI JSON response:", e);
        this._error.set(`The AI returned malformed JSON. Error: ${e.message}. Please try again.`);
        return null;
    }
  }

  private _calculateOverallScore(dimensionalAnalysis: DimensionalAnalysis): number {
      let weightedScore = 0;
      for (const key in dimensionalAnalysis) {
          if (Object.prototype.hasOwnProperty.call(dimensionalAnalysis, key)) {
              const weightKey = key as keyof typeof SCORING_WEIGHTS;
              const metric = dimensionalAnalysis[weightKey];
              const score = metric?.score || 0;
              const weight = SCORING_WEIGHTS[weightKey] || 0;
              weightedScore += (score / 100) * weight;
          }
      }
      return Math.round(weightedScore * 100);
  }

  async analyzeCv(input: CvAnalysisInput): Promise<CvAnalysisData | null> {
    this._error.set(null);
    const dataSections = { 'CANDIDATE CV': input.cvText };
    const prompt = this._buildMasterPrompt(dataSections, CV_ANALYSIS_SCHEMA);
    return this._generateJsonContent<CvAnalysisData>(prompt);
  }

  async analyzeJd(input: JdAnalysisInput): Promise<JdAnalysisData | null> {
    this._error.set(null);
    const dataSections: { [key: string]: string } = { 'JOB DESCRIPTION': input.jdText };
    if (input.fallbackLocation) {
        dataSections['FALLBACK LOCATION'] = `CRITICAL: The job description's location could not be determined. Use the following location as the context for salary estimation: ${input.fallbackLocation}.`;
    }
    const prompt = this._buildMasterPrompt(dataSections, JD_ANALYSIS_SCHEMA);
    return this._generateJsonContent<JdAnalysisData>(prompt);
  }

  async analyzeFit(input: FitAnalysisInput): Promise<FitAnalysisData | null> {
    this._error.set(null);
    
    const dataSections: { [key: string]: string } = {
        'JOB DESCRIPTION': input.jdText,
        'CANDIDATE CV': input.cvText,
    };
    
    if (input.highlightedSkills && input.highlightedSkills.length > 0) {
        dataSections['HIGHLIGHTED SKILLS'] = [...input.highlightedSkills].sort().join(', ');
    }
    if (input.expectedSalary?.trim()) {
        dataSections['CANDIDATE EXPECTED SALARY'] = input.expectedSalary;
    }
    if (input.editedJobSalary?.trim()) {
        dataSections['USER-PROVIDED JOB SALARY'] = input.editedJobSalary;
    }
    if (input.initialEstimatedJobSalary?.trim()) {
        dataSections['JOB SALARY BENCHMARK'] = input.initialEstimatedJobSalary;
    }
    if (input.initialEstimatedCandidateSalary?.trim()) {
        dataSections['CANDIDATE SALARY BENCHMARK'] = input.initialEstimatedCandidateSalary;
    }

    const prompt = this._buildMasterPrompt(dataSections, FIT_ANALYSIS_SCHEMA);
    
    const parsedResult = await this._generateJsonContent<Omit<FitAnalysisData, 'overallScore'>>(prompt);

    if (!parsedResult) {
      return null;
    }
    
    // Sort arrays to ensure reproducible output order.
    if (parsedResult.strengths) {
      parsedResult.strengths.sort((a, b) => a.skill.localeCompare(b.skill));
    }
    if (parsedResult.concerns) {
      parsedResult.concerns.sort((a, b) => a.localeCompare(b));
    }
    if (parsedResult.unmentionedStrengths) {
      parsedResult.unmentionedStrengths.sort((a, b) => a.skill.localeCompare(b.skill));
    }
    
    const overallScore = this._calculateOverallScore(parsedResult.dimensionalAnalysis);
    
    return { ...parsedResult, overallScore };
  }
  
  async analyze(): Promise<AnalysisResult | null> {
    throw new Error('Worker services like OpenAiAnalyzerService should not be called for orchestration.');
  }
}
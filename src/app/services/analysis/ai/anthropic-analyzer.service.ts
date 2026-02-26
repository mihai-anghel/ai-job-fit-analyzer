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

declare var Anthropic: any; // From CDN

@Injectable({ providedIn: 'root' })
export class AnthropicAnalyzerService extends AnalysisService {
  private readonly _error = signal<string | null>(null);
  public readonly error = this._error.asReadonly();
  public readonly provider = 'anthropic';
  
  private anthropic: any | null = null;
  public model: string | null = null;

  constructor() {
    super();
  }
  
  override initialize(apiKey: string): void {
    if (apiKey && apiKey.trim() && typeof Anthropic !== 'undefined') {
      try {
        // Note: Anthropic's browser SDK requires a proxy. In AI Studio's environment, this is handled.
        // For local development, a proxy would need to be configured.
        this.anthropic = new Anthropic({ apiKey });
        this._error.set(null);
      } catch (e: any) {
        this.anthropic = null;
        this._error.set(`Failed to initialize Anthropic client: ${e.message}`);
      }
    } else if (apiKey && apiKey.trim() && typeof Anthropic === 'undefined') {
      this.anthropic = null;
      this._error.set("Anthropic SDK failed to load. Please check your internet connection or try refreshing.");
    } else {
      this.anthropic = null;
    }
  }

  override configure(model: string): void {
    this.model = model;
  }
  
  clearError(): void {
    this._error.set(null);
  }

  private _buildMasterPrompt(dataSections: { [key: string]: string }, schema: object): { systemPrompt: string, userPrompt: string } {
    // For Anthropic, we add a specific instruction to wrap the JSON in a tag for reliable extraction.
    const rules = `${MASTER_PROMPT_RULES}
12. CRITICAL: You MUST wrap your entire JSON response in a single <json_output> XML tag. For example: <json_output>{...}</json_output>.`;
    const systemPrompt = rules;

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
    if (!this.anthropic) {
        this._error.set("AI service is not initialized. Please configure the Anthropic API Key.");
        return null;
    }
    if (!this.model) {
        this._error.set("AI model is not configured.");
        return null;
    }

    let response;
    try {
        response = await this.anthropic.messages.create({
            model: this.model,
            system: prompt.systemPrompt,
            messages: [{ role: "user", content: prompt.userPrompt }],
            max_tokens: 4096, // A reasonable max for complex JSON
            temperature: 0,
            top_p: 1,
        });
    } catch (e: any) {
        console.error("Error during Anthropic API call:", e);
        let userFriendlyMessage = "An unexpected API error occurred during analysis.";
        // Anthropic SDK throws structured errors
        if (e?.status) {
            switch(e.status) {
                case 401:
                    userFriendlyMessage = "Anthropic API Error: Invalid API Key. Please check your key and try again.";
                    break;
                case 429:
                    userFriendlyMessage = "Anthropic API Error: Rate limit or quota exceeded. Please check your plan and billing details.";
                    break;
                case 500:
                    userFriendlyMessage = "Anthropic API Error: The server had an error while processing your request. Please try again later.";
                    break;
                default:
                    userFriendlyMessage = `Anthropic API Error: ${e.message || 'An unknown error occurred.'} (Status: ${e.status})`;
            }
        } else if (e.message) {
            userFriendlyMessage = e.message;
        }
        
        this._error.set(userFriendlyMessage);
        return null;
    }

    const rawText = response.content?.[0]?.text?.trim();

    if (!rawText) {
        const stopReason = response.stop_reason;
        if (stopReason === 'max_tokens') {
            this._error.set('The AI response was too long and was cut off. This can happen with very large documents.');
        } else {
            this._error.set(`The AI returned an empty response. Stop Reason: ${stopReason || 'Unknown'}.`);
        }
        return null;
    }

    // Extract JSON from between the tags
    const jsonMatch = rawText.match(/<json_output>([\s\S]*)<\/json_output>/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : null;

    if (!jsonString) {
        console.error("Could not find <json_output> tag in response:", rawText);
        this._error.set('The AI returned a response in an unexpected format. Could not find the JSON payload.');
        return null;
    }

    try {
        return JSON.parse(jsonString) as T;
    } catch (e: any) {
        console.error("Failed to parse Anthropic JSON response:", e, "Raw string:", jsonString);
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
    throw new Error('Worker services like AnthropicAnalyzerService should not be called for orchestration.');
  }
}
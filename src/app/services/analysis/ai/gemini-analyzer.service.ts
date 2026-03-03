import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Schema, GenerateContentResponse } from "@google/genai";

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

@Injectable({ providedIn: 'root' })
export class GeminiAnalyzerService extends AnalysisService {
  private readonly _error = signal<string | null>(null);
  public readonly error = this._error.asReadonly();
  public readonly provider = 'gemini';
  
  private ai: GoogleGenAI | null = null;
  public model: string | null = null;

  constructor() {
    super();
  }
  
  override initialize(apiKey: string): void {
    if (apiKey && apiKey.trim()) {
      this.ai = new GoogleGenAI({ apiKey });
      this._error.set(null);
    } else {
      this.ai = null;
    }
  }

  override configure(model: string): void {
    this.model = model;
  }
  
  clearError(): void {
    this._error.set(null);
  }

  private async _generateJsonContent<T>(prompt: string, schema: object): Promise<T | null> {
    if (!this.ai) {
        this._error.set("AI service is not initialized. Please configure the API Key.");
        return null;
    }
     if (!this.model) {
        this._error.set("AI model is not configured.");
        return null;
    }

    let response: GenerateContentResponse;
    try {
        // wrap request in a 30‑second timeout to avoid indefinite hangs
        const callPromise = this.ai.models.generateContent({
            model: this.model,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: schema as Schema,
                temperature: 0,
                seed: 42,
                topK: 1,
            }
        });
        response = await Promise.race([
            callPromise,
            new Promise<never>((_, rej) =>
              setTimeout(() => rej(new Error('AI request timed out (30s)')), 30000)
            )
        ]);
    } catch (e: any) {
        // handle timeout separately for user clarity
        if (e.message && e.message.includes('timed out')) {
            this._error.set('The AI service did not respond within 30 seconds. Please check your network or API key.');
            return null;
        }
        console.error("Error during AI content generation API call:", e);
        
        let userFriendlyMessage = "An unexpected API error occurred during analysis. Please check the console for details.";

        if (e?.message) {
            let parsedError;
            try {
                // The API error message can be a JSON string. Try to parse it.
                parsedError = JSON.parse(e.message);
            } catch (jsonParseError) {
                // If parsing fails, it's just a regular string message.
                userFriendlyMessage = e.message;
                this._error.set(userFriendlyMessage);
                return null;
            }

            if (parsedError?.error) {
                const errorDetails = parsedError.error;
                if (errorDetails.status === 'RESOURCE_EXHAUSTED' || errorDetails.code === 429) {
                    userFriendlyMessage = "API quota exceeded. You have made too many requests or your free tier limit has been reached. Please check your Google AI Studio plan and billing details.";
                } else if (errorDetails.message) {
                    // Use the message from the API error payload if it exists
                    userFriendlyMessage = `API Error: ${errorDetails.message}`;
                }
            } else {
                // It was JSON, but not in the expected { error: ... } format.
                console.error("Received an unhandled JSON error structure:", parsedError);
                userFriendlyMessage = "An unexpected API error occurred with an unknown format.";
            }
        }
        
        this._error.set(userFriendlyMessage);
        return null;
    }

    const jsonString = response.text?.trim();

    if (!jsonString) {
        const blockReason = response.candidates?.[0]?.finishReason;
        if (blockReason === 'SAFETY') {
            const message = 'The response was blocked due to safety concerns. Please review your input documents for sensitive or inappropriate content.';
            this._error.set(message);
            console.error(message, response.candidates?.[0]?.safetyRatings);
        } else {
            this._error.set(`The AI returned an empty response. Finish Reason: ${blockReason || 'Unknown'}.`);
        }
        return null;
    }

    try {
        return JSON.parse(jsonString) as T;
    } catch (e: any) {
        console.error("Failed to parse AI JSON response:", e);
        this._error.set(`The AI returned malformed JSON. Error: ${e.message}. Please try again.`);
        return null;
    }
  }

  private _buildMasterPromptForGemini(dataSections: { [key: string]: string }): string {
    const dataString = Object.entries(dataSections)
      .filter(([, value]) => value && value.trim())
      .map(([key, value]) => `------------------------------------------------------------
[[ ${key} ]]
${value}
[[ END ${key} ]]`)
      .join('\n');

    // This prompt is leaner. It does NOT include the stringified schema,
    // as it will be passed separately in the `responseSchema` config parameter.
    return `${MASTER_PROMPT_RULES}
${dataString}
------------------------------------------------------------
Now produce the JSON object based on the schema provided in the configuration.`;
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
    const prompt = this._buildMasterPromptForGemini(dataSections);
    return this._generateJsonContent<CvAnalysisData>(prompt, CV_ANALYSIS_SCHEMA);
  }

  async analyzeJd(input: JdAnalysisInput): Promise<JdAnalysisData | null> {
    this._error.set(null);
    const dataSections: { [key: string]: string } = { 'JOB DESCRIPTION': input.jdText };
    if (input.fallbackLocation) {
        dataSections['FALLBACK LOCATION'] = `CRITICAL: The job description's location could not be determined. Use the following location as the context for salary estimation: ${input.fallbackLocation}.`;
    }
    const prompt = this._buildMasterPromptForGemini(dataSections);
    return this._generateJsonContent<JdAnalysisData>(prompt, JD_ANALYSIS_SCHEMA);
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

    const prompt = this._buildMasterPromptForGemini(dataSections);
    
    const parsedResult = await this._generateJsonContent<Omit<FitAnalysisData, 'overallScore'>>(prompt, FIT_ANALYSIS_SCHEMA);

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
    throw new Error('Worker services like GeminiAnalyzerService should not be called for orchestration.');
  }
}
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
import { getProviderApiUrl } from '../../../config/ai-providers.config';

@Injectable({ providedIn: 'root' })
export class GeminiAnalyzerService extends AnalysisService {
  private readonly _error = signal<string | null>(null);
  public readonly error = this._error.asReadonly();
  public readonly provider = 'gemini';
  
  private apiKey: string | null = null;
  public model: string | null = null;

  constructor() {
    super();
  }
  
  override initialize(apiKey: string): void {
    this.apiKey = apiKey?.trim() ? apiKey.trim() : null;
    this._error.set(null);
  }

  override configure(model: string): void {
    this.model = model;
  }
  
  clearError(): void {
    this._error.set(null);
  }

  private async _generateJsonContent<T>(prompt: string, schema: object): Promise<T | null> {
     if (!this.model) {
        this._error.set("AI model is not configured.");
        return null;
    }
    if (!this.apiKey) {
        this._error.set('Gemini API key is not configured.');
        return null;
    }

    const baseUrl = getProviderApiUrl('gemini').replace(/\/+$/, '');
    const endpoint = `${baseUrl}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const payload = {
      model: this.model,
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0,
        seed: 42,
        topK: 1,
      },
    };

    let response: Response | null = null;
    let body: any = null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        body = await response.json();
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e?.name === 'AbortError') {
            this._error.set('The AI service did not respond within 30 seconds. Please check your network or API key.');
            return null;
        }
        console.error("Error during AI content generation API call:", e);
        this._error.set('Failed to reach Gemini. Check your network and configured Gemini API URL.');
        return null;
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response || !response.ok) {
        const status = response?.status ?? 0;
        const errorDetails = body?.error;
        if (errorDetails?.status === 'RESOURCE_EXHAUSTED' || status === 429) {
            this._error.set('API quota exceeded. You have made too many requests or your free tier limit has been reached.');
            return null;
        }
        const upstreamMessage = errorDetails?.message || errorDetails || 'Request failed';
        let message = `Gemini API Error: ${upstreamMessage} (Status: ${status})`;
        if (status === 401 || status === 403) {
            message = 'Gemini API Error: Invalid API key or insufficient permissions.';
        }
        this._error.set(message);
        return null;
    }

    const jsonString = body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!jsonString) {
        const blockReason = body?.candidates?.[0]?.finishReason;
        if (blockReason === 'SAFETY') {
            const message = 'The response was blocked due to safety concerns. Please review your input documents for sensitive or inappropriate content.';
            this._error.set(message);
            console.error(message, body?.candidates?.[0]?.safetyRatings);
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

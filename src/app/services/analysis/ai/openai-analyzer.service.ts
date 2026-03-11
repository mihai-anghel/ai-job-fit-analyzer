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
export class OpenAiAnalyzerService extends AnalysisService {
  private readonly _error = signal<string | null>(null);
  public readonly error = this._error.asReadonly();
  public readonly provider = 'openai';
  
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
    if (!this.model) {
        this._error.set("AI model is not configured.");
        return null;
    }
    if (!this.apiKey) {
        this._error.set('OpenAI API key is not configured.');
        return null;
    }

    const endpoint = getProviderApiUrl('openai');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      seed: 42,
      top_p: 1,
    };

    let response: Response;
    let body: any;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        body = await response.json();
    } catch (e: any) {
        if (e?.name === 'AbortError') {
            this._error.set('OpenAI request timed out after 45 seconds. Please try again.');
            return null;
        }
        console.error("Error during OpenAI API call:", e);
        this._error.set('Failed to reach OpenAI. Check your network and configured OpenAI API URL.');
        return null;
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const status = response.status;
      const upstreamMessage = body?.error?.message || body?.error || 'Request failed';
      let userFriendlyMessage = `OpenAI API Error: ${upstreamMessage} (Status: ${status})`;
      if (status === 401) {
        userFriendlyMessage = 'OpenAI API Error: Invalid API key.';
      } else if (status === 429) {
        userFriendlyMessage = 'OpenAI API Error: Rate limit or quota exceeded.';
      } else if (status === 500) {
        userFriendlyMessage = 'OpenAI API Error: Server error while processing your request.';
      }
      this._error.set(userFriendlyMessage);
      return null;
    }

    const jsonString = body?.choices?.[0]?.message?.content?.trim();

    if (!jsonString) {
        const finishReason = body?.choices?.[0]?.finish_reason;
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

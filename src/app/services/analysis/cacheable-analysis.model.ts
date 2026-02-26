import { 
  AiProvider,
  CvAnalysisInput,
  CvAnalysisData,
  JdAnalysisInput,
  JdAnalysisData,
  FitAnalysisInput,
  FitAnalysisData
} from '../../models/analysis.model';

function simpleHash(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

// --- Granular Caching Models for Final Analysis (Now state-aware) ---

export class CachedCvAnalysisData implements CvAnalysisData {
  private readonly cvTextHash: number;
  private readonly model: string;
  private readonly provider: AiProvider;
  candidateSummary: any;
  candidateInfo: any;
  cvAnalysis: any;
  estimatedCandidateSalary: any;
  candidateSalaryJustification: any;

  private constructor(cvTextHash: number, model: string, provider: AiProvider, result: CvAnalysisData) {
    this.cvTextHash = cvTextHash;
    this.model = model;
    this.provider = provider;
    Object.assign(this, result);
  }
  
  static create(input: CvAnalysisInput, result: CvAnalysisData, provider: AiProvider, model: string): CachedCvAnalysisData {
    const cvHash = simpleHash(input.cvText);
    return new CachedCvAnalysisData(cvHash, model, provider, result);
  }
  
  static revive(obj: any): CachedCvAnalysisData | null {
    if (!obj || typeof obj.cvTextHash !== 'number' || !obj.model || !obj.provider || !obj.result) return null;
    return new CachedCvAnalysisData(obj.cvTextHash, obj.model, obj.provider, obj.result);
  }
  
  isValid(input: CvAnalysisInput, provider: AiProvider, model: string): boolean {
    const currentCvHash = simpleHash(input.cvText);
    return this.provider === provider && this.model === model && this.cvTextHash === currentCvHash;
  }
}

export class CachedJdAnalysisData implements JdAnalysisData {
  private readonly jdTextHash: number;
  private readonly model: string;
  private readonly provider: AiProvider;
  private readonly fallbackLocation?: string;
  jobSummary: any;
  jobInfo: any;
  jdAnalysis: any;
  requirements: any;
  estimatedJobSalary: any;
  jobSalaryJustification: any;

  private constructor(jdTextHash: number, model: string, provider: AiProvider, fallbackLocation: string | undefined, result: JdAnalysisData) {
    this.jdTextHash = jdTextHash;
    this.model = model;
    this.provider = provider;
    this.fallbackLocation = fallbackLocation;
    Object.assign(this, result);
  }
  
  static create(input: JdAnalysisInput, result: JdAnalysisData, provider: AiProvider, model: string): CachedJdAnalysisData {
    const jdHash = simpleHash(input.jdText);
    return new CachedJdAnalysisData(jdHash, model, provider, input.fallbackLocation, result);
  }
  
  static revive(obj: any): CachedJdAnalysisData | null {
    if (!obj || typeof obj.jdTextHash !== 'number' || !obj.model || !obj.provider || !obj.result) return null;
    return new CachedJdAnalysisData(obj.jdTextHash, obj.model, obj.provider, obj.fallbackLocation, obj.result);
  }
  
  isValid(input: JdAnalysisInput, provider: AiProvider, model: string): boolean {
    const currentJdHash = simpleHash(input.jdText);
    return this.provider === provider && this.model === model && this.jdTextHash === currentJdHash && this.fallbackLocation === input.fallbackLocation;
  }
}

export class CachedFitAnalysisData implements FitAnalysisData {
  private readonly jdTextHash: number;
  private readonly cvTextHash: number;
  private readonly model: string;
  private readonly provider: AiProvider;
  private readonly skillsKey: string;
  private readonly expectedSalary?: string;
  private readonly editedJobSalary?: string;
  private readonly initialEstimatedCandidateSalary?: string;
  private readonly initialEstimatedJobSalary?: string;
  evaluationSummary: any;
  matchStrength: any;
  dimensionalAnalysis: any;
  strengths: any;
  improves: any;
  questionsForCandidate: any;
  questionsForInterviewer: any;
  suggestedSkills: any;
  concerns: any;
  unmentionedStrengths: any;
  questionsToAsk: any;
  overallScore: any;

  private constructor(
    hashes: { jd: number, cv: number, skills: string },
    config: { provider: AiProvider, model: string },
    salaries: { expected?: string, editedJob?: string, initialCandidate?: string, initialJob?: string },
    result: FitAnalysisData
  ) {
    this.jdTextHash = hashes.jd;
    this.cvTextHash = hashes.cv;
    this.skillsKey = hashes.skills;
    this.provider = config.provider;
    this.model = config.model;
    this.expectedSalary = salaries.expected;
    this.editedJobSalary = salaries.editedJob;
    this.initialEstimatedCandidateSalary = salaries.initialCandidate;
    this.initialEstimatedJobSalary = salaries.initialJob;
    Object.assign(this, result);
  }

  static create(input: FitAnalysisInput, result: FitAnalysisData, provider: AiProvider, model: string): CachedFitAnalysisData {
    const hashes = {
      jd: simpleHash(input.jdText),
      cv: simpleHash(input.cvText),
      skills: [...input.highlightedSkills].sort().join(',')
    };
    const config = { provider, model };
    const salaries = {
      expected: input.expectedSalary,
      editedJob: input.editedJobSalary,
      initialCandidate: input.initialEstimatedCandidateSalary,
      initialJob: input.initialEstimatedJobSalary
    };
    return new CachedFitAnalysisData(hashes, config, salaries, result);
  }

  static revive(obj: any): CachedFitAnalysisData | null {
    if (!obj || typeof obj.jdTextHash !== 'number' || typeof obj.cvTextHash !== 'number' || !obj.model || !obj.provider || typeof obj.skillsKey !== 'string' || !obj.result) return null;
    
    const hashes = { jd: obj.jdTextHash, cv: obj.cvTextHash, skills: obj.skillsKey };
    const config = { provider: obj.provider, model: obj.model };
    const salaries = {
      expected: obj.expectedSalary,
      editedJob: obj.editedJobSalary,
      initialCandidate: obj.initialEstimatedCandidateSalary,
      initialJob: obj.initialEstimatedJobSalary
    };
    return new CachedFitAnalysisData(hashes, config, salaries, obj.result);
  }

  isValid(input: FitAnalysisInput, provider: AiProvider, model: string): boolean {
    const currentJdHash = simpleHash(input.jdText);
    const currentCvHash = simpleHash(input.cvText);
    const currentSkillsKey = [...input.highlightedSkills].sort().join(',');
    
    return this.provider === provider &&
           this.model === model &&
           this.jdTextHash === currentJdHash &&
           this.cvTextHash === currentCvHash &&
           this.skillsKey === currentSkillsKey &&
           this.expectedSalary === input.expectedSalary &&
           this.editedJobSalary === input.editedJobSalary &&
           this.initialEstimatedCandidateSalary === input.initialEstimatedCandidateSalary &&
           this.initialEstimatedJobSalary === input.initialEstimatedJobSalary;
  }
}
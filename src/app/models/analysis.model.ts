import { AiProvider } from "../config/ai-providers.config";

export type { AiProvider };

export type SalarySource = 'extracted' | 'estimated' | 'manual' | 'cached-manual';

export type FileType = 'jd' | 'cv';
export type ViewState = 'input' | 'analyzing' | 'confirmingSkills' | 'results';

export interface JobSalaryEstimate {
  estimatedJobSalary: string;
  jobSalaryJustification: string;
}

// --- Granular Analysis Parameter Interfaces ---

export interface CvAnalysisInput {
  cvText: string;
}

export interface JdAnalysisInput {
  jdText: string;
  // Optional location from the CV to improve salary estimation if the JD is missing a location.
  fallbackLocation?: string; 
}

export interface FitAnalysisInput {
  cvText: string;
  jdText: string;
  highlightedSkills: string[];
  expectedSalary?: string;
  editedJobSalary?: string;
  initialEstimatedCandidateSalary?: string;
  initialEstimatedJobSalary?: string;
}


// For backward compatibility and simplicity in the AppComponent
export type AnalysisInput = FitAnalysisInput;


// --- Data Model Interfaces ---

export interface Metric {
  score: number;
  feedback: string;
}

export interface DimensionalAnalysis {
  qualificationMatch: Metric;
  capabilityConfidence: Metric;
  situationalStability: Metric;
  rewardPotential: Metric;
  cultureFit: Metric;
  careerTrajectory: Metric;
  compensationFit: Metric;
  learningVelocity: Metric;
  techStackModernity: Metric;
}

export interface CandidateInfo {
  name: string;
  homeLocation: string;
  currentCompany: string;
  currentCompanyLocation: string;
  currentRole: string;
  currentRoleStartDate: string;
  currentRoleEndDate: string;
  expectedSalaryFromCv?: string;
}

export interface JobInfo {
  title: string;
  companyName: string;
  recruitingAgency?: string;
  companyDescription?: string;
  location: string;
  employmentType: string;
  workModel: string;
  salaryRange: string;
}

export interface StrengthItem {
  skill: string;
  description: string;
}

export interface CvQualityAnalysis {
  clarityAndConciseness: { score: number; feedback: string };
  actionOrientedLanguage: { score: number; feedback: string };
  quantifiableAchievements: { score: number; feedback: string };
  professionalismAndFormatting: { score: number; feedback: string };
  careerNarrativeCohesion: { score: number; feedback: string };
  candidateSalaryAlignment?: { score: number; feedback: string };
}

export interface JdQualityAnalysis {
  clarityOfRole: { score: number; feedback: string };
  specificityOfRequirements: { score: number; feedback:string };
  focusAndRealism?: { score: number; feedback: string };
  languageRequirementJustification?: { score: number; feedback: string };
  inclusiveLanguage: { score: number; feedback: string };
  discriminationRisk?: { score: number; feedback: string };
  toneAndCulture: { score: number; feedback: string };
  jobSalaryAlignment?: { score: number; feedback: string };
}

export interface DocumentQualityAnalysis {
  cvAnalysis: CvQualityAnalysis;
  jdAnalysis: JdQualityAnalysis;
}

// --- Granular Analysis Data Interfaces ---

export interface CvAnalysisData {
  candidateSummary: string;
  candidateInfo: CandidateInfo;
  cvAnalysis: CvQualityAnalysis;
  // Fields moved from InitialAnalysisData
  estimatedCandidateSalary: string;
  candidateSalaryJustification: string;
}

export interface JdAnalysisData {
  jobSummary: string[];
  jobInfo: JobInfo;
  jdAnalysis: JdQualityAnalysis;
  // Fields moved from InitialAnalysisData
  requirements: string[];
  estimatedJobSalary: string;
  jobSalaryJustification: string;
}

export interface FitAnalysisData {
  evaluationSummary: string;
  matchStrength: string;
  dimensionalAnalysis: DimensionalAnalysis;
  strengths: StrengthItem[];
  concerns: string[];
  unmentionedStrengths: StrengthItem[];
  questionsToAsk: string[];
  questionsForCandidate?: string[];
  overallScore: number;
}


// --- Final Combined Analysis Result ---

export interface AnalysisResult {
  // From CvAnalysisData
  candidateSummary: string;
  candidateInfo: CandidateInfo;
  
  // From JdAnalysisData
  jobSummary: string[];
  jobInfo: JobInfo;
  
  // From FitAnalysisData
  evaluationSummary: string;
  matchStrength: string;
  dimensionalAnalysis: DimensionalAnalysis;
  strengths: StrengthItem[];
  concerns: string[];
  unmentionedStrengths: StrengthItem[];
  questionsToAsk: string[];
  questionsForCandidate?: string[];
  overallScore: number;

  // Composed from CvAnalysisData and JdAnalysisData
  documentQualityAnalysis?: DocumentQualityAnalysis;
}
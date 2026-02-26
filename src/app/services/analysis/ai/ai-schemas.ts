import {
  CandidateInfo,
  CvQualityAnalysis,
  DimensionalAnalysis,
  JdQualityAnalysis,
  JobInfo,
  Metric,
  StrengthItem,
  CvAnalysisData,
  JdAnalysisData,
  FitAnalysisData
} from '../../../models/analysis.model';

// --- STRONGLY-TYPED SCHEMA DEFINITIONS ---

// Base types for primitive schema properties
type AiStringProperty = {
  type: 'STRING';
  description: string;
};

type AiIntegerProperty = {
  type: 'INTEGER';
  description: string;
};

// Strongly-typed schema for an object, ensuring all keys of T are present and in order
type AiObjectSchema<T extends object> = {
  type: 'OBJECT';
  description: string;
  properties: { [K in keyof T]: AiSchemaProperty };
  propertyOrdering: Extract<keyof T, string>[];
};

// Generic type for an Array property. The items themselves can be any valid property.
type AiArrayProperty = {
  type: 'ARRAY';
  description: string;
  items: AiSchemaProperty;
};

// Discriminated union for any valid schema property.
// This is the core of the strong typing. A property is one of these specific types.
// This eliminates optional properties like `items` or `propertyOrdering` on types where they don't belong.
type AiSchemaProperty = AiStringProperty | AiIntegerProperty | AiArrayProperty | AiObjectSchema<any>;


// --- SHARED CONSTANTS ---

export const MASTER_PROMPT_RULES = `You are a world-class HR analyst AI with a deep knowledge in the domain of the job you analyze. You must perform a fully deterministic analysis.
ABSOLUTE RULES:
1. Your output MUST be a single, VALID JSON object that STRICTLY matches the schema I provide.
2. NO variation is allowed. If you run this prompt again with the same inputs, the JSON must be exactly identical byte-for-byte.
3. No creative wording, no paraphrasing, no stylistic randomness.
4. Use ONLY English.
5. Arrays must be SORTED NATURALLY whenever possible.
6. Ignore all gender-inclusive markers in job titles such as (m/f/d), (w/m/d), (all genders).
7. Use intelligent semantic inference: if someone knows PostgreSQL, they know SQL and relational databases; if they know Spring Boot, they know Spring and Java.
8. When evaluating compensation fit, convert all salaries to the same currency implicitly.
9. If a field is not applicable, return an empty string, empty array, or null EXACTLY as required by the schema.
10. Do not add, remove, or reorder keys. The order of keys in the JSON you generate MUST match the provided schema's 'propertyOrdering' where available.
11. You MUST respond with JSON only. No introductory text, no commentary, no explanations, no markdown code blocks. Just the raw JSON object.`;


// --- FULL ANALYSIS SCHEMAS & SUB-SCHEMAS ---

const METRIC_SCHEMA = (description: string): AiObjectSchema<Metric> => ({
  type: 'OBJECT',
  description: "A single object containing the score and the justification for it.",
  properties: {
    score: {
      type: 'INTEGER',
      description: description
    },
    feedback: {
      type: 'STRING',
      description: "A concise, one-sentence justification for the score, specific to the candidate and job. This MUST explain the 'why' behind the score."
    }
  },
  propertyOrdering: ['score', 'feedback']
});

const CV_QUALITY_SCHEMA: AiObjectSchema<CvQualityAnalysis> = {
  type: 'OBJECT',
  description: "An analysis of the Candidate's CV.",
  properties: {
    clarityAndConciseness: METRIC_SCHEMA("Score (0-100) for clarity, scannability, and freedom from jargon."),
    actionOrientedLanguage: METRIC_SCHEMA("Score (0-100) for the use of strong, active verbs to describe accomplishments."),
    quantifiableAchievements: METRIC_SCHEMA("Score (0-100) for using metrics and data to demonstrate impact."),
    professionalismAndFormatting: METRIC_SCHEMA("Score (0-100) for freedom from typos/grammar errors and consistent formatting."),
    careerNarrativeCohesion: {
      type: 'OBJECT', description: "Score (0-100) for how well the CV tells a clear and compelling story of professional growth. A high score indicates a logical, focused career path. A low score suggests a scattered or unfocused work history that doesn't build towards a clear goal.", properties: { score: { type: 'INTEGER', description: "Score (0-100) for how well the CV tells a clear and compelling story of professional growth. A high score indicates a logical, focused career path. A low score suggests a scattered or unfocused work history that doesn't build towards a clear goal." }, feedback: { type: 'STRING', description: "Concise feedback on the career story, e.g., 'The CV shows a clear progression in backend development roles.' or 'The career path seems unfocused, with frequent changes between unrelated fields.'" } }, propertyOrdering: ['score', 'feedback']
    } as AiObjectSchema<Metric>,
    candidateSalaryAlignment: {
      type: 'OBJECT',
      description: "An analysis of the Candidate's CV salary alignment.",
      properties: {
        score: {
          type: 'INTEGER',
          description: "CRITICAL: You MUST ONLY generate this entire 'candidateSalaryAlignment' object if an expected salary is explicitly mentioned in the Candidate CV. If no salary is mentioned, you MUST OMIT this object from your response. Score (0-100) for how realistic the candidate's expected salary is compared to the AI's objective market-rate estimate for their profile. A high score means the expectation is aligned with the market."
        },
        feedback: {
          type: 'STRING',
          description: "A concise, one-sentence justification for the score, specific to the candidate and job. This MUST explain the 'why' behind the score."
        }
      },
      propertyOrdering: ['score', 'feedback']
    } as AiObjectSchema<Metric>
  },
  propertyOrdering: ['clarityAndConciseness', 'actionOrientedLanguage', 'quantifiableAchievements', 'professionalismAndFormatting', 'careerNarrativeCohesion', 'candidateSalaryAlignment']
};

const JD_QUALITY_SCHEMA: AiObjectSchema<JdQualityAnalysis> = {
  type: 'OBJECT',
  description: "An analysis of the Job Description.",
  properties: {
    clarityOfRole: METRIC_SCHEMA("Score (0-100) for how clearly the role and its responsibilities are defined."),
    specificityOfRequirements: METRIC_SCHEMA("Score (0-100) for using specific, unambiguous language for requirements."),
    focusAndRealism: {
      type: 'OBJECT', description: "Score (0-100) for how focused and realistic the technical requirements are. CRITICAL: You must detect 'unicorn' job posts. First, identify the primary role archetype (e.g., Backend Engineer, Frontend Engineer, DevOps). A high score is for JDs with requirements tightly focused on ONE primary archetype. A low score MUST be given if the JD demands deep, expert-level skills (look for words like 'excellent', 'expert', 'deep know-how') across multiple distinct archetypes simultaneously. Example of a low-scoring 'unicorn' post: A 'Fullstack Developer' role that requires 'excellent' skills in Java (Backend), React/Angular/Vue (Frontend), and Kubernetes/CI/CD (DevOps). You MUST also distinguish between mandatory requirements and 'nice-to-haves' (e.g., 'wünschenswert', 'von Vorteil', 'plus'). A long list of mandatory requirements spanning multiple domains is a strong negative signal.", properties: { score: { type: 'INTEGER', description: "Score (0-100) for how focused and realistic the technical requirements are. CRITICAL: You must detect 'unicorn' job posts. First, identify the primary role archetype (e.g., Backend Engineer, Frontend Engineer, DevOps). A high score is for JDs with requirements tightly focused on ONE primary archetype. A low score MUST be given if the JD demands deep, expert-level skills (look for words like 'excellent', 'expert', 'deep know-how') across multiple distinct archetypes simultaneously. Example of a low-scoring 'unicorn' post: A 'Fullstack Developer' role that requires 'excellent' skills in Java (Backend), React/Angular/Vue (Frontend), and Kubernetes/CI/CD (DevOps). You MUST also distinguish between mandatory requirements and 'nice-to-haves' (e.g., 'wünschenswert', 'von Vorteil', 'plus'). A long list of mandatory requirements spanning multiple domains is a strong negative signal." }, feedback: { type: 'STRING', description: "Concise feedback explaining the reasoning for the score. For a low score, explicitly state that the role seems unrealistic, e.g., 'The role requires expert-level skills across multiple distinct specializations (Backend, Frontend, DevOps), which is unrealistic for a single individual.'" } }, propertyOrdering: ['score', 'feedback']
    } as AiObjectSchema<Metric>,
    languageRequirementJustification: {
      type: 'OBJECT', description: "Score (0-100) for how well language requirements are justified by the role's function. CRITICAL: Your analysis MUST be context-aware. Give a LOW score (< 40) if 'native speaker' level is required for a role that is primarily technical and often part of an international team (e.g., Backend Developer, Data Scientist, Cloud Engineer), as this is an excessive barrier. Give a HIGH score ONLY if fluency is clearly essential for the role's core duties (e.g., client-facing sales, local HR, public relations).", properties: { score: { type: 'INTEGER', description: "Score (0-100) for how well language requirements are justified by the role's function. CRITICAL: Your analysis MUST be context-aware. Give a LOW score (< 40) if 'native speaker' level is required for a role that is primarily technical and often part of an international team (e.g., Backend Developer, Data Scientist, Cloud Engineer), as this is an excessive barrier. Give a HIGH score ONLY if fluency is clearly essential for the role's core duties (e.g., client-facing sales, local HR, public relations)." }, feedback: { type: 'STRING', description: "Concise feedback explaining the reasoning for the score. For a low score, explain why the requirement may be unjustified, e.g., 'Requiring native-level German for a backend developer role is an unnecessary barrier that excludes international talent; business-level proficiency should suffice.'" } }, propertyOrdering: ['score', 'feedback']
    } as AiObjectSchema<Metric>,
    inclusiveLanguage: METRIC_SCHEMA("Score (0-100) for using inclusive language and avoiding corporate jargon or biased terms."),
    discriminationRisk: {
      type: 'OBJECT', description: "Score (0-100) for how well the job description avoids potentially discriminatory language. CRITICAL: A high score indicates a low risk. A low score indicates a high risk. You MUST scrutinize the text for subtle biases. Give a LOW score if you find any of the following: age-related bias (e.g., 'young and dynamic', 'recent graduate'), gendered language without inclusive alternatives, unnecessary physical requirements that could exclude people with disabilities, or any language that implies preference for a specific nationality, marital status, or family status.", properties: { score: { type: 'INTEGER', description: "Score (0-100) for how well the job description avoids potentially discriminatory language. CRITICAL: A high score indicates a low risk. A low score indicates a high risk. You MUST scrutinize the text for subtle biases. Give a LOW score if you find any of the following: age-related bias (e.g., 'young and dynamic', 'recent graduate'), gendered language without inclusive alternatives, unnecessary physical requirements that could exclude people with disabilities, or any language that implies preference for a specific nationality, marital status, or family status." }, feedback: { type: 'STRING', description: "Concise, direct, and professional feedback. For a low score, you MUST explain the potential risk (e.g., 'The phrase `young and dynamic` could be interpreted as age discrimination.')." } }, propertyOrdering: ['score', 'feedback']
    } as AiObjectSchema<Metric>,
    toneAndCulture: METRIC_SCHEMA("Score (0-100) for having a consistent and appropriate tone that reflects the company culture."),
    jobSalaryAlignment: {
      type: 'OBJECT',
      description: "An analysis of the Job Description salary alignment.",
      properties: {
        score: {
          type: 'INTEGER',
          description: "CRITICAL: You MUST ONLY generate this entire 'jobSalaryAlignment' object if a salary or salary range is explicitly mentioned in the Job Description. If no salary is mentioned, you MUST OMIT this object from your response. Score (0-100) for how well the salary from the job description aligns with the AI's objective market-rate estimate. A high score means the offered salary is competitive."
        },
        feedback: {
          type: 'STRING',
          description: "CRITICAL: Your feedback MUST be based ONLY on the comparison between the job's explicit salary and the objective market-rate estimate for the ROLE. You MUST NOT reference the candidate's profile or experience in this feedback. Example: 'Offered salary is competitive for the market.'"
        }
      },
      propertyOrdering: ['score', 'feedback']
    } as AiObjectSchema<Metric>
  },
  propertyOrdering: ['clarityOfRole', 'specificityOfRequirements', 'focusAndRealism', 'languageRequirementJustification', 'inclusiveLanguage', 'discriminationRisk', 'toneAndCulture', 'jobSalaryAlignment']
};

const CANDIDATE_INFO_SCHEMA: AiObjectSchema<CandidateInfo> = {
  type: 'OBJECT',
  description: "Structured information about the candidate. Extract from the CV. Translate to English where necessary, but DO NOT translate the candidate's name.",
  properties: {
    name: { type: 'STRING', description: "The candidate's full name. Do not translate this." },
    currentRole: { type: 'STRING', description: "The candidate's current or most recent job title/role. Translate to English." },
    currentRoleStartDate: { type: 'STRING', description: "The start date of the candidate's current or most recent role. Format as 'Month YYYY' (e.g., 'May 2012'). Translate to English." },
    currentRoleEndDate: { type: 'STRING', description: "The end date of the candidate's current or most recent role. If the candidate is still in this role, this value MUST be the string 'Present'. Format as 'Month YYYY' (e.g., 'June 2023') or 'Present'. Translate to English." },
    homeLocation: { type: 'STRING', description: "The candidate's personal/home location (e.g., city, country). Translate to English." },
    currentCompany: { type: 'STRING', description: "The candidate's current or most recent company. Translate to English." },
    currentCompanyLocation: { type: 'STRING', description: "The location of the candidate's current or most recent company. If not specified, it might be the same as homeLocation. Translate to English." },
    expectedSalaryFromCv: { type: 'STRING', description: "The salary expectation or range mentioned in the CV. Format as a string including currency and 'per year'. If no salary is mentioned, this MUST be null or an empty string." }
  },
  propertyOrdering: ['name', 'currentRole', 'currentRoleStartDate', 'currentRoleEndDate', 'homeLocation', 'currentCompany', 'currentCompanyLocation', 'expectedSalaryFromCv']
};

const JOB_INFO_SCHEMA: AiObjectSchema<JobInfo> = {
  type: 'OBJECT',
  description: "Structured information about the job. Extract from the job description. Translate to English where necessary.",
  properties: {
    title: { type: 'STRING', description: "The job title. Translate to English." },
    companyName: {
      type: 'STRING',
      description: "CRITICAL: Extract the specific, proper noun name of the hiring company where the candidate will ultimately work (the end client). This field MUST contain the company's actual name (e.g., 'Acme Corporation', 'Innovatech Ltd.'), NOT a generic description (e.g., 'a leading fintech company'). If a recruiter is posting on behalf of a client, this field MUST contain the client's proper name. If the client's name is truly not mentioned anywhere, you MUST return null."
    },
    recruitingAgency: { type: 'STRING', description: "The name of the recruiting agency, consultancy, OR INDIVIDUAL RECRUITER that posted the job, if mentioned. Look for phrases like 'We are recruiting for our client', '[Agency Name] is hiring on behalf of...', or a recruiter's name and title. If the job is posted directly by the employer, this MUST be null." },
    companyDescription: { type: 'STRING', description: "A brief, one or two-sentence summary of the company, extracted from the job description. Focus on what the company does or its mission. If no description is available, this should be null or an empty string." },
    location: { type: 'STRING', description: "The job location (e.g., city, country). Translate to English." },
    employmentType: { type: 'STRING', description: "The type of employment (e.g., 'Permanent', 'Full-time', 'Contract'). Translate to English." },
    workModel: { type: 'STRING', description: "The work model (e.g., 'Remote', 'Hybrid', 'On-site'). Translate to English." },
    salaryRange: { type: 'STRING', description: "The salary range mentioned in the job description. Format as a string including currency (EUR) and 'per year' (e.g., '€80,000 - €100,000 per year'). If no salary is mentioned, this should be null or an empty string." }
  },
  propertyOrdering: ['title', 'companyName', 'recruitingAgency', 'companyDescription', 'location', 'employmentType', 'workModel', 'salaryRange']
};


// --- Granular Top-Level Schemas ---

export const CV_ANALYSIS_SCHEMA: AiObjectSchema<CvAnalysisData> = {
  type: 'OBJECT',
  description: "Schema for a CV-only analysis. It extracts candidate summary, profile information, quality scores, and a market-rate salary estimate for the candidate.",
  properties: {
    candidateSummary: {
      type: 'STRING',
      description: "In English, a concise paragraph summarizing the candidate's professional profile, key experience areas, and career trajectory based on their CV."
    },
    candidateInfo: CANDIDATE_INFO_SCHEMA,
    cvAnalysis: CV_QUALITY_SCHEMA,
    estimatedCandidateSalary: {
      type: 'STRING',
      description: "CRITICAL: This field MUST contain ONLY the salary string (e.g., '€95,000 per year') and NOTHING else. Your estimate MUST be based on the CANDIDATE CV's profile (roles, experience, skills, and extracted location) ONLY. You MUST IGNORE any desired salary figures explicitly mentioned in the CV text to provide an objective, unbiased market-rate estimation. Estimate their expected yearly salary in the currency appropriate for their location (e.g., RON for Romania, EUR for Germany). You MUST adjust your estimate to reflect the local economic context and purchasing power of the specified country or city. Do not use salary data from high-cost regions for a candidate located in a region with a different economic scale. If the location is missing, provide a broad estimate. Format as a single value string including 'per year' (e.g., '€95,000 per year')."
    },
    candidateSalaryJustification: {
      type: 'STRING',
      description: "A brief, one-sentence justification for the 'estimatedCandidateSalary' provided, explaining the reasoning based on the CANDIDATE CV (e.g., 'Based on 8 years of experience in senior roles and cloud expertise.' or 'Based on a strong track record of leading successful marketing campaigns and 10 years of experience.'). IN ENGLISH."
    }
  },
  propertyOrdering: ['candidateSummary', 'candidateInfo', 'cvAnalysis', 'estimatedCandidateSalary', 'candidateSalaryJustification']
};

export const JD_ANALYSIS_SCHEMA: AiObjectSchema<JdAnalysisData> = {
  type: 'OBJECT',
  description: "Schema for a JD-only analysis. It extracts the job summary, structured job information, quality scores, key requirements, and a market-rate salary estimate for the role.",
  properties: {
    jobSummary: {
      type: 'ARRAY',
      description: "In English, 5-10 bullet points summarizing the job description, focusing on key responsibilities and required experience.",
      items: { type: 'STRING', description: 'A single bullet point summarizing a key aspect of the job.' }
    },
    jobInfo: JOB_INFO_SCHEMA,
    jdAnalysis: JD_QUALITY_SCHEMA,
    requirements: {
      type: 'ARRAY',
      description: "From the JOB DESCRIPTION, extract a list of concise, tag-like key skills, core competencies, and qualifications. CRITICAL: You MUST infer higher-level skills from specific ones mentioned. For technical roles, if 'Spring Boot' is mentioned, include 'Spring Boot' and 'Backend Development'. For non-technical roles, if 'SEO/SEM campaigns' is mentioned, include 'Digital Marketing' and 'Performance Marketing'. Focus on concrete skills and their parent categories. Exclude generic soft skills and educational degrees.",
      items: { type: 'STRING', description: 'A single, concise skill or qualification extracted from the job description.' }
    },
    estimatedJobSalary: {
        type: 'STRING',
        description: "CRITICAL: Your estimate MUST be based on the JOB DESCRIPTION's title, responsibilities, and extracted 'location'. If the 'location' is missing, you MUST use the user-provided 'FALLBACK LOCATION' (if available) as the context for your estimation. You MUST IGNORE any salary figures explicitly mentioned in the job description text to provide an objective, unbiased market-rate comparison. ALWAYS provide a realistic market-rate salary estimate in the currency appropriate for the job's location (e.g., RON for Romania, EUR for Germany). You MUST adjust your estimate to reflect the local economic context and purchasing power of the specified country or city. Do not use salary data from high-cost regions (like Germany or the USA) for a role located in a region with a different economic scale (like Romania). If the location is missing and there is no fallback, provide a broad estimate based on the language or other context, but do not default to a high-cost region. Format as a descriptive string including 'per year', e.g., '€80,000 - €100,000 per year'."
    },
    jobSalaryJustification: {
      type: 'STRING',
      description: "A brief, one-sentence justification for the 'estimatedJobSalary' provided, explaining the reasoning based on the JOB DESCRIPTION (e.g., 'Based on a senior developer role in Berlin requiring 5+ years of Java experience.' or 'Based on a Marketing Manager role in London with 7+ years of experience in B2B SaaS.'). IN ENGLISH."
    }
  },
  propertyOrdering: ['jobSummary', 'jobInfo', 'jdAnalysis', 'requirements', 'estimatedJobSalary', 'jobSalaryJustification']
};

// The AI schema for fit analysis should not include `overallScore` as it's calculated client-side.
type FitAnalysisDataFromAI = Omit<FitAnalysisData, 'overallScore'>;

export const FIT_ANALYSIS_SCHEMA: AiObjectSchema<FitAnalysisDataFromAI> = {
  type: 'OBJECT',
    description: "Schema for the fit analysis comparing a CV and a job description.",
    properties: {
      evaluationSummary: {
        type: 'STRING',
        description: "In English, a concise paragraph explaining why the candidate received their overall score and fit rating. It MUST connect the dimensional analysis scores to the job requirements and the candidate's profile, providing a clear justification for the evaluation."
      },
      matchStrength: {
        type: 'STRING',
        description: 'In English, a short, descriptive title for the match level (e.g., "Strong Match", "Good Fit", "Potential Gap").'
      },
      dimensionalAnalysis: {
        type: 'OBJECT',
        description: "Scores from 0 to 100 for each of the dimensions, each with a feedback justification.",
        properties: {
          qualificationMatch: METRIC_SCHEMA("Score for the on-paper, 'checklist' match of the candidate's skills and experience against the job's explicit requirements. CRITICAL: Your analysis MUST be context-aware of the role's specialization. First, determine if the job requires a highly specific educational degree (e.g., 'Bioinformatics', 'Cheminformatics', 'Computational Biology'). If such a specific degree is required, you MUST give a LOW score if the candidate has a generalist degree (e.g., 'Computer Science'), as this represents a significant 'domain gap'. A generalist degree is NOT a suitable substitute for a specialized scientific one in this context."),
          capabilityConfidence: METRIC_SCHEMA("Score for proven impact and execution. This goes beyond the checklist and evaluates the candidate's track record of using their skills to deliver quantifiable results and achievements, giving confidence they can perform the job's duties effectively."),
          situationalStability: METRIC_SCHEMA("Score for likelihood to join and stay."),
          rewardPotential: METRIC_SCHEMA("Score for upside if hired, potential for growth."),
          cultureFit: METRIC_SCHEMA("Score for alignment with typical company culture for this type of role."),
          careerTrajectory: METRIC_SCHEMA("Score for growth potential over time within the company."),
          compensationFit: {
            type: 'OBJECT',
            description: "An analysis of the compensation fit.",
            properties: {
              score: {
                type: 'INTEGER',
                description: "Score for compensation alignment. CRITICAL: Before calculating this score, you MUST convert all salary figures to a common currency for an accurate comparison."
              },
              feedback: {
                type: 'STRING',
                description: `CRITICAL: Your feedback MUST be context-aware of the salary data sources provided. You MUST tailor your one-sentence justification based on the following four scenarios:
1.  **If comparing CANDIDATE EXPECTED SALARY vs USER-PROVIDED JOB SALARY (both explicit):** Your feedback must reflect this direct comparison (e.g., "The candidate's expectation aligns well with the stated salary range for the role.").
2.  **If comparing CANDIDATE EXPECTED SALARY (explicit) vs JOB SALARY BENCHMARK (AI-estimated):** Your feedback must clearly state this (e.g., "The candidate's expectation is in line with the AI's market-rate estimate for this position.").
3.  **If comparing CANDIDATE SALARY BENCHMARK (AI-estimated) vs USER-PROVIDED JOB SALARY (explicit):** Your feedback must also be specific (e.g., "The AI's market-rate estimate for the candidate fits comfortably within the job's stated salary range.").
4.  **If comparing CANDIDATE SALARY BENCHMARK vs JOB SALARY BENCHMARK (both AI-estimated):** Your feedback must make this clear (e.g., "The AI's market-rate estimates for both the candidate and the role are well-aligned.").`
              }
            },
            propertyOrdering: ['score', 'feedback']
          } as AiObjectSchema<Metric>,
          learningVelocity: METRIC_SCHEMA("Score for the candidate's demonstrated ability to learn and adapt quickly. Analyze the CV for indicators like self-teaching, certifications, rapid adoption of new technologies, or a history of moving into roles with different tech stacks."),
          techStackModernity: METRIC_SCHEMA("Score for how up-to-date the candidate's skills are. A high score reflects recent experience with modern tools (e.g., Docker, Kubernetes) and current versions of frameworks. A candidate with long experience in a technology but who hasn't used it in the last 5-10 years should receive a lower score for that skill's contribution, as the experience may be outdated."),
        },
        propertyOrdering: ['qualificationMatch', 'capabilityConfidence', 'situationalStability', 'rewardPotential', 'cultureFit', 'careerTrajectory', 'compensationFit', 'learningVelocity', 'techStackModernity']
      } as AiObjectSchema<DimensionalAnalysis>,
      strengths: {
        type: 'ARRAY',
        description: "In English, a list of objects detailing the candidate's key strengths. Apply inferential skill analysis: if a candidate has 'Spring Boot' experience, this is a strength for a 'Backend' role. Each object should have a 'skill' (the topic, e.g., 'Java, Spring Boot') and a 'description' (the explanation). Explicitly feature any user-highlighted skills provided.",
        items: {
          type: 'OBJECT',
          description: "An object detailing a candidate strength, with a skill and a description.",
          properties: {
            skill: { type: 'STRING', description: "The name of the skill or strength topic." },
            description: { type: 'STRING', description: "The detailed explanation of why this is a strength for the candidate." }
          },
          propertyOrdering: ['skill', 'description']
        } as AiObjectSchema<StrengthItem>
      },
      concerns: {
        type: 'ARRAY',
        description: "In English, bullet points listing the candidate's potential gaps, weaknesses or concerns for this role. Consider how user-highlighted skills might mitigate these concerns.",
        items: { type: 'STRING', description: 'A single bullet point describing a potential concern or weakness.' }
      },
      unmentionedStrengths: {
        type: 'ARRAY',
        description: "In English, a list of objects detailing valuable skills or experiences from the CV not mentioned in the JD. Each object should have a 'skill' (the topic, e.g., 'Full-stack Development') and a 'description' (the explanation).",
        items: {
          type: 'OBJECT',
          description: "An object detailing a valuable skill or experience from the CV not mentioned in the JD.",
          properties: {
            skill: { type: 'STRING', description: "The name of the unmentioned skill or strength topic." },
            description: { type: 'STRING', description: "The detailed explanation of this unique strength." }
          },
          propertyOrdering: ['skill', 'description']
        } as AiObjectSchema<StrengthItem>
      },
      questionsToAsk: {
        type: 'ARRAY',
        description: "In English, 5-7 interview questions. The questions MUST be conversational, direct, and use simple language. They should sound natural when spoken, avoiding 'academic' or overly formal phrasing. Good example: 'Tell me about a complex application you designed. What was the main challenge?'. Bad example: 'Can you describe a specific instance where you led the architectural design of a complex application?'.",
        items: { type: 'STRING', description: 'A single, well-formed interview question for the hiring manager to ask.' }
      },
      questionsForCandidate: {
        type: 'ARRAY',
        description: "In English, 3-5 insightful and strategic questions that the CANDIDATE could ask the interviewer. These should focus on understanding the role's challenges, team dynamics, success metrics, and company culture, rather than simple questions about benefits or vacation time. Frame them from the candidate's perspective.",
        items: { type: 'STRING', description: 'A single, insightful question for the candidate to ask.' }
      }
    },
    propertyOrdering: [
      'evaluationSummary',
      'matchStrength',
      'dimensionalAnalysis',
      'strengths',
      'concerns',
      'unmentionedStrengths',
      'questionsToAsk',
      'questionsForCandidate'
    ]
};
import { GoogleGenAI } from '@google/genai';
import { JobAnalysisRequest, JobAnalysisResult, UserProfile } from '@applyflow/types';
import { JobAnalysisResultSchema } from '@applyflow/validators';

export class JobAnalyzer {
  private aiClient: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || null;
    if (this.apiKey) {
      this.aiClient = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  async analyzeJob(req: JobAnalysisRequest, profile: UserProfile): Promise<JobAnalysisResult> {
    if (!this.aiClient || !this.apiKey) {
      return this.analyzeJobRuleBased(req, profile);
    }

    try {
      const prompt = `Analyze this job posting and map it against the candidate profile:
JOB TEXT:
${req.jobText.substring(0, 4000)}

CANDIDATE SKILLS:
${JSON.stringify(profile.skills)}

CANDIDATE PROJECTS:
${profile.projects.map((p) => p.title).join(', ')}

AVAILABLE RESUMES:
${profile.resumes.map((r) => `${r.name} (target: ${r.targetRoles.join(', ')})`).join('\n')}

INSTRUCTIONS:
Extract the role, company, location, employment type, required skills, preferred skills, experience and education requirements, and sponsorship status.
Recommend the most suitable resume from the user's list.
Identify matching candidate skills and projects.
NEVER fabricate company requirements.
Do NOT give a numerical "hire probability".

Return strictly JSON conforming to:
{
  "role": string,
  "company": string,
  "location": string,
  "employmentType": string or null,
  "requiredSkills": string[],
  "preferredSkills": string[],
  "experienceRequirements": string[],
  "educationRequirements": string[],
  "sponsorship": string or null,
  "relevantUserSkills": string[],
  "relevantProjects": string[],
  "recommendedResume": string,
  "summary": string
}`;

      const response = await this.aiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      const validated = JobAnalysisResultSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
      return this.analyzeJobRuleBased(req, profile);
    } catch {
      return this.analyzeJobRuleBased(req, profile);
    }
  }

  analyzeJobRuleBased(req: JobAnalysisRequest, profile: UserProfile): JobAnalysisResult {
    const text = req.jobText.toLowerCase();

    // Detect role keywords
    let detectedRole = 'Software Engineer';
    if (text.includes('backend')) detectedRole = 'Backend Engineer';
    else if (text.includes('frontend') || text.includes('ui/ux') || text.includes('web developer'))
      detectedRole = 'Frontend Developer';
    else if (text.includes('blockchain') || text.includes('web3') || text.includes('smart contract'))
      detectedRole = 'Blockchain Developer';
    else if (text.includes('full stack') || text.includes('fullstack'))
      detectedRole = 'Full Stack Developer';
    else if (text.includes('intern')) detectedRole = 'Software Engineer Intern';

    // Find matching skills
    const allCandidateSkills = [
      ...profile.skills.programming,
      ...profile.skills.frontend,
      ...profile.skills.backend,
      ...profile.skills.database,
      ...profile.skills.infrastructure,
      ...profile.skills.blockchain
    ];

    const matchedSkills = allCandidateSkills.filter((skill) =>
      text.includes(skill.toLowerCase())
    );

    // Recommend resume
    let recommendedResume = profile.resumes.find((r) => r.isDefault)?.name || 'General Software Engineer Resume';
    if (detectedRole.includes('Backend') && profile.resumes.find((r) => r.name.includes('Backend'))) {
      recommendedResume = 'Backend Resume';
    } else if (detectedRole.includes('Frontend') && profile.resumes.find((r) => r.name.includes('Frontend'))) {
      recommendedResume = 'Frontend Resume';
    } else if (detectedRole.includes('Blockchain') && profile.resumes.find((r) => r.name.includes('Blockchain'))) {
      recommendedResume = 'Blockchain Resume';
    }

    // Matching projects
    const matchedProjects = profile.projects
      .filter((p) => p.technologies.some((t) => text.includes(t.toLowerCase())))
      .map((p) => p.title);

    return {
      role: detectedRole,
      company: 'Detected Organization',
      location: 'Remote / Bangalore',
      employmentType: text.includes('intern') ? 'Internship' : 'Full-time',
      requiredSkills: matchedSkills.slice(0, 5),
      preferredSkills: matchedSkills.slice(5, 10),
      experienceRequirements: ['0-2 years relevant software experience'],
      educationRequirements: ['Bachelors or Masters in Computer Science or related field'],
      sponsorship: text.includes('visa sponsorship') ? 'Available' : null,
      relevantUserSkills: matchedSkills,
      relevantProjects: matchedProjects.length > 0 ? matchedProjects : ['DPI Engine', 'MediVault'],
      recommendedResume,
      summary: `Targeting ${detectedRole} with relevant candidate skills in ${matchedSkills.slice(0, 4).join(', ')}.`
    };
  }
}

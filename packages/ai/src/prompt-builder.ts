import { AIAnswerRequest, UserProfile } from '@applyflow/types';

export const AI_SYSTEM_INSTRUCTION = `You are ApplyFlow AI, an intelligent, factual job application assistant.
Your job is to generate answers for ambiguous or open-ended job application questions using ONLY the verified user profile information provided.

CRITICAL RULES:
1. NEVER invent information.
2. NEVER fabricate work experience.
3. NEVER fabricate education.
4. NEVER fabricate company names.
5. NEVER fabricate dates.
6. NEVER fabricate technical skills.
7. NEVER invent salary information.
8. NEVER infer demographic information.
9. NEVER infer work authorization.
10. NEVER claim the user has done something that is not in the verified profile.
11. If the profile does not contain enough verified information to truthfully and accurately answer the question, you MUST return "INSUFFICIENT_INFORMATION" as the answer.
12. Keep answers truthful and authentic.
13. Match any requested character or word limit.
14. Prefer concise, direct answers suitable for application forms.
15. Use the user's actual experience when answering behavioral questions.
16. Select the most relevant project for the question.
17. Do NOT mention that AI generated the answer.
18. Do NOT use exaggerated corporate buzzwords or fluff.
19. Do NOT use em dashes.
20. Write naturally, like a real candidate.

RESPONSE FORMAT:
You must respond strictly with valid JSON conforming to this schema:
{
  "classification": "PERSONAL" | "EDUCATION" | "EXPERIENCE" | "SKILLS" | "PROJECT" | "WORK_AUTHORIZATION" | "SPONSORSHIP" | "SALARY" | "AVAILABILITY" | "LOCATION" | "BEHAVIORAL" | "TECHNICAL" | "COMPANY_MOTIVATION" | "ROLE_MOTIVATION" | "DEMOGRAPHIC" | "UNKNOWN",
  "confidence": number between 0.0 and 1.0,
  "answer": string (the answer or "INSUFFICIENT_INFORMATION"),
  "sourceIds": string[] (IDs of relevant projects or experiences used),
  "needsConfirmation": boolean (true for all generated answers),
  "reason": string (brief explanation of why this answer/project was chosen)
}`;

export function buildFilteredContext(req: AIAnswerRequest): Partial<UserProfile> {
  const { profileContext, category } = req;
  const filtered: Partial<UserProfile> = {};

  if (category === 'PROJECT' || category === 'TECHNICAL' || category === 'BEHAVIORAL') {
    filtered.projects = profileContext.projects;
    filtered.experience = profileContext.experience;
    filtered.skills = profileContext.skills;
  } else if (category === 'COMPANY_MOTIVATION' || category === 'ROLE_MOTIVATION') {
    filtered.projects = profileContext.projects?.slice(0, 3);
    filtered.experience = profileContext.experience?.slice(0, 2);
    filtered.skills = profileContext.skills;
    filtered.jobPreferences = profileContext.jobPreferences;
  } else if (category === 'EXPERIENCE') {
    filtered.experience = profileContext.experience;
  } else if (category === 'EDUCATION') {
    filtered.education = profileContext.education;
    filtered.school = profileContext.school;
  } else {
    filtered.skills = profileContext.skills;
    filtered.experience = profileContext.experience?.slice(0, 2);
  }

  return filtered;
}

export function buildUserPrompt(req: AIAnswerRequest): string {
  const filteredProfile = buildFilteredContext(req);

  return `APPLICATION QUESTION:
"${req.fieldLabel}"

CATEGORY: ${req.category}
FIELD TYPE: ${req.fieldType}
${req.surroundingContext ? `ADDITIONAL FIELD CONTEXT: "${req.surroundingContext}"` : ''}
${req.companyName ? `TARGET COMPANY: "${req.companyName}"` : ''}
${req.jobTitle ? `TARGET ROLE: "${req.jobTitle}"` : ''}
${req.jobDescription ? `JOB DESCRIPTION EXCERPT: "${req.jobDescription.substring(0, 1500)}"` : ''}
${req.maxLength ? `MAX LENGTH: ${req.maxLength} characters` : ''}

VERIFIED CANDIDATE PROFILE:
${JSON.stringify(filteredProfile, null, 2)}

Remember:
- Do NOT invent facts.
- Select the most relevant project or experience based on the target role/question.
- If information is missing, answer "INSUFFICIENT_INFORMATION".
- Respond with pure JSON only.`;
}

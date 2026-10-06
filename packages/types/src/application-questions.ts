export type ApplicationQuestionCategory =
  | 'MOTIVATION'
  | 'CAREER'
  | 'AVAILABILITY'
  | 'EMPLOYMENT'
  | 'LOCATION'
  | 'WORK_AUTHORIZATION'
  | 'COMPENSATION'
  | 'EXPERIENCE'
  | 'SKILLS'
  | 'EDUCATION'
  | 'APPLICATION_LOGISTICS'
  | 'REFERENCES'
  | 'PORTFOLIO_LINKS'
  | 'COVER_LETTER'
  | 'ADDITIONAL_INFO';

export interface ApplicationQuestionDefinition {
  id: string;
  category: ApplicationQuestionCategory;
  question: string;
  placeholder?: string;
  defaultAnswer?: string;
  isSensitive?: boolean;
}

export const QUESTION_LIBRARY: ApplicationQuestionDefinition[] = [
  // Motivation
  {
    id: 'q_why_role',
    category: 'MOTIVATION',
    question: 'Why are you interested in this role?',
    placeholder: 'Highlight relevant passions, alignment with your skills, and what excites you about the position...'
  },
  {
    id: 'q_why_company',
    category: 'MOTIVATION',
    question: 'Why are you interested in this company?',
    placeholder: 'Mention company values, mission, product impact, or culture...'
  },
  {
    id: 'q_why_hire_you',
    category: 'MOTIVATION',
    question: 'Why should we hire you?',
    placeholder: 'Summarize your core strengths, proven track record, and immediate value add...'
  },
  {
    id: 'q_what_makes_unique',
    category: 'MOTIVATION',
    question: 'What makes you unique?',
    placeholder: 'Describe your distinctive perspective, cross-functional background, or approach...'
  },

  // Career
  {
    id: 'q_career_goals',
    category: 'CAREER',
    question: 'What are your career goals?',
    placeholder: 'Outline near-term and long-term milestones...'
  },
  {
    id: 'q_see_yourself_3_years',
    category: 'CAREER',
    question: 'Where do you see yourself in 3 years?',
    placeholder: 'Describe growth in responsibility, expertise, or team mentorship...'
  },
  {
    id: 'q_see_yourself_5_years',
    category: 'CAREER',
    question: 'Where do you see yourself in 5 years?',
    placeholder: 'Discuss leadership, specialized excellence, or strategic contributions...'
  },
  {
    id: 'q_why_leaving_current',
    category: 'CAREER',
    question: 'Why are you leaving your current job / seeking a new opportunity?',
    placeholder: 'Focus positively on seeking new growth challenges, broader scope, or impactful projects...'
  },

  // Availability
  {
    id: 'q_when_start',
    category: 'AVAILABILITY',
    question: 'When can you start?',
    placeholder: 'e.g., Immediately, 15 days, 1 month after offer acceptance...'
  },
  {
    id: 'q_notice_period',
    category: 'AVAILABILITY',
    question: 'What is your notice period?',
    placeholder: 'e.g., 15 days, 30 days, Immediate...'
  },
  {
    id: 'q_available_immediately',
    category: 'AVAILABILITY',
    question: 'Are you available immediately?',
    placeholder: 'Yes / No with brief context...'
  },

  // Employment
  {
    id: 'q_work_full_time',
    category: 'EMPLOYMENT',
    question: 'Are you available to work full-time?',
    placeholder: 'Yes / No...'
  },
  {
    id: 'q_willing_overtime_shifts',
    category: 'EMPLOYMENT',
    question: 'Are you willing to work flexible hours, shifts, or occasional weekends if required?',
    placeholder: 'Detail your flexibility and boundary preferences...'
  },

  // Location
  {
    id: 'q_willing_relocate',
    category: 'LOCATION',
    question: 'Are you willing to relocate?',
    placeholder: 'e.g., Yes, open to relocation globally / within specific countries...'
  },
  {
    id: 'q_remote_hybrid_pref',
    category: 'LOCATION',
    question: 'What type of work environment do you prefer (Remote, Hybrid, or On-site)?',
    placeholder: 'Explain your preferred working arrangement and adaptability...'
  },

  // Work Authorization (Explicitly sensitive, never guessed)
  {
    id: 'q_work_auth_general',
    category: 'WORK_AUTHORIZATION',
    question: 'Are you legally authorized to work in the country of this application?',
    placeholder: 'Derived directly from your verified Work Authorization settings.',
    isSensitive: true
  },
  {
    id: 'q_sponsorship_general',
    category: 'WORK_AUTHORIZATION',
    question: 'Will you now or in the future require visa sponsorship?',
    placeholder: 'Derived directly from your verified Work Authorization settings.',
    isSensitive: true
  },

  // Compensation
  {
    id: 'q_salary_expectations',
    category: 'COMPENSATION',
    question: 'What are your compensation / salary expectations?',
    placeholder: 'e.g., Market competitive, or provide target range with currency...'
  },
  {
    id: 'q_salary_flexibility',
    category: 'COMPENSATION',
    question: 'Are you flexible on compensation?',
    placeholder: 'e.g., Flexible depending on overall compensation structure, equity, and benefits...'
  },

  // Experience & Achievements
  {
    id: 'q_tell_about_yourself',
    category: 'EXPERIENCE',
    question: 'Tell us about yourself.',
    placeholder: 'A concise elevator pitch highlighting background, key strengths, and career trajectory...'
  },
  {
    id: 'q_proud_project',
    category: 'EXPERIENCE',
    question: 'Describe a project or accomplishment you are proud of.',
    placeholder: 'Use STAR method: Situation, Task, Action, and measurable Result...'
  },
  {
    id: 'q_challenging_problem',
    category: 'EXPERIENCE',
    question: 'Describe a challenging problem you solved.',
    placeholder: 'Detail the complexity, your analytical process, and the outcome...'
  },
  {
    id: 'q_leadership_teamwork',
    category: 'EXPERIENCE',
    question: 'Describe a time you demonstrated leadership or collaborated through conflict.',
    placeholder: 'Highlight active listening, empathy, consensus building, and accountability...'
  },

  // Logistics & References
  {
    id: 'q_hear_about_role',
    category: 'APPLICATION_LOGISTICS',
    question: 'How did you hear about this position?',
    placeholder: 'e.g., Company careers page, LinkedIn, Referral...'
  },
  {
    id: 'q_background_check',
    category: 'APPLICATION_LOGISTICS',
    question: 'Are you willing to undergo background checks or assessments?',
    placeholder: 'Yes, fully willing upon offer stage...'
  },

  // Additional Info
  {
    id: 'q_anything_else',
    category: 'ADDITIONAL_INFO',
    question: 'Anything else you would like us to know?',
    placeholder: 'Any additional context, portfolios, or enthusiasm you want to share with the team...'
  }
];

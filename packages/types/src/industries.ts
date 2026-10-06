export interface IndustryTaxonomy {
  id: string;
  name: string;
  suggestedRoles: string[];
}

export const INDUSTRIES: IndustryTaxonomy[] = [
  {
    id: 'technology',
    name: 'Technology',
    suggestedRoles: [
      'Software Engineer',
      'Backend Engineer',
      'Frontend Engineer',
      'Full Stack Developer',
      'DevOps Engineer',
      'Data Engineer',
      'Product Manager',
      'QA Engineer',
      'Systems Architect',
      'Mobile Developer'
    ]
  },
  {
    id: 'finance',
    name: 'Finance & Banking',
    suggestedRoles: [
      'Financial Analyst',
      'Investment Banker',
      'Risk Manager',
      'Accountant',
      'Credit Analyst',
      'Compliance Officer',
      'Portfolio Manager',
      'Auditor'
    ]
  },
  {
    id: 'healthcare_pharmacy',
    name: 'Healthcare & Pharmaceuticals',
    suggestedRoles: [
      'Pharmacist',
      'Clinical Research Associate',
      'Regulatory Affairs Associate',
      'Biomedical Engineer',
      'Medical Science Liaison',
      'Healthcare Administrator',
      'Nurse Practitioner',
      'Physician Assistant'
    ]
  },
  {
    id: 'marketing_sales',
    name: 'Marketing & Sales',
    suggestedRoles: [
      'Marketing Manager',
      'Account Executive',
      'Digital Marketing Specialist',
      'Content Strategist',
      'Sales Development Representative',
      'Brand Manager',
      'SEO Specialist',
      'Growth Marketer'
    ]
  },
  {
    id: 'consulting_legal',
    name: 'Consulting & Legal',
    suggestedRoles: [
      'Management Consultant',
      'Strategy Consultant',
      'Legal Counsel',
      'Paralegal',
      'Operations Consultant',
      'Policy Analyst'
    ]
  },
  {
    id: 'education_research',
    name: 'Education & Research',
    suggestedRoles: [
      'Research Scientist',
      'Instructional Designer',
      'Academic Advisor',
      'University Lecturer',
      'Curriculum Developer',
      'Postdoctoral Researcher'
    ]
  },
  {
    id: 'manufacturing_engineering',
    name: 'Manufacturing & Engineering',
    suggestedRoles: [
      'Mechanical Engineer',
      'Electrical Engineer',
      'Manufacturing Operations Manager',
      'Quality Control Specialist',
      'Process Engineer',
      'Plant Manager'
    ]
  },
  {
    id: 'automotive_aerospace',
    name: 'Automotive & Aerospace',
    suggestedRoles: [
      'Aerospace Engineer',
      'Automotive Systems Engineer',
      'Avionics Specialist',
      'Flight Test Engineer',
      'Powertrain Engineer'
    ]
  },
  {
    id: 'energy_utilities',
    name: 'Energy & Utilities',
    suggestedRoles: [
      'Renewable Energy Specialist',
      'Power Systems Engineer',
      'Environmental Consultant',
      'Energy Analyst',
      'Grid Modernization Engineer'
    ]
  },
  {
    id: 'construction_real_estate',
    name: 'Construction & Real Estate',
    suggestedRoles: [
      'Civil Engineer',
      'Project Manager (Construction)',
      'Real Estate Analyst',
      'Site Supervisor',
      'Estimator',
      'Architect'
    ]
  },
  {
    id: 'retail_ecommerce',
    name: 'Retail & E-commerce',
    suggestedRoles: [
      'E-commerce Manager',
      'Category Manager',
      'Merchandiser',
      'Store Operations Manager',
      'Customer Experience Lead'
    ]
  },
  {
    id: 'logistics_supply_chain',
    name: 'Logistics & Supply Chain',
    suggestedRoles: [
      'Supply Chain Analyst',
      'Logistics Coordinator',
      'Procurement Manager',
      'Warehouse Operations Supervisor',
      'Freight Forwarder'
    ]
  },
  {
    id: 'media_entertainment',
    name: 'Media & Entertainment',
    suggestedRoles: [
      'Video Producer',
      'Journalist',
      'Sound Designer',
      'Broadcast Engineer',
      'Animator',
      'Creative Director'
    ]
  },
  {
    id: 'human_resources',
    name: 'Human Resources & Recruiting',
    suggestedRoles: [
      'HR Business Partner',
      'Technical Recruiter',
      'Talent Acquisition Specialist',
      'People Operations Specialist',
      'Compensation & Benefits Analyst'
    ]
  },
  {
    id: 'operations_support',
    name: 'Operations & Customer Support',
    suggestedRoles: [
      'Operations Analyst',
      'Customer Success Manager',
      'Support Team Lead',
      'Business Process Specialist'
    ]
  },
  {
    id: 'design_architecture',
    name: 'Design & Architecture',
    suggestedRoles: [
      'UI/UX Designer',
      'Product Designer',
      'Graphic Designer',
      'Interior Designer',
      'Landscape Architect'
    ]
  },
  {
    id: 'agriculture_food',
    name: 'Agriculture & Food Science',
    suggestedRoles: [
      'Agronomist',
      'Food Technologist',
      'Agricultural Engineer',
      'Quality Assurance Auditor',
      'Supply Chain Agronomist'
    ]
  },
  {
    id: 'government_nonprofit',
    name: 'Government & Non-Profit',
    suggestedRoles: [
      'Program Officer',
      'Grant Writer',
      'Public Policy Analyst',
      'Community Outreach Coordinator',
      'Monitoring & Evaluation Lead'
    ]
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity & Defense',
    suggestedRoles: [
      'Security Analyst',
      'Information Security Officer',
      'Penetration Tester',
      'Incident Responder',
      'Security Compliance Auditor'
    ]
  },
  {
    id: 'data_analytics',
    name: 'Data & Analytics',
    suggestedRoles: [
      'Data Analyst',
      'Business Intelligence Developer',
      'Data Scientist',
      'Machine Learning Engineer',
      'Quantitative Researcher'
    ]
  },
  {
    id: 'other',
    name: 'Other',
    suggestedRoles: []
  }
];

export const EMPLOYMENT_STATUS_OPTIONS = [
  'Student',
  'Employed full-time',
  'Employed part-time',
  'Self-employed',
  'Freelancer',
  'Contractor',
  'Intern',
  'Apprentice',
  'Unemployed',
  'Career break',
  'Other'
] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUS_OPTIONS)[number];

export const EMPLOYMENT_TYPE_OPTIONS = [
  'Full-time',
  'Part-time',
  'Internship',
  'Contract',
  'Temporary',
  'Freelance',
  'Apprenticeship',
  'Graduate / Entry-level',
  'Seasonal',
  'Volunteer',
  'Casual'
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPE_OPTIONS)[number];

export const WORK_MODE_OPTIONS = ['Remote', 'Hybrid', 'On-site'] as const;
export type WorkMode = (typeof WORK_MODE_OPTIONS)[number];

export const GENDER_OPTIONS = [
  'Woman',
  'Man',
  'Non-binary',
  'Genderqueer',
  'Genderfluid',
  'Agender',
  'Two-Spirit',
  'Prefer to self-describe',
  'Prefer not to say'
] as const;

export type GenderOption = (typeof GENDER_OPTIONS)[number];

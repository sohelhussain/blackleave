import { UserProfile } from './index.js';

export const INITIAL_SOHEL_PROFILE: UserProfile = {
  id: 'user_sohel_hussain_01',
  personal: {
    fullName: 'Sohel Hussain',
    firstName: 'Sohel',
    lastName: 'Hussain',
    preferredName: 'Sohel',
    email: 'sohelhussaing@gmail.com',
    phone: '+91 9694428769',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    pincode: '560066',
    linkedin: 'https://www.linkedin.com/in/sohelhussain',
    github: 'https://github.com/sohelhussain',
    portfolio: 'https://sohelhussain.github.io/portfolio',
    summary: 'Software Engineer specializing in scalable full-stack web applications, distributed systems, and modern web architectures.'
  },
  jobPreferences: {
    targetRoles: [
      'Software Engineer',
      'SDE Intern',
      'Backend Engineer',
      'Full Stack Developer'
    ],
    targetJobTitles: [
      'Software Engineer',
      'SDE Intern',
      'Backend Engineer',
      'Full Stack Developer'
    ],
    targetIndustries: ['Technology', 'Healthcare & Pharmaceuticals'],
    targetCareerAreas: ['Software Engineering', 'Full Stack Development', 'Distributed Systems'],
    employmentStatus: 'Student',
    studentEnrollment: {
      isCurrentlyEnrolled: true,
      institution: 'Jain University',
      degreeProgram: 'Master of Computer Applications',
      fieldOfStudy: 'Computer Science',
      currentYearSemester: '2nd Year / 3rd Semester',
      expectedGraduationDate: '2027',
      openToStudyCombinedJobs: true
    },
    employmentTypes: ['Internship', 'Full-time'],
    workModes: ['Remote', 'Hybrid'],
    preferredLocations: ['Bangalore', 'Chennai', 'Hyderabad', 'Europe', 'Remote'],
    willingToRelocate: true,
    willingToWorkRemotely: true,
    noticePeriod: '15 days',
    expectedSalaryMin: null,
    expectedSalaryMax: null,
    salaryCurrency: 'INR'
  },
  education: [
    {
      id: 'edu_mca_jain',
      degree: 'Master of Computer Applications',
      branch: 'Computer Science',
      university: 'Jain University',
      location: 'Bangalore',
      startDate: '08/2024',
      endDate: null,
      expectedGraduation: '2027',
      cgpa: 8,
      percentage: null,
      stream: null
    },
    {
      id: 'edu_bpharma_rgpv',
      degree: "Bachelor's Degree / B.Pharma",
      branch: 'Pharmacy',
      university: 'Rajiv Gandhi Proudyogiki Vishwavidyalaya',
      location: 'Bhopal',
      startDate: '08/2020',
      endDate: '05/2024',
      expectedGraduation: '2024',
      cgpa: null,
      percentage: null,
      stream: null
    }
  ],
  school: {
    tenthPercentage: '55%',
    twelfthPercentage: '66%',
    twelfthStream: 'Science'
  },
  workAuthorization: {
    indiaAuthorized: true,
    indiaSponsorshipRequired: false,
    usAuthorized: true,
    usSponsorshipRequired: true,
    europeAuthorized: true,
    europeSponsorshipRequired: true,
    otherDetails: null,
    countries: [
      {
        countryCode: 'IN',
        countryName: 'India',
        status: 'AUTHORIZED',
        visaType: 'Citizen'
      },
      {
        countryCode: 'US',
        countryName: 'United States',
        status: 'REQUIRES_SPONSORSHIP',
        visaType: null
      },
      {
        countryCode: 'DE',
        countryName: 'Germany',
        status: 'REQUIRES_SPONSORSHIP',
        visaType: null
      }
    ]
  },
  experience: [
    {
      id: 'exp_saurce',
      company: 'Saurce',
      title: 'Software Engineer',
      employmentType: 'Full-time',
      location: 'France',
      workMode: 'Remote',
      startDate: '03/2025',
      endDate: '06/2025',
      current: false,
      responsibilities: [
        'Delivered 10+ production screens in React + TypeScript, cutting frontend scope delivery time by 40%.',
        'Eliminated unauthorized API access via JWT auth, secured tokens, Axios headers, and protected routes.',
        'Cut invalid API submissions by 60% via multi-image upload with client-side preview and validation.',
        'Cut environment setup from 2 hours to 5 minutes by containerizing the full stack with Docker and docker-compose.',
        'Resolved 8+ REST API data-flow mismatches across endpoints, eliminating a class of runtime errors blocking QA.'
      ],
      technologies: [
        'React',
        'TypeScript',
        'JWT',
        'Axios',
        'Docker',
        'docker-compose',
        'REST APIs'
      ]
    },
    {
      id: 'exp_medivault',
      company: 'MediVault',
      title: 'Blockchain Developer',
      employmentType: 'Hackathon / Project',
      location: 'Noida',
      workMode: 'On-site',
      startDate: '05/2025',
      endDate: '06/2025',
      current: false,
      responsibilities: [
        'Built Anchor smart contract to store prescription data on-chain.',
        'Integrated Phantom wallet and web3.js for on-chain read/write.',
        'Implemented wallet-signature authentication.',
        'Generated QR codes encoding Solana account addresses.'
      ],
      technologies: [
        'Solana',
        'Anchor',
        'web3.js',
        'Phantom Wallet',
        'Next.js',
        'PostgreSQL',
        'Prisma',
        'Kafka',
        'WebRTC',
        'tRPC',
        'Turborepo'
      ]
    },
    {
      id: 'exp_fibon_hack',
      company: 'Fibon Hack',
      title: 'Backend Developer',
      employmentType: 'Hackathon / Project',
      location: 'RGPV University, Bhopal',
      workMode: 'On-site',
      startDate: '10/2024',
      endDate: '11/2024',
      current: false,
      responsibilities: [
        'Built backend APIs for event creation.',
        'Built registration APIs.',
        'Implemented live updates.',
        'Built the backend during a 36-hour hackathon.',
        'Ranked among 100+ teams and won sponsor awards.'
      ],
      technologies: []
    },
    {
      id: 'exp_freelance_b2b',
      company: 'Freelance B2B E-commerce MVP',
      title: 'Freelance Full Stack Developer',
      employmentType: 'Freelance',
      location: 'Remote',
      workMode: 'Remote',
      startDate: '01/2024',
      endDate: '04/2024',
      current: false,
      responsibilities: [
        'Built React + TypeScript frontend.',
        'Built admin dashboard.',
        'Implemented buyer-seller messaging.',
        'Implemented multiple image uploads.',
        'Implemented JWT authentication.',
        'Implemented backend/cloud features.'
      ],
      technologies: [
        'React',
        'TypeScript',
        'Node.js',
        'Socket.IO',
        'JWT',
        'AWS S3',
        'AWS CloudFront',
        'Docker'
      ]
    }
  ],
  projects: [
    {
      id: 'proj_medivault',
      title: 'MediVault',
      description:
        'Blockchain-based prescription storage platform. Prescription data is hashed using SHA-256 and anchored on Solana for tamper-evident verification while medical data remains off-chain in PostgreSQL. Patients access/share records through QR codes with OTP/email verification.',
      technologies: [
        'Solana',
        'Anchor',
        'web3.js',
        'Next.js',
        'Turborepo',
        'PostgreSQL',
        'Prisma',
        'Kafka',
        'WebRTC',
        'tRPC'
      ],
      features: [
        'SHA-256 prescription hashing',
        'Solana tamper-evident verification',
        'QR code sharing with OTP verification'
      ]
    },
    {
      id: 'proj_dpi_engine',
      title: 'DPI Engine',
      description:
        'Multi-threaded Deep Packet Inspection engine with thread pools, concurrent packet processing, TLS SNI extraction, HTTPS domain classification without decrypting payloads, stateful flow tracking, 5-tuple hashing, and consistent per-connection routing.',
      technologies: ['C++17', 'Multithreading', 'libpcap', 'TLS/SNI parsing'],
      features: [
        'Thread pools & concurrent packet processing',
        'TLS SNI extraction & domain classification',
        'Stateful flow tracking & 5-tuple hashing'
      ]
    },
    {
      id: 'proj_upi_offline',
      title: 'UPI Without Internet',
      description:
        'UPI payment system routing transactions over a Bluetooth gossip mesh with zero internet connectivity. Employs RSA-OAEP, AES-256-GCM, SHA-256, duplicate settlement prevention, ConcurrentHashMap, and verified with a 3-thread concurrency test.',
      technologies: [
        'Spring Boot',
        'Java 17',
        'RSA-OAEP',
        'AES-256-GCM',
        'H2',
        'JPA'
      ],
      features: [
        'Bluetooth gossip mesh routing',
        'Zero internet connectivity payment settlement',
        'RSA-OAEP & AES-256-GCM encryption'
      ],
      securityHighlights: [
        'RSA-OAEP transaction signing',
        'AES-256-GCM payload encryption',
        'Duplicate settlement prevention via atomic maps'
      ]
    },
    {
      id: 'proj_pulsechat',
      title: 'PulseChat',
      description:
        'Real-time chat application with WebRTC video calling and Socket.IO messaging.',
      technologies: ['WebRTC', 'Socket.IO', 'Node.js'],
      features: ['Peer-to-peer video streaming', 'Real-time WebSocket chat']
    },
    {
      id: 'proj_medium_clone',
      title: 'Medium Clone',
      description:
        'Blogging platform clone with Next.js frontend and Rust Axum backend in a Turborepo monorepo.',
      technologies: ['Next.js', 'Rust', 'Axum', 'Turborepo', 'BlockNote', 'Axios'],
      features: ['Rich text editing with BlockNote', 'High performance Rust Axum API']
    },
    {
      id: 'proj_notion_clone',
      title: 'Notion Clone',
      description:
        'Notion-style workspace and notes application powered by Next.js, Convex, and Clerk.',
      technologies: ['Next.js', 'Convex', 'Clerk'],
      features: ['Real-time collaborative workspace', 'Authentication with Clerk']
    },
    {
      id: 'proj_nexabank',
      title: 'NexaBank',
      description:
        'Banking web application built as an academic MCA capstone project.',
      technologies: [
        'React',
        'TypeScript',
        'Tailwind CSS',
        'Spring Boot 3',
        'PostgreSQL'
      ],
      features: [
        'Account management and fund transfers',
        'Role-based access control'
      ]
    }
  ],
  skills: {
    programming: ['Java', 'JavaScript', 'TypeScript', 'C++', 'Rust', 'HTML', 'CSS'],
    frontend: ['React', 'Next.js', 'Tailwind CSS'],
    backend: ['Node.js', 'Express.js', 'Spring Boot', 'Rust Axum'],
    database: ['PostgreSQL', 'MongoDB', 'H2', 'Prisma'],
    infrastructure: [
      'Docker',
      'AWS',
      'S3',
      'CloudFront',
      'CI/CD',
      'Git',
      'Turborepo'
    ],
    blockchain: ['Solana', 'Anchor', 'web3.js', 'Phantom Wallet'],
    realtime: ['WebRTC', 'Socket.IO', 'Kafka'],
    auth: ['JWT', 'Clerk', 'Convex'],
    other: [
      'Wikimedia open-source contributions',
      'Hacktoberfest',
      '500+ LeetCode problems in Java'
    ]
  },
  resumes: [
    {
      id: 'resume_general',
      name: 'General Software Engineer Resume',
      fileName: 'Sohel_Hussain_Software_Engineer.pdf',
      targetRoles: ['Software Engineer', 'Full Stack Developer', 'SDE Intern'],
      relevantSkills: ['React', 'TypeScript', 'Node.js', 'Java', 'PostgreSQL', 'Docker'],
      isDefault: true,
      createdAt: '2025-01-10T00:00:00.000Z',
      updatedAt: '2025-06-01T00:00:00.000Z'
    },
    {
      id: 'resume_backend',
      name: 'Backend Resume',
      fileName: 'Sohel_Hussain_Backend_Engineer.pdf',
      targetRoles: ['Backend Engineer', 'Distributed Systems Engineer'],
      relevantSkills: ['Java', 'Spring Boot', 'Rust', 'Axum', 'C++', 'Kafka', 'PostgreSQL', 'Docker'],
      isDefault: false,
      createdAt: '2025-01-15T00:00:00.000Z',
      updatedAt: '2025-06-01T00:00:00.000Z'
    },
    {
      id: 'resume_frontend',
      name: 'Frontend Resume',
      fileName: 'Sohel_Hussain_Frontend_Developer.pdf',
      targetRoles: ['Frontend Developer', 'UI Engineer'],
      relevantSkills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux', 'Axios'],
      isDefault: false,
      createdAt: '2025-01-20T00:00:00.000Z',
      updatedAt: '2025-06-01T00:00:00.000Z'
    },
    {
      id: 'resume_ai_ml',
      name: 'AI/ML Resume',
      fileName: 'Sohel_Hussain_AI_ML.pdf',
      targetRoles: ['AI Engineer', 'Machine Learning Engineer'],
      relevantSkills: ['Python', 'LLM Integration', 'Gemini API', 'TypeScript', 'Data Pipelines'],
      isDefault: false,
      createdAt: '2025-02-01T00:00:00.000Z',
      updatedAt: '2025-06-01T00:00:00.000Z'
    },
    {
      id: 'resume_blockchain',
      name: 'Blockchain Resume',
      fileName: 'Sohel_Hussain_Blockchain_Developer.pdf',
      targetRoles: ['Blockchain Developer', 'Web3 Engineer'],
      relevantSkills: ['Solana', 'Anchor', 'web3.js', 'Rust', 'Smart Contracts', 'Phantom Wallet'],
      isDefault: false,
      createdAt: '2025-02-10T00:00:00.000Z',
      updatedAt: '2025-06-01T00:00:00.000Z'
    }
  ],
  applicationQuestions: [
    {
      id: 'q_sohel_why_role',
      category: 'MOTIVATION',
      question: 'Why are you interested in this role?',
      answer:
        'I am excited about this role because it allows me to build high-scale, resilient distributed systems and full-stack web applications. My experience leading backend architectures and browser automations aligns directly with delivering high-impact product features.',
      lastUpdated: '2025-06-15T00:00:00.000Z'
    },
    {
      id: 'q_sohel_why_company',
      category: 'MOTIVATION',
      question: 'Why are you interested in this company?',
      answer:
        'I strongly admire your mission to build developer-first, high-reliability products. The opportunity to work on ambitious technical challenges with a collaborative, high-velocity engineering culture is exactly where I can contribute my best work.',
      lastUpdated: '2025-06-15T00:00:00.000Z'
    },
    {
      id: 'q_sohel_notice_period',
      category: 'AVAILABILITY',
      question: 'What is your notice period / earliest start date?',
      answer: '15 days notice period. Available to join within 15 days upon offer acceptance.',
      lastUpdated: '2025-06-15T00:00:00.000Z'
    },
    {
      id: 'q_sohel_tell_about_yourself',
      category: 'EXPERIENCE',
      question: 'Tell us about yourself.',
      answer:
        'I am a software engineer with a strong foundation in computer science and pharmacy. I have hands-on experience building full-stack applications with React, Next.js, TypeScript, Node.js, and PostgreSQL, along with network inspection engines and AI-assisted workflows.',
      lastUpdated: '2025-06-15T00:00:00.000Z'
    },
    {
      id: 'q_sohel_anything_else',
      category: 'ADDITIONAL_INFO',
      question: 'Anything else you would like us to know?',
      answer:
        'I am an eager continuous learner currently pursuing my MCA at Jain University while shipping production-grade open source projects and web tools. I look forward to contributing immediately to the team.',
      lastUpdated: '2025-06-15T00:00:00.000Z'
    }
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-06-15T00:00:00.000Z'
};

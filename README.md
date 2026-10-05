# blackLeave

An intelligent job application assistant and autofill engine. Stores a candidate's complete verified profile once and autofills applications across ATS platforms and Google Forms with 100% review guarantee.

## Architecture

This repository is structured as a Turborepo monorepo with pnpm workspaces:

```
blackLeave/
├── apps/
│   ├── web/        # Next.js + TypeScript + Tailwind CSS Candidate Dashboard
│   ├── api/        # Node.js + Express + Prisma + Gemini REST API Server
│   └── extension/  # Manifest V3 Chrome Extension (Classic IIFE Content Script + React Popup)
│
├── packages/
│   ├── ui/         # Shared React + Tailwind UI component library
│   ├── database/   # PostgreSQL Prisma schema, client, and seeds
│   ├── types/      # Shared TypeScript type definitions
│   ├── validators/ # Zod runtime validation schemas
│   ├── ai/         # Gemini AI synthesis engine with profile truthfulness guards
│   ├── jobs/       # Job provider & listing aggregation (reserved)
│   ├── matching/   # Candidate-to-job matching & scoring algorithms (reserved)
│   ├── resume/     # Resume optimization & section tailoring (reserved)
│   └── autofill/   # ATS adapters, DOM field detection, and React-safe dispatcher
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── README.md
```

## Core Guarantees

- **Zero Auto-Submit Guarantee**: blackLeave never automatically clicks form submission buttons.
- **Truthful AI Synthesis**: Answers to open-ended questions use verified facts from the candidate's stored profile.
- **Privacy First**: Sensitive credentials like Gemini API keys stay on the backend and are never packaged in client bundles.
- **Universal Field Detection**: Detects standard HTML controls as well as custom Google Forms and ARIA controls (`[role="radiogroup"]`, `[role="radio"]`, `[role="checkbox"]`, `[role="textbox"]`, `[role="listbox"]`).

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Build all packages**:
   ```bash
   pnpm build
   ```

3. **Run tests**:
   ```bash
   pnpm test
   ```

4. **Load Chrome Extension**:
   - Navigate to `chrome://extensions` in Chrome.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select `apps/extension/dist`.

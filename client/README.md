This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Task 2 — AI Placement Readiness Engine

The project now includes a Placement Readiness Engine at `/placement`.

### Engine inputs
- AI resume analysis (skills, strengths and domain confidence)
- Completed AI technical interviews
- AI communication scoring for interview answers
- Skill assessments (latest score per skill)

### Explainable scoring
Default configurable weights:
- Resume: 25%
- Interview: 35%
- Communication: 20%
- Skills: 20%

Default categories:
- `Placement Ready`: 80+
- `High Potential Candidate`: 60–79
- `Needs Improvement`: below 60

These can be changed with server environment variables:
`READINESS_RESUME_WEIGHT`, `READINESS_INTERVIEW_WEIGHT`,
`READINESS_COMMUNICATION_WEIGHT`, `READINESS_SKILL_WEIGHT`,
`READINESS_PLACEMENT_READY`, and `READINESS_HIGH_POTENTIAL`.

### Personalized roadmap
The engine combines verified gaps with resume domains and candidate type:
- Fresher
- Internship Seeker
- Experienced

Groq generates structured technologies, projects, certifications and interview topics. A deterministic fallback keeps the feature usable when the AI request fails.

### Historical tracking
Readiness snapshots are stored when measured scores/category/candidate type changes. The latest state is shown with score trend/history, so recommendations can evolve after new interviews and skill assessments.

### API
- `GET /api/placement/readiness`
- `GET /api/placement/history`
- `GET /api/placement/rules`
- `PATCH /api/placement/candidate-type`
- `POST /api/skills`
- `GET /api/skills`

The existing Task 1 resume and interview functionality remains intact.

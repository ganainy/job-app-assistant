/**
 * Few-shot examples for ATS analysis prompting
 * These examples help the LLM understand the expected output format and quality
 */

export interface AtsExampleAnalysis {
    description: string;
    scenario: 'strong_match' | 'weak_match' | 'average_match';
    jobExcerpt: string;
    cvExcerpt: string;
    expectedOutput: {
        atsScore: number;
        scoreBreakdown: {
            technicalSkills: number;
            experienceRelevance: number;
            additionalSkills: number;
            formatting: number;
        };
        matchedKeywords: string[];
        missingKeywords: Array<{
            keyword: string;
            priority: 'high' | 'medium' | 'low';
            context: string;
        }>;
        matchedSkills: string[];
        missingSkills: Array<{
            skill: string;
            priority: 'high' | 'medium' | 'low';
            context: string;
        }>;
        actionableFeedback: Array<{
            priority: 'high' | 'medium' | 'low';
            action: string;
            impact: string;
        }>;
    };
}

/**
 * Example 1: Strong match - Frontend Developer
 */
export const STRONG_MATCH_EXAMPLE: AtsExampleAnalysis = {
    description: "Strong match example - Senior Frontend Developer role",
    scenario: 'strong_match',
    jobExcerpt: `
        Senior Frontend Developer - Tech Company GmbH
        Requirements:
        - 5+ years experience with React.js and TypeScript
        - Experience with Next.js and modern frontend tooling
        - Strong understanding of responsive design and CSS frameworks
        - Experience with state management (Redux, Zustand)
        - Familiarity with testing frameworks (Jest, React Testing Library)
        Nice to have:
        - Experience with GraphQL
        - Knowledge of CI/CD pipelines
    `,
    cvExcerpt: `
        Senior Frontend Engineer - 6 years experience
        Technical Skills: React.js, TypeScript, Next.js, Redux, Zustand, 
        Tailwind CSS, Jest, React Testing Library, Webpack, Vite
        Experience: Led frontend development for e-commerce platform,
        implemented responsive designs, managed complex state with Redux
    `,
    expectedOutput: {
        atsScore: 88,
        scoreBreakdown: {
            technicalSkills: 92,
            experienceRelevance: 90,
            additionalSkills: 75,
            formatting: 85
        },
        matchedKeywords: ["React.js", "TypeScript", "Next.js", "Redux", "Zustand",
            "responsive design", "Jest", "React Testing Library", "frontend"],
        missingKeywords: [
            {
                keyword: "GraphQL",
                priority: "low",
                context: "Listed as nice-to-have, not a core requirement"
            },
            {
                keyword: "CI/CD",
                priority: "low",
                context: "Listed as nice-to-have, adding would strengthen application"
            }
        ],
        matchedSkills: ["React.js", "TypeScript", "Next.js", "State Management",
            "Responsive Design", "Testing"],
        missingSkills: [],
        actionableFeedback: [
            {
                priority: "low",
                action: "Consider mentioning any GraphQL experience if applicable",
                impact: "Could differentiate your application from other candidates"
            },
            {
                priority: "medium",
                action: "Add specific metrics to your achievements (e.g., 'reduced load time by 40%')",
                impact: "Quantified achievements increase perceived impact by 25%"
            }
        ]
    }
};

/**
 * Example 2: Weak match - Backend role applying for Frontend
 */
export const WEAK_MATCH_EXAMPLE: AtsExampleAnalysis = {
    description: "Weak match example - Backend developer applying for Frontend role",
    scenario: 'weak_match',
    jobExcerpt: `
        Frontend Developer - E-Commerce Startup
        Requirements:
        - 3+ years experience with React or Vue.js
        - Strong proficiency in JavaScript/TypeScript
        - Experience with CSS-in-JS or Tailwind CSS
        - Understanding of web performance optimization
        - Experience with REST APIs and state management
    `,
    cvExcerpt: `
        Java Backend Developer - 5 years experience
        Technical Skills: Java, Spring Boot, PostgreSQL, Redis, 
        Docker, Kubernetes, REST API development
        Experience: Built microservices architecture, optimized database queries,
        implemented caching strategies
    `,
    expectedOutput: {
        atsScore: 32,
        scoreBreakdown: {
            technicalSkills: 20,
            experienceRelevance: 35,
            additionalSkills: 45,
            formatting: 80
        },
        matchedKeywords: ["REST APIs"],
        missingKeywords: [
            {
                keyword: "React",
                priority: "high",
                context: "Primary framework requirement - critical for shortlisting"
            },
            {
                keyword: "Vue.js",
                priority: "high",
                context: "Alternative to React - one of these is mandatory"
            },
            {
                keyword: "JavaScript",
                priority: "high",
                context: "Core language for frontend development"
            },
            {
                keyword: "TypeScript",
                priority: "high",
                context: "Required for frontend role, listed as mandatory"
            },
            {
                keyword: "CSS",
                priority: "high",
                context: "Essential for frontend styling - no CSS skills shown"
            },
            {
                keyword: "web performance",
                priority: "medium",
                context: "Important for role but could be learned quickly"
            }
        ],
        matchedSkills: ["API Development"],
        missingSkills: [
            {
                skill: "React.js/Vue.js",
                priority: "high",
                context: "No frontend framework experience listed"
            },
            {
                skill: "CSS/Styling",
                priority: "high",
                context: "No CSS or styling framework experience"
            },
            {
                skill: "State Management",
                priority: "medium",
                context: "Redux/Vuex experience needed for frontend"
            }
        ],
        actionableFeedback: [
            {
                priority: "high",
                action: "Add any React, Vue, or JavaScript project experience, even personal projects",
                impact: "Without frontend framework experience, resume will likely be filtered out automatically"
            },
            {
                priority: "high",
                action: "Highlight any web UI work you've done, even with Java frameworks like Thymeleaf",
                impact: "Showing any frontend exposure increases chances of human review"
            },
            {
                priority: "medium",
                action: "Consider adding frontend certifications or courses to your CV",
                impact: "Demonstrates commitment to frontend development path"
            }
        ]
    }
};

/**
 * Example 3: Average match - Related but not perfect fit
 */
export const AVERAGE_MATCH_EXAMPLE: AtsExampleAnalysis = {
    description: "Average match example - Full-stack developer for specialized Frontend role",
    scenario: 'average_match',
    jobExcerpt: `
        React Developer - FinTech Company
        Requirements:
        - 4+ years React.js experience
        - Experience with financial dashboards or data visualization
        - TypeScript proficiency
        - Knowledge of charting libraries (D3.js, Recharts, Chart.js)
        - Experience with real-time data updates (WebSockets)
    `,
    cvExcerpt: `
        Full-Stack Developer - 5 years experience
        Technical Skills: React.js, Node.js, TypeScript, MongoDB, 
        Express, Socket.io, PostgreSQL, AWS
        Experience: Built customer portal with React, implemented 
        real-time notifications using Socket.io, created admin dashboards
    `,
    expectedOutput: {
        atsScore: 62,
        scoreBreakdown: {
            technicalSkills: 65,
            experienceRelevance: 55,
            additionalSkills: 70,
            formatting: 80
        },
        matchedKeywords: ["React.js", "TypeScript", "WebSockets", "dashboards"],
        missingKeywords: [
            {
                keyword: "D3.js",
                priority: "high",
                context: "Specific charting library required for data visualization"
            },
            {
                keyword: "Recharts",
                priority: "medium",
                context: "Alternative charting library - knowing one would help"
            },
            {
                keyword: "Chart.js",
                priority: "medium",
                context: "Alternative charting library"
            },
            {
                keyword: "financial",
                priority: "medium",
                context: "Domain experience valued in FinTech"
            },
            {
                keyword: "data visualization",
                priority: "high",
                context: "Core requirement for the role"
            }
        ],
        matchedSkills: ["React.js", "TypeScript", "Real-time Updates", "Dashboard Development"],
        missingSkills: [
            {
                skill: "Data Visualization",
                priority: "high",
                context: "D3.js or similar charting library experience needed"
            },
            {
                skill: "FinTech Domain",
                priority: "medium",
                context: "Financial industry experience preferred"
            }
        ],
        actionableFeedback: [
            {
                priority: "high",
                action: "Emphasize any experience with charts, graphs, or data visualization in your dashboards",
                impact: "This is a core requirement - highlighting it could increase score by 15-20%"
            },
            {
                priority: "high",
                action: "Add D3.js or Chart.js to your skills if you have any experience, even basic",
                impact: "Specific charting library keywords will improve ATS matching significantly"
            },
            {
                priority: "medium",
                action: "Rename 'customer portal' to include 'dashboard' or 'data visualization'",
                impact: "Better keyword alignment with job description"
            },
            {
                priority: "low",
                action: "Mention Socket.io as 'WebSocket' as well for keyword matching",
                impact: "Synonym matching may not always be perfect in ATS systems"
            }
        ]
    }
};

/**
 * Formats examples for inclusion in the prompt
 */
export function formatExamplesForPrompt(): string {
    const examples = [STRONG_MATCH_EXAMPLE, WEAK_MATCH_EXAMPLE, AVERAGE_MATCH_EXAMPLE];

    return examples.map((example, index) => `
**Example ${index + 1}: ${example.description}**

Job Description Excerpt:
${example.jobExcerpt.trim()}

CV Excerpt:
${example.cvExcerpt.trim()}

Expected Analysis Output:
\`\`\`json
${JSON.stringify(example.expectedOutput, null, 2)}
\`\`\`
`).join('\n---\n');
}

/**
 * Returns a condensed version of examples for prompts (to save tokens)
 */
export function getCondensedExamples(): string {
    return `
**Example Outputs (for reference):**

1. **Strong Match (88% score):** All required skills present, missing only nice-to-haves. 
   Feedback focuses on optimization, not gaps.

2. **Weak Match (32% score):** Missing critical technical skills (React, JavaScript, CSS).
   All missing keywords marked as "high" priority with clear context explaining why each is critical.
   Actionable feedback emphasizes the most impactful changes.

3. **Average Match (62% score):** Has core skills but missing specialized requirements (D3.js, data visualization).
   Mix of high/medium priority missing keywords with specific suggestions for improvement.
`;
}

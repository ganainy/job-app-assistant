// server/src/services/githubService.ts
import Profile from '../models/Profile';
import { InternalServerError } from '../utils/errors/AppError';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  fork: boolean;
  private: boolean;
}

interface GitHubReadme {
  content: string;
  encoding: string;
}

interface TransformedProject {
  title: string;
  description: string;
  technologies: string[];
  liveUrl: string;
  repoUrl: string;
  lastUpdated: string;
  stars: number;
  forks: number;
  isFeatured: boolean;
  videoUrl: string | null;
}

interface SkillsData {
  programmingLanguages: string[];
  otherSkills: string[];
}

const PROGRAMMING_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'Kotlin',
  'C#',
  'C++',
  'C',
  'Swift',
  'Go',
  'Rust',
  'PHP',
  'Ruby',
  'Dart',
  'Scala',
  'R',
  'Objective-C',
  'Shell',
  'PowerShell',
  'HTML',
  'CSS',
  'SQL',
  'Perl',
  'Lua',
  'Haskell',
  'F#',
];

/**
 * Get GitHub API token from user profile or fallback to environment variable
 */
export const getApiToken = async (userId?: string): Promise<string | null> => {
  if (userId) {
    try {
      const profile = await Profile.findOne({ userId });
      const userToken = profile?.integrations?.github?.accessToken;
      if (userToken) return userToken;
    } catch (error) {
      console.warn('Could not fetch authenticated user token:', error);
    }
  }

  // Fallback to environment variable
  const fallbackToken = process.env.GITHUB_TOKEN;
  return fallbackToken || null;
};

/**
 * Get GitHub API headers with optional token
 */
const getGitHubHeaders = (token: string | null): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Job-App-Assistant/1.0',
  };

  if (token && typeof token === 'string') {
    headers['Authorization'] = `token ${token.trim()}`;
  }

  return headers;
};

/**
 * Fetch data from GitHub API
 * Token is optional - public repos work without token (60 requests/hour limit)
 */
export const fetchFromGitHub = async (
  url: string,
  token: string | null
): Promise<any> => {
  // Allow requests without token for public repos
  const response = await fetch(url, {
    headers: getGitHubHeaders(token),
  });

  if (!response.ok) {
    const status = response.status;
    let errorBody;
    try {
      errorBody = await response.json();
    } catch (e) {
      errorBody = {
        message: `GitHub API responded with status ${status} but the response body could not be parsed.`,
      };
    }

    const githubMessage = errorBody.message || 'An unknown error occurred with the GitHub API.';
    const hasToken = token && typeof token === 'string' && token.trim().length > 0;

    switch (status) {
      case 401:
        throw new InternalServerError(
          `Authentication failed. The GitHub token is invalid or expired. ${githubMessage}`
        );
      case 403: {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        const rateLimitReset = response.headers.get('x-ratelimit-reset');
        const rateLimitTotal = response.headers.get('x-ratelimit-limit');
        const resetTime = rateLimitReset
          ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString()
          : 'N/A';
        
        // Check if this is a rate limit issue (remaining is 0 or low)
        const isRateLimit = rateLimitRemaining === '0' || (rateLimitRemaining && parseInt(rateLimitRemaining) < 10);
        
        if (isRateLimit && !hasToken) {
          throw new InternalServerError(
            `GitHub API rate limit exceeded (${rateLimitRemaining || 0}/${rateLimitTotal || 60} requests remaining). A GitHub token is recommended for higher rate limits (5,000 vs 60 requests/hour). Resets at: ${resetTime}.`
          );
        }
        
        const details = `Rate limit exceeded or access forbidden. Remaining: ${rateLimitRemaining}. Resets at: ${resetTime}. GitHub's message: ${githubMessage}`;
        throw new InternalServerError(
          `GitHub API rate limit exceeded or access is forbidden. ${details}`
        );
      }
      case 404: {
        const details = `The requested resource at ${url} was not found. This could mean the GitHub username or repository does not exist. GitHub's message: ${githubMessage}`;
        throw new InternalServerError(`The requested GitHub user or repository was not found. ${details}`);
      }
      default:
        throw new InternalServerError(
          `GitHub API responded with an error: ${githubMessage}`
        );
    }
  }

  return response.json();
};

/**
 * Fetch README content from a repository
 */
export const fetchReadmeContent = async (
  repo: GitHubRepo,
  userToken: string | null
): Promise<string | null> => {
  try {
    const readmeData = (await fetchFromGitHub(
      `https://api.github.com/repos/${repo.full_name}/readme`,
      userToken
    )) as GitHubReadme;
    const content = Buffer.from(readmeData.content, 'base64').toString('utf-8');
    return content;
  } catch (error) {
    // A missing README is not a critical error, so we suppress it and return null.
    console.warn(`Could not fetch README for ${repo.full_name}:`, error);
    return null;
  }
};

/**
 * Extract video URLs from text
 */
export const extractVideoUrls = (text: string | null | undefined): string | null => {
  if (!text) return null;

  const videoPatterns = [
    /https:\/\/www\.youtube\.com\/watch\?v=[\w-]+/g,
    /https:\/\/youtu\.be\/[\w-]+/g,
    /https:\/\/vimeo\.com\/[\d]+/g,
    /https:\/\/www\.vimeo\.com\/[\d]+/g,
    /https:\/\/www\.loom\.com\/share\/[\w-]+/g,
    /https:\/\/streamable\.com\/[\w-]+/g,
    /https:\/\/www\.dailymotion\.com\/video\/[\w-]+/g,
  ];

  for (const pattern of videoPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      return matches[0];
    }
  }

  return null;
};

/**
 * Transform a GitHub repository to a Project object
 */
export const transformGitHubRepoToProject = async (
  repo: GitHubRepo,
  userToken: string | null
): Promise<TransformedProject | null> => {
  if (repo.fork || repo.private) {
    return null;
  }

  let videoUrl: string | null = null;

  videoUrl = extractVideoUrls(repo.description);

  if (!videoUrl) {
    const readmeContent = await fetchReadmeContent(repo, userToken);
    if (readmeContent) {
      videoUrl = extractVideoUrls(readmeContent);
    }
  }

  const generatedTags: string[] = [];
  if (repo.language) {
    generatedTags.push(repo.language);
  }
  if (repo.topics && repo.topics.length > 0) {
    const formattedTopics = repo.topics.slice(0, 3).map((topic) =>
      topic
        .replace(/-/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
    generatedTags.push(...formattedTopics);
  }

  const title = repo.name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const description = repo.description || `A ${repo.language || 'software'} project`;

  return {
    title,
    description,
    technologies: generatedTags.length > 0 ? generatedTags : ['Project'],
    liveUrl: '#',
    repoUrl: repo.html_url,
    lastUpdated: repo.pushed_at,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    isFeatured: false,
    videoUrl,
  };
};

/**
 * Extract skills from GitHub repositories
 */
export const extractSkillsFromRepos = (repos: GitHubRepo[]): SkillsData => {
  const skillCounts: Record<string, number> = {};
  const languageCounts: Record<string, number> = {};

  repos.forEach((repo) => {
    if (repo.topics && repo.topics.length > 0) {
      repo.topics.forEach((topic) => {
        const formattedTopic = topic
          .replace(/-/g, ' ')
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        if (PROGRAMMING_LANGUAGES.includes(formattedTopic)) {
          languageCounts[formattedTopic] = (languageCounts[formattedTopic] || 0) + 1;
        } else {
          skillCounts[formattedTopic] = (skillCounts[formattedTopic] || 0) + 1;
        }
      });
    }
    if (repo.language) {
      if (PROGRAMMING_LANGUAGES.includes(repo.language)) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      } else {
        skillCounts[repo.language] = (skillCounts[repo.language] || 0) + 1;
      }
    }
  });

  const sortedLanguages = Object.entries(languageCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([language]) => language)
    .slice(0, 15);
  const sortedSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([skill]) => skill)
    .slice(0, 20);

  return {
    programmingLanguages: sortedLanguages,
    otherSkills: sortedSkills,
  };
};

/**
 * Fetch user repositories from GitHub
 */
export const fetchUserRepositories = async (
  username: string,
  token: string | null
): Promise<GitHubRepo[]> => {
  const url = `https://api.github.com/users/${username}/repos?sort=pushed&per_page=100`;
  const repos = await fetchFromGitHub(url, token);
  return repos.filter((repo: GitHubRepo) => !repo.fork && !repo.private);
};


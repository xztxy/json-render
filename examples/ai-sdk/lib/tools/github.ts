import { tool } from "ai";
import { z } from "zod";

/**
 * Get public GitHub repository information.
 * Uses the public GitHub REST API (no auth, 60 req/hr rate limit).
 */
export const getGitHubRepo = tool({
  description:
    "Get information about a public GitHub repository including stars, forks, open issues, description, language, and recent activity.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner (e.g., 'vercel')"),
    repo: z.string().describe("Repository name (e.g., 'next.js')"),
  }),
  execute: async ({ owner, repo }) => {
    const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

    const [repoRes, languagesRes] = await Promise.all([
      fetch(repoUrl, {
        headers: { Accept: "application/vnd.github.v3+json" },
      }),
      fetch(`${repoUrl}/languages`, {
        headers: { Accept: "application/vnd.github.v3+json" },
      }),
    ]);

    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return { error: `Repository not found: ${owner}/${repo}` };
      }
      if (repoRes.status === 403) {
        return { error: "GitHub API rate limit exceeded. Try again later." };
      }
      return { error: `Failed to fetch repository: ${repoRes.statusText}` };
    }

    const repoData = (await repoRes.json()) as {
      full_name: string;
      description: string | null;
      html_url: string;
      stargazers_count: number;
      forks_count: number;
      open_issues_count: number;
      watchers_count: number;
      language: string | null;
      license: { spdx_id: string } | null;
      created_at: string;
      updated_at: string;
      pushed_at: string;
      topics: string[];
      size: number;
      default_branch: string;
      archived: boolean;
      fork: boolean;
    };

    const languages: Record<string, number> = languagesRes.ok
      ? ((await languagesRes.json()) as Record<string, number>)
      : {};

    const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
    const languageBreakdown = Object.entries(languages)
      .map(([lang, bytes]) => ({
        language: lang,
        percentage: Math.round((bytes / totalBytes) * 100),
        bytes,
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8);

    return {
      name: repoData.full_name,
      description: repoData.description,
      url: repoData.html_url,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      watchers: repoData.watchers_count,
      primaryLanguage: repoData.language,
      license: repoData.license?.spdx_id ?? "None",
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      lastPush: repoData.pushed_at,
      topics: repoData.topics,
      defaultBranch: repoData.default_branch,
      archived: repoData.archived,
      isFork: repoData.fork,
      languages: languageBreakdown,
    };
  },
});

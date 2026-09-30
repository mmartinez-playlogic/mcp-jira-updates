import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import { AppConfig } from './config.js';

export interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  message: string;
  date: string;
  url?: string;
}

export interface CommitHistoryResult {
  latestCommit: CommitInfo;
  commits: CommitInfo[];
  computedVersion: string;
  branch: string;
}

export class GitHubService {
  private octokit: Octokit | null = null;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    if (config.github.token) {
      this.octokit = new Octokit({ auth: config.github.token });
    }
  }

  /**
   * Fetches latest commit and recent commit history from GitHub API or local Git repo as fallback
   */
  async getCommitData(limit: number = 10): Promise<CommitHistoryResult> {
    try {
      if (this.octokit && this.config.github.owner && this.config.github.repo) {
        return await this.fetchFromOctokit(limit);
      }
    } catch (error) {
      console.warn('⚠️ GitHub API request failed or not fully configured. Attempting local git fallback...', (error as Error).message);
    }

    return this.fetchFromLocalGit(limit);
  }

  private async fetchFromOctokit(limit: number): Promise<CommitHistoryResult> {
    if (!this.octokit) throw new Error('Octokit not initialized');

    const { owner, repo, branch } = this.config.github;

    // Fetch commits on branch
    const { data: commitsData } = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: limit,
    });

    if (!commitsData || commitsData.length === 0) {
      throw new Error(`No commits found on branch ${branch} for ${owner}/${repo}`);
    }

    const commits: CommitInfo[] = commitsData.map((c) => ({
      hash: c.sha,
      shortHash: c.sha.substring(0, 7),
      author: c.commit.author?.name || c.author?.login || 'Unknown',
      email: c.commit.author?.email || '',
      message: c.commit.message,
      date: c.commit.author?.date || new Date().toISOString(),
      url: c.html_url,
    }));

    const latestCommit = commits[0];
    const computedVersion = this.generateVersion(latestCommit.shortHash);

    return {
      latestCommit,
      commits,
      computedVersion,
      branch,
    };
  }

  private fetchFromLocalGit(limit: number): CommitHistoryResult {
    try {
      const branch = this.config.github.branch || 'main';
      // %H: commit hash, %h: short hash, %an: author name, %ae: author email, %ad: date, %s: subject
      const format = '%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s';
      const output = execSync(`git log -n ${limit} --pretty=format:"${format}"`, { encoding: 'utf-8' });

      const lines = output.trim().split('\n').filter(Boolean);
      const commits: CommitInfo[] = lines.map((line) => {
        const [hash, shortHash, author, email, date, message] = line.split('\x1f');
        return {
          hash,
          shortHash,
          author,
          email,
          message,
          date,
        };
      });

      if (commits.length === 0) {
        throw new Error('No local git commits found');
      }

      const latestCommit = commits[0];
      const computedVersion = this.generateVersion(latestCommit.shortHash);

      return {
        latestCommit,
        commits,
        computedVersion,
        branch,
      };
    } catch (err) {
      throw new Error(`Failed to fetch commit history via GitHub API or local git: ${(err as Error).message}`);
    }
  }

  private generateVersion(shortHash: string): string {
    const base = this.config.versioning.prefix;
    if (this.config.versioning.includeCommitHash) {
      return `${base}+${shortHash}`;
    }
    return base;
  }
}

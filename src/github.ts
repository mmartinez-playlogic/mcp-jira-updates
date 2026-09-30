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
    if (!this.octokit || !this.config.github.owner || !this.config.github.repo) {
      throw new Error('Octokit/GitHub parameters not fully configured');
    }

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
      const targetBranch = this.config.github.branch || 'main';
      const cwd = this.config.github.localRepoPath || process.cwd();
      const mergesOnly = this.config.versioning.mergesOnly !== false;
      const mergesFlag = mergesOnly ? '--merges ' : '';
      // %H: commit hash, %h: short hash, %an: author name, %ae: author email, %ad: date, %s: subject
      const format = '%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s';

      let output = '';
      const branchesToTry = [targetBranch, `origin/${targetBranch}`, 'main', 'master', 'HEAD'];

      // First try with --merges if enabled
      for (const branchRef of branchesToTry) {
        try {
          output = execSync(`git log ${branchRef} ${mergesFlag}-n ${limit} --pretty=format:"${format}"`, {
            encoding: 'utf-8',
            cwd,
          });
          if (output.trim()) break;
        } catch {
          // Try next branch ref
        }
      }

      // Fallback without --merges if --merges returned empty
      if (!output.trim() && mergesOnly) {
        for (const branchRef of branchesToTry) {
          try {
            output = execSync(`git log ${branchRef} -n ${limit} --pretty=format:"${format}"`, {
              encoding: 'utf-8',
              cwd,
            });
            if (output.trim()) break;
          } catch {
            // Try next branch ref
          }
        }
      }

      if (!output.trim()) {
        output = execSync(`git log -n ${limit} --pretty=format:"${format}"`, {
          encoding: 'utf-8',
          cwd,
        });
      }

      const lines = output.trim().split('\n').filter(Boolean);
      let commits: CommitInfo[] = lines.map((line) => {
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

      // When mergesOnly, keep only real PR merges (Merge pull request #N)
      if (mergesOnly) {
        commits = commits.filter((c) =>
          /^Merge pull request #\d+/i.test((c.message || '').trim())
        );
      }

      if (commits.length === 0) {
        throw new Error('No merge commits found on branch. Ensure the branch has merged pull requests.');
      }

      const latestCommit = commits[0];
      const computedVersion = this.generateVersion(latestCommit.shortHash);

      return {
        latestCommit,
        commits,
        computedVersion,
        branch: targetBranch,
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

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
export declare class GitHubService {
    private octokit;
    private config;
    constructor(config: AppConfig);
    /**
     * Fetches latest commit and recent commit history from GitHub API or local Git repo as fallback
     */
    getCommitData(limit?: number): Promise<CommitHistoryResult>;
    private fetchFromOctokit;
    private fetchFromLocalGit;
    private generateVersion;
}

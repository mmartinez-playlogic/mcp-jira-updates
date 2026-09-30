import { CommitInfo } from './github.js';
export interface CategorizedCommits {
    features: CommitInfo[];
    fixes: CommitInfo[];
    performance: CommitInfo[];
    documentation: CommitInfo[];
    chores: CommitInfo[];
    other: CommitInfo[];
}
export declare class ChangelogGenerator {
    static categorizeCommits(commits: CommitInfo[]): CategorizedCommits;
    /**
     * Generates clean markdown representation of the changelog
     */
    static generateMarkdown(version: string, latestCommit: CommitInfo, commits: CommitInfo[], repoUrl?: string): string;
    /**
     * Builds Atlassian Document Format (ADF) JSON structure required by Jira Cloud REST API v3
     */
    static generateADF(version: string, latestCommit: CommitInfo, commits: CommitInfo[]): any;
    /**
     * Generates Confluence Storage Format XHTML (HTML subset used by Confluence Cloud)
     */
    static generateConfluenceStorageFormat(version: string, latestCommit: CommitInfo, commits: CommitInfo[]): string;
    /**
     * Plain text summary for console outputs & webhook messages
     */
    static generateSummaryText(version: string, latestCommit: CommitInfo, commitsCount: number): string;
}

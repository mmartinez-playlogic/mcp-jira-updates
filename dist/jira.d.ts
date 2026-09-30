import { AppConfig } from './config.js';
import { CommitInfo } from './github.js';
export declare class JiraService {
    private client;
    private config;
    constructor(config: AppConfig);
    /**
     * Updates Jira according to configured update mode (issue_comment, issue_description, jira_version)
     */
    updateJiraChangelog(version: string, latestCommit: CommitInfo, commits: CommitInfo[]): Promise<{
        success: boolean;
        mode: string;
        details: string;
    }>;
    /**
     * Posts an issue comment formatted in ADF (Atlassian Document Format)
     */
    private addIssueComment;
    /**
     * Appends or sets the Jira Issue description formatted in ADF
     */
    private updateIssueDescription;
    /**
     * Creates or updates a Jira Project Release Version
     */
    private createOrUpdateProjectVersion;
}

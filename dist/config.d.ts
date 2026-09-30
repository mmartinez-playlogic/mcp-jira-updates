export interface AppConfig {
    github: {
        token?: string;
        owner?: string;
        repo?: string;
        branch: string;
        localRepoPath?: string;
    };
    jira: {
        host: string;
        email: string;
        apiToken: string;
        projectKey?: string;
        issueKey?: string;
        confluencePageId?: string;
        updateMode: 'issue_comment' | 'issue_description' | 'jira_version' | 'confluence_page';
    };
    versioning: {
        prefix: string;
        includeCommitHash: boolean;
        mergesOnly?: boolean;
    };
    notification: {
        webhookUrl?: string;
        email?: string;
        smtp?: {
            host?: string;
            port?: number;
            user?: string;
            pass?: string;
        };
    };
    dryRun: boolean;
    onlyNewCommits?: boolean;
}
export declare function extractConfluencePageId(input?: string): string | undefined;
export declare function getConfig(overrides?: Partial<AppConfig>): AppConfig;
export declare function validateConfig(config: AppConfig): string[];

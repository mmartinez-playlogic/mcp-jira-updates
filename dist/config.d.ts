export interface AppConfig {
    github: {
        token: string;
        owner: string;
        repo: string;
        branch: string;
    };
    jira: {
        host: string;
        email: string;
        apiToken: string;
        projectKey: string;
        issueKey?: string;
        updateMode: 'issue_comment' | 'issue_description' | 'jira_version';
    };
    versioning: {
        prefix: string;
        includeCommitHash: boolean;
    };
    notification: {
        webhookUrl?: string;
    };
    dryRun: boolean;
}
export declare function getConfig(overrides?: Partial<AppConfig>): AppConfig;
export declare function validateConfig(config: AppConfig): string[];

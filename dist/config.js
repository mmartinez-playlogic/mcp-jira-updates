import dotenv from 'dotenv';
// Load .env file if available
dotenv.config();
export function extractConfluencePageId(input) {
    if (!input)
        return undefined;
    // If it's a URL like https://playlogiq.atlassian.net/wiki/spaces/SD/pages/888995841/Changelogs
    const match = input.match(/\/pages\/(\d+)/);
    if (match)
        return match[1];
    // If it's already a numeric ID
    if (/^\d+$/.test(input.trim()))
        return input.trim();
    return input;
}
export function getConfig(overrides) {
    const rawHost = process.env.JIRA_HOST || 'https://playlogiq.atlassian.net';
    const formattedHost = rawHost.startsWith('http') ? rawHost : `https://${rawHost}`;
    const confluenceInput = overrides?.jira?.confluencePageId || process.env.CONFLUENCE_PAGE_ID || process.env.CONFLUENCE_PAGE_URL;
    const confluencePageId = extractConfluencePageId(confluenceInput);
    let defaultMode = process.env.JIRA_UPDATE_MODE || (confluencePageId ? 'confluence_page' : 'issue_comment');
    return {
        github: {
            token: overrides?.github?.token || process.env.GITHUB_TOKEN || process.env.GH_PAT || '',
            owner: overrides?.github?.owner || process.env.GITHUB_OWNER || process.env.GITHUB_REPOSITORY_OWNER || '',
            repo: overrides?.github?.repo || process.env.GITHUB_REPO || (process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : ''),
            branch: overrides?.github?.branch || process.env.GITHUB_BRANCH || 'main',
            localRepoPath: overrides?.github?.localRepoPath || process.env.LOCAL_REPO_PATH || process.cwd(),
        },
        jira: {
            host: formattedHost,
            email: overrides?.jira?.email || process.env.JIRA_EMAIL || '',
            apiToken: overrides?.jira?.apiToken || process.env.JIRA_API_TOKEN || '',
            projectKey: overrides?.jira?.projectKey || process.env.JIRA_PROJECT_KEY || '',
            issueKey: overrides?.jira?.issueKey || process.env.JIRA_ISSUE_KEY,
            confluencePageId,
            updateMode: (overrides?.jira?.updateMode || defaultMode),
        },
        versioning: {
            prefix: overrides?.versioning?.prefix || process.env.VERSION_PREFIX || 'v1.0.0',
            includeCommitHash: overrides?.versioning?.includeCommitHash ?? (process.env.INCLUDE_COMMIT_HASH !== 'false'),
        },
        notification: {
            webhookUrl: overrides?.notification?.webhookUrl || process.env.NOTIFICATION_WEBHOOK_URL,
        },
        dryRun: overrides?.dryRun ?? false,
    };
}
export function validateConfig(config) {
    const errors = [];
    if (!config.dryRun) {
        if (!config.jira.host || config.jira.host === 'https://') {
            errors.push('Missing JIRA_HOST environment variable');
        }
        if (!config.jira.email) {
            errors.push('Missing JIRA_EMAIL environment variable');
        }
        if (!config.jira.apiToken) {
            errors.push('Missing JIRA_API_TOKEN environment variable');
        }
        if (config.jira.updateMode === 'confluence_page' && !config.jira.confluencePageId) {
            errors.push('Missing CONFLUENCE_PAGE_ID or CONFLUENCE_PAGE_URL (required for confluence_page mode)');
        }
        if ((config.jira.updateMode === 'issue_comment' || config.jira.updateMode === 'issue_description') && !config.jira.issueKey) {
            errors.push('Missing JIRA_ISSUE_KEY (required for issue_comment and issue_description update modes)');
        }
        if (config.jira.updateMode === 'jira_version' && !config.jira.projectKey) {
            errors.push('Missing JIRA_PROJECT_KEY (required for jira_version update mode)');
        }
    }
    return errors;
}

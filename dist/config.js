import dotenv from 'dotenv';
// Load .env file if available
dotenv.config();
export function getConfig(overrides) {
    const host = process.env.JIRA_HOST || '';
    // Ensure host has protocol
    const formattedHost = host.startsWith('http') ? host : `https://${host}`;
    return {
        github: {
            token: overrides?.github?.token || process.env.GITHUB_TOKEN || process.env.GH_PAT || '',
            owner: overrides?.github?.owner || process.env.GITHUB_OWNER || process.env.GITHUB_REPOSITORY_OWNER || '',
            repo: overrides?.github?.repo || process.env.GITHUB_REPO || (process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : ''),
            branch: overrides?.github?.branch || process.env.GITHUB_BRANCH || 'main',
        },
        jira: {
            host: formattedHost,
            email: overrides?.jira?.email || process.env.JIRA_EMAIL || '',
            apiToken: overrides?.jira?.apiToken || process.env.JIRA_API_TOKEN || '',
            projectKey: overrides?.jira?.projectKey || process.env.JIRA_PROJECT_KEY || '',
            issueKey: overrides?.jira?.issueKey || process.env.JIRA_ISSUE_KEY,
            updateMode: (overrides?.jira?.updateMode || process.env.JIRA_UPDATE_MODE || 'issue_comment'),
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
    if (!config.github.token && !config.dryRun) {
        errors.push('Missing GITHUB_TOKEN environment variable');
    }
    if (!config.github.owner && !config.dryRun) {
        errors.push('Missing GITHUB_OWNER (or GITHUB_REPOSITORY_OWNER) environment variable');
    }
    if (!config.github.repo && !config.dryRun) {
        errors.push('Missing GITHUB_REPO (or GITHUB_REPOSITORY) environment variable');
    }
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
        if (config.jira.updateMode !== 'jira_version' && !config.jira.issueKey) {
            errors.push('Missing JIRA_ISSUE_KEY (required for issue_comment and issue_description update modes)');
        }
        if (config.jira.updateMode === 'jira_version' && !config.jira.projectKey) {
            errors.push('Missing JIRA_PROJECT_KEY (required for jira_version update mode)');
        }
    }
    return errors;
}

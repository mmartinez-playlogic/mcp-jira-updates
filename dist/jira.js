import axios from 'axios';
import { ChangelogGenerator } from './changelog.js';
export class JiraService {
    client = null;
    config;
    constructor(config) {
        this.config = config;
        if (config.jira.host && config.jira.email && config.jira.apiToken) {
            const authHeader = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString('base64');
            this.client = axios.create({
                baseURL: `${config.jira.host}`,
                headers: {
                    Authorization: `Basic ${authHeader}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            });
        }
    }
    /**
     * Updates Jira according to configured update mode (issue_comment, issue_description, jira_version)
     */
    async updateJiraChangelog(version, latestCommit, commits) {
        if (this.config.dryRun) {
            const summary = ChangelogGenerator.generateSummaryText(version, latestCommit, commits.length);
            console.log('🔍 [DRY RUN] Would send update to Jira:');
            console.log('--- Markdown Output ---');
            console.log(ChangelogGenerator.generateMarkdown(version, latestCommit, commits));
            return { success: true, mode: 'DRY_RUN', details: summary };
        }
        if (!this.client) {
            throw new Error('Jira API client is not configured. Check JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN.');
        }
        const mode = this.config.jira.updateMode;
        switch (mode) {
            case 'issue_comment':
                return await this.addIssueComment(version, latestCommit, commits);
            case 'issue_description':
                return await this.updateIssueDescription(version, latestCommit, commits);
            case 'jira_version':
                return await this.createOrUpdateProjectVersion(version, latestCommit, commits);
            default:
                throw new Error(`Unsupported Jira update mode: ${mode}`);
        }
    }
    /**
     * Posts an issue comment formatted in ADF (Atlassian Document Format)
     */
    async addIssueComment(version, latestCommit, commits) {
        const issueKey = this.config.jira.issueKey;
        if (!issueKey)
            throw new Error('JIRA_ISSUE_KEY is required to post a comment');
        const adfBody = ChangelogGenerator.generateADF(version, latestCommit, commits);
        try {
            const response = await this.client.post(`/rest/api/3/issue/${issueKey}/comment`, {
                body: adfBody,
            });
            const commentId = response.data.id;
            const details = `Added comment #${commentId} to Jira issue ${issueKey} with version ${version} (commit: ${latestCommit.shortHash})`;
            return { success: true, mode: 'issue_comment', details };
        }
        catch (error) {
            const errMsg = error.response?.data?.errorMessages?.join(', ') || error.message;
            throw new Error(`Failed to add comment to Jira issue ${issueKey}: ${errMsg}`);
        }
    }
    /**
     * Appends or sets the Jira Issue description formatted in ADF
     */
    async updateIssueDescription(version, latestCommit, commits) {
        const issueKey = this.config.jira.issueKey;
        if (!issueKey)
            throw new Error('JIRA_ISSUE_KEY is required to update issue description');
        const adfBody = ChangelogGenerator.generateADF(version, latestCommit, commits);
        try {
            await this.client.put(`/rest/api/3/issue/${issueKey}`, {
                fields: {
                    description: adfBody,
                },
            });
            const details = `Updated description on Jira issue ${issueKey} for version ${version} (commit: ${latestCommit.shortHash})`;
            return { success: true, mode: 'issue_description', details };
        }
        catch (error) {
            const errMsg = error.response?.data?.errorMessages?.join(', ') || error.message;
            throw new Error(`Failed to update Jira issue ${issueKey} description: ${errMsg}`);
        }
    }
    /**
     * Creates or updates a Jira Project Release Version
     */
    async createOrUpdateProjectVersion(version, latestCommit, commits) {
        const projectKey = this.config.jira.projectKey;
        if (!projectKey)
            throw new Error('JIRA_PROJECT_KEY is required to create a version');
        const description = `Released on commit ${latestCommit.shortHash} (${latestCommit.author}): ${latestCommit.message.split('\n')[0]}`;
        const releaseDate = new Date().toISOString().split('T')[0];
        try {
            // First check if version exists
            const getRes = await this.client.get(`/rest/api/3/project/${projectKey}/version`);
            const existingVersions = getRes.data.values || [];
            const match = existingVersions.find((v) => v.name === version);
            let versionId;
            if (match) {
                versionId = match.id;
                await this.client.put(`/rest/api/3/version/${versionId}`, {
                    description,
                    released: true,
                    releaseDate,
                });
            }
            else {
                const createRes = await this.client.post('/rest/api/3/version', {
                    name: version,
                    project: projectKey,
                    description,
                    released: true,
                    releaseDate,
                });
                versionId = createRes.data.id;
            }
            const details = `Created/Updated Jira Release Version "${version}" (ID: ${versionId}) for project ${projectKey}`;
            return { success: true, mode: 'jira_version', details };
        }
        catch (error) {
            const errMsg = error.response?.data?.errorMessages?.join(', ') || error.message;
            throw new Error(`Failed to create/update Jira version "${version}" for project ${projectKey}: ${errMsg}`);
        }
    }
}

import axios, { AxiosInstance } from 'axios';
import { AppConfig } from './config.js';
import { CommitInfo } from './github.js';
import { ChangelogGenerator } from './changelog.js';

export class JiraService {
  private client: AxiosInstance | null = null;
  private config: AppConfig;

  constructor(config: AppConfig) {
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
  async updateJiraChangelog(
    version: string,
    latestCommit: CommitInfo,
    commits: CommitInfo[]
  ): Promise<{ success: boolean; mode: string; details: string }> {
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
      case 'confluence_page':
        return await this.updateConfluencePage(version, latestCommit, commits);
      default:
        throw new Error(`Unsupported Atlassian update mode: ${mode}`);
    }
  }

  /**
   * Updates a Confluence Cloud Page by prepending/updating its storage format content
   */
  private async updateConfluencePage(
    version: string,
    latestCommit: CommitInfo,
    commits: CommitInfo[]
  ): Promise<{ success: boolean; mode: string; details: string }> {
    const pageId = this.config.jira.confluencePageId;
    if (!pageId) throw new Error('CONFLUENCE_PAGE_ID or CONFLUENCE_PAGE_URL is required for Confluence updates');

    const newChangelogHTML = ChangelogGenerator.generateConfluenceStorageFormat(version, latestCommit, commits);

    try {
      // 1. Fetch current Confluence page content and version
      const getRes = await this.client!.get(`/wiki/rest/api/content/${pageId}?expand=body.storage,version`);
      const pageData = getRes.data;
      const currentVersionNumber = pageData.version?.number || 1;
      const title = pageData.title || 'Changelogs';
      const existingStorage = pageData.body?.storage?.value || '';

      // Prepend the new changelog update to existing content
      const updatedStorage = `${newChangelogHTML}\n<br/>\n${existingStorage}`;

      // 2. Put updated page back to Confluence REST API v1
      await this.client!.put(`/wiki/rest/api/content/${pageId}`, {
        id: pageId,
        type: 'page',
        title,
        version: {
          number: currentVersionNumber + 1,
        },
        body: {
          storage: {
            value: updatedStorage,
            representation: 'storage',
          },
        },
      });

      const details = `Successfully updated Confluence Page "${title}" (ID: ${pageId}) to version ${currentVersionNumber + 1} with release ${version} (commit: ${latestCommit.shortHash})`;
      return { success: true, mode: 'confluence_page', details };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.response?.data?.errorMessages?.join(', ') || error.message;
      throw new Error(`Failed to update Confluence Page ID ${pageId}: ${errMsg}`);
    }
  }

  /**
   * Posts an issue comment formatted in ADF (Atlassian Document Format)
   */
  private async addIssueComment(
    version: string,
    latestCommit: CommitInfo,
    commits: CommitInfo[]
  ): Promise<{ success: boolean; mode: string; details: string }> {
    const issueKey = this.config.jira.issueKey;
    if (!issueKey) throw new Error('JIRA_ISSUE_KEY is required to post a comment');

    const adfBody = ChangelogGenerator.generateADF(version, latestCommit, commits);

    try {
      const response = await this.client!.post(`/rest/api/3/issue/${issueKey}/comment`, {
        body: adfBody,
      });

      const commentId = response.data.id;
      const details = `Added comment #${commentId} to Jira issue ${issueKey} with version ${version} (commit: ${latestCommit.shortHash})`;
      return { success: true, mode: 'issue_comment', details };
    } catch (error: any) {
      const errMsg = error.response?.data?.errorMessages?.join(', ') || error.message;
      throw new Error(`Failed to add comment to Jira issue ${issueKey}: ${errMsg}`);
    }
  }

  /**
   * Appends or sets the Jira Issue description formatted in ADF
   */
  private async updateIssueDescription(
    version: string,
    latestCommit: CommitInfo,
    commits: CommitInfo[]
  ): Promise<{ success: boolean; mode: string; details: string }> {
    const issueKey = this.config.jira.issueKey;
    if (!issueKey) throw new Error('JIRA_ISSUE_KEY is required to update issue description');

    const adfBody = ChangelogGenerator.generateADF(version, latestCommit, commits);

    try {
      await this.client!.put(`/rest/api/3/issue/${issueKey}`, {
        fields: {
          description: adfBody,
        },
      });

      const details = `Updated description on Jira issue ${issueKey} for version ${version} (commit: ${latestCommit.shortHash})`;
      return { success: true, mode: 'issue_description', details };
    } catch (error: any) {
      const errMsg = error.response?.data?.errorMessages?.join(', ') || error.message;
      throw new Error(`Failed to update Jira issue ${issueKey} description: ${errMsg}`);
    }
  }

  /**
   * Creates or updates a Jira Project Release Version
   */
  private async createOrUpdateProjectVersion(
    version: string,
    latestCommit: CommitInfo,
    commits: CommitInfo[]
  ): Promise<{ success: boolean; mode: string; details: string }> {
    const projectKey = this.config.jira.projectKey;
    if (!projectKey) throw new Error('JIRA_PROJECT_KEY is required to create a version');

    const description = `Released on commit ${latestCommit.shortHash} (${latestCommit.author}): ${latestCommit.message.split('\n')[0]}`;
    const releaseDate = new Date().toISOString().split('T')[0];

    try {
      // First check if version exists
      const getRes = await this.client!.get(`/rest/api/3/project/${projectKey}/version`);
      const existingVersions = getRes.data.values || [];
      const match = existingVersions.find((v: any) => v.name === version);

      let versionId: string;
      if (match) {
        versionId = match.id;
        await this.client!.put(`/rest/api/3/version/${versionId}`, {
          description,
          released: true,
          releaseDate,
        });
      } else {
        const createRes = await this.client!.post('/rest/api/3/version', {
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
    } catch (error: any) {
      const errMsg = error.response?.data?.errorMessages?.join(', ') || error.message;
      throw new Error(`Failed to create/update Jira version "${version}" for project ${projectKey}: ${errMsg}`);
    }
  }
}

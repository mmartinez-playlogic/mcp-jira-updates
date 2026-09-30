import axios from 'axios';
import { getConfig, validateConfig } from './config.js';
import { GitHubService } from './github.js';
import { JiraService } from './jira.js';
import { ChangelogGenerator } from './changelog.js';
export async function runSync(options) {
    const config = getConfig(options);
    // Validate configuration unless dry-run is specified with mock data fallback
    const configErrors = validateConfig(config);
    if (configErrors.length > 0 && !config.dryRun) {
        throw new Error(`Configuration errors:\n - ${configErrors.join('\n - ')}`);
    }
    console.log('🔄 Initializing GitHub to Jira Sync...');
    console.log(`📌 Target Repo: ${config.github.owner}/${config.github.repo} (Branch: ${config.github.branch})`);
    // 1. Fetch commit history from GitHub
    const githubService = new GitHubService(config);
    const commitData = await githubService.getCommitData(15);
    console.log(`✅ Retrieved latest commit: ${commitData.latestCommit.shortHash} by ${commitData.latestCommit.author}`);
    console.log(`🏷️  Computed Version: ${commitData.computedVersion}`);
    console.log(`📝 Total Commits in Batch: ${commitData.commits.length}`);
    // 2. Perform Jira Update
    const jiraService = new JiraService(config);
    const jiraResult = await jiraService.updateJiraChangelog(commitData.computedVersion, commitData.latestCommit, commitData.commits);
    console.log(`✅ Jira Update Status: ${jiraResult.details}`);
    // 3. Optional Notification Dispatch (Webhook)
    const summaryMessage = ChangelogGenerator.generateSummaryText(commitData.computedVersion, commitData.latestCommit, commitData.commits.length);
    if (config.notification.webhookUrl && !config.dryRun) {
        try {
            await axios.post(config.notification.webhookUrl, {
                text: `📢 **Jira Changelog Sync Update**\n${summaryMessage}\nDetails: ${jiraResult.details}`,
            });
            console.log('✅ Notification webhook sent successfully.');
        }
        catch (webhookErr) {
            console.warn('⚠️ Webhook notification failed:', webhookErr.message);
        }
    }
    return {
        success: jiraResult.success,
        version: commitData.computedVersion,
        latestCommitHash: commitData.latestCommit.hash,
        commitsProcessed: commitData.commits.length,
        jiraDetails: jiraResult.details,
        message: summaryMessage,
    };
}

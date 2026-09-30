import axios from 'axios';
import { getConfig, validateConfig } from './config.js';
import { GitHubService } from './github.js';
import { JiraService } from './jira.js';
import { ChangelogGenerator } from './changelog.js';
import { Logger } from './logger.js';
import { StateManager } from './state.js';
import { EmailService } from './email.js';
export async function runSync(options) {
    const config = getConfig(options);
    // Validate configuration unless dry-run is specified with mock data fallback
    const configErrors = validateConfig(config);
    if (configErrors.length > 0 && !config.dryRun) {
        const err = new Error(`Configuration errors:\n - ${configErrors.join('\n - ')}`);
        Logger.appendLog({
            timestamp: new Date().toISOString(),
            status: 'FAILED',
            version: 'N/A',
            commitHash: 'N/A',
            commitAuthor: 'N/A',
            jiraDetails: 'Validation Failed',
            error: err.message,
        });
        throw err;
    }
    console.log('🔄 Initializing GitHub to Jira/Confluence Sync...');
    console.log(`📌 Target Repo: ${config.github.localRepoPath || config.github.repo || 'Local Git'} (Branch: ${config.github.branch})`);
    try {
        // 1. Fetch commit history from GitHub or Local Git
        const githubService = new GitHubService(config);
        const commitData = await githubService.getCommitData(15);
        console.log(`✅ Retrieved latest commit: ${commitData.latestCommit.shortHash} by ${commitData.latestCommit.author}`);
        console.log(`🏷️  Computed Version: ${commitData.computedVersion}`);
        console.log(`📝 Total Commits in Batch: ${commitData.commits.length}`);
        // Check state if onlyNewCommits is enabled
        const stateKey = `${config.github.localRepoPath || config.github.repo}_${config.jira.confluencePageId || config.jira.issueKey || 'default'}`;
        const lastState = StateManager.getLastState(stateKey);
        if (config.onlyNewCommits && lastState && lastState.lastSyncedCommitHash === commitData.latestCommit.hash && !config.dryRun) {
            const skipMsg = `ℹ️  Main branch commit (${commitData.latestCommit.shortHash}) has not changed since last sync on ${lastState.lastSyncedDate}. Skipping update.`;
            console.log(skipMsg);
            return {
                success: true,
                version: commitData.computedVersion,
                latestCommitHash: commitData.latestCommit.hash,
                commitsProcessed: 0,
                jiraDetails: skipMsg,
                message: skipMsg,
                skipped: true,
            };
        }
        // 2. Perform Jira/Confluence Update
        const jiraService = new JiraService(config);
        const jiraResult = await jiraService.updateJiraChangelog(commitData.computedVersion, commitData.latestCommit, commitData.commits);
        console.log(`✅ Update Status: ${jiraResult.details}`);
        // 3. Save State & Optional Notification Dispatch
        if (!config.dryRun) {
            StateManager.saveState(stateKey, {
                lastSyncedCommitHash: commitData.latestCommit.hash,
                lastSyncedDate: new Date().toISOString(),
                version: commitData.computedVersion,
            });
        }
        const summaryMessage = ChangelogGenerator.generateSummaryText(commitData.computedVersion, commitData.latestCommit, commitData.commits.length);
        if (config.notification.webhookUrl && !config.dryRun) {
            try {
                await axios.post(config.notification.webhookUrl, {
                    text: `📢 **Jira/Confluence Changelog Sync Update**\n${summaryMessage}\nDetails: ${jiraResult.details}`,
                });
                console.log('✅ Notification webhook sent successfully.');
            }
            catch (webhookErr) {
                console.warn('⚠️ Webhook notification failed:', webhookErr.message);
            }
        }
        // Email Notification
        const emailService = new EmailService(config);
        const emailResult = await emailService.sendReleaseEmail(commitData.computedVersion, commitData.latestCommit, commitData.commits, jiraResult.details);
        console.log(`✉️  ${emailResult.message}`);
        // Append Log Entry
        Logger.appendLog({
            timestamp: new Date().toISOString(),
            status: config.dryRun ? 'DRY_RUN' : 'SUCCESS',
            version: commitData.computedVersion,
            commitHash: commitData.latestCommit.hash,
            commitAuthor: commitData.latestCommit.author,
            jiraDetails: jiraResult.details,
        });
        return {
            success: jiraResult.success,
            version: commitData.computedVersion,
            latestCommitHash: commitData.latestCommit.hash,
            commitsProcessed: commitData.commits.length,
            jiraDetails: jiraResult.details,
            message: summaryMessage,
            skipped: false,
        };
    }
    catch (err) {
        Logger.appendLog({
            timestamp: new Date().toISOString(),
            status: 'FAILED',
            version: 'N/A',
            commitHash: 'N/A',
            commitAuthor: 'N/A',
            jiraDetails: 'Execution Failed',
            error: err.message,
        });
        throw err;
    }
}

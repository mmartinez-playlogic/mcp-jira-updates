#!/usr/bin/env node
import { Command } from 'commander';
import { runSync } from './index.js';
const program = new Command();
program
    .name('jira-changelog')
    .description('CLI tool to sync GitHub commit history & versioning to Jira')
    .version('1.0.0');
program
    .command('sync')
    .description('Fetch latest GitHub commits on main branch and update Jira changelog/version')
    .option('-d, --dry-run', 'Simulate execution without modifying Jira')
    .option('-i, --issue <issueKey>', 'Jira Issue Key (e.g. PROJ-123)')
    .option('-p, --project <projectKey>', 'Jira Project Key (e.g. PROJ)')
    .option('-m, --mode <mode>', 'Update mode: issue_comment, issue_description, or jira_version')
    .option('-v, --version-prefix <prefix>', 'Base version tag prefix (e.g. v1.0.0)')
    .option('-o, --owner <owner>', 'GitHub repository owner/username')
    .option('-r, --repo <repo>', 'GitHub repository name')
    .option('-b, --branch <branch>', 'GitHub target branch (default: main)')
    .action(async (options) => {
    try {
        const overrides = {};
        if (options.dryRun)
            overrides.dryRun = true;
        if (options.issue) {
            overrides.jira = overrides.jira || {};
            overrides.jira.issueKey = options.issue;
        }
        if (options.project) {
            overrides.jira = overrides.jira || {};
            overrides.jira.projectKey = options.project;
        }
        if (options.mode) {
            overrides.jira = overrides.jira || {};
            overrides.jira.updateMode = options.mode;
        }
        if (options.versionPrefix) {
            overrides.versioning = overrides.versioning || {};
            overrides.versioning.prefix = options.versionPrefix;
        }
        if (options.owner || options.repo || options.branch) {
            overrides.github = overrides.github || {};
            if (options.owner)
                overrides.github.owner = options.owner;
            if (options.repo)
                overrides.github.repo = options.repo;
            if (options.branch)
                overrides.github.branch = options.branch;
        }
        const result = await runSync(overrides);
        console.log('\n================ Execution Summary ================');
        console.log(`✨ Status:             SUCCESS`);
        console.log(`🏷️  Version Tag:       ${result.version}`);
        console.log(`🔑 Target Hash:        ${result.latestCommitHash}`);
        console.log(`📊 Commits Processed:  ${result.commitsProcessed}`);
        console.log(`📌 Jira Response:      ${result.jiraDetails}`);
        console.log('====================================================\n');
    }
    catch (err) {
        console.error('\n❌ Execution Failed:', err.message);
        process.exit(1);
    }
});
program.parse(process.argv);

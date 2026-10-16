#!/usr/bin/env node

import { Command } from 'commander';
import { runSync } from './index.js';
import { Logger } from './logger.js';
import { startWatcher } from './watch.js';

const program = new Command();

program
  .name('jira-changelog')
  .description('CLI tool to sync GitHub commit history & versioning to Jira & Confluence')
  .version('1.0.0');

program
  .command('sync')
  .description('Fetch latest GitHub commits on main branch and update Jira/Confluence changelog')
  .option('-d, --dry-run', 'Simulate execution without modifying Jira/Confluence')
  .option('-i, --issue <issueKey>', 'Jira Issue Key (e.g. PROJ-123)')
  .option('-p, --project <projectKey>', 'Jira Project Key (e.g. PROJ)')
  .option('-m, --mode <mode>', 'Update mode: issue_comment, issue_description, jira_version, or confluence_page')
  .option('-v, --version-prefix <prefix>', 'Base version tag prefix (e.g. v1.0.0)')
  .option('--manifest-version <version>', 'Integrity manifest inventory version; tag becomes the bare commit hash and MANIFEST_VERSION is shown on its own line')
  .option('-o, --owner <owner>', 'GitHub repository owner/username')
  .option('-r, --repo <repo>', 'GitHub repository name')
  .option('-b, --branch <branch>', 'GitHub target branch (default: main)')
  .option('-path, --path <path>', 'Path to local git repository directory')
  .option('-c, --confluence <confluencePageIdOrUrl>', 'Confluence Page ID or Page URL to update')
  .option('-n, --only-new', 'Only update Jira/Confluence if main branch has new commits')
  .action(async (options) => {
    try {
      const overrides: any = {};

      if (options.dryRun) overrides.dryRun = true;
      if (options.onlyNew) overrides.onlyNewCommits = true;
      if (options.issue) {
        overrides.jira = overrides.jira || {};
        overrides.jira.issueKey = options.issue;
      }
      if (options.project) {
        overrides.jira = overrides.jira || {};
        overrides.jira.projectKey = options.project;
      }
      if (options.confluence) {
        overrides.jira = overrides.jira || {};
        overrides.jira.confluencePageId = options.confluence;
        overrides.jira.updateMode = 'confluence_page';
      }
      if (options.mode) {
        overrides.jira = overrides.jira || {};
        overrides.jira.updateMode = options.mode;
      }
      if (options.versionPrefix) {
        overrides.versioning = overrides.versioning || {};
        overrides.versioning.prefix = options.versionPrefix;
      }
      if (options.manifestVersion) {
        overrides.versioning = overrides.versioning || {};
        overrides.versioning.manifestVersion = options.manifestVersion;
      }
      if (options.owner || options.repo || options.branch || options.path) {
        overrides.github = overrides.github || {};
        if (options.owner) overrides.github.owner = options.owner;
        if (options.repo) overrides.github.repo = options.repo;
        if (options.branch) overrides.github.branch = options.branch;
        if (options.path) overrides.github.localRepoPath = options.path;
      }

      const result = await runSync(overrides);

      console.log('\n================ Execution Summary ================');
      console.log(`✨ Status:             ${result.skipped ? 'SKIPPED (No New Commits)' : 'SUCCESS'}`);
      console.log(`🏷️  Version Tag:       ${result.version}`);
      if (result.manifestVersion) console.log(`📦 Manifest Version:   ${result.manifestVersion}`);
      console.log(`🔑 Target Hash:        ${result.latestCommitHash}`);
      console.log(`📊 Commits Processed:  ${result.commitsProcessed}`);
      console.log(`📌 Jira/Confluence:    ${result.jiraDetails}`);
      console.log('====================================================\n');
    } catch (err: any) {
      console.error('\n❌ Execution Failed:', err.message);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Automatically watch local repo, fetch main branch updates, and sync to Confluence/Jira when updated')
  .option('-path, --path <path>', 'Path to local git repository directory')
  .option('-b, --branch <branch>', 'Target branch to watch (default: main)', 'main')
  .option('-c, --confluence <confluencePageIdOrUrl>', 'Confluence Page ID or Page URL to update')
  .option('-t, --interval <seconds>', 'Check interval in seconds (default: 60)', '60')
  .action((options) => {
    const overrides: any = {
      github: {
        localRepoPath: options.path,
        branch: options.branch,
      },
      intervalSeconds: parseInt(options.interval, 10),
    };
    if (options.confluence) {
      overrides.jira = {
        confluencePageId: options.confluence,
        updateMode: 'confluence_page',
      };
    }
    startWatcher(overrides);
  });

program
  .command('logs')
  .description('Display recent Jira Changelog sync logs')
  .option('-n, --lines <number>', 'Number of recent log lines to show', '20')
  .action((options) => {
    console.log(`\n📋 --- Recent Jira Sync Logs (${Logger.getLogFilePath()}) ---`);
    console.log(Logger.readLogs(parseInt(options.lines, 10)));
    console.log('----------------------------------------------------------------------\n');
  });

program.parse(process.argv);

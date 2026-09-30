import { execSync } from 'child_process';
import { runSync } from './index.js';
import { AppConfig } from './config.js';

export async function startWatcher(
  options: Partial<AppConfig> & { intervalSeconds?: number }
) {
  const intervalMs = (options.intervalSeconds || 60) * 1000;
  const repoPath = options.github?.localRepoPath || process.cwd();

  console.log(`👀 Starting Automatic Jira/Confluence Watcher...`);
  console.log(`📂 Watching repo: ${repoPath}`);
  console.log(`🌿 Branch: ${options.github?.branch || 'main'}`);
  console.log(`⏱️  Check Interval: ${options.intervalSeconds || 60} seconds\n`);

  const checkAndSync = async () => {
    try {
      // Fetch latest updates from remote git repository
      try {
        execSync(`git fetch origin ${options.github?.branch || 'main'}`, {
          cwd: repoPath,
          encoding: 'utf-8',
          stdio: 'ignore',
        });
      } catch {
        // Continue if fetch fails (e.g. offline)
      }

      // Run sync with onlyNewCommits enabled
      await runSync({
        ...options,
        onlyNewCommits: true,
      });
    } catch (err: any) {
      console.error('⚠️ Watcher cycle error:', err.message);
    }
  };

  // Run first check immediately
  await checkAndSync();

  // Set recurring interval
  setInterval(checkAndSync, intervalMs);
}

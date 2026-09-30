import fs from 'fs';
import path from 'path';

export interface LogEntry {
  timestamp: string;
  status: 'SUCCESS' | 'DRY_RUN' | 'FAILED';
  version: string;
  commitHash: string;
  commitAuthor: string;
  jiraDetails: string;
  error?: string;
}

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'jira-sync.log');

export class Logger {
  static ensureLogDirectory() {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  }

  static appendLog(entry: LogEntry) {
    try {
      this.ensureLogDirectory();
      const line = `[${entry.timestamp}] [${entry.status}] Version: ${entry.version} | Hash: ${entry.commitHash.substring(0, 7)} | Author: ${entry.commitAuthor} | Details: ${entry.jiraDetails}${entry.error ? ` | Error: ${entry.error}` : ''}\n`;
      fs.appendFileSync(LOG_FILE, line, 'utf-8');
    } catch (err) {
      console.warn('⚠️ Could not write to log file:', (err as Error).message);
    }
  }

  static getLogFilePath(): string {
    return LOG_FILE;
  }

  static readLogs(linesCount: number = 20): string {
    if (!fs.existsSync(LOG_FILE)) {
      return 'No logs found yet. Run a sync command to generate logs!';
    }
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n');
    return lines.slice(-linesCount).join('\n');
  }
}

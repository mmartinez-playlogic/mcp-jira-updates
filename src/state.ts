import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.resolve(__dirname, '../logs/state.json');

export interface SyncState {
  lastSyncedCommitHash: string;
  lastSyncedDate: string;
  version: string;
}

export class StateManager {
  private static ensureDir() {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private static loadAll(): Record<string, SyncState> {
    this.ensureDir();
    if (!fs.existsSync(STATE_FILE)) return {};
    try {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  static getLastState(key: string): SyncState | null {
    const all = this.loadAll();
    return all[key] || null;
  }

  static saveState(key: string, state: SyncState) {
    try {
      const all = this.loadAll();
      all[key] = state;
      fs.writeFileSync(STATE_FILE, JSON.stringify(all, null, 2), 'utf-8');
    } catch (err) {
      console.warn('⚠️ Failed to save sync state:', (err as Error).message);
    }
  }
}

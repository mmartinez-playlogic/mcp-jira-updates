import { AppConfig } from './config.js';
export interface SyncResult {
    success: boolean;
    version: string;
    latestCommitHash: string;
    commitsProcessed: number;
    jiraDetails: string;
    message: string;
    skipped?: boolean;
}
export declare function runSync(options?: Partial<AppConfig>): Promise<SyncResult>;

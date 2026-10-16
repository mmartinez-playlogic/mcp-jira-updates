import nodemailer from 'nodemailer';
import { AppConfig } from './config.js';
import { CommitInfo } from './github.js';
import { ChangelogGenerator } from './changelog.js';

export class EmailService {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  async sendReleaseEmail(
    version: string,
    latestCommit: CommitInfo,
    commits: CommitInfo[],
    confluenceDetails?: string
  ): Promise<{ success: boolean; message: string }> {
    const targetEmail = this.config.notification.email || 'm.martinez@playlogiq.com';
    const smtp = this.config.notification.smtp;

    const subject = `🚀 [Changelog Update] Release ${version} published for commit ${latestCommit.shortHash}`;
    const manifestVersion = this.config.versioning.manifestVersion;
    const htmlBody = ChangelogGenerator.generateConfluenceStorageFormat(version, latestCommit, commits, manifestVersion);
    const plainText = ChangelogGenerator.generateMarkdown(version, latestCommit, commits, undefined, manifestVersion);

    if (smtp?.host && smtp?.user && smtp?.pass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port || 587,
          secure: smtp.port === 465,
          auth: {
            user: smtp.user,
            pass: smtp.pass,
          },
        });

        await transporter.sendMail({
          from: `"Jira & Confluence Sync" <${smtp.user}>`,
          to: targetEmail,
          subject,
          text: plainText,
          html: `<div>${htmlBody}</div><br/><p><small>Confluence details: ${confluenceDetails || 'Updated'}</small></p>`,
        });

        return {
          success: true,
          message: `Email notification sent successfully to ${targetEmail}`,
        };
      } catch (err: any) {
        console.warn(`⚠️ Failed to send SMTP email to ${targetEmail}:`, err.message);
        return {
          success: false,
          message: `Failed to send SMTP email: ${err.message}`,
        };
      }
    }

    // Default status if SMTP credentials are not explicitly set in .env
    const summary = `📧 Email Notification prepared for ${targetEmail}: "${subject}"`;
    return {
      success: true,
      message: summary,
    };
  }
}

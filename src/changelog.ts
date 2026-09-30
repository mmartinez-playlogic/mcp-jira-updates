import { CommitInfo } from './github.js';

export interface CategorizedCommits {
  features: CommitInfo[];
  fixes: CommitInfo[];
  performance: CommitInfo[];
  documentation: CommitInfo[];
  chores: CommitInfo[];
  other: CommitInfo[];
}

export class ChangelogGenerator {
  static categorizeCommits(commits: CommitInfo[]): CategorizedCommits {
    const categorized: CategorizedCommits = {
      features: [],
      fixes: [],
      performance: [],
      documentation: [],
      chores: [],
      other: [],
    };

    for (const commit of commits) {
      const msg = commit.message.toLowerCase().trim();
      if (msg.startsWith('feat') || msg.includes('feature')) {
        categorized.features.push(commit);
      } else if (msg.startsWith('fix') || msg.includes('bug')) {
        categorized.fixes.push(commit);
      } else if (msg.startsWith('perf')) {
        categorized.performance.push(commit);
      } else if (msg.startsWith('docs')) {
        categorized.documentation.push(commit);
      } else if (msg.startsWith('chore') || msg.startsWith('refactor') || msg.startsWith('test') || msg.startsWith('ci')) {
        categorized.chores.push(commit);
      } else {
        categorized.other.push(commit);
      }
    }

    return categorized;
  }

  /**
   * Generates clean markdown representation of the changelog
   */
  static generateMarkdown(
    version: string,
    latestCommit: CommitInfo,
    commits: CommitInfo[],
    repoUrl?: string
  ): string {
    const categorized = this.categorizeCommits(commits);
    const dateStr = new Date().toISOString().split('T')[0];

    let md = `## 🚀 Release / Deployment Update: ${version}\n`;
    md += `**Date:** ${dateStr} | **Target Commit:** \`${latestCommit.shortHash}\` (${latestCommit.hash})\n`;
    md += `**Author:** ${latestCommit.author}\n\n`;

    const addSection = (title: string, items: CommitInfo[]) => {
      if (items.length === 0) return '';
      let section = `### ${title}\n`;
      for (const item of items) {
        const firstLine = item.message.split('\n')[0];
        const hashLink = item.url ? `[\`${item.shortHash}\`](${item.url})` : `\`${item.shortHash}\``;
        section += `- ${hashLink} ${firstLine} *(by ${item.author})*\n`;
      }
      return section + '\n';
    };

    md += addSection('✨ Features', categorized.features);
    md += addSection('🐛 Bug Fixes', categorized.fixes);
    md += addSection('⚡ Performance Improvements', categorized.performance);
    md += addSection('📚 Documentation', categorized.documentation);
    md += addSection('🔧 Chores & Maintenance', categorized.chores);
    md += addSection('🔄 Other Changes', categorized.other);

    md += `---\n*Automated changelog updated by GitHub to Jira Sync.*`;

    return md;
  }

  /**
   * Builds Atlassian Document Format (ADF) JSON structure required by Jira Cloud REST API v3
   */
  static generateADF(
    version: string,
    latestCommit: CommitInfo,
    commits: CommitInfo[]
  ): any {
    const categorized = this.categorizeCommits(commits);
    const dateStr = new Date().toISOString().split('T')[0];

    const content: any[] = [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: `🚀 Release / Deployment Update: ${version}` }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Date: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: `${dateStr} | ` },
          { type: 'text', text: 'Target Commit: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: latestCommit.shortHash, marks: [{ type: 'code' }] },
          { type: 'text', text: ` (${latestCommit.hash.substring(0, 12)}...)\n` },
          { type: 'text', text: 'Author: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: latestCommit.author },
        ],
      },
    ];

    const addADFSection = (title: string, items: CommitInfo[]) => {
      if (items.length === 0) return;

      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: title }],
      });

      const listItems: any[] = items.map((item) => {
        const firstLine = item.message.split('\n')[0];
        const itemContent: any[] = [
          { type: 'text', text: item.shortHash, marks: [{ type: 'code' }] },
          { type: 'text', text: ` ${firstLine} ` },
          { type: 'text', text: `(by ${item.author})`, marks: [{ type: 'em' }] },
        ];

        return {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: itemContent,
            },
          ],
        };
      });

      content.push({
        type: 'bulletList',
        content: listItems,
      });
    };

    addADFSection('✨ Features', categorized.features);
    addADFSection('🐛 Bug Fixes', categorized.fixes);
    addADFSection('⚡ Performance Improvements', categorized.performance);
    addADFSection('📚 Documentation', categorized.documentation);
    addADFSection('🔧 Chores & Maintenance', categorized.chores);
    addADFSection('🔄 Other Changes', categorized.other);

    content.push({
      type: 'rule',
    });

    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Automated changelog updated by GitHub to Jira Sync.',
          marks: [{ type: 'em' }],
        },
      ],
    });

    return {
      version: 1,
      type: 'doc',
      content,
    };
  }

  /**
   * Generates Confluence Storage Format XHTML (HTML subset used by Confluence Cloud)
   */
  static generateConfluenceStorageFormat(
    version: string,
    latestCommit: CommitInfo,
    commits: CommitInfo[]
  ): string {
    const categorized = this.categorizeCommits(commits);
    const dateStr = new Date().toISOString().split('T')[0];

    let html = `<h2>🚀 Release / Deployment Update: ${version}</h2>`;
    html += `<p><strong>Date:</strong> ${dateStr} | <strong>Target Commit:</strong> <code>${latestCommit.shortHash}</code> (${latestCommit.hash})<br/>`;
    html += `<strong>Author:</strong> ${latestCommit.author}</p>`;

    const addHTMLSection = (title: string, items: CommitInfo[]) => {
      if (items.length === 0) return '';
      let sec = `<h3>${title}</h3><ul>`;
      for (const item of items) {
        const firstLine = item.message.split('\n')[0].replace(/</g, '&lt;').replace(/>/g, '&gt;');
        sec += `<li><code>${item.shortHash}</code> ${firstLine} <em>(by ${item.author})</em></li>`;
      }
      sec += `</ul>`;
      return sec;
    };

    html += addHTMLSection('✨ Features', categorized.features);
    html += addHTMLSection('🐛 Bug Fixes', categorized.fixes);
    html += addHTMLSection('⚡ Performance Improvements', categorized.performance);
    html += addHTMLSection('📚 Documentation', categorized.documentation);
    html += addHTMLSection('🔧 Chores & Maintenance', categorized.chores);
    html += addHTMLSection('🔄 Other Changes', categorized.other);

    html += `<hr/><p><em>Automated changelog updated by GitHub to Jira & Confluence Sync.</em></p>`;
    return html;
  }

  /**
   * Plain text summary for console outputs & webhook messages
   */
  static generateSummaryText(
    version: string,
    latestCommit: CommitInfo,
    commitsCount: number
  ): string {
    return `[Jira/Confluence Changelog Sync] Version ${version} published for commit ${latestCommit.shortHash} (${commitsCount} commits processed).`;
  }
}

export class ChangelogGenerator {
    static categorizeCommits(commits) {
        const categorized = {
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
            }
            else if (msg.startsWith('fix') || msg.includes('bug')) {
                categorized.fixes.push(commit);
            }
            else if (msg.startsWith('perf')) {
                categorized.performance.push(commit);
            }
            else if (msg.startsWith('docs')) {
                categorized.documentation.push(commit);
            }
            else if (msg.startsWith('chore') || msg.startsWith('refactor') || msg.startsWith('test') || msg.startsWith('ci')) {
                categorized.chores.push(commit);
            }
            else {
                categorized.other.push(commit);
            }
        }
        return categorized;
    }
    /**
     * Generates clean markdown representation of the changelog
     */
    static generateMarkdown(version, latestCommit, commits, repoUrl) {
        const categorized = this.categorizeCommits(commits);
        const dateStr = new Date().toISOString().split('T')[0];
        let md = `## 🚀 Release / Deployment Update: ${version}\n`;
        md += `**Date:** ${dateStr} | **Target Commit:** \`${latestCommit.shortHash}\` (${latestCommit.hash})\n`;
        md += `**Author:** ${latestCommit.author}\n\n`;
        const addSection = (title, items) => {
            if (items.length === 0)
                return '';
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
    static generateADF(version, latestCommit, commits) {
        const categorized = this.categorizeCommits(commits);
        const dateStr = new Date().toISOString().split('T')[0];
        const content = [
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
        const addADFSection = (title, items) => {
            if (items.length === 0)
                return;
            content.push({
                type: 'heading',
                attrs: { level: 3 },
                content: [{ type: 'text', text: title }],
            });
            const listItems = items.map((item) => {
                const firstLine = item.message.split('\n')[0];
                const itemContent = [
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
     * Plain text summary for console outputs & webhook messages
     */
    static generateSummaryText(version, latestCommit, commitsCount) {
        return `[Jira Changelog Sync] Version ${version} published for commit ${latestCommit.shortHash} (${commitsCount} commits processed).`;
    }
}

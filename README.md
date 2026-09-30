# GitHub to Jira Changelog & Versioning Sync

An automated application and CLI tool that connects to your GitHub repository, extracts commit history upon merge or manual invocation, derives versioning tagged with the latest commit hash, and updates your Jira tickets or project releases with a formatted changelog.

---

## ✨ Key Features

- **Automated Commit Tracking**: Fetches the latest published commit hash, author, timestamp, and message history from GitHub.
- **Commit-Hash Versioning**: Generates version identifiers using the latest commit hash (e.g. `v1.0.0+a1b2c3d` or custom prefix).
- **Jira Integration**: Supports Jira Cloud REST API v3 with Atlassian Document Format (ADF) output.
- **Multiple Jira Update Modes**:
  1. `issue_comment`: Posts a structured changelog comment on a target Jira ticket (`JIRA_ISSUE_KEY`).
  2. `issue_description`: Updates/replaces the main description of a target Jira ticket.
  3. `jira_version`: Automatically creates or updates an official Jira Project Release Version under `JIRA_PROJECT_KEY`.
- **Conventional Commit Parsing**: Automatically groups commits into **Features**, **Bug Fixes**, **Performance**, **Docs**, and **Chores**.
- **Dual Trigger Mechanisms**:
  - **Manual CLI Execution**: Run on-demand anytime locally or via terminal.
  - **GitHub Action Workflow**: Automatically triggers on every push / merge to `main`.
- **Dry Run Mode**: Test changelog generation and version calculation without modifying Jira.

---

## 🛠️ Setup & Configuration

### 1. Prerequisites

- Node.js (v18+)
- A Jira Cloud instance (`https://your-domain.atlassian.net`)
- A Jira API Token (Create one at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens))
- A GitHub Personal Access Token (`GITHUB_TOKEN`) with `repo` scope (or automatically provided in GitHub Actions).

### 2. Environment Variables

Create a `.env` file in the root directory (or copy from `.env.example`):

```env
# GitHub Settings
GITHUB_TOKEN=ghp_your_github_token
GITHUB_OWNER=your-org-or-username
GITHUB_REPO=your-repository-name
GITHUB_BRANCH=main

# Jira Settings
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=PROJ
JIRA_ISSUE_KEY=PROJ-123
JIRA_UPDATE_MODE=issue_comment   # Options: issue_comment, issue_description, jira_version

# Versioning Options
VERSION_PREFIX=v1.0.0
INCLUDE_COMMIT_HASH=true

# Optional Webhook Notification
NOTIFICATION_WEBHOOK_URL=
```

---

## 🚀 Running the Application

### 1. Dry Run (Preview without updating Jira)

Test the GitHub connection and inspect the generated changelog markdown:

```bash
npm run dry-run
```

Or via CLI options:

```bash
npx tsx src/cli.ts sync --dry-run
```

### 2. Manual CLI Sync Command

Trigger the sync on-demand:

```bash
npm run sync
```

You can pass CLI arguments to override configuration:

```bash
# Sync specific issue key and version prefix
npx tsx src/cli.ts sync --issue PROJ-456 --version-prefix v2.0.0

# Sync using jira_version mode
npx tsx src/cli.ts sync --mode jira_version --project PROJ
```

---

## 🤖 GitHub Actions Setup (Automatic Trigger on Merge to `main`)

This project includes a pre-configured workflow at `.github/workflows/jira-changelog.yml`.

### Setting up Repository Secrets

In your GitHub Repository, navigate to **Settings > Secrets and variables > Actions** and add the following secrets:

- `JIRA_HOST`: `https://your-domain.atlassian.net`
- `JIRA_EMAIL`: `your-email@example.com`
- `JIRA_API_TOKEN`: Your Atlassian API token
- `JIRA_PROJECT_KEY`: `PROJ`
- `JIRA_ISSUE_KEY`: `PROJ-123` (or whichever issue tracks your deployments)

Whenever code is merged to `main`, GitHub Actions will automatically run the sync and send you execution summaries.

---

## 🏗️ Project Structure

```
├── .github/
│   └── workflows/
│       └── jira-changelog.yml  # GitHub Actions workflow
├── src/
│   ├── config.ts               # Environment & configuration validator
│   ├── github.ts               # GitHub API & Git commit history service
│   ├── changelog.ts            # Conventional commit parser & ADF generator
│   ├── jira.ts                 # Jira REST API client
│   ├── index.ts                # Main sync orchestrator
│   └── cli.ts                  # CLI interface
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 📜 License

MIT
# mcp-jira-updates

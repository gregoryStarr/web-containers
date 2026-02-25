<div align="center">
  <img src="https://img.shields.io/badge/StackBlitz-WebContainers-blue?style=for-the-badge&logo=stackblitz" alt="Powered by StackBlitz WebContainers" />
  <img src="https://img.shields.io/badge/License-BSL--1.1-orange?style=for-the-badge" alt="License BSL-1.1" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
  
  # Browser CI Pipeline
  
  **Run your CI/CD pipelines entirely in the browser using StackBlitz WebContainers.**
  
  No servers. No infrastructure. No costs. Just pure browser-based continuous integration.

[Live Demo](https://browser-ci-pipeline-demo.fly.dev) · [Documentation](apps/browser-ci-pipeline/ARCHITECTURE.md) · [Report Bug](https://github.com/gregoryStarr/web-containers/issues)

</div>

---

## Why Browser CI?

Traditional CI/CD requires servers, infrastructure, and money. **Browser CI** changes that:

- **Zero Infrastructure** — All builds run in WebContainers inside the browser
- **Instant Setup** — No server configuration, no Docker, no CI YAML
- **Free Forever** — No compute costs, no runner minutes
- **Secure** — Your code never leaves your browser
- **Works Everywhere** — Chrome, Firefox, Safari, Edge

## Features

- **GitHub Integration** — Connect with your GitHub Personal Access Token
- **Pull Request Sync** — Automatically fetch and list all PRs from any repo
- **Live Pipeline Execution** — Run `npm install`, `npm run build`, `npm test`
- **Real-time Logs** — Watch build output stream live in the terminal
- **Merge & Delete** — Merge PRs and clean up branches directly from the UI
- **Full Terminal** — Interactive terminal with WebContainer shell access

## Quick Start

### Option 1: Use the Live Demo

The easiest way to try Browser CI:

1. **Visit** [https://browser-ci-pipeline-demo.fly.dev](https://browser-ci-pipeline-demo.fly.dev)
2. **Enter your GitHub Personal Access Token** (with `repo` scope)
3. **Enter an owner** (username or organization)
4. **Click Fetch** to load repositories
5. **Select a repository** and **click Sync** to pull PRs
6. **Select a PR** and **click Run CI** to execute the pipeline

> **Note:** Your token stays in your browser. Nothing is sent to any server.

### Option 2: Run Locally

```bash
# Clone the repository
git clone https://github.com/gregoryStarr/web-containers.git
cd web-containers

# Install dependencies
npm install

# Start the development server
npm start

# Or with Nx
npx nx serve browser-ci-pipeline
```

Open [https://localhost:4200](https://localhost:4200) and accept the self-signed certificate warning.

## GitHub Token Setup

To use Browser CI, you need a GitHub Personal Access Token:

1. Go to [GitHub Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Give it a name (e.g., "Browser CI")
4. Select the `repo` scope (full control of private repositories)
5. Click **Generate token**
6. Copy the token and paste it into Browser CI

> **Security:** Your token is stored locally in your browser and is never transmitted to any server except directly to GitHub's API.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Browser                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   UI       │───▶│  GitHub API │───▶│ WebContainer│     │
│  │  React App  │◀───│  (your token)│◀───│   (builds)  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│        │                                      │             │
│        │                                      │             │
│        ▼                                      ▼             │
│  ┌─────────────┐                      ┌─────────────┐      │
│  │  GitHub     │                      │   Build     │      │
│  │  PRs & Files│                      │   Output    │      │
│  └─────────────┘                      └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

1. **Connect** — Enter your GitHub token to authenticate
2. **Fetch** — Browser CI calls GitHub's API to list repositories
3. **Sync** — Pull all open PRs for the selected repository
4. **Run** — WebContainer fetches the PR branch, installs deps, runs build/tests
5. **Review** — Watch live logs and see pass/fail status
6. **Merge** — Merge successful PRs directly from the UI

## Project Structure

```
web-containers/
├── apps/
│   └── browser-ci-pipeline/     # Main React application
│       ├── src/
│       │   └── app/
│       │       ├── components/   # UI components (modals, forms)
│       │       ├── hooks/       # Custom React hooks
│       │       ├── types/       # TypeScript types
│       │       └── app.tsx      # Main application
│       └── ...
├── libs/
│   └── shared/
│       ├── ci-pipeline/          # Pipeline orchestration logic
│       ├── github-integration/  # GitHub API client
│       └── webcontainer-manager/# WebContainer wrapper
├── fly.toml                     # Fly.io deployment config
├── Dockerfile                   # Container build
└── server.js                    # Production server
```

### Key Libraries

| Library                     | Purpose                                 |
| --------------------------- | --------------------------------------- |
| `@org/ci-pipeline`          | Orchestrates the build pipeline stages  |
| `@org/github-integration`   | GitHub API client for PRs, repos, files |
| `@org/webcontainer-manager` | Wraps StackBlitz WebContainer API       |

## Technology Stack

- **Runtime** — [StackBlitz WebContainers](https://webcontainers.io)
- **Frontend** — React 19, TypeScript, Tailwind CSS
- **Build** — Vite, Nx (monorepo)
- **Deployment** — Fly.io, Docker
- **API** — GitHub REST API v3

## Deployment

The app is deployed to Fly.io. To deploy your own instance:

```bash
# Install Fly CLI
brew install flyctl

# Login
fly auth login

# Launch (first time)
fly launch

# Deploy updates
fly deploy
```

Or use the included Docker image:

```bash
docker build -t browser-ci .
docker run -p 3000:3000 browser-ci
```

## Architecture

For deeper technical details, see [ARCHITECTURE.md](apps/browser-ci-pipeline/ARCHITECTURE.md).

### Data Flow

1. **User enters token** → Stored in React state (local only)
2. **User selects owner** → GitHub API fetches repos via `/users/:owner/repos`
3. **User selects repo** → GitHub API fetches PRs via `/repos/:owner/:repo/pulls`
4. **User clicks Run CI**:
   - Fetch PR branch files via GitTree API
   - Mount files to WebContainer
   - Execute pipeline: `install → build → test`
   - Stream output to terminal UI
   - Post status back to GitHub (optional)

## Limitations & Use Constraints

Browser CI is a powerful tool for development and testing, but it has inherent limitations due to running in a browser environment:

### Browser Compatibility

| Browser     | Support          | Notes                              |
| ----------- | ---------------- | ---------------------------------- |
| Chrome/Edge | ✅ Full          | WebContainers work natively        |
| Firefox     | ✅ Full          | WebWorkers enabled                 |
| Safari      | ⚠️ Experimental  | May have issues with some features |
| Mobile      | ❌ Not supported | Requires desktop browser           |

### GitHub API Rate Limits

- **Unauthenticated**: 60 requests/hour
- **Authenticated (token)**: 5,000 requests/hour
- **Tips**: Use the manual "Fetch" button instead of auto-fetch to conserve API calls

### Repository Size Constraints

| Metric       | Limit      | Notes                                   |
| ------------ | ---------- | --------------------------------------- |
| Total files  | ~1,000     | WebContainer memory constraints         |
| File size    | 500KB/file | Larger files filtered out               |
| Binary files | Limited    | Images/fonts supported, not archives    |
| Hidden dirs  | Skipped    | `.git`, `node_modules`, `dist` excluded |

### Build Constraints

| Constraint            | Impact                                          |
| --------------------- | ----------------------------------------------- |
| **No native modules** | Some npm packages with C++ bindings won't work  |
| **Single thread**     | No parallel builds within a stage               |
| **Browser sandbox**   | No access to system APIs or Docker              |
| **Ephemeral**         | Each run starts fresh (no caching between runs) |
| **Memory limit**      | ~2GB RAM available                              |

### Network Requirements

- **Always online** — Requires internet for GitHub API
- **No webhooks** — Manual refresh to fetch new PRs
- **No SSH keys** — Token-based auth only

### When NOT to Use

- ⛔ Production CI/CD (use GitHub Actions, CircleCI, etc.)
- ⛔ Large monorepos with thousands of files
- ⛔ Projects requiring native Node modules (node-sass, sharp, etc.)
- ⛔ Parallel test execution across multiple machines
- ⛔ Long-running builds (>10 minutes)

### When TO Use

- ✅ Quick PR validation during development
- ✅ Preview builds before merging
- ✅ Debugging CI failures locally
- ✅ Learning/testing CI pipelines
- ✅ Open source projects wanting free CI

> **Bottom line:** Browser CI is excellent for development iteration and quick PR checks. For production CI, use dedicated CI/CD platforms.

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

```bash
# Development setup
npm install
npm start

# Run tests
npm test

# Build
npm run build
```

## License

## License

This software is licensed under the **Business Source License 1.1 (BSL-1.1)**.

### What You Can Do

- ✅ View and study the source code
- ✅ Fork the repository for personal use
- ✅ Submit bug reports and feature requests
- ✅ Use for personal or educational projects
- ✅ Modify and experiment with the code

### What Requires a License

- ❌ Commercial use or revenue-generating products
- ❌ Redistributing as part of a commercial product
- ❌ Using to provide services to third parties
- ❌ Building competing products

### Commercial Licensing

For commercial licensing inquiries, please contact the author.

See [LICENSE](LICENSE) and [NOTICE](NOTICE) for full details.

## Acknowledgments

- [StackBlitz](https://stackblitz.com) — For the incredible WebContainer API
- [GitHub](https://github.com) — For the API that makes this possible
- [Nx](https://nx.dev) — For the amazing monorepo tooling

---

<div align="center">
  
  **Built with** [StackBlitz WebContainers](https://webcontainers.io) · **Deployed on** [Fly.io](https://fly.io)

</div>

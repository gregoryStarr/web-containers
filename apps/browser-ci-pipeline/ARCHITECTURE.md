# Browser CI Pipeline - Architecture Documentation

## Overview

The **Browser CI Pipeline** is a sophisticated browser-based continuous integration platform powered by StackBlitz WebContainers. It enables developers to run build and test pipelines directly in their browser with full filesystem and terminal support—eliminating the need for local CI/CD infrastructure.

---

## Project Structure

```
apps/browser-ci-pipeline/
├── src/
│   ├── app/
│   │   ├── app.tsx                    # Main application component (786 lines)
│   │   ├── components/
│   │   │   ├── PipelineLogs.tsx       # CI pipeline log viewer
│   │   │   ├── PRList.tsx            # Pull request list display
│   │   │   ├── PRDetail.tsx          # Selected PR details and actions
│   │   │   ├── WebContainerTerminal.tsx # Interactive terminal emulator
│   │   │   ├── SettingsPanel.tsx      # Configuration modal
│   │   │   ├── StatusIndicator.tsx    # Connection status display
│   │   │   └── CILogo.tsx            # Custom logo component
│   │   └── nx-welcome.tsx            # Nx starter component
│   ├── main.tsx                       # Application entry point
│   └── styles.css                     # Tailwind + custom CSS variables
├── vite.config.mts                    # Vite configuration with HTTPS
├── postcss.config.js                  # PostCSS for Tailwind v4
└── package.json                       # Dependencies

libs/shared/                          # Shared libraries
├── github-integration/                # GitHub API client
├── webcontainer-manager/              # WebContainer abstraction
├── ci-pipeline/                       # Pipeline orchestration
└── test-utils/                        # Testing utilities
```

---

## Key Design Decisions

### 1. **WebContainers for Browser-Based CI**

The app runs CI pipelines entirely in the browser using StackBlitz WebContainers. This is a revolutionary approach because:

- **No backend required**: All execution happens client-side
- **Security**: Code never leaves the user's browser
- **Speed**: Instant feedback without server round-trips
- **Cost**: Zero infrastructure costs for CI runners

**Implementation** (`WebContainerManager`):

```typescript
// From lib/webcontainer-manager.ts
const webcontainer = new WebContainerManager();
await webcontainer.bootContainer();
const shellProcess = await container.spawn('jsh', { terminal: {...} });
```

### 2. **Service-Oriented Architecture**

The app uses three core services that communicate via callbacks:

| Service                    | Purpose                             | Location                    |
| -------------------------- | ----------------------------------- | --------------------------- |
| `GitHubIntegrationService` | GitHub API interactions             | `@org/github-integration`   |
| `WebContainerManager`      | Browser-based execution environment | `@org/webcontainer-manager` |
| `CIPipelineOrchestrator`   | Pipeline stage management           | `@org/ci-pipeline`          |

**Service initialization pattern** (app.tsx lines 89-131):

```typescript
const webcontainer = new WebContainerManager();
await webcontainer.bootContainer();

const github = new GitHubIntegrationService(token, owner, repo, logCallback);
const orchestrator = new CIPipelineOrchestrator(github, webcontainer, logCallback, stageCallback);
```

### 3. **Callback-Based Logging**

All services communicate via callbacks rather than direct imports, enabling:

- Real-time log streaming to the UI
- Stage tracking for progress indicators
- Decoupled service logic from UI

```typescript
// Log callback pattern
const github = new GitHubIntegrationService(token, owner, repo, (msg: string) => setLogs((prev) => [...prev, `[GitHub] ${msg}`]));

// Stage callback for progress
const orchestrator = new CIPipelineOrchestrator(
  github,
  webcontainer,
  (msg) => setLogs((prev) => [...prev, msg]),
  (stage) => setCurrentStage(stage)
);
```

### 4. **Tailwind CSS v4 with CSS Variables**

The app uses Tailwind CSS v4 (CSS-first configuration) with a custom design system:

**CSS Variables** (styles.css):

```css
:root {
  /* Earth & Forest palette - Sage & Beige Design System */
  --color-earth-bg: #fdfbf7;
  --color-earth-surface: #ffffff;
  --color-earth-border: #e8e8e1;
  --color-earth-primary: #5f7161; /* Sage green */
  --color-earth-secondary: #dde0bd;
  --color-earth-text: #435334;
  --color-earth-muted: #7d8f69;

  --color-forest-dark: #3f4e40;
  --color-forest-accent: #6d8b74;
}
```

**Usage in components**:

```tsx
className = 'bg-[var(--color-forest-dark)] border-[var(--color-earth-border)]';
```

### 5. **HSL-Based Alternating Row Colors** (PipelineLogs.tsx)

The log viewer uses dynamic HSL values based on the earth-primary theme for alternating backgrounds:

```typescript
const getBackgroundClass = (index: number) => {
  const hue = 135; // From earth-primary #5F7161
  const saturation = index % 2 === 0 ? '12%' : '20%';
  const lightness = index % 2 === 0 ? '10%' : '16%';
  return `bg-[hsl(${hue},${saturation},${lightness})]`;
};

const getTextContrastClass = (index: number) => 'text-[#f0f0f0]';
```

This ensures:

- Alternating backgrounds with subtle contrast
- Text always contrasts properly against the background
- Colors are derived from the theme (HSL 135 from earth-primary)

### 6. **Xterm.js Terminal Integration**

The app provides a fully interactive terminal using xterm.js:

```typescript
// Terminal setup with custom theme (emerald)
const term = new Terminal({
  cursorBlink: true,
  fontSize: 13,
  fontFamily: "'JetBrains Mono', monospace",
  theme: {
    background: '#022c22', // emerald-950
    foreground: '#ecfdf5', // emerald-50
  },
});

// Fit addon for responsive sizing
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
```

---

## Component Architecture

### Main App Component (`app.tsx`)

The main app manages:

1. **State Management**: All application state in a single component using `useState`
2. **Service Lifecycle**: Bootstraps WebContainer, GitHub, and Orchestrator
3. **Event Handling**: Pipeline execution, PR operations, settings changes

**Key State Variables**:

```typescript
const [prs, setPrs] = useState<PR[]>([]);
const [selectedPR, setSelectedPR] = useState<PR | null>(null);
const [logs, setLogs] = useState<string[]>([]);
const [status, setStatus] = useState<'online' | 'offline' | 'booting' | 'busy'>();
const [services, setServices] = useState<{ github; webcontainer; orchestrator }>();
```

### PipelineLogs Component

**Purpose**: Display real-time CI pipeline logs with filtering and search

**Key Features**:

- Category-based filtering (COMMANDS, INSTALL, BUILD, TESTS, etc.)
- Auto-scroll to latest log entry
- Alternating HSL backgrounds with contrasting text
- Single icon color (slate-400) for visual consistency

**File**: `src/app/components/PipelineLogs.tsx`

### WebContainerTerminal Component

**Purpose**: Provide an interactive shell for the WebContainer

**Key Features**:

- xterm.js with custom emerald theme
- JSH shell spawned in WebContainer
- Collapsible panel (expandable/collapsible)
- Fit addon for responsive sizing

**File**: `src/app/components/WebContainerTerminal.tsx`

---

## GitHub Integration Pattern

The app uses the GitHub API to:

1. **Poll PRs**: Fetch open pull requests from a repository
2. **Clone repos**: Clone the PR branch into WebContainer
3. **Merge PRs**: Merge approved pull requests
4. **Delete branches**: Clean up branches after merge

**Flow**:

```
User selects PR → Clone repo → Run install → Run build → Run tests → Report results
```

---

## Pipeline Stages

The CI pipeline runs through these stages:

1. **Clone**: Git clone the PR branch
2. **Install**: Run package manager install
3. **Build**: Execute build command
4. **Test**: Run test suite
5. **Report**: Display results in UI

Each stage logs to the PipelineLogs component via callbacks.

---

## Styling Patterns

### Design System: "Sage & Beige"

| Token                     | Value     | Usage                         |
| ------------------------- | --------- | ----------------------------- |
| `--color-earth-primary`   | `#5F7161` | Primary actions, highlights   |
| `--color-earth-secondary` | `#DDE0BD` | Selection backgrounds         |
| `--color-earth-text`      | `#435334` | Body text                     |
| `--color-forest-dark`     | `#3F4E40` | Terminal, sidebar backgrounds |
| `--color-earth-bg`        | `#FDFBF7` | Page background               |

### Responsive Design

- **Mobile-first**: Base styles for mobile, `lg:` overrides for desktop
- **Breakpoints**: sm: 640px, md: 768px, lg: 1024px
- **Container queries**: Used for component-level responsiveness

### Animation Patterns

- **Micro-interactions**: 150-300ms transitions on hover/focus
- **Page load**: Staggered fade-in with `animate-in` classes
- **Status indicators**: Pulsing animations for running processes

---

## Security Considerations

1. **HTTPS Required**: WebContainers require secure context (HTTPS or localhost)
2. **Token Handling**: GitHub token stored in component state, not localStorage
3. **CORS**: GitHub API calls use appropriate CORS headers
4. **No server**: All execution happens in browser—code never leaves user machine

---

## Dependencies

### Core Dependencies

- `@webcontainer/api` - Browser-based Node.js runtime
- `@xterm/xterm` - Terminal emulator
- `@xterm/addon-fit` - Auto-sizing terminal
- `lucide-react` - Icon library

### Build Dependencies

- `tailwindcss` v4 - CSS framework
- `vite` - Build tool
- `react` - UI library
- `typescript` - Type safety

---

## Running the Application

```bash
# Development
npm run dev

# Production build
npm run build

# Via Nx
npx nx run browser-ci-pipeline:build
```

The app runs on `https://localhost:4200` with self-signed certificates (required for WebContainers COOP/COEP headers).

---

## Future Enhancements

1. **Multiple pipeline configurations**: Support different build/test commands per project
2. **Artifact storage**: Save build outputs in IndexedDB
3. **Parallel execution**: Run multiple PR pipelines simultaneously
4. **Pipeline templates**: Reusable pipeline definitions
5. **Team features**: Shared configurations and history

---

## Credits

- **Author**: Gregory Starr
- **Technology**: StackBlitz WebContainers
- **Icons**: Lucide React
- **Design**: Custom "Sage & Beige" theme

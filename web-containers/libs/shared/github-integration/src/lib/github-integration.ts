// Note: In browser environment, GitHub API calls require CORS and authentication
// Webhooks cannot be received directly; use polling or external service

export interface PRData {
  id: number;
  number: number;
  title: string;
  head: {
    sha: string;
    ref: string;
  };
  base: {
    ref: string;
  };
  html_url: string;
}

export interface CIStatus {
  state: 'pending' | 'success' | 'failure' | 'error';
  description: string;
  target_url?: string;
  context: string;
}

interface GitHubFileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  download_url: string;
}

export class GitHubIntegrationService {
  private token: string;
  private owner: string;
  private repo: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string, owner: string, repo: string) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
  }

  async fetchPR(prNumber: number): Promise<PRData> {
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/pulls/${prNumber}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PR: ${response.statusText}`);
    }

    return await response.json() as PRData;
  }

  async postStatusCheck(commitSha: string, status: CIStatus): Promise<void> {
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/statuses/${commitSha}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(status),
    });

    if (!response.ok) {
      throw new Error(`Failed to post status: ${response.statusText}`);
    }
  }

  async fetchPRFiles(prNumber: number): Promise<any[]> {
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/pulls/${prNumber}/files`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PR files: ${response.statusText}`);
    }

    return await response.json() as any[];
  }

  // For webhook simulation - poll for new PRs
  async pollPRs(since?: Date): Promise<PRData[]> {
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/pulls`;
    const params = new URLSearchParams();
    if (since) {
      params.append('since', since.toISOString());
    }

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to poll PRs: ${response.statusText}`);
    }

    return await response.json() as PRData[];
  }

  // Helper to create WebContainer files from repository
  async createContainerFilesFromRepo(): Promise<Record<string, { file: { contents: string } }>> {
    const files = await this.fetchEssentialRepoFiles();
    const containerFiles: Record<string, { file: { contents: string } }> = {};

    for (const file of files) {
      if (file.type === 'file' && file.size < 1000000) { // Skip files larger than 1MB
        try {
          const response = await fetch(file.download_url, {
            headers: {
              'Authorization': `token ${this.token}`,
              'Accept': 'application/vnd.github.v3.raw',
            },
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
          const content = await response.text();
          containerFiles[file.path] = {
            file: {
              contents: content,
            },
          };
        } catch (error) {
          console.warn(`Failed to fetch ${file.path}:`, error);
        }
      }
    }

    return containerFiles;
  }

  // Fetch essential files from repository (non-recursive for simplicity)
  private async fetchEssentialRepoFiles(): Promise<GitHubFileItem[]> {
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repo contents: ${response.statusText}`);
    }

    const contents = await response.json() as GitHubFileItem[];
    const essentialFiles: GitHubFileItem[] = [];

    for (const item of contents) {
      if (item.type === 'file') {
        // Include essential files
        if (item.name === 'package.json' ||
            item.name === 'package-lock.json' ||
            item.name === 'yarn.lock' ||
            item.name === 'tsconfig.json' ||
            item.name === 'vite.config.ts' ||
            item.name === 'vite.config.js' ||
            item.name.endsWith('.config.js') ||
            item.name.endsWith('.config.ts')) {
          essentialFiles.push(item);
        }
      } else if (item.type === 'dir') {
        // Include key directories
        if (item.name === 'src' || item.name === 'libs' || item.name === 'apps' ||
            item.name === 'public' || item.name === 'dist') {
          // Fetch files from these directories (shallow)
          const subResponse = await fetch(`${url}${item.name}`, {
            headers: {
              'Authorization': `token ${this.token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          });
          if (subResponse.ok) {
            const subContents = await subResponse.json() as GitHubFileItem[];
            essentialFiles.push(...subContents.filter(subItem =>
              subItem.type === 'file' && subItem.size < 100000 // < 100KB
            ));
          }
        }
      }
    }

    return essentialFiles;
  }
}

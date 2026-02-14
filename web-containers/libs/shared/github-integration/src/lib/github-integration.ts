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
  url: string;
  download_url: string | null;
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
    console.log('Fetched files for CI:', files.map(f => f.path));
    const containerFiles: Record<string, { file: { contents: string } }> = {};

    for (const file of files) {
      if (file.type === 'file' && file.size < 1000000) { // Skip files larger than 1MB
        try {
          const response = await fetch(file.url, {
            headers: {
              'Authorization': `token ${this.token}`,
              'Accept': 'application/vnd.github.v3.raw',
            },
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
          const content = await response.text();
          // Strip the "web-containers/" prefix for proper mounting
          const relativePath = file.path.replace(/^web-containers\//, '');
          containerFiles[relativePath] = {
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
    console.log('Fetching from URL:', url);
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    console.log('Response status:', response.status, response.statusText);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      throw new Error(`Failed to fetch repo contents: ${response.status} ${response.statusText}`);
    }

    const contents = await response.json() as GitHubFileItem[];
    console.log('Raw API response:', JSON.stringify(contents, null, 2));
    const essentialFiles: GitHubFileItem[] = [];

    for (const item of contents) {
      console.log('Processing item:', item.name, item.type, item.path);
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
    console.log('Found directory:', item.name);
    // Include key directories
    if (item.name === 'src' || item.name === 'libs' || item.name === 'apps' ||
        item.name === 'public' || item.name === 'dist' || item.name === 'web-containers') {
      console.log('Fetching subdirectory:', item.name);
      // Fetch files from these directories (shallow)
      const subResponse = await fetch(`${url}${item.name}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      console.log('Sub response status:', subResponse.status);
      if (subResponse.ok) {
        const subContents = await subResponse.json() as GitHubFileItem[];
        console.log('Sub contents:', subContents.length, 'items');
        const filtered = subContents.filter(subItem =>
          subItem.type === 'file' && (subItem.size < 100000 || subItem.name === 'package-lock.json') // < 100KB or package-lock.json
        );
        console.log('Filtered files:', filtered.length, filtered.map(f => f.name));
        essentialFiles.push(...filtered);
      }
    } else {
      console.log('Skipping directory:', item.name);
    }
      }
    }

    return essentialFiles;
  }
}

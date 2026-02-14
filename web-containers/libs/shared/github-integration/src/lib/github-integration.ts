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

  // Helper to create WebContainer files from PR
  async createContainerFilesFromPR(prNumber: number): Promise<Record<string, { file: { contents: string } }>> {
    const files = await this.fetchPRFiles(prNumber);
    const containerFiles: Record<string, { file: { contents: string } }> = {};

    // For simplicity, only include package.json and source files
    // In real implementation, fetch actual file contents
    for (const file of files) {
      if (file.filename === 'package.json' || file.filename.match(/\.(js|ts|jsx|tsx|json)$/)) {
        // Fetch file content
        const content = await this.fetchFileContent(file.raw_url);
        containerFiles[file.filename] = {
          file: {
            contents: content,
          },
        };
      }
    }

    return containerFiles;
  }

  private async fetchFileContent(rawUrl: string): Promise<string> {
    const response = await fetch(rawUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }
    return await response.text();
  }
}
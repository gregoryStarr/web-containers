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

  private logger?: (message: string) => void;

  constructor(token: string, owner: string, repo: string, logger?: (message: string) => void) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.logger = logger;
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

  async fetchUser(): Promise<{ login: string }> {
    const response = await fetch(`${this.baseUrl}/user`, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
    return await response.json() as { login: string };
  }

  async fetchOrgs(): Promise<{ login: string }[]> {
    const response = await fetch(`${this.baseUrl}/user/orgs`, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!response.ok) throw new Error(`Failed to fetch orgs: ${response.statusText}`);
    return await response.json() as { login: string }[];
  }

  async fetchRepos(owner: string, type: 'user' | 'org' = 'user'): Promise<{ name: string }[]> {
    // If fetching for the authenticated user (and type is user), use /user/repos to see private repos too
    // Otherwise use /users/:username/repos or /orgs/:org/repos
    let url = '';
    if (type === 'org') {
      url = `${this.baseUrl}/orgs/${owner}/repos?per_page=100&sort=updated`;
    } else {
      // For a specific user (public)
      url = `${this.baseUrl}/users/${owner}/repos?per_page=100&sort=updated`;
    }
    
    // Optimisation: if owner matches authenticated user, we could use /user/repos, 
    // but the UI typically selects "Owner" which might be self. 
    // Let's try to handle the "self" case if we can, but simpler to use the public endpoints first.
    // Actually, /user/repos lists all repos the user has access to (owned + collab + org).
    // Better to stick to specific owner listings to filter correctly.

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
        // Fallback: maybe it's the authenticated user? try /user/repos?affiliation=owner
         const selfResponse = await fetch(`${this.baseUrl}/user/repos?per_page=100&sort=updated&affiliation=owner`, {
            headers: {
                Authorization: `token ${this.token}`,
                Accept: 'application/vnd.github.v3+json',
            },
         });
         if (selfResponse.ok) {
             const repos = await selfResponse.json() as { name: string; owner: { login: string } }[];
             return repos.filter(r => r.owner.login === owner);
         }
         throw new Error(`Failed to fetch repos for ${owner}: ${response.statusText}`);
    }
    return await response.json() as { name: string }[];
  }

  // Helper to create WebContainer files from repository using recursive tree API
  async createContainerFilesFromRepo(ref?: string): Promise<Record<string, any>> {
    const { tree, branch } = await this.fetchRepoTree(ref);
    this.logger?.(`🌲 Fetched tree with ${tree.length} items from branch "${branch}"`);

    // Filter out heavy binaries (archives, videos) but allow images/fonts/code
    const ignoredExtensions = new Set(['zip', 'tar', 'gz', 'rar', '7z', 'pdf', 'mp3', 'mp4', 'mov', 'avi', 'exe', 'dmg', 'iso', 'bin']);
    const skipDirs = new Set(['node_modules', '.git', 'dist', '.nx', '.next', '.cache', 'coverage', '.turbo']);

    const filesToFetch = tree.filter(item => {
      if (item.type !== 'blob') return false;
      
      // Log some skips for debugging
      const debugSkip = (reason: string) => {
        // Only log first few to avoid spam
        // if (Math.random() > 0.999) console.log(`Skipped ${item.path}: ${reason}`);
        return false;
      };

      if (item.size > 500000 && !item.path.endsWith('package-lock.json') && !item.path.endsWith('yarn.lock')) return debugSkip('Size too large');

      // Skip files inside excluded directories
      const parts = item.path.split('/');
      if (parts.some(p => skipDirs.has(p))) return debugSkip(`In excluded dir: ${parts.find(p => skipDirs.has(p))}`);

      // Skip heavy binary files
      const ext = item.path.split('.').pop()?.toLowerCase();
      if (ext && ignoredExtensions.has(ext)) return debugSkip('Ignored extension');

      return true;
    });

    this.logger?.(`📋 Filtered to ${filesToFetch.length} files to fetch (from ${tree.length} total)`);
    if (filesToFetch.length < 50) {
        this.logger?.(`Files to fetch: ${filesToFetch.map(f => f.path).join(', ')}`);
    }

    // List of extensions to treat as binary (fetch as Uint8Array)
    const binaryExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'webp', 'bin']);

    // Fetch file contents in parallel batches using the Blob API (item.url)
    // This avoids CORS/token issues with raw.githubusercontent.com for private repos
    const batchSize = 20;
    const fileEntries: { path: string; content: string | Uint8Array }[] = [];
    let failCount = 0;

    for (let i = 0; i < filesToFetch.length; i += batchSize) {
      const batch = filesToFetch.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          // item.url is the API url for the blob: https://api.github.com/repos/.../git/blobs/SHA
          const response = await fetch(item.url, {
            headers: {
              'Authorization': `token ${this.token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          });
          if (!response.ok) throw new Error(`HTTP ${response.status} for ${item.path}`);
          
          const data = await response.json() as { content: string; encoding: string };
          // content is base64 encoded
          const base64Content = data.content.replace(/\n/g, '');
          const binaryString = atob(base64Content);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let k = 0; k < len; k++) {
            bytes[k] = binaryString.charCodeAt(k);
          }

          const ext = item.path.split('.').pop()?.toLowerCase();
          if (ext && binaryExtensions.has(ext)) {
            return { path: item.path, content: bytes };
          } else {
            // Text file - decode UTF-8
            const text = new TextDecoder().decode(bytes);
            return { path: item.path, content: text };
          }
        })
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          fileEntries.push(result.value);
        } else {
          failCount++;
          console.warn('Failed to fetch file:', result.reason);
        }
      }
    }

    if (failCount > 0) {
      this.logger?.(`⚠️ Failed to fetch ${failCount} files`);
    }
    this.logger?.(`✅ Successfully fetched ${fileEntries.length} files`);

    // Validation: Ensure package.json exists anywhere
    if (!fileEntries.some(f => f.path.endsWith('package.json'))) {
      const Msg = `⚠️ Warning: package.json not found in fetched files! CI might fail.`;
      this.logger?.(Msg);
      // throw new Error(Msg); // Downgrade to warning for now to debug
    }

    // Build WebContainer file tree structure
    // WebContainer expects: { 'dir': { directory: { 'file.txt': { file: { contents: '...' } } } } }
    const root: Record<string, any> = {};

    for (const entry of fileEntries) {
      const parts = entry.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i];
        if (!current[dirName]) {
          current[dirName] = { directory: {} };
        }
        current = current[dirName].directory;
      }

      const fileName = parts[parts.length - 1];
      current[fileName] = { file: { contents: entry.content } };
    }

    const totalFiles = fileEntries.length;
    this.logger?.(`🌲 Built tree with ${Object.keys(root).length} top-level entries, ${totalFiles} total files`);

    return root;
  }

  // Fetch the full recursive tree using the Git Trees API (single request)
  private async fetchRepoTree(ref?: string): Promise<{ tree: { path: string; type: string; size: number; url: string }[]; branch: string }> {
    // First get the default branch if ref is not provided
    let branch = ref;

    if (!branch) {
      const repoResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (!repoResponse.ok) {
        this.logger?.(`❌ Failed to fetch repo info: ${repoResponse.statusText}`);
        throw new Error(`Failed to fetch repo info: ${repoResponse.statusText}`);
      }
      const repoData = await repoResponse.json() as { default_branch: string };
      branch = repoData.default_branch;
    }

    // Get the recursive tree for the specified branch/ref
    const treeResponse = await fetch(
      `${this.baseUrl}/repos/${this.owner}/${this.repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    if (!treeResponse.ok) {
      this.logger?.(`❌ Failed to fetch tree: ${treeResponse.statusText}`);
      throw new Error(`Failed to fetch tree: ${treeResponse.statusText}`);
    }
    const treeData = await treeResponse.json() as { tree: { path: string; type: string; size: number; url: string }[]; truncated: boolean };

    if (treeData.truncated) {
      this.logger?.('⚠️ Repository tree was truncated — some files may be missing');
      console.warn('⚠️ Repository tree was truncated — some files may be missing');
    }

    return { tree: treeData.tree, branch };
  }
}


import { GitHubIntegrationService } from './src/lib/github-integration';

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('Please set GITHUB_TOKEN environment variable');
    process.exit(1);
  }

  // Use a medium-sized public repo to test
  const owner = 'facebook';
  const repo = 'react'; 
  
  console.log(`Fetching files for ${owner}/${repo}...`);
  
  const service = new GitHubIntegrationService(token, owner, repo, (msg) => console.log(`[Log] ${msg}`));
  
  try {
    const files = await service.createContainerFilesFromRepo();
    console.log('Successfully fetched files.');
  } catch (error) {
    console.error('Error fetching files:', error);
  }
}

main();

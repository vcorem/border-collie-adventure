import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function getAllFiles(dir: string, baseDir: string = dir): Promise<{path: string, content: string}[]> {
  const files: {path: string, content: string}[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  const ignoreDirs = ['node_modules', '.git', 'dist', '.cache', '.replit', '.upm', '.config'];
  const ignoreFiles = ['.replit', 'replit.nix', '.gitignore'];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      if (!ignoreDirs.includes(entry.name)) {
        files.push(...await getAllFiles(fullPath, baseDir));
      }
    } else {
      if (!ignoreFiles.includes(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          files.push({ path: relativePath, content });
        } catch (e) {
          console.log(`Skipping binary file: ${relativePath}`);
        }
      }
    }
  }
  
  return files;
}

async function main() {
  const repoName = process.argv[2] || 'border-collie-adventure';
  
  console.log('Getting GitHub client...');
  const octokit = await getUncachableGitHubClient();
  
  console.log('Getting authenticated user...');
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);
  
  let repo;
  try {
    console.log(`Checking if repo ${repoName} exists...`);
    const { data: existingRepo } = await octokit.repos.get({
      owner: user.login,
      repo: repoName,
    });
    repo = existingRepo;
    console.log(`Repository ${repoName} already exists`);
  } catch (e: any) {
    if (e.status === 404) {
      console.log(`Creating new repository: ${repoName}`);
      const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'Border Collie Adventure - A Nintendo-style 2D platformer game',
        private: false,
        auto_init: true,
      });
      repo = newRepo;
      console.log(`Repository created: ${repo.html_url}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      throw e;
    }
  }
  
  console.log('Collecting files to upload...');
  const files = await getAllFiles('.');
  console.log(`Found ${files.length} files to upload`);
  
  let currentSha: string | undefined;
  try {
    const { data: ref } = await octokit.git.getRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/main',
    });
    currentSha = ref.object.sha;
    console.log(`Current main branch SHA: ${currentSha}`);
  } catch (e) {
    console.log('No existing commits found, will create initial commit');
  }
  
  console.log('Creating blobs for all files...');
  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner: user.login,
        repo: repoName,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      };
    })
  );
  
  console.log('Creating tree...');
  const { data: tree } = await octokit.git.createTree({
    owner: user.login,
    repo: repoName,
    tree: blobs,
    base_tree: currentSha,
  });
  
  console.log('Creating commit...');
  const { data: commit } = await octokit.git.createCommit({
    owner: user.login,
    repo: repoName,
    message: 'Update Border Collie Adventure game - 30 levels with touch controls',
    tree: tree.sha,
    parents: currentSha ? [currentSha] : [],
  });
  
  console.log('Updating main branch reference...');
  try {
    await octokit.git.updateRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/main',
      sha: commit.sha,
    });
  } catch (e) {
    await octokit.git.createRef({
      owner: user.login,
      repo: repoName,
      ref: 'refs/heads/main',
      sha: commit.sha,
    });
  }
  
  console.log('\n✅ Successfully pushed to GitHub!');
  console.log(`Repository URL: ${repo.html_url}`);
}

main().catch(console.error);

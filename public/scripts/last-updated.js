(function() {
  function formatDate(dateLike) {
    try {
      const d = new Date(dateLike);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) {
      return null;
    }
  }

  function deriveRepoInfo(scriptEl) {
    const datasetOwner = scriptEl && scriptEl.dataset ? scriptEl.dataset.owner : null;
    const datasetRepo = scriptEl && scriptEl.dataset ? scriptEl.dataset.repo : null;

    if (datasetOwner && datasetRepo) {
      return { owner: datasetOwner, repo: datasetRepo };
    }

    const host = window.location.hostname || '';
    if (host.endsWith('.github.io')) {
      const owner = host.split('.')[0];
      return { owner, repo: host };
    }

    // Fallback defaults (override via data-owner/data-repo when including the script)
    // Use the source repository for Firebase Hosting deployments
    return { owner: 'detekoi', repo: 'wildcat-docs' };
  }

  function derivePathForApi(repo) {
    let path = window.location.pathname || '/';

    // If path includes the repo prefix (project pages), strip it
    const repoPrefix = '/' + repo + '/';
    if (path.startsWith(repoPrefix)) {
      path = path.slice(repoPrefix.length - 1);
    }

    // Remove leading slashes for GitHub API path parameter
    path = path.replace(/^\/+/, '');

    // Map directory root to index.html
    if (path === '' || path.endsWith('/')) {
      path = path + 'index.html';
    }

    // For Firebase Hosting, files are served from the repo's public/ directory
    if (!path.startsWith('public/')) {
      path = 'public/' + path;
    }

    return path;
  }

  async function fetchLastCommitDate(owner, repo, filePath) {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(filePath)}&per_page=1`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      throw new Error('GitHub API error: ' + response.status);
    }

    const commits = await response.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      return null;
    }

    const c = commits[0];
    // Prefer committer date, then author date
    const dateLike = (c && c.commit && c.commit.committer && c.commit.committer.date) ||
                     (c && c.commit && c.commit.author && c.commit.author.date) || null;
    return dateLike ? new Date(dateLike) : null;
  }

  function setFooterDate(el, date) {
    const label = (el.textContent.split(':')[0] || 'Last updated').trim();
    const formatted = formatDate(date) || formatDate(document.lastModified) || '';
    if (!formatted) return;
    el.textContent = `${label}: ${formatted}`;
  }

  async function updateLastUpdated() {
    const el = document.getElementById('last-updated');
    if (!el) return;

    const scriptEl = document.currentScript || document.querySelector('script[src*="last-updated.js"]');
    const { owner, repo } = deriveRepoInfo(scriptEl);
    const filePath = derivePathForApi(repo);

    try {
      const date = await fetchLastCommitDate(owner, repo, filePath);
      if (date) {
        setFooterDate(el, date);
        return;
      }
    } catch (_) {
      // Ignore and fall back
    }

    // Fallback to document.lastModified if API fails or returns nothing
    setFooterDate(el, document.lastModified);
  }

  document.addEventListener('DOMContentLoaded', updateLastUpdated);
})();

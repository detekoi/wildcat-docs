(function () {
  // Publish the date as a machine-readable ISO string and let i18n.js render it.
  // Both the label and the date format are language-dependent, so this file
  // deliberately does no formatting -- it used to call
  // toLocaleDateString('en-US', ...), which left the date US-formatted in every
  // locale, and then recovered the label by splitting the element's textContent.
  function publishDate(el, dateLike) {
    const d = new Date(dateLike);
    if (isNaN(d.getTime())) return;
    el.dataset.iso = d.toISOString();
    document.dispatchEvent(new CustomEvent('lastupdated:change'));
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

    // Source files live in src/; public/ is Eleventy's build output and is
    // gitignored, so asking the commits API about a public/ path returns zero
    // commits and the date silently falls back to the deploy time.
    // Keep this in step with `dir.input` in .eleventy.js.
    if (!path.startsWith('src/')) {
      path = 'src/' + path;
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

  async function updateLastUpdated() {
    const el = document.getElementById('last-updated');
    if (!el) return;

    // In local development, use document.lastModified immediately
    // to reflect local changes instead of fetching the old date from GitHub.
    const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) || window.location.protocol === 'file:';
    if (isLocal) {
      publishDate(el, document.lastModified);
      return;
    }

    const scriptEl = document.currentScript || document.querySelector('script[src*="last-updated.js"]');
    const { owner, repo } = deriveRepoInfo(scriptEl);
    const filePath = derivePathForApi(repo);

    try {
      const githubDate = await fetchLastCommitDate(owner, repo, filePath);

      if (githubDate) {
        publishDate(el, githubDate);
        return;
      }
    } catch (_) {
      // Ignore and fall back
    }

    // Fallback to document.lastModified if API fails or returns nothing
    publishDate(el, document.lastModified);
  }

  document.addEventListener('DOMContentLoaded', updateLastUpdated);
})();

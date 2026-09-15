import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Marked } from 'marked';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key || !key.startsWith('--') || !value) {
      throw new Error('Usage: build-docs --source DIR --output DIR --config FILE');
    }
    args[key.slice(2)] = value;
  }
  return args;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripMarkdown(value) {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function descriptionFromMarkdown(markdown, fallback) {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, '');
  const blocks = withoutCode.split(/\n\s*\n/);
  for (const block of blocks) {
    if (/^(?:#|[-+*]\s|\|)/.test(block.trim())) continue;
    const text = stripMarkdown(block.replace(/^[-+*]\s+/gm, ''));
    if (text && text.length > 35) {
      if (text.length <= 157) return text;
      const shortened = text.slice(0, 156);
      return shortened.slice(0, shortened.lastIndexOf(' ')) + '…';
    }
  }
  return fallback;
}

function slugText(value) {
  return stripMarkdown(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

function splitTarget(href) {
  const match = String(href).match(/^([^?#]*)([?#].*)?$/);
  return { pathname: match ? match[1] : href, suffix: match && match[2] ? match[2] : '' };
}

function fileKind(filePath) {
  try {
    return fs.statSync(filePath).isDirectory() ? 'tree' : 'blob';
  } catch {
    return filePath.endsWith('/') ? 'tree' : 'blob';
  }
}

function sourceUrl(config, repositoryRoot, filePath, suffix) {
  const relative = path.relative(repositoryRoot, filePath).split(path.sep).map(encodeURIComponent).join('/');
  return config.sourceRepository + '/' + fileKind(filePath) + '/' +
    encodeURIComponent(config.sourceBranch) + '/' + relative + suffix;
}

function rawSourceUrl(config, repositoryRoot, filePath) {
  const repoPath = new URL(config.sourceRepository).pathname.replace(/^\//, '');
  const relative = path.relative(repositoryRoot, filePath).split(path.sep).map(encodeURIComponent).join('/');
  return 'https://raw.githubusercontent.com/' + repoPath + '/' +
    encodeURIComponent(config.sourceBranch) + '/' + relative;
}

function routeFor(slug) {
  return slug ? '/docs/' + slug + '/' : '/docs/';
}

function renderNavigation(config, currentSlug) {
  return config.groups.map(function (group) {
    const items = group.items.map(function (item) {
      const current = item.slug === currentSlug ? ' aria-current="page"' : '';
      return '<li><a href="' + routeFor(item.slug) + '"' + current + '>' +
        escapeHtml(item.label) + '</a></li>';
    }).join('\n');
    return '<section class="docs-nav-group"><h2>' + escapeHtml(group.title) +
      '</h2><ul>' + items + '</ul></section>';
  }).join('\n');
}

function pageTemplate(config, page) {
  const title = page.isIndex
    ? 'Documentation — ' + config.siteName
    : page.title + ' — ' + config.siteName + ' Documentation';
  const canonical = config.siteUrl + page.route;
  const navigation = renderNavigation(config, page.slug);
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    '    <title>' + escapeHtml(title) + '</title>',
    '    <meta name="description" content="' + escapeHtml(page.description) + '">',
    '    <meta name="theme-color" content="' + escapeHtml(config.themeColor) + '">',
    '    <link rel="icon" href="' + escapeHtml(config.favicon) + '">',
    '    <link rel="canonical" href="' + escapeHtml(canonical) + '">',
    '    <link rel="stylesheet" href="/docs.css">',
    '    <script src="/analytics-config.js"></script>',
    '    <script src="/analytics.js"></script>',
    '    <meta property="og:type" content="article">',
    '    <meta property="og:site_name" content="' + escapeHtml(config.siteName) + '">',
    '    <meta property="og:title" content="' + escapeHtml(title) + '">',
    '    <meta property="og:description" content="' + escapeHtml(page.description) + '">',
    '    <meta property="og:url" content="' + escapeHtml(canonical) + '">',
    '  </head>',
    '  <body>',
    '    <a class="skip-link" href="#content">Skip to content</a>',
    '    <div class="docs-layout">',
    '      <aside class="docs-sidebar">',
    '        <a class="docs-brand" href="/">' + escapeHtml(config.siteName) + '</a>',
    '        <p>' + escapeHtml(config.tagline) + '</p>',
    '        <nav class="desktop-docs-nav" aria-label="Documentation sidebar">' + navigation + '</nav>',
    '        <a class="source-link" href="' + escapeHtml(config.sourceRepository) + '">Source on GitHub</a>',
    '      </aside>',
    '      <main id="content" class="docs-content">',
    '        <a class="back-link" href="/">&larr; ' + escapeHtml(config.siteName) + ' home</a>',
    '        <details class="mobile-docs-nav">',
    '          <summary>Documentation</summary>',
    '          <nav aria-label="Mobile documentation menu">' + navigation + '</nav>',
    '        </details>',
    '        <article class="markdown-body">' + page.html + '</article>',
    page.sourceUrl ? '        <p class="edit-link"><a href="' + escapeHtml(page.sourceUrl) + '">View this page on GitHub</a></p>' : '',
    '        <footer class="docs-footer">',
    '          <span>' + escapeHtml(config.siteName) + ' documentation</span>',
    '          <span><a href="' + escapeHtml(config.licenseUrl) + '">' + escapeHtml(config.licenseName) + '</a></span>',
    '        </footer>',
    '      </main>',
    '    </div>',
    '  </body>',
    '</html>',
    ''
  ].join('\n');
}

function renderDocument(config, markdown, currentFile, routeByFile, repositoryRoot) {
  const seenSlugs = new Map();
  const renderer = {
    heading(token) {
      const text = this.parser.parseInline(token.tokens);
      const base = slugText(token.text || text) || 'section';
      const count = seenSlugs.get(base) || 0;
      seenSlugs.set(base, count + 1);
      const id = count ? base + '-' + count : base;
      return '<h' + token.depth + ' id="' + escapeHtml(id) + '">' + text +
        '<a class="heading-anchor" href="#' + escapeHtml(id) +
        '" aria-label="Link to this section">#</a></h' + token.depth + '>\n';
    }
  };
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer,
    walkTokens(token) {
      if (token.type !== 'link' && token.type !== 'image') return;
      const href = token.href;
      if (!href || /^(?:[a-z]+:|#|\/)/i.test(href)) return;
      const target = splitTarget(href);
      const resolved = path.resolve(path.dirname(currentFile), decodeURIComponent(target.pathname));
      if (token.type === 'image') {
        token.href = rawSourceUrl(config, repositoryRoot, resolved);
      } else if (routeByFile.has(resolved)) {
        token.href = routeFor(routeByFile.get(resolved).slug) + target.suffix;
      } else {
        token.href = sourceUrl(config, repositoryRoot, resolved, target.suffix);
      }
    }
  });
  return marked.parse(markdown).replace(
    / align="(left|center|right)"/g,
    ' class="align-$1"'
  );
}

function renderIndex(config) {
  const groups = config.groups.map(function (group) {
    const links = group.items.map(function (item) {
      return '<a href="' + routeFor(item.slug) + '"><strong>' +
        escapeHtml(item.label) + '</strong><span>' +
        escapeHtml(item.description) + '</span></a>';
    }).join('');
    return '<section class="docs-index-group"><h2>' + escapeHtml(group.title) +
      '</h2><div class="docs-index-links">' + links + '</div></section>';
  }).join('');
  return '<h1>' + escapeHtml(config.siteName) + ' documentation</h1><p class="lead">' +
    escapeHtml(config.docsIntro) + '</p><div class="docs-index">' + groups + '</div>';
}

function writePage(outputRoot, route, html) {
  const relative = route.replace(/^\//, '');
  const directory = path.join(outputRoot, relative);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), html);
}

const args = parseArgs(process.argv.slice(2));
if (!args.source || !args.output || !args.config) {
  throw new Error('Missing --source, --output, or --config');
}

const sourceDir = path.resolve(args.source);
const outputDir = path.resolve(args.output);
const config = JSON.parse(fs.readFileSync(path.resolve(args.config), 'utf8'));
const repositoryRoot = path.dirname(sourceDir);
const documents = config.groups.flatMap(function (group) { return group.items; });
const routeByFile = new Map();

for (const item of documents) {
  const sourceFile = path.resolve(sourceDir, item.file);
  if (!fs.existsSync(sourceFile)) {
    throw new Error('Configured documentation file does not exist: ' + sourceFile);
  }
  routeByFile.set(sourceFile, item);
  for (const alias of item.aliases || []) {
    routeByFile.set(path.resolve(sourceDir, alias), item);
  }
}

fs.mkdirSync(outputDir, { recursive: true });
writePage(outputDir, '/docs/', pageTemplate(config, {
  isIndex: true,
  slug: '',
  route: '/docs/',
  title: 'Documentation',
  description: config.docsIntro,
  html: renderIndex(config),
  sourceUrl: null
}));

for (const item of documents) {
  const sourceFile = path.resolve(sourceDir, item.file);
  const markdown = fs.readFileSync(sourceFile, 'utf8');
  const route = routeFor(item.slug);
  const html = renderDocument(config, markdown, sourceFile, routeByFile, repositoryRoot);
  writePage(outputDir, route, pageTemplate(config, {
    isIndex: false,
    slug: item.slug,
    route,
    title: item.label,
    description: descriptionFromMarkdown(markdown, item.description),
    html,
    sourceUrl: sourceUrl(config, repositoryRoot, sourceFile, '')
  }));
}

const urls = ['/', '/docs/']
  .concat(config.staticRoutes || [])
  .concat(documents.map(function (item) {
    return routeFor(item.slug);
  }));
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urls.map(function (route) {
    return '  <url><loc>' + escapeHtml(config.siteUrl + route) + '</loc></url>';
  }).join('\n'),
  '</urlset>',
  ''
].join('\n');
fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemap);
console.log('Built ' + documents.length + ' documentation pages for ' + config.siteName);

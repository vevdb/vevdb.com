import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const homepage = fs.readFileSync(path.join(repositoryRoot, 'index.html'), 'utf8');
const articleIndex = fs.readFileSync(path.join(repositoryRoot, 'articles/index.html'), 'utf8');
const article = fs.readFileSync(
  path.join(repositoryRoot, 'articles/the-database-as-a-value/index.html'),
  'utf8'
);
const docsConfig = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'docs.config.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(repositoryRoot, '.github/workflows/pages.yml'), 'utf8');
const articleStyles = fs.readFileSync(path.join(repositoryRoot, 'article.css'), 'utf8');

function pngDimensions(relativePath) {
  const image = fs.readFileSync(path.join(repositoryRoot, relativePath));
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20)
  };
}

test('homepage and article index link to the database-value article', () => {
  const route = '/articles/the-database-as-a-value/';
  assert.match(homepage, new RegExp(route));
  assert.match(articleIndex, new RegExp(route));
});

test('article has canonical, sharing, structured data, and analytics metadata', () => {
  assert.match(article, /<link rel="canonical" href="https:\/\/vevdb\.com\/articles\/the-database-as-a-value\/">/);
  assert.match(article, /<meta property="og:type" content="article">/);
  assert.match(article, /<meta property="og:image" content="https:\/\/vevdb\.com\/social\/database-as-a-value\.png">/);
  assert.match(article, /<meta property="og:image:width" content="1200">/);
  assert.match(article, /<meta property="og:image:height" content="630">/);
  assert.match(article, /<meta name="twitter:image" content="https:\/\/vevdb\.com\/social\/database-as-a-value\.png">/);
  assert.match(article, /"@type": "TechArticle"/);
  assert.match(article, /<script src="\/analytics-config\.js"><\/script>/);
  assert.match(article, /<script src="\/analytics\.js"><\/script>/);
  assert.match(article, /data-analytics-event="getting_started_clicked"/);
  assert.match(article, /data-analytics-event="download_clicked"/);
  assert.match(article, /data-analytics-event="evaluation_contact_clicked"/);
});

test('article routes and assets are included in the deployed site', () => {
  assert.deepEqual(docsConfig.staticRoutes, [
    '/articles/',
    '/articles/the-database-as-a-value/'
  ]);
  assert.match(workflow, /cp -R articles _site\//);
  assert.match(workflow, /cp -R social _site\//);
  assert.match(workflow, /article\.css/);
});

test('homepage presents the launch positioning and social preview', () => {
  assert.match(homepage, /<title>VevDB\. Native embedded database for history and what-if state<\/title>/);
  assert.match(homepage, /Start with the problem you have\./);
  assert.match(homepage, /a stable snapshot, not a copy/);
  assert.match(homepage, /what you would need before you could adopt it/);
  assert.match(homepage, /<meta property="og:image" content="https:\/\/vevdb\.com\/social\/vevdb-home\.png">/);
  assert.match(homepage, /<meta property="og:image:width" content="1200">/);
  assert.match(homepage, /<meta property="og:image:height" content="630">/);
  assert.match(homepage, /<meta name="twitter:image" content="https:\/\/vevdb\.com\/social\/vevdb-home\.png">/);
});

test('social preview images use the Open Graph dimensions declared in metadata', () => {
  assert.deepEqual(pngDimensions('social/vevdb-home.png'), { width: 1200, height: 630 });
  assert.deepEqual(pngDimensions('social/database-as-a-value.png'), { width: 1200, height: 630 });
});

test('article and article index use the same desktop content width', () => {
  assert.match(articleStyles, /\.article-shell \{\s*width: min\(920px, calc\(100% - 48px\)\);/);
  assert.match(articleStyles, /\.article-index \{\s*width: min\(920px, calc\(100% - 48px\)\);/);
});

test('article pseudocode uses the homepage syntax highlighting vocabulary', () => {
  assert.match(article, /class="syntax-call"/);
  assert.match(article, /class="syntax-string"/);
  assert.match(article, /class="syntax-comment"/);
  assert.match(articleStyles, /\.syntax-call \{ color: #68d0d0; \}/);
  assert.match(articleStyles, /\.syntax-string \{ color: #c5db91; \}/);
  assert.match(articleStyles, /\.syntax-comment \{ color: #8290a4; \}/);
});

test('article attributes the model to Datomic and derives values from facts', () => {
  assert.match(article, /href="https:\/\/docs\.datomic\.com\/"/);
  assert.match(article, /The Database as a Value<\/em>/);
  assert.match(article, /Deconstructing the Database<\/em>/);

  const factsSection = article.indexOf('<h2>Facts accumulate</h2>');
  const valuesSection = article.indexOf('<h2>The database becomes a value</h2>');
  const applicationSection = article.indexOf('<h2>Change the database value, not the function</h2>');

  assert.ok(factsSection > -1);
  assert.ok(valuesSection > factsSection);
  assert.ok(applicationSection > valuesSection);
  assert.doesNotMatch(article, /<h2>Where this model fits<\/h2>/);
});

test('site prose and generated page titles do not use em dashes', () => {
  const emDashPattern = new RegExp([
    '\u2014',
    '&m' + 'dash;',
    '&#82' + '12;',
    '&#x20' + '14;'
  ].join('|'), 'i');
  for (const source of [homepage, articleIndex, article, workflow]) {
    assert.doesNotMatch(source, emDashPattern);
  }
  const docsBuilder = fs.readFileSync(path.join(repositoryRoot, 'scripts/build-docs.mjs'), 'utf8');
  assert.doesNotMatch(docsBuilder, emDashPattern);
});

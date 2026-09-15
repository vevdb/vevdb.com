import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const homepage = fs.readFileSync(path.join(repositoryRoot, 'index.html'), 'utf8');
const articleIndex = fs.readFileSync(path.join(repositoryRoot, 'articles/index.html'), 'utf8');
const article = fs.readFileSync(
  path.join(repositoryRoot, 'articles/the-database-becomes-an-argument/index.html'),
  'utf8'
);
const docsConfig = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'docs.config.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(repositoryRoot, '.github/workflows/pages.yml'), 'utf8');

test('homepage and article index link to the database-value article', () => {
  const route = '/articles/the-database-becomes-an-argument/';
  assert.match(homepage, new RegExp(route));
  assert.match(articleIndex, new RegExp(route));
});

test('article has canonical, sharing, structured data, and analytics metadata', () => {
  assert.match(article, /<link rel="canonical" href="https:\/\/vevdb\.com\/articles\/the-database-becomes-an-argument\/">/);
  assert.match(article, /<meta property="og:type" content="article">/);
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
    '/articles/the-database-becomes-an-argument/'
  ]);
  assert.match(workflow, /cp -R articles _site\//);
  assert.match(workflow, /article\.css/);
});

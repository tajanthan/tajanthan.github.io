import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHome, renderLibrary, renderTopic } from '../src/render.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = async file => JSON.parse(await readFile(join(root, 'data', file), 'utf8'));

const [profile, topics, papers] = await Promise.all([
  readJson('profile.json'), readJson('topics.json'), readJson('publications.json')
]);

if (!Array.isArray(topics) || !Array.isArray(papers)) throw new Error('Topics and publications must be JSON arrays.');
const knownTopics = new Set(topics.map(topic => topic.code));
for (const topic of topics) {
  for (const code of topic.includes || []) {
    if (!knownTopics.has(code) || code === topic.code) throw new Error(`Invalid included topic ${code} in ${topic.code}`);
  }
  for (const code of topic.excludes || []) {
    if (!knownTopics.has(code) || code === topic.code) throw new Error(`Invalid excluded topic ${code} in ${topic.code}`);
  }
}
const ids = new Set();
for (const paper of papers) {
  if (!paper.id || !/^[a-z0-9][a-z0-9_-]*$/.test(paper.id) || ids.has(paper.id)) throw new Error(`Invalid or duplicate publication id: ${paper.id}`);
  ids.add(paper.id);
  if (!Number.isInteger(paper.year) || !Array.isArray(paper.authors) || !paper.title || !Array.isArray(paper.topics)) throw new Error(`Incomplete publication: ${paper.id}`);
  for (const code of paper.topics) if (!knownTopics.has(code)) throw new Error(`Unknown topic ${code} in ${paper.id}`);
}

const pages = [
  ['index.html', renderHome(profile, topics, papers)],
  ['publications/index.html', renderLibrary(profile, topics, papers)],
  ['cv/index.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=/vision/"><link rel="canonical" href="https://tajanthan.github.io/vision/"><title>Vision &amp; representation learning · Thalaiyasingam Ajanthan</title></head><body><p>This topic is now part of <a href="/vision/">Vision &amp; representation learning</a>.</p></body></html>'],
  ['misc/index.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=/tabular/"><link rel="canonical" href="https://tajanthan.github.io/tabular/"><title>Tabular learning · Thalaiyasingam Ajanthan</title></head><body><p>This topic is now listed under <a href="/tabular/">Tabular learning</a>.</p></body></html>'],
  ['optimization/index.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=/nno/"><link rel="canonical" href="https://tajanthan.github.io/nno/"><title>Learning dynamics &amp; optimization · Thalaiyasingam Ajanthan</title></head><body><p>This topic is now part of <a href="/nno/">Learning dynamics &amp; optimization</a>.</p></body></html>'],
  ...topics.map(topic => [`${topic.code}/index.html`, renderTopic(profile, topic, topics, papers)])
];
for (const [file, html] of pages) {
  await mkdir(resolve(root, file, '..'), { recursive: true });
  const cleanHtml = html.replace(/^[\t ]+$/gm, '');
  await writeFile(join(root, file), `${cleanHtml}\n`, 'utf8');
}
const bibliography = papers.map(paper => paper.bibtex?.trim()).filter(Boolean).join('\n\n');
await writeFile(join(root, 'publications', 'publications.bib'), `${bibliography}\n`, 'utf8');
console.log(`Built ${pages.length} static pages and a BibTeX file from ${papers.length} publications.`);

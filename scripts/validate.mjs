import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { parseBibEntries, authorsFromBib, normalizedTitle } from './lib/bibtex.mjs';

const root = process.cwd();
const json = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
const [papers, topics, profile] = await Promise.all(['data/publications.json', 'data/topics.json', 'data/profile.json'].map(json));
const knownTopics = new Set(topics.map(topic => topic.code));
for (const topic of topics) {
  for (const included of topic.includes || []) assert(knownTopics.has(included) && included !== topic.code, `Invalid included topic ${included} in ${topic.code}`);
}
const topicCodes = paper => {
  const codes = new Set(paper.topics);
  for (const topic of topics) if (!topic.excludes?.some(excluded => codes.has(excluded)) && topic.includes?.some(included => codes.has(included))) codes.add(topic.code);
  return codes;
};
const types = new Set(['conference', 'journal', 'workshop', 'preprint', 'thesis']);
const ids = new Set();
const citationKeys = new Set();
for (const paper of papers) {
  assert.match(paper.id, /^[a-z0-9][a-z0-9_-]*$/);
  assert(!ids.has(paper.id), `Duplicate ID: ${paper.id}`);
  ids.add(paper.id);
  assert(paper.title && paper.venue && types.has(paper.type), `Incomplete record: ${paper.id}`);
  assert(Number.isInteger(paper.year) && paper.year >= 1900 && paper.year <= new Date().getFullYear() + 1, `Invalid year: ${paper.id}`);
  assert(paper.authors.length && paper.authors.every(author => typeof author === 'string' && author.trim()), `Invalid authors: ${paper.id}`);
  assert(paper.authors.some(author => /Ajanthan/i.test(author)), `Profile author missing: ${paper.id}`);
  assert(Array.isArray(paper.topics) && paper.topics.every(topic => knownTopics.has(topic)), `Invalid topics: ${paper.id}`);
  assert(paper.links?.paper && /\.pdf(?:$|[?#])|\/pdf\//i.test(paper.links.paper), `Full-paper PDF link missing: ${paper.id}`);
  if (paper.citationThreshold !== undefined) {
    assert(Number.isInteger(paper.citationThreshold) && paper.citationThreshold > 1000 && paper.citationThreshold % 500 === 0, `Invalid citation threshold: ${paper.id}`);
  }
  const bib = parseBibEntries(paper.bibtex);
  assert.equal(bib.length, 1, `Invalid citation: ${paper.id}`);
  assert(!citationKeys.has(bib[0].key), `Duplicate citation key: ${bib[0].key}`);
  citationKeys.add(bib[0].key);
  assert.equal(normalizedTitle(bib[0].fields.title), normalizedTitle(paper.title), `Citation title mismatch: ${paper.id}`);
  assert.equal(Number(bib[0].fields.year), paper.year, `Citation year mismatch: ${paper.id}`);
  const normalizeAuthor = author => author.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  assert.deepEqual(authorsFromBib(bib[0].fields.author).map(normalizeAuthor), paper.authors.map(normalizeAuthor), `Citation author mismatch: ${paper.id}`);
  if (paper.verified) assert(paper.sources?.some(source => source.startsWith('https://')), `Verification source missing: ${paper.id}`);
}
assert.equal(papers.filter(paper => paper.selected).length, 6, 'Homepage needs six curated papers.');
assert.equal(papers.filter(paper => paper.citationThreshold !== undefined).length, 3, 'Expected three citation badges.');
assert(!topics.some(topic => topic.code === 'optimization' || topic.code === 'misc'), 'Broad Optimization and Other topics should not be present.');
for (const [id, threshold] of [['lee_snip_iclr19', 2000], ['chaudhry_rwalk_eccv2018', 2000], ['chaudhry_tinyer_icml2019', 1500]]) {
  assert.equal(papers.find(paper => paper.id === id)?.citationThreshold, threshold, `Citation threshold mismatch: ${id}`);
}
const contextPaper = papers.find(paper => paper.id === 'ramasinghe_mixtures_neurips25');
assert(contextPaper.topics.includes('context') && !contextPaper.topics.includes('pipeline'), 'Context-parallel paper needs the context tag, not pipeline parallelism.');
const tabularPaper = papers.find(paper => paper.id === 'liu_ssldm_iclr24');
assert(!topicCodes(tabularPaper).has('vision'), 'Tabular diffusion must not inherit the Vision theme.');
for (const id of ['markou_reduction_neurips25', 'markou_gnc_neurips24', 'lee_dataparallelism_iclr21']) {
  assert.equal(papers.find(paper => paper.id === id)?.primarySupervision, false, `Unexpected supervision classification: ${id}`);
}
for (const id of ['tonioni_l2a_cvpr19', 'long_rac_cvpr22', 'ramasinghe_llm_adaptation_arxiv26']) {
  assert.equal(papers.find(paper => paper.id === id)?.primarySupervision, true, `Missing supervision classification: ${id}`);
}
assert.equal(papers.find(paper => paper.id === 'xu_supseg_arxiv20')?.primarySupervision, false, 'Superpixel segmentation should not be classified as supervised.');
assert.notEqual(papers.find(paper => paper.id === 'xu_ranp_3dv20')?.primarySupervision, false, 'RANP should keep the default author-position classification.');
assert.equal(papers.some(paper => paper.topics.includes('cv')), false, 'Generic Computer vision should not remain a paper tag.');
assert(!topics.some(topic => topic.code === 'cv'), 'Generic Computer vision topic should be removed.');
assert(!topics.some(topic => topic.code === 'misc'), 'Other topic should be removed.');
assert(profile.name && profile.intro && profile.contact?.links?.length, 'Incomplete profile');

const pages = ['index.html', 'publications/index.html', ...topics.map(topic => `${topic.code}/index.html`)];
const legacyVision = await readFile(join(root, 'cv/index.html'), 'utf8');
assert(legacyVision.includes('content="0;url=/vision/"'), 'Legacy /cv/ route must redirect to vision research.');
for (const [path, destination] of [['misc/index.html', '/tabular/'], ['optimization/index.html', '/nno/']]) {
  const legacyPage = await readFile(join(root, path), 'utf8');
  assert(legacyPage.includes(`content="0;url=${destination}"`), `Legacy /${path.split('/')[0]}/ route must redirect to ${destination}.`);
}
const htmlByPath = new Map(await Promise.all(pages.map(async path => [path, await readFile(join(root, path), 'utf8')])));
const publicationHtml = htmlByPath.get('publications/index.html');
for (const paper of papers.filter(paper => paper.citationThreshold !== undefined)) {
  const article = publicationHtml.match(new RegExp(`<article class="paper" id="${paper.id}"[\\s\\S]*?<\\/article>`))?.[0] || '';
  const threshold = paper.citationThreshold;
  assert(article.includes(`aria-label="${threshold}+ citations"`), `Citation badge missing: ${paper.id}`);
}
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
let checkedLinks = 0;
for (const [path, html] of htmlByPath) {
  const pageIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(pageIds).size, pageIds.length, `Duplicate HTML ID in ${path}`);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `Expected one heading in ${path}`);
  assert(html.includes('name="description"') && html.includes('rel="canonical"'), `Missing page metadata: ${path}`);
  assert(!/>(?:Supp\.|Supplement)\s*</i.test(html), `Supplement link rendered in ${path}`);
  const expected = path === 'index.html' ? 6 : path.startsWith('publications/') ? papers.length : papers.filter(p => topicCodes(p).has(path.split('/')[0])).length;
  assert.equal([...html.matchAll(/data-paper(?:\s|>)/g)].length, expected, `Publication count differs from data in ${path}; run npm run build`);
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
    const href = decode(raw);
    const url = new URL(href, `https://local.invalid/${path}`);
    assert(['http:', 'https:', 'mailto:'].includes(url.protocol), `Unexpected URL: ${href}`);
    if (url.origin !== 'https://local.invalid') continue;
    let target = resolve(root, '.' + decodeURIComponent(url.pathname));
    assert(target.startsWith(root + sep) || target === root, `Path escapes site: ${href}`);
    const info = await stat(target).catch(() => null);
    assert(info, `Broken local link in ${path}: ${href}`);
    if (info.isDirectory()) target = join(target, 'index.html');
    await stat(target);
    if (url.hash) {
      const targetHtml = htmlByPath.get(target.slice(root.length + 1)) || await readFile(target, 'utf8');
      const fragment = decodeURIComponent(url.hash.slice(1));
      assert(targetHtml.includes(`id="${fragment}"`), `Missing fragment in ${path}: ${href}`);
    }
    checkedLinks++;
  }
}
console.log(`Validated ${papers.length} publications, ${pages.length} pages and ${checkedLinks} local links.`);

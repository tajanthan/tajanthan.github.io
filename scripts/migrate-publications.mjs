#!/usr/bin/env node
// Rebuild the initial JSON catalogue from the site's committed legacy HTML.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authorsFromBib, bibtexFor, latexText, normalizedTitle, parseBibEntries } from './lib/bibtex.mjs';
import { applyVerifiedPublications } from './lib/verified-publications.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyRef = 'a960d0444f8bf3c22ee92fe53afbab29d732a732';
const topics = ['pl', 'vl', 'dlt', 'nnq', 'nnp', 'spnn', 'nnc', 'il', 'mrf', 'meta', 'gm', 'ssl', 'tabular'];
const readCommitted = name => {
  try { return execFileSync('git', ['show', `${legacyRef}:${name}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return readFileSync(path.join(root, name), 'utf8'); }
};
const noComments = html => html.replace(/<!--[\s\S]*?-->/g, '');
const plain = html => latexText(html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' '));
const topicTags = html => [...html.matchAll(/<a\b[^>]*>\s*#([A-Za-z]+)\s*<\/a>/gi)].map(x => x[1].toLowerCase()).filter(x => topics.includes(x));
const equalContributors = {
  long_upms_neurips25: [0, 1],
  rahimi_wsod_wacv22: [0, 1],
  ajanthan_mdnnq_aistats21: [0, 1],
  rahimi_wsod_eccv20: [0, 1],
  tonioni_l2a_cvpr19: [1, 2],
  chaudhry_rwalk_eccv2018: [0, 1, 2],
  joy_higherorder_siam2018: [0, 1, 2],
  najafi_vobjseg_davis2018: [0, 1],
};
const authorCorrections = {
  rahimi_wsod_eccv20: ['Amir Rahimi', 'Amirreza Shaban', 'Thalaiyasingam Ajanthan', 'Richard Hartley', 'Byron Boots'],
};

function linksFrom(html, page) {
  const links = {};
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const raw = match[1].replace(/&amp;/g, '&');
    if (!raw || /\/index\.html(?:#.*)?$/.test(raw)) continue;
    const label = plain(match[2]).toLowerCase();
    const title = /\btitle="([^"]+)"/i.exec(match[0])?.[1]?.toLowerCase() || '';
    const kind = label === 'supp' ? 'supplement' : label === 'poster' ? 'slides' : label === 'talk' ? (raw.match(/\.pdf$|\.pptx?$/i) ? 'slides' : 'video') :
      label === 'arxiv' ? 'arxiv' : label === 'code' ? 'code' : label === 'blog' ? 'blog' : label === 'project' ? 'project' :
      label === 'pdf' || title === 'pdf' ? 'paper' : '';
    if (!kind || links[kind]) continue;
    links[kind] = /^https?:\/\//.test(raw) ? raw : '/' + path.posix.normalize(path.posix.join(path.posix.dirname(page), raw));
  }
  return links;
}

function entryFrom(html, page, section, ownTopic = '') {
  const bibMatch = /<pre\b[^>]*class="bibBlock"[^>]*>([\s\S]*?)<\/pre>/i.exec(html);
  if (!bibMatch) return null;
  const parsed = parseBibEntries(bibMatch[1])[0];
  if (!parsed) throw new Error(`No BibTeX in ${page}`);
  let id = parsed.key.toLowerCase();
  // The legacy bibliography reused this key for two distinct works.
  if (id === 'rahimi_wsod_eccv20' && /Directional Statistics/i.test(parsed.fields.title || '')) id = 'rahimi_wsod_wacv22';
  const visible = html.slice(0, bibMatch.index);
  const visibleTitles = [...visible.matchAll(/<strong>([^<]+)<\/strong>/gi)].map(x => plain(x[1]));
  const title = visibleTitles.find(x => normalizedTitle(x) === normalizedTitle(parsed.fields.title)) || latexText(parsed.fields.title || '');
  let authors = authorCorrections[id] || authorsFromBib((parsed.fields.author || '').replace(/\band\s+and\b/gi, 'and').replace(/Sminchisescu and Cristian/g, 'Sminchisescu, Cristian'));
  authors = authors.map((name, index) => equalContributors[id]?.includes(index) ? `${name}*` : name);
  const type = section === 'Conferences' ? 'conference' : section === 'Journals' ? 'journal' : section === 'Workshops' ? 'workshop' : section === 'Thesis' ? 'thesis' : 'preprint';
  const year = Number(parsed.fields.year);
  if (!title || !authors.length || !Number.isInteger(year)) throw new Error(`Incomplete entry ${id} in ${page}`);
  let venue = latexText(parsed.fields.booktitle || parsed.fields.journal || parsed.fields.school || '');
  if (type === 'workshop') {
    const afterTitle = visible.slice(visible.lastIndexOf('</strong>') + '</strong>'.length);
    const show = plain(afterTitle).match(/^\s*,\s*(.*),\s*(?:19|20)\d{2}\./);
    if (show) venue = show[1];
  }
  if (type === 'preprint') venue = 'arXiv';
  const tags = [...new Set([...topicTags(html), ...(ownTopic ? [ownTopic] : [])])];
  const distinction = /\((oral|spotlight|highlight)(?:, [^)]*)?\)/i.exec(visible)?.[1]?.toLowerCase();
  const record = { id, title, authors, year, venue, type, topics: tags, links: linksFrom(html, page), bibtex: '', sources: [page] };
  if (distinction) record.distinction = distinction;
  record.bibtex = bibtexFor(record, bibMatch[1]);
  return record;
}

function extractBibliography() {
  const page = 'publications/index.html';
  const html = noComments(readCommitted(page));
  const records = [];
  for (const match of html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const prefix = html.slice(0, match.index);
    const section = [...prefix.matchAll(/<h2>([^<]+)<\/h2>/gi)].at(-1)?.[1] || '';
    const record = entryFrom(match[1], page, section);
    if (record) records.push(record);
  }
  return records;
}

function extractTopicPage(topic) {
  const page = `${topic}/index.html`;
  let html;
  try { html = noComments(readCommitted(page)); } catch { return []; }
  const records = [];
  for (const match of html.matchAll(/<pre\b[^>]*class="bibBlock"[^>]*>[\s\S]*?<\/pre>/gi)) {
    const start = Math.max(html.lastIndexOf('<div', match.index), html.lastIndexOf('<li', match.index));
    if (start < 0) continue;
    const tag = html.slice(start + 1, start + 4).toLowerCase();
    const end = html.indexOf(`</${tag}>`, match.index);
    const fragment = html.slice(start, end < 0 ? match.index + match[0].length : end + tag.length + 3);
    const parsed = parseBibEntries(match[0])[0];
    const record = entryFrom(fragment, page, parsed?.fields.journal?.includes('Workshop') ? 'Workshops' : 'Conferences', topic);
    if (record) records.push(record);
  }
  return records;
}

if (process.argv.includes('--refresh-bibtex')) {
  const dataPath = path.join(root, 'data/publications.json');
  const current = JSON.parse(readFileSync(dataPath, 'utf8'));
  for (const record of current) record.bibtex = bibtexFor(record, record.bibtex);
  writeFileSync(dataPath, JSON.stringify(current, null, 2) + '\n');
  console.log(`Refreshed BibTeX for ${current.length} existing records without changing other fields.`);
  process.exit(0);
}

if (existsSync(path.join(root, 'data/publications.json')) && !process.argv.includes('--force')) {
  throw new Error('data/publications.json already exists; this one-time migration would overwrite curation. Pass --force only when rebuilding from the pinned legacy commit.');
}

const records = extractBibliography();
if (records.length !== 49) throw new Error(`Expected 49 active legacy bibliography records, found ${records.length}; refusing to overwrite data`);
const byTitle = new Map(records.map(record => [normalizedTitle(record.title), record]));
const byId = new Map(records.map(record => [record.id, record]));
for (const topic of topics) {
  for (const extra of extractTopicPage(topic)) {
    const key = normalizedTitle(extra.title);
    const existing = byTitle.get(key) || byId.get(extra.id);
    if (existing) {
      existing.topics = [...new Set([...existing.topics, ...extra.topics])];
      existing.links = { ...extra.links, ...existing.links };
      if (!existing.sources.includes(`${topic}/index.html`)) existing.sources.push(`${topic}/index.html`);
      continue;
    }
    byId.set(extra.id, extra); byTitle.set(key, extra); records.push(extra);
  }
}
applyVerifiedPublications(records);
records.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
const output = path.join(root, 'data');
mkdirSync(output, { recursive: true });
writeFileSync(path.join(output, 'publications.json'), JSON.stringify(records, null, 2) + '\n');
writeFileSync(path.join(output, 'metadata.json'), JSON.stringify({
  schemaVersion: 1,
  catalogueStatus: 'legacy records migrated from site HTML; Google Scholar profile has not been reconciled',
  legacySource: `${legacyRef}:publications/index.html and ${legacyRef}:<topic>/index.html`,
  googleScholarProfile: 'https://scholar.google.com/citations?user=Rza8c10AAAAJ',
  primarySourceVerification: 'Eight records were checked against linked primary sources on 2026-09-23; this is not a complete Scholar reconciliation.',
  refreshPolicy: 'Local Scholar BibTeX import requires explicit --apply; scheduled DBLP checks create review artifacts only.'
}, null, 2) + '\n');
console.log(`Wrote ${records.length} publications (49 legacy bibliography, 1 unique topic-page paper, 6 primary-source additions).`);

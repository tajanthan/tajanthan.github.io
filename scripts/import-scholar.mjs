#!/usr/bin/env node
// Reconcile a user-downloaded Google Scholar BibTeX export with local records.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arxivId, authorsFromBib, doiId, formatBibEntry, latexText, normalizedTitle, parseBibEntries } from './lib/bibtex.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const reportAt = args.indexOf('--report');
const reportPath = reportAt < 0 ? '' : args[reportAt + 1];
const dataAt = args.indexOf('--data');
const dataOption = dataAt < 0 ? '' : args[dataAt + 1];
const inputPath = args.find((arg, index) => !arg.startsWith('--') && (reportAt < 0 || index !== reportAt + 1) && (dataAt < 0 || index !== dataAt + 1));
if (!inputPath || (reportAt >= 0 && (!reportPath || reportPath.startsWith('--'))) || (dataAt >= 0 && (!dataOption || dataOption.startsWith('--')))) {
  console.error('Usage: node scripts/import-scholar.mjs <export.bib> [--report report.json] [--data publications.json] [--apply]');
  process.exit(2);
}

const dataPath = dataOption ? path.resolve(dataOption) : path.join(root, 'data/publications.json');
const records = JSON.parse(readFileSync(dataPath, 'utf8'));
const entries = parseBibEntries(readFileSync(inputPath, 'utf8'));
if (!entries.length) { console.error('No BibTeX entries found; catalogue unchanged.'); process.exit(2); }
const report = { source: 'user-supplied Scholar BibTeX export', mode: apply ? 'apply' : 'review', candidates: [], applied: 0 };
const slug = title => normalizedTitle(title).replace(/ /g, '-').slice(0, 70);
const availableId = title => {
  const base = slug(title) || 'publication';
  let id = base, number = 2;
  while (records.some(record => record.id === id)) id = `${base}-${number++}`;
  return id;
};
const recordDoi = record => doiId(record.bibtex || '');
const recordArxiv = record => arxivId(record.links?.arxiv || record.bibtex || '');
const authorIdentity = authors => authors.some(name => /\bAjanthan\b/i.test(name) && /Thalaiyasingam|\bT\.?\b/i.test(name));

for (const entry of entries) {
  const fields = entry.fields;
  const title = latexText(fields.title || '');
  const authors = authorsFromBib(fields.author || '');
  const year = Number(fields.year);
  const venue = latexText(fields.booktitle || fields.journal || fields.school || fields.publisher || '');
  const candidate = { inputKey: entry.key, title, year, venue, status: '', matchId: null, reasons: [] };
  report.candidates.push(candidate);
  if (!title || !authors.length || !Number.isInteger(year)) {
    candidate.status = 'invalid'; candidate.reasons.push('Missing title, authors, or numeric year'); continue;
  }
  if (!authorIdentity(authors)) {
    candidate.status = 'identity-review'; candidate.reasons.push('Export author list does not identify Thalaiyasingam Ajanthan'); continue;
  }
  const doi = doiId(fields.doi || fields.url || '');
  const arxiv = /^\d{4}\.\d{4,5}$/.test(fields.eprint || '') ? fields.eprint : arxivId(fields.eprint || fields.url || fields.note || '');
  const byDoi = doi ? records.filter(record => recordDoi(record) === doi) : [];
  const byArxiv = arxiv ? records.filter(record => recordArxiv(record) === arxiv) : [];
  const byTitle = records.filter(record => normalizedTitle(record.title) === normalizedTitle(title));
  const matches = [...new Set([...byDoi, ...byArxiv, ...byTitle])];
  if (matches.length > 1) {
    candidate.status = 'ambiguous'; candidate.reasons.push(`Identifier/title evidence points to multiple records: ${matches.map(x => x.id).join(', ')}`); continue;
  }
  const match = matches[0];
  if (match && normalizedTitle(match.title) !== normalizedTitle(title)) {
    candidate.status = 'ambiguous'; candidate.matchId = match.id;
    candidate.reasons.push('Identifier matches but title differs; inspect possible reused or incorrect source URL'); continue;
  }
  if (match) {
    candidate.matchId = match.id;
    if (authors.length !== match.authors.length || authors.some((author, index) => normalizedTitle(author) !== normalizedTitle(match.authors[index]?.replace(/\*$/, '') || ''))) {
      candidate.reasons.push('Author count, order, or names differ from the local record');
    }
    if (match.year !== year) candidate.reasons.push(`Year differs: local ${match.year}, export ${year}`);
    if (venue && match.venue && normalizedTitle(match.venue) !== normalizedTitle(venue)) candidate.reasons.push(`Venue differs: local ${match.venue}, export ${venue}`);
    if (candidate.reasons.length) { candidate.status = 'review'; continue; }
    candidate.status = 'matched';
    if (apply) {
      let changed = false;
      const bibtex = formatBibEntry(entry, match.id);
      if (bibtex !== match.bibtex) { match.bibtex = bibtex; changed = true; }
      if (arxiv && !match.links.arxiv) { match.links.arxiv = `https://arxiv.org/abs/${arxiv}`; changed = true; }
      const sources = [...new Set([...(match.sources || []), 'user-supplied Scholar BibTeX export'])];
      if (sources.length !== (match.sources || []).length) { match.sources = sources; changed = true; }
      if (changed) report.applied++;
    }
    continue;
  }
  const id = availableId(title);
  candidate.status = 'new'; candidate.proposedId = id;
  if (!apply) continue;
  const type = entry.type === 'phdthesis' || entry.type === 'mastersthesis' ? 'thesis' :
    /workshop/i.test(venue) ? 'workshop' : entry.type === 'inproceedings' || entry.type === 'conference' ? 'conference' :
    /arxiv|corr/i.test(venue) || entry.type === 'misc' || arxiv ? 'preprint' : 'journal';
  const record = { id, title, authors, year, venue: venue || (type === 'preprint' ? 'arXiv' : 'Unspecified'),
    type, topics: [], links: arxiv ? { arxiv: `https://arxiv.org/abs/${arxiv}` } : {},
    bibtex: formatBibEntry(entry, id), sources: ['user-supplied Scholar BibTeX export'] };
  records.push(record); report.applied++;
}

if (apply) {
  records.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  writeFileSync(dataPath, JSON.stringify(records, null, 2) + '\n');
}
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

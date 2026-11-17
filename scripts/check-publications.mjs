#!/usr/bin/env node
// Read-only DBLP freshness check. It never changes the published catalogue.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arxivId, doiId, normalizedTitle } from './lib/bibtex.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputArg = process.argv.indexOf('--output');
const inputArg = process.argv.indexOf('--input');
const dataArg = process.argv.indexOf('--data');
if ((outputArg >= 0 && (!process.argv[outputArg + 1] || process.argv[outputArg + 1].startsWith('--'))) ||
    (inputArg >= 0 && (!process.argv[inputArg + 1] || process.argv[inputArg + 1].startsWith('--'))) ||
    (dataArg >= 0 && (!process.argv[dataArg + 1] || process.argv[dataArg + 1].startsWith('--')))) {
  console.error('Usage: node scripts/check-publications.mjs [--output report.json] [--input saved-dblp.xml] [--data publications.json]'); process.exit(2);
}
const output = outputArg < 0 ? path.join(root, 'review/publications-review.json') : path.resolve(process.argv[outputArg + 1]);
const input = inputArg < 0 ? '' : path.resolve(process.argv[inputArg + 1]);
const dataPath = dataArg < 0 ? path.join(root, 'data/publications.json') : path.resolve(process.argv[dataArg + 1]);
const source = 'https://dblp.org/pid/154/6629.xml';
const report = { checkedAt: new Date().toISOString(), source, status: 'error', candidates: [] };
const decodeXml = value => value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
  .replace(/&(amp|lt|gt|quot|apos);/g, (_, entity) => ({ amp:'&', lt:'<', gt:'>', quot:'"', apos:"'" })[entity]);
const field = (xml, name) => decodeXml(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i').exec(xml)?.[1]?.replace(/<[^>]*>/g, '') || '').trim();
const venueKey = value => {
  const key = normalizedTitle(value);
  return ({ nn: 'neural networks', ijcv: 'international journal of computer vision', pami: 'ieee transactions on pattern analysis and machine intelligence', siims: 'siam journal on imaging sciences' })[key] || key;
};
const kindFor = (tag, venue) => tag === 'phdthesis' || tag === 'mastersthesis' ? 'thesis' :
  /workshop/i.test(venue) ? 'workshop' : tag === 'inproceedings' ? 'conference' :
  /^(corr|arxiv)$/i.test(venue) ? 'preprint' : 'journal';
const rank = item => item.type === 'conference' || item.type === 'journal' ? 3 : item.type === 'workshop' ? 2 : 1;

try {
  const records = JSON.parse(readFileSync(dataPath, 'utf8'));
  let xml;
  if (input) {
    xml = readFileSync(input, 'utf8');
    report.inputFile = input;
  } else {
    const response = await fetch(source, { headers: { Accept: 'application/xml', 'User-Agent': 'publication-review-checker/1.0 (github.com/tajanthan/tajanthan.github.io)' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`DBLP returned HTTP ${response.status}`);
    xml = await response.text();
  }
  if (!/<dblpperson\b/i.test(xml) || !/pid="154\/6629"/i.test(xml)) throw new Error('DBLP did not return the expected author XML (possibly a bot challenge)');
  let inspected = 0;
  const sourcePapers = new Map();
  for (const item of xml.matchAll(/<r>\s*<(article|inproceedings|phdthesis|mastersthesis)\b[^>]*>([\s\S]*?)<\/\1>\s*<\/r>/gi)) {
    const body = item[2], tag = item[1].toLowerCase();
    const authorTags = [...body.matchAll(/<author\b([^>]*)>([\s\S]*?)<\/author>/gi)];
    if (!authorTags.some(tag => /pid="154\/6629"/.test(tag[1]) && /\b(?:Thalaiyasingam|T\.)\s+Ajanthan\b/i.test(decodeXml(tag[2])))) continue;
    const title = field(body, 'title').replace(/\.$/, '');
    const year = Number(field(body, 'year'));
    if (!title || !Number.isInteger(year)) continue;
    inspected++;
    const venue = field(body, 'booktitle') || field(body, 'journal') || field(body, 'school');
    const url = field(body, 'ee') || field(body, 'url');
    const sourcePaper = { title, year, venue, type: kindFor(tag, venue), url };
    const key = normalizedTitle(title);
    const previous = sourcePapers.get(key);
    if (!previous || rank(sourcePaper) > rank(previous)) sourcePapers.set(key, sourcePaper);
  }
  for (const sourcePaper of sourcePapers.values()) {
    const { title, year, venue, type, url } = sourcePaper;
    const arxiv = arxivId(url), doi = doiId(url);
    const matches = records.filter(record => (arxiv && arxivId(record.links?.arxiv || '') === arxiv) ||
      (doi && doiId(record.bibtex || '') === doi) || normalizedTitle(record.title) === normalizedTitle(title));
    if (matches.length > 1) {
      report.candidates.push({ status: 'ambiguous', ...sourcePaper, localIds: matches.map(record => record.id) });
    } else if (!matches.length) {
      report.candidates.push({ status: 'new', ...sourcePaper });
    } else if (normalizedTitle(matches[0].title) !== normalizedTitle(title)) {
      report.candidates.push({ status: 'ambiguous', ...sourcePaper, localIds: [matches[0].id], difference: 'Identifier matches but title differs' });
    } else {
      const local = matches[0];
      // A preprint mirror is not evidence that an existing peer-reviewed record should be downgraded.
      if (type === 'preprint' && local.type !== 'preprint') continue;
      const differences = [];
      if (local.year !== year) differences.push(`year: local ${local.year}, DBLP ${year}`);
      if (local.type !== type) differences.push(`type: local ${local.type}, DBLP ${type}`);
      if (venue && venueKey(local.venue) !== venueKey(venue)) differences.push(`venue: local ${local.venue}, DBLP ${venue}`);
      if (differences.length) report.candidates.push({ status: 'changed', ...sourcePaper, localId: local.id, differences });
    }
  }
  if (!inspected) throw new Error('No records with the expected DBLP author PID and name were found');
  report.status = 'ok'; report.inspected = inspected; report.uniqueSourceTitles = sourcePapers.size; report.candidateCount = report.candidates.length;
} catch (error) {
  report.error = String(error?.message || error);
  report.note = 'Published data was retained. Retry the check or inspect the DBLP source manually.';
}
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'ok') process.exitCode = 1;

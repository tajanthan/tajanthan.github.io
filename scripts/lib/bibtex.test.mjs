import test from 'node:test';
import assert from 'node:assert/strict';
import { authorsFromBib, bibtexFor, latexText, parseBibEntries } from './bibtex.mjs';

test('reads nested values and parenthesized BibTeX entries', () => {
  const [entry] = parseBibEntries('@article(sample, title={{A {Nested} Title (2026)}}, author={Ajanthan, Thalaiyasingam and Doe, J\\"org}, year="2026")');
  assert.equal(entry.key, 'sample');
  assert.equal(entry.fields.title, '{A {Nested} Title (2026)}');
  assert.deepEqual(authorsFromBib(entry.fields.author), ['Thalaiyasingam Ajanthan', 'Jörg Doe']);
  assert.equal(latexText('Garc\\\'ia'), 'García');
});

test('BibTeX output keeps compound surnames, workshop type, and arXiv ID', () => {
  const record = { id: 'example', title: 'A {Model}', authors: ['Hadi Mohaghegh Dolatabadi', 'Chamin P Hewa Koneputugodage', 'Anton van den Hengel'],
    year: 2026, venue: 'ICLR Workshop', type: 'workshop', links: {} };
  const [workshop] = parseBibEntries(bibtexFor(record, '@article{old, volume={12}, title={Old}}'));
  assert.equal(workshop.type, 'inproceedings');
  assert.equal(workshop.fields.volume, '12');
  assert.deepEqual(authorsFromBib(workshop.fields.author), record.authors);
  record.type = 'preprint'; record.venue = 'arXiv'; record.links.arxiv = 'https://arxiv.org/abs/2603.03597';
  const [preprint] = parseBibEntries(bibtexFor(record));
  assert.equal(preprint.fields.eprint, '2603.03597');
  assert.equal(preprint.fields.archiveprefix, 'arXiv');
});

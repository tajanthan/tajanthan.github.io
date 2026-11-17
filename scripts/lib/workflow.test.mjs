import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

let importCounter = 0;
async function runCli(script, args) {
  const previousArgv = process.argv, previousExitCode = process.exitCode, previousLog = console.log;
  process.argv = [process.execPath, script, ...args];
  console.log = () => {};
  try {
    await import(new URL(`../${script}.mjs?test=${++importCounter}`, import.meta.url));
    return process.exitCode || 0;
  } finally {
    process.argv = previousArgv;
    process.exitCode = previousExitCode;
    console.log = previousLog;
  }
}

const localRecord = {
  id: 'proven', title: 'A Proven Paper', authors: ['Thalaiyasingam Ajanthan', 'Jane Doe'],
  year: 2026, venue: 'arXiv', type: 'preprint', topics: ['pl'],
  links: { arxiv: 'https://arxiv.org/abs/2601.10000', code: 'https://example.org/code' },
  bibtex: '@article{proven, title={A Proven Paper}, author={Ajanthan, Thalaiyasingam and Doe, Jane}, journal={arXiv}, year={2026}}',
  selected: 1, summary: 'A curated summary.', sources: ['legacy'],
};

test('Scholar CLI reviews by default, applies safe matches, and retains curation', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'publication-import-'));
  try {
    const data = path.join(directory, 'publications.json');
    const bib = path.join(directory, 'export.bib');
    const report = path.join(directory, 'report.json');
    const original = JSON.stringify([localRecord], null, 2) + '\n';
    writeFileSync(data, original);
    writeFileSync(bib, '@article{scholar1, title={A Proven Paper}, author={Ajanthan, Thalaiyasingam and Doe, Jane}, journal={arXiv}, year={2026}, eprint={2601.10000}, doi={10.1234/example}}');
    await runCli('import-scholar', [bib, '--data', data, '--report', report]);
    assert.equal(readFileSync(data, 'utf8'), original);
    assert.equal(JSON.parse(readFileSync(report)).candidates[0].status, 'matched');
    await runCli('import-scholar', [bib, '--data', data, '--report', report, '--apply']);
    const [applied] = JSON.parse(readFileSync(data));
    assert.equal(applied.selected, 1);
    assert.equal(applied.summary, 'A curated summary.');
    assert.equal(applied.links.code, 'https://example.org/code');
    assert.match(applied.bibtex, /doi=\{10\.1234\/example\}/);
    writeFileSync(bib, '@article{scholar2, title={A Proven Paper}, author={Ajanthan, Thalaiyasingam}, journal={arXiv}, year={2026}}');
    const beforeMismatch = readFileSync(data, 'utf8');
    await runCli('import-scholar', [bib, '--data', data, '--report', report, '--apply']);
    assert.equal(JSON.parse(readFileSync(report)).candidates[0].status, 'review');
    assert.equal(readFileSync(data, 'utf8'), beforeMismatch);
    writeFileSync(bib, '@article{broken, title={Unbalanced}');
    await assert.rejects(runCli('import-scholar', [bib, '--data', data]), /Unbalanced/);
    assert.equal(readFileSync(data, 'utf8'), beforeMismatch);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('DBLP CLI reports bot challenges and a deduplicated venue upgrade without modifying data', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'publication-check-'));
  try {
    const data = path.join(directory, 'publications.json');
    const xml = path.join(directory, 'dblp.xml');
    const output = path.join(directory, 'report.json');
    const original = JSON.stringify([localRecord], null, 2) + '\n';
    writeFileSync(data, original);
    writeFileSync(xml, '<html><title>Making sure you are not a bot!</title></html>');
    const failure = await runCli('check-publications', ['--input', xml, '--data', data, '--output', output]);
    assert.equal(failure, 1);
    const errorReport = JSON.parse(readFileSync(output));
    assert.equal(errorReport.status, 'error');
    assert.match(errorReport.error, /expected author XML/);
    assert.equal(readFileSync(data, 'utf8'), original);
    writeFileSync(xml, '<dblpperson pid="154/6629"><r><article><author pid="154/6629">Thalaiyasingam Ajanthan</author><title>A Proven Paper.</title><journal>CoRR</journal><year>2026</year><ee>https://arxiv.org/abs/2601.10000</ee></article></r><r><inproceedings><author pid="154/6629">Thalaiyasingam Ajanthan</author><title>A Proven Paper.</title><booktitle>ICML</booktitle><year>2026</year><ee>https://arxiv.org/abs/2601.10000</ee></inproceedings></r></dblpperson>');
    const success = await runCli('check-publications', ['--input', xml, '--data', data, '--output', output]);
    const result = JSON.parse(readFileSync(output));
    assert.equal(success, 0);
    assert.equal(result.uniqueSourceTitles, 1);
    assert.equal(result.candidateCount, 1);
    assert.equal(result.candidates[0].status, 'changed');
    assert.ok(result.candidates[0].differences.some(x => x.startsWith('type:')));
    assert.ok(result.candidates[0].differences.some(x => x.startsWith('venue:')));
    assert.ok(!result.candidates[0].differences.some(x => x.startsWith('year:')));
    assert.equal(readFileSync(data, 'utf8'), original);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

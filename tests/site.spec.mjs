import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

const papers = JSON.parse(await readFile(new URL('../data/publications.json', import.meta.url)));
const topics = JSON.parse(await readFile(new URL('../data/topics.json', import.meta.url)));
const profile = JSON.parse(await readFile(new URL('../data/profile.json', import.meta.url)));
const topicCodes = paper => {
  const codes = new Set(paper.topics);
  for (const topic of topics) if (!topic.excludes?.some(code => codes.has(code)) && topic.includes?.some(code => codes.has(code))) codes.add(topic.code);
  return [...codes];
};
const hasTopic = (paper, code) => topicCodes(paper).includes(code);
const authorRoles = paper => {
  const clean = author => String(author).replace(/\*+\s*$/, '').trim().replace(/\s+/g, ' ').toLowerCase();
  const index = paper.authors.findIndex(author => ['thalaiyasingam ajanthan', 'ajanthan, thalaiyasingam'].includes(clean(author)));
  if (index < 0) return [];
  const marker = author => String(author).match(/(\*+)\s*$/)?.[1] || '';
  const sharedFirst = index > 0 && marker(paper.authors[0]) && marker(paper.authors[0]) === marker(paper.authors[index]);
  const positionQualifies = paper.authors.length > 1 && (index === 1 || index === paper.authors.length - 1);
  return [...(index === 0 || sharedFirst ? ['first'] : []), ...(paper.primarySupervision === true || (paper.primarySupervision !== false && positionQualifies) ? ['supervision'] : [])];
};
const normalize = value => String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const matchesQuery = (paper, query) => {
  const topicText = topicCodes(paper).flatMap(code => { const topic = topics.find(item => item.code === code); return topic ? [code, topic.title, topic.tag] : []; });
  const authorText = paper.authors.flatMap(author => {
    const names = author.split(/\s+/);
    return [author, names.length > 1 ? `${names.slice(0, -1).map(name => name[0]).join(' ')} ${names.at(-1)}` : author];
  });
  const haystack = normalize([paper.title, ...authorText, paper.venue, paper.year, paper.type, ...topicText].join(' '));
  return normalize(query).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
};
const auditSummary = audit => audit.violations.map(({ id, nodes }) => ({ id, targets: nodes.slice(0, 4).map(n => n.target), count: nodes.length }));

test('desktop pages render without broken images, overflow or accessibility violations', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/', '/publications/', '/pl/', '/dlt/', '/nno/', '/compression/', '/vision/', '/do/']) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const images = await page.locator('img').evaluateAll(elements => elements.filter(img => img.complete && !img.naturalWidth).map(img => img.src));
    expect(images).toEqual([]);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(auditSummary(audit)).toEqual([]);
    if (route === '/') {
      await expect(page.locator('#selected-work .paper-summary')).toHaveCount(0);
      await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
      await page.screenshot({ path: 'test-results/home-preview.png', fullPage: false });
    }
    if (route === '/publications/') {
      await expect(page.locator('.citation-badge')).toHaveCount(3);
      await expect(page.locator('#lee_snip_iclr19 .citation-badge')).toHaveText('2000+ citations');
      await expect(page.locator('#chaudhry_rwalk_eccv2018 .citation-badge')).toHaveText('2000+ citations');
      await expect(page.locator('#chaudhry_tinyer_icml2019 .citation-badge')).toHaveText('1500+ citations');
      await expect(page.locator('.citation-badge[title]')).toHaveCount(0);
      await expect(page.locator('.equal-contribution')).toHaveCount(1);
      await expect(page.locator('#xu_ranp_3dv20 .distinction').nth(0)).toHaveText('oral');
      await expect(page.locator('#xu_ranp_3dv20 .distinction').nth(1)).toHaveText('Best Student Paper');
      await expect(page.locator('.archive-links a')).toHaveCount(1);
      await expect(page.locator('#role-filter option[value="supervision"]')).toHaveText('Primary supervisor/contributor');
      await expect(page.locator('.filter-help')).toHaveCount(0);
      expect((await page.locator('.paper-actions').allTextContents()).join(' ')).not.toContain('Supp.');
      await page.screenshot({ path: 'test-results/publications-desktop.png', fullPage: false });
    }
    if (route === '/dlt/') await page.screenshot({ path: 'test-results/topic-desktop.png', fullPage: false });
  }
  expect(errors).toEqual([]);
});

test('publication search, combined filters and reset agree with the dataset', async ({ page }) => {
  await page.goto('/publications/');
  const visible = page.locator('[data-paper]:visible');
  await expect(visible).toHaveCount(papers.length);
  await expect(page.locator('.paper-authors').first()).toContainText('T. Ajanthan');
  await expect(page.locator('.paper-authors').first()).not.toContainText('Thalaiyasingam Ajanthan');
  const venues = await page.locator('.venue-heading').allTextContents();
  expect(venues).toContain('ICLR Workshop');
  expect(venues.every(venue => !venue.includes(':'))).toBe(true);
  const neurips = page.locator('[data-year-group][aria-labelledby="year-2025"] .venue-group').filter({ has: page.getByRole('heading', { name: 'NeurIPS', exact: true }) });
  await expect(neurips.locator('[data-paper]')).toHaveCount(4);
  const neuripsIds = await neurips.locator('[data-paper]').evaluateAll(items => items.map(item => item.id));
  expect(neuripsIds).toEqual(papers.filter(paper => paper.year === 2025 && paper.venue === 'NeurIPS').sort((a, b) => a.title.localeCompare(b.title)).map(paper => paper.id));
  await page.getByLabel('Search publications').fill('SNIP');
  await expect(visible).toHaveCount(papers.filter(p => matchesQuery(p, 'SNIP')).length);
  await page.getByLabel('Search publications').fill('optimization chaos');
  await expect(visible).toHaveCount(papers.filter(p => matchesQuery(p, 'optimization chaos')).length);
  await expect(visible.first()).toContainText('A Chaos Theory Approach');
  await page.getByLabel('Search publications').fill('T Ajanthan SNIP');
  await expect(visible).toHaveCount(papers.filter(p => matchesQuery(p, 'T Ajanthan SNIP')).length);
  await page.getByLabel('Search publications').fill('language vision');
  await expect(visible).toHaveCount(papers.filter(p => matchesQuery(p, 'language vision')).length);
  await page.getByLabel('Search publications').fill('a title that does not exist xyz');
  await expect(visible).toHaveCount(0);
  await expect(page.locator('[data-venue-group]:visible')).toHaveCount(0);
  await expect(page.locator('[data-year-group]:visible')).toHaveCount(0);
  await expect(page.getByText('No matching publications')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(visible).toHaveCount(papers.length);
  await page.getByLabel('Topic', { exact: true }).selectOption('pl');
  await page.getByLabel('Type', { exact: true }).selectOption('conference');
  await expect(visible).toHaveCount(papers.filter(p => p.topics.includes('pl') && p.type === 'conference').length);
  await page.reload();
  await expect(visible).toHaveCount(papers.filter(p => p.topics.includes('pl') && p.type === 'conference').length);
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await page.getByLabel('Topic', { exact: true }).selectOption('nno');
  await expect(visible).toHaveCount(papers.filter(p => hasTopic(p, 'nno')).length);
  await page.getByLabel('Topic', { exact: true }).selectOption('do');
  await expect(visible).toHaveCount(papers.filter(p => hasTopic(p, 'do')).length);
  await page.getByLabel('Topic', { exact: true }).selectOption('lowrank');
  await expect(visible).toHaveCount(papers.filter(p => p.topics.includes('lowrank')).length);
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page.locator('#topic-filter option[value="optimization"]')).toHaveCount(0);
  await expect(page.locator('#topic-filter option[value="misc"]')).toHaveCount(0);
  await page.getByLabel('Topic', { exact: true }).selectOption('context');
  await expect(visible).toHaveCount(papers.filter(p => p.topics.includes('context')).length);
  expect(papers.find(p => p.id === 'ramasinghe_mixtures_neurips25').topics).not.toContain('pipeline');
  expect(hasTopic(papers.find(p => p.id === 'liu_ssldm_iclr24'), 'vision')).toBe(false);
  for (const id of ['markou_reduction_neurips25', 'markou_gnc_neurips24', 'lee_dataparallelism_iclr21']) {
    expect(papers.find(paper => paper.id === id).primarySupervision).toBe(false);
  }
  expect(papers.find(paper => paper.id === 'xu_ranp_3dv20').primarySupervision).not.toBe(false);
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await page.getByLabel('Topic', { exact: true }).selectOption('lowrank');
  await page.getByLabel('Author role').selectOption('supervision');
  const lowrankSupervision = papers.filter(p => p.topics.includes('lowrank') && authorRoles(p).includes('supervision')).length;
  await expect(visible).toHaveCount(lowrankSupervision);
  expect(papers.filter(p => authorRoles(p).includes('first'))).toHaveLength(14);
  expect(papers.filter(p => authorRoles(p).includes('supervision'))).toHaveLength(25);
  expect(page.url()).toContain('role=supervision');
  await page.reload();
  await expect(visible).toHaveCount(lowrankSupervision);
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await page.getByLabel('Author role').selectOption('supervision');
  await expect(visible).toHaveCount(25);
  for (const id of ['tonioni_l2a_cvpr19', 'long_rac_cvpr22', 'ramasinghe_llm_adaptation_arxiv26']) await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(page.locator('#xu_supseg_arxiv20')).toBeHidden();
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await page.getByLabel('Author role').selectOption('first');
  await expect(visible).toHaveCount(papers.filter(p => authorRoles(p).includes('first')).length);
  await expect(page.locator('#ajanthan_asyncmesh_arxiv26')).toBeVisible();
  for (const id of ['ajanthan_asyncmesh_arxiv26', 'dolatabadi_numuon_arxiv26', 'ramasinghe_llm_adaptation_arxiv26']) {
    const group = page.locator('.venue-group').filter({ has: page.locator(`#${id}`) });
    await expect(group.locator('.venue-heading')).toHaveText('NeurIPS');
  }
  await expect(page.locator('#ajanthan_asyncmesh_arxiv26 .paper-meta')).toHaveCount(0);
});

test('themes and content use the available width from mobile to wide desktop', async ({ page }) => {
  for (const width of [360, 768, 850, 960, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const layout = await page.evaluate(() => {
      const main = document.querySelector('.main-content').getBoundingClientRect();
      const wrap = document.querySelector('.home-page').getBoundingClientRect();
      return {
        widthRatio: wrap.width / main.width,
        columns: getComputedStyle(document.querySelector('.theme-list')).gridTemplateColumns.split(' ').length,
        postHeights: [...document.querySelectorAll('.note')].map(note => Math.round(note.getBoundingClientRect().height)),
        postScroll: getComputedStyle(document.querySelector('.note-post')).overflowY,
        themeFigureSizes: [...document.querySelectorAll('.theme-figure')].map(figure => [Math.round(figure.getBoundingClientRect().width), Math.round(figure.getBoundingClientRect().height)]),
        peopleItemBorder: getComputedStyle(document.querySelector('.people-list li')).borderTopWidth,
        serviceItemBorder: getComputedStyle(document.querySelector('.workshop-list li')).borderTopWidth,
        introColumns: getComputedStyle(document.querySelector('.intro')).gridTemplateColumns.split(' ').length,
        communityColumns: getComputedStyle(document.querySelector('.community-grid')).gridTemplateColumns.split(' ').length,
        communityHeadingOffset: Math.abs(document.querySelector('.academic-panel h3').getBoundingClientRect().top - document.querySelector('.workshop-panel h3').getBoundingClientRect().top),
        teachingMargin: parseFloat(getComputedStyle(document.querySelector('.teaching-block')).marginTop),
        coursePadding: parseFloat(getComputedStyle(document.querySelector('.teaching-list li')).paddingTop)
      };
    });
    expect(layout.widthRatio).toBeGreaterThan(0.99);
    expect(layout.columns).toBe(width > 1120 ? 2 : 1);
    expect(new Set(layout.postHeights).size).toBe(1);
    expect(layout.postScroll).toBe('auto');
    expect(new Set(layout.themeFigureSizes.map(size => size[1])).size).toBe(1);
    if (width > 1120) expect(new Set(layout.themeFigureSizes.map(size => size[0])).size).toBe(1);
    expect(layout.peopleItemBorder).toBe('0px');
    expect(layout.serviceItemBorder).toBe('0px');
    expect(layout.introColumns).toBe(width > 1120 ? 2 : 1);
    expect(layout.communityColumns).toBe(width > 1000 ? 2 : 1);
    expect(layout.teachingMargin).toBe(40);
    expect(layout.coursePadding).toBe(4);
    if (width > 1000) expect(layout.communityHeadingOffset).toBeLessThan(1);
  }
});

test('research themes, section links and X notes stay concise and navigable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.theme')).toHaveCount(5);
  await expect(page.locator('.theme-description')).toHaveCount(5);
  await expect(page.getByRole('link', { name: 'Computer vision', exact: true })).toHaveCount(0);
  await expect(page.locator('.note')).toHaveCount(4);
  await expect(page.locator('.note-post')).toHaveCount(4);
  await expect(page.locator('.note-date')).toHaveText(['Sep 2026', 'Sep 2026', 'Aug 2026', 'Jul 2026']);
  const renderedPostParagraphs = await page.locator('.note-post').evaluateAll(elements => elements.map(element => [...element.querySelectorAll('p')].map(p => p.textContent)));
  expect(renderedPostParagraphs.map(paragraphs => paragraphs.length)).toEqual([3, 1, 2, 1]);
  for (const [index, note] of profile.notes.entries()) {
    expect(renderedPostParagraphs[index]).toEqual(note.content.split(/\n\n/));
  }
  await expect(page.getByRole('heading', { name: 'Pulse on X' })).toBeVisible();
  await expect(page.locator('.profile-wordart img')).toBeVisible();
  await expect(page.locator('.profile-wordart img')).toHaveAttribute('src', '/images/research-wordart.png');
  await expect(page.getByRole('heading', { name: 'Pulse on X' }).getByRole('link', { name: 'X' })).toHaveAttribute('href', 'https://x.com/tha_ajanthan');
  await expect(page.locator('.sidebar-nav a', { hasText: 'Pulse on X' })).toHaveAttribute('href', '/#notes');
  await expect(page.getByRole('heading', { name: 'Mentoring & Service' })).toBeVisible();
  await expect(page.locator('.sidebar-nav a', { hasText: 'Mentoring & Service' })).toHaveAttribute('href', '/#mentoring');
  await expect(page.locator('#about .intro-summary a', { hasText: 'Protocol Learning' })).toHaveAttribute('href', '/pl/');
  await expect(page.locator('.note-post').first()).toHaveJSProperty('tagName', 'DIV');
  await expect(page.locator('.note-open')).toHaveCount(0);
  await expect(page.locator('.note a[href="https://x.com/tha_ajanthan"]')).toHaveCount(0);
  await expect(page.locator('.note').getByRole('link', { name: 'More info' })).toHaveCount(3);
  const noteCopy = (await page.locator('.note').allTextContents()).join(' ');
  expect(noteCopy).not.toContain('Join the test');
  expect(noteCopy).not.toContain('The run');
  await expect(page.getByRole('heading', { name: 'Invited Keynotes' })).toBeVisible();
  await expect(page.locator('.sidebar-nav a', { hasText: 'Invited Keynotes' })).toHaveAttribute('href', '/#talks');
  await expect(page.locator('#background .collaborator-list')).toContainText('Hongdong Li');
  await expect(page.locator('#background .collaborator-list')).toContainText('Martin Jaggi');
  await expect(page.locator('#background .collaborators h3')).toHaveText('Some people I’ve been fortunate to work with');
  const collaborators = await page.locator('#background .collaborator-list li').allTextContents();
  expect(collaborators.indexOf('Stephen Gould')).toBeLessThan(collaborators.indexOf('Hongdong Li'));
  expect(collaborators.indexOf('Anton van den Hengel')).toBeLessThan(collaborators.indexOf('Hongdong Li'));
  expect(collaborators.indexOf('M. Pawan Kumar')).toBe(collaborators.indexOf('Puneet K. Dokania') - 1);
  await expect(page.locator('#mentoring .people-list')).toContainText('Alessio Tonioni(2018 · visitor · then Google Zurich)');
  await expect(page.locator('#mentoring .people-list')).toContainText('Kartik Gupta(2019–21 · then Seeing Machines)');
  await expect(page.locator('#mentoring .people-list')).toContainText('Namhoon Lee(2018–20 · then UNIST)');
  await expect(page.locator('#background .timeline')).toContainText('Machine Learning Scientist → Senior Machine Learning Scientist');
  await expect(page.locator('#mentoring .community-intro')).toContainText('supervised PhD students in academia');
  await expect(page.locator('#mentoring .community-grid > div').first().getByRole('heading', { name: 'Teaching' })).toBeVisible();
  await expect(page.locator('#mentoring .teaching-list a', { hasText: 'Computer Systems and Architecture' })).toHaveAttribute('href', 'https://programsandcourses.anu.edu.au/2026/course/COMP8045/Second%20Semester/9013');
  await expect(page.locator('#mentoring .workshop-list')).toContainText('Protocol Learning · ICLR 2026 (Pluralis)');
  await expect(page.locator('#mentoring .workshop-list')).toContainText('Protocol Learning · ICML 2026 (Pluralis)');
  await expect(page.locator('#mentoring .workshop-panel > h3')).toHaveText('Workshop organizer');
  await expect(page.locator('#mentoring .workshop-list')).not.toContainText('Organizer');
  await expect(page.locator('#background .collaborator-list')).not.toContainText('Byron Boots');
  await expect(page.locator('#background .collaborator-list')).not.toContainText('Cristian Sminchisescu');
  await expect(page.locator('#background .collaborator-list')).not.toContainText('Marc’Aurelio Ranzato');
  await expect(page.locator('#background .collaborator-list')).not.toContainText('Chunhua Shen');
  await expect(page.locator('#background .collaborator-list')).not.toContainText('Adrian Weller');
  await expect(page.locator('.sidebar-nav a[href="/publications/"]')).toHaveCount(0);
  await expect(page.locator('.sidebar-nav a', { hasText: 'Selected Publications' })).toHaveAttribute('href', '/#selected-work');
  await expect(page.locator('#mentoring .workshop-list')).toContainText('CODEC-FM · NeurIPS 2026');
  await expect(page.locator('#mentoring .workshop-panel .community-recognition')).toContainText('Area Chair');
  await expect(page.locator('#mentoring .workshop-panel .community-recognition')).toContainText('Outstanding Reviewer');
  await expect(page.locator('.talk-feature').first()).toContainText('November 2026');
  await expect(page.locator('.talk-feature').first()).toContainText('TBD');
  await expect(page.locator('.talk-feature').first().getByRole('link', { name: 'International Conference on Computational Optimization' })).toHaveAttribute('href', 'https://www.icomp.cc/');
  await expect(page.locator('.note-open[href*="/status/"]')).toHaveCount(0);
  const themeRoutes = ['/pl/', '/nno/', '/compression/', '/vision/', '/do/'];
  for (const [index, link] of (await page.locator('.theme-figure').all()).entries()) expect(await link.getAttribute('href')).toBe(themeRoutes[index]);
  await expect(page.locator('.theme-figure img').nth(0)).toHaveAttribute('src', '/images/protocol-learning-agora-fig1.png');
  await expect(page.locator('.theme-figure img').nth(1)).toHaveAttribute('src', '/images/learning-dynamics-reduction-fig1.png');
  await page.goto('/pl/');
  const figureTrigger = page.getByRole('button', { name: 'View full-size Protocol Learning figure' });
  const figureDialog = page.getByRole('dialog', { name: 'Protocol Learning figure' });
  await expect(figureTrigger).toBeVisible();
  await figureTrigger.click();
  await expect(figureDialog).toBeVisible();
  await expect(figureDialog.locator('img')).toHaveAttribute('src', '/images/protocol-learning-agora-fig1.png');
  await figureDialog.click({ position: { x: 3, y: 3 } });
  await expect(figureDialog).not.toBeVisible();
  await expect(figureTrigger).toBeFocused();
});

test('citations expand and copy their actual BibTeX', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/publications/');
  const paper = page.locator('[data-paper]').first();
  await paper.locator('summary').click();
  const bibtex = await paper.locator('pre code').textContent();
  await paper.getByRole('button', { name: 'Copy citation' }).click();
  await expect(paper.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(bibtex);
});

test('mobile navigation and pages fit narrow screens', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Selected Publications', exact: true }).click();
    await expect(page).toHaveURL(/#selected-work$/);
    await page.getByRole('link', { name: 'All publications' }).click();
    await expect(page.locator('h1')).toHaveText('Publications');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const homeAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(auditSummary(homeAudit)).toEqual([]);
    if (width === 390) await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
    await page.goto('/dlt/');
    await expect(page.getByRole('link', { name: '← Research' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Papers' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const firstYear = page.locator('[data-year-group]').first();
    await expect(firstYear.locator('.paper-meta > span').first()).toContainText('NeurIPS');
    const topicAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(auditSummary(topicAudit)).toEqual([]);
  }
});

test('all publications and navigation remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/publications/');
  await expect(page.locator('[data-paper]')).toHaveCount(papers.length);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.locator('[data-paper]').first().locator('summary').click();
  await expect(page.locator('[data-paper]').first().locator('pre')).toBeVisible();
  await context.close();
});

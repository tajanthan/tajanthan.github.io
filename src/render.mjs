import { nameAsBib } from '../scripts/lib/bibtex.mjs';

const siteUrl = 'https://tajanthan.github.io';

export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function safeUrl(value) {
  if (typeof value !== 'string') return '';
  if (value.startsWith('/') && !value.startsWith('//') && !/[\r\n]/.test(value)) return value;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
  } catch { /* Invalid links are omitted from the rendered page. */ }
  return '';
}

function link(url, label, className = '', extra = '') {
  const href = safeUrl(url);
  if (!href) return escapeHtml(label);
  const external = /^https?:/.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${escapeHtml(href)}"${className ? ` class="${className}"` : ''}${external}${extra}>${escapeHtml(label)}</a>`;
}

function monthYear(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return '';
  const [year, month] = value.split('-').map(Number);
  const label = `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]} ${year}`;
  return `<time class="note-date" datetime="${value}">${escapeHtml(label)}</time>`;
}

function socialLinks(items = [], className = 'social-links') {
  const icons = {
    'Google Scholar': '<span class="ai ai-google-scholar" aria-hidden="true"></span>',
    GitHub: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z"/></svg>',
    LinkedIn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.44-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.61 0 4.28 2.37 4.28 5.46v6.28ZM5.33 7.43a2.06 2.06 0 1 1 .02-4.12 2.06 2.06 0 0 1-.02 4.12ZM7.11 20.45H3.55V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>',
    X: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.5h-7.4l-5.8-7.59-6.63 7.59H.49l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.04h2.04L6.48 3.35H4.29l13.32 16.84Z"/></svg>'
  };
  return `<div class="${className}" role="group" aria-label="Social profiles">${items.map(item => {
    const href = safeUrl(item.url);
    if (!href) return '';
    const name = String(item.label || 'Profile');
    const icon = icons[name];
    if (!icon) return link(href, name);
    const external = /^https?:/.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a class="social-icon" href="${escapeHtml(href)}" aria-label="${escapeHtml(name)}" title="${escapeHtml(name)}"${external}>${icon}</a>`;
  }).join('')}</div>`;
}

function sectionIntro(kicker, title, description = '') {
  return `<div class="section-heading"><div>${kicker ? `<p class="eyebrow">${escapeHtml(kicker)}</p>` : ''}<h2>${escapeHtml(title)}</h2></div>${description ? `<p>${escapeHtml(description)}</p>` : ''}</div>`;
}

function relativeAsset(pagePath, value) {
  const depth = pagePath.split('/').filter(Boolean).length;
  return `${'../'.repeat(depth)}${String(value).replace(/^\/+/, '')}`;
}

function shell({ title, description, path, active, content, profile, notes = false }) {
  const fullTitle = title === profile.name ? title : `${title} · ${profile.name}`;
  const canonical = new URL(path, siteUrl).href;
  const asset = value => relativeAsset(path, value);
  const nav = [
    ['/#about', 'Profile', 'profile'],
    ['/#research', 'Research', 'research'],
    ['/#selected-work', 'Selected Publications', 'selected-work'],
    ...(profile.talks?.length ? [['/#talks', 'Invited Keynotes', 'talks']] : []),
    ['/#background', 'Background', 'background'],
    ['/#mentoring', 'Mentoring & Service', 'mentoring'],
    ...(notes ? [['/#notes', 'Pulse on X', 'notes']] : []),
    ['/#contact', 'Contact', 'contact']
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#24312f">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${siteUrl}/images/avatar.jpg">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="${asset('images/avatar.jpg')}">
  <link rel="stylesheet" href="${asset('assets/css/academicons.min.css')}">
  <link rel="stylesheet" href="${asset('assets/css/site.css')}">
  <script defer src="${asset('assets/js/site.js')}"></script>
  <title>${escapeHtml(fullTitle)}</title>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="mobile-header">
    ${link('/', 'AJ', 'mobile-brand')}
    <button class="menu-toggle" type="button" aria-controls="site-sidebar" aria-expanded="false" aria-label="Open navigation"><span></span><span></span><span></span></button>
  </header>
  <aside class="sidebar" id="site-sidebar" aria-label="Site navigation">
    <div class="sidebar-top">
      <a href="/" class="portrait-link"><img src="${asset('images/portrait.webp')}" width="112" height="112" alt="Portrait of ${escapeHtml(profile.name)}"></a>
      <div class="sidebar-identity"><a href="/">AJ<span class="identity-dot">.</span></a><p><span class="sidebar-role">${escapeHtml(profile.sidebarRole || profile.role)}</span><br>${escapeHtml(profile.affiliation)}</p></div>
    </div>
    <nav class="sidebar-nav" aria-label="Main navigation">${nav.map(([href, label, key]) => `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    <div class="sidebar-bottom">${socialLinks(profile.contact?.links || [])}</div>
  </aside>
  <main id="main-content" class="main-content">${content}
    <footer class="site-footer"><span>© ${escapeHtml(profile.name)}</span></footer>
  </main>
</body>
</html>`;
}

function paperAuthors(authors = []) {
  return authors.map(author => {
    const raw = String(author).trim();
    const marker = raw.match(/\*+$/)?.[0] || '';
    const cleaned = raw.slice(0, raw.length - marker.length).trim();
    const bibName = nameAsBib(cleaned).split(/,\s*/);
    const family = bibName[0] || cleaned;
    const given = bibName.slice(1).join(' ');
    const initials = given.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)?.map(part => `${part[0]}.`).join(' ') || '';
    const displayFamily = family.split(/\s+/).map(part => /^[\p{Lu}]$/u.test(part) ? `${part}.` : part).join(' ');
    const rendered = escapeHtml(initials ? `${initials} ${displayFamily}` : cleaned);
    const name = /\bAjanthan\b/i.test(cleaned) ? `<strong>${rendered}</strong>` : rendered;
    return `${name}${marker ? `<sup>${escapeHtml(marker)}</sup>` : ''}`;
  }).join(', ');
}

function authorSearchNames(authors = []) {
  return authors.flatMap(author => {
    const cleaned = String(author).replace(/\*+$/, '').trim();
    const [family, ...givenParts] = nameAsBib(cleaned).split(/,\s*/);
    const initials = givenParts.join(' ').match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)?.map(part => `${part[0]}.`).join(' ') || '';
    return [cleaned, initials ? `${initials} ${family}` : ''];
  });
}

function effectiveTopicCodes(paper, topicMap) {
  const direct = new Set(paper.topics || []);
  for (const topic of topicMap.values()) {
    if (!topic.excludes?.some(code => direct.has(code)) && topic.includes?.some(code => direct.has(code))) direct.add(topic.code);
  }
  return [...topicMap.keys()].filter(code => direct.has(code));
}

function authorRoles(paper) {
  const authors = paper.authors || [];
  const clean = author => String(author).replace(/\*+\s*$/, '').trim().replace(/\s+/g, ' ').toLowerCase();
  const ajIndex = authors.findIndex(author => ['thalaiyasingam ajanthan', 'ajanthan, thalaiyasingam'].includes(clean(author)));
  if (ajIndex < 0) return [];
  const marker = author => String(author).match(/(\*+)\s*$/)?.[1] || '';
  const sharedFirst = ajIndex > 0 && marker(authors[0]) && marker(authors[0]) === marker(authors[ajIndex]);
  const roles = [];
  if (ajIndex === 0 || sharedFirst) roles.push('first');
  const positionQualifies = authors.length > 1 && (ajIndex === 1 || ajIndex === authors.length - 1);
  if (paper.primarySupervision === true || (paper.primarySupervision !== false && positionQualifies)) roles.push('supervision');
  return roles;
}

function normalizeSearchText(value) {
  return String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const artifactLabels = {
  paper: 'PDF', arxiv: 'arXiv', code: 'Code', slides: 'Slides', video: 'Video',
  project: 'Project', blog: 'Post'
};

function displayVenue(venue = '', year) {
  const compact = String(venue).replace(/^(.+?)\s+Workshop(?:\s*[:–—-].+|\s+on\s+.+)$/i, '$1 Workshop');
  return Number.isInteger(year) ? compact.replace(new RegExp(`\\s+${year}$`), '') : compact;
}

function venueGroup(paper) {
  const type = paper.type || 'preprint';
  if (type === 'preprint') return { key: 'preprint:Preprints', label: 'Preprints', order: 3 };
  if (type === 'thesis') return { key: 'thesis:Thesis', label: 'Thesis', order: 4 };
  const label = displayVenue(paper.venue || '', paper.year) || ({ conference: 'Conferences', journal: 'Journals', workshop: 'Workshops' }[type] || 'Other');
  const order = ({ conference: 0, journal: 1, workshop: 2 }[type] ?? 3);
  return { key: `${type}:${label.toLowerCase()}`, label, order };
}

const venueChronology = [
  'neurips', 'nips', 'icml', 'iclr', 'cvpr', 'iccv', 'eccv', 'ijcai', 'aaai', 'aistats', 'bmvc', 'wacv'
];

function venueRank(paper) {
  const venue = String(paper.venue || '').toLowerCase();
  const index = venueChronology.findIndex(name => venue.includes(name));
  return index < 0 ? venueChronology.length : index;
}

function latestFirst(a, b) {
  return b.year - a.year || venueRank(a) - venueRank(b) || String(a.title).localeCompare(String(b.title));
}

function paperArticle(paper, topicMap, options = {}) {
  const topics = effectiveTopicCodes(paper, topicMap);
  const visibleTopics = (paper.topics || []).filter(code => topicMap.has(code) && !topicMap.get(code).includes?.length);
  if (!visibleTopics.length) visibleTopics.push(...(paper.topics || []).filter(code => topicMap.has(code)));
  const type = paper.type || 'preprint';
  const searchableTopics = topics.flatMap(code => [code, topicMap.get(code).title, topicMap.get(code).tag]);
  const distinctions = [...new Set([...(Array.isArray(paper.distinction) ? paper.distinction : paper.distinction ? [paper.distinction] : []), ...(Array.isArray(paper.awards) ? paper.awards : paper.awards ? [paper.awards] : [])])];
  const citationThreshold = Number.isInteger(paper.citationThreshold) ? paper.citationThreshold : 0;
  const citationBadge = citationThreshold > 1000 ? `${citationThreshold}+ citations` : '';
  const search = [...new Set([paper.title, ...authorSearchNames(paper.authors), displayVenue(paper.venue || '', paper.year), paper.year, type, ...distinctions, citationBadge, ...searchableTopics].map(normalizeSearchText).filter(Boolean))].join(' ');
  const links = Object.entries(artifactLabels).filter(([key]) => safeUrl(paper.links?.[key])).map(([key, label]) => link(paper.links[key], label)).join('');
  const badges = [...distinctions.map(badge => `<span class="distinction">${escapeHtml(badge)}</span>`), citationBadge ? `<span class="distinction citation-badge" aria-label="${escapeHtml(citationBadge)}">${escapeHtml(citationBadge)}</span>` : ''].join('');
  const metadata = `${options.showYear === false ? '' : `<span>${escapeHtml(paper.year)}</span>`}${options.showVenue === false ? '' : `<span class="paper-venue">${escapeHtml(displayVenue(paper.venue || type, paper.year))}</span>`}${badges}`;
  const bibtex = paper.bibtex ? `<details class="bibtex"><summary>BibTeX</summary><div class="bibtex-inner"><button type="button" class="copy-bibtex" data-copy-bibtex="${escapeHtml(paper.id)}">Copy citation</button><pre id="bib-${escapeHtml(paper.id)}"><code>${escapeHtml(paper.bibtex)}</code></pre></div></details>` : '';
  return `<article class="paper" id="${escapeHtml(paper.id)}" data-paper data-search="${escapeHtml(search)}" data-type="${escapeHtml(type)}" data-topics="${escapeHtml(topics.join(' '))}" data-author-roles="${escapeHtml(authorRoles(paper).join(' '))}">
    ${metadata ? `<div class="paper-meta">${metadata}</div>` : ''}
    <h3>${safeUrl(paper.links?.paper || paper.links?.arxiv || paper.links?.project) ? link(paper.links.paper || paper.links.arxiv || paper.links.project, paper.title) : escapeHtml(paper.title)}</h3>
    <p class="paper-authors">${paperAuthors(paper.authors)}</p>
    <div class="paper-actions">${links}${bibtex}</div>
    ${options.showTopics && visibleTopics.length ? `<div class="topic-tags">${visibleTopics.map(code => { const topic = topicMap.get(code); const href = options.topicFilterLinks ? `/publications/?topic=${encodeURIComponent(code)}` : `/${code}/`; return link(href, topic.tag || topic.title); }).join('')}</div>` : ''}
  </article>`;
}

function groupedPapers(papers, topicMap, options = {}) {
  const years = [...new Set(papers.map(p => p.year))].sort((a, b) => b - a);
  return years.map(year => {
    const yearPapers = papers.filter(paper => paper.year === year);
    let papersMarkup;
    if (options.groupByVenue) {
      const groups = new Map();
      for (const paper of yearPapers) {
        const group = venueGroup(paper);
        if (!groups.has(group.key)) groups.set(group.key, { ...group, papers: [] });
        groups.get(group.key).papers.push(paper);
      }
      papersMarkup = [...groups.values()].sort((a, b) => {
        const paperA = yearPapers.find(paper => venueGroup(paper).key === a.key);
        const paperB = yearPapers.find(paper => venueGroup(paper).key === b.key);
        return a.order - b.order || venueRank(paperA || {}) - venueRank(paperB || {}) || a.label.localeCompare(b.label);
      }).map((group, index) => {
        const id = `venue-${year}-${index}`;
        const entries = group.papers.sort(latestFirst).map(paper => paperArticle(paper, topicMap, { ...options, groupByVenue: false, showYear: false, showVenue: false })).join('');
        return `<section class="venue-group" data-venue-group aria-labelledby="${id}"><h3 id="${id}" class="venue-heading">${escapeHtml(group.label)}</h3><div class="paper-list">${entries}</div></section>`;
      }).join('');
    } else {
      papersMarkup = `<div class="paper-list">${yearPapers.map(paper => paperArticle(paper, topicMap, { ...options, showYear: false })).join('')}</div>`;
    }
    return `<section class="year-group" data-year-group aria-labelledby="year-${year}"><h2 id="year-${year}" class="year-heading">${year}</h2>${papersMarkup}</section>`;
  }).join('');
}

const mainThemeFigures = {
  pl: { image: '/images/theme-protocol.png', width: 1428, height: 847, alt: 'Agora system overview: language model stages, workers, trainers and managed services' },
  nno: { image: '/images/theme-dynamics.png', width: 1252, height: 531, alt: 'Reduction mappings change the curvature of an optimization landscape' },
  compression: { image: '/images/theme-compression.png', width: 859, height: 477, alt: 'Proximal mean-field quantization on a simplex' },
  vision: { image: '/images/theme-vision.png', width: 1141, height: 544, alt: 'Composed image retrieval across image and text representations' },
  do: { image: '/images/theme-discrete.png', width: 898, height: 529, alt: 'Message-passing variables and factors in a discrete graphical model' }
};

function researchThemes(topics) {
  const themes = [
    { title: 'Protocol Learning', description: 'Training large models across independent, heterogeneous machines.', topicCode: 'pl', tags: ['decentralized', 'asyncopt', 'comm', 'pipeline', 'context', 'verify'], ...mainThemeFigures.pl },
    { title: 'Learning Dynamics & Optimization', description: 'How architecture, initialization and optimization shape learning.', topicCode: 'nno', tags: ['dlt', 'spnn', 'neuralcollapse', 'nnc', 'asyncopt'], ...mainThemeFigures.nno },
    { title: 'Neural Network Compression', description: 'Smaller models and cheaper training through pruning, quantization and low-rank structure.', topicCode: 'compression', tags: ['nnq', 'nnp', 'lowrank'], ...mainThemeFigures.compression },
    { title: 'Vision & Representation Learning', description: 'Learning visual representations and connecting them with language.', topicCode: 'vision', tags: ['vl', 'retrieval', 'representation', 'textrecognition', 'stereo', 'semseg', 'objectdet', 'metric', 'il', 'meta', 'gm', 'ssl', 'robustness'], ...mainThemeFigures.vision },
    { title: 'Discrete Optimization', description: 'Efficient inference with graph cuts and message passing.', topicCode: 'do', tags: ['mrf', 'graphcuts', 'message'], ...mainThemeFigures.do }
  ];
  return `<div class="theme-list">${themes.map(theme => {
    const title = theme.topicCode ? link(`/${theme.topicCode}/`, theme.title, 'theme-title-link') : escapeHtml(theme.title);
    const tags = theme.tags.map(code => topics.find(topic => topic.code === code)).filter(Boolean);
    const image = theme.image.replace(/^\//, '');
    return `<article class="theme"><div class="theme-content"><h3>${title}</h3><p class="theme-description">${escapeHtml(theme.description)}</p><div class="theme-links">${tags.map(topic => link(`/${topic.code}/`, topic.tag || topic.title)).join('')}</div></div><a class="theme-figure" href="/${escapeHtml(theme.topicCode)}/" aria-label="Explore ${escapeHtml(theme.title)} research"><img src="${escapeHtml(image)}" width="${theme.width}" height="${theme.height}" alt="${escapeHtml(theme.alt)}" loading="lazy"></a></article>`;
  }).join('')}</div>`;
}

function talkActions(talk) {
  const links = [];
  const recording = talk.video || talk.url;
  if (recording) links.push({ url: recording, label: talk.videoLabel || 'Watch talk' });
  const slides = Array.isArray(talk.slides) ? talk.slides : talk.slides ? [talk.slides] : [];
  for (const slide of slides) {
    const item = typeof slide === 'string' ? { url: slide, label: 'Slides' } : slide;
    if (item?.url) links.push({ url: item.url, label: item.label || 'Slides' });
  }
  return links.map(item => link(item.url, item.label, 'text-arrow')).join('');
}

function talkFeature(talk) {
  const event = talk.eventUrl ? link(talk.eventUrl, talk.event) : escapeHtml(talk.event || '');
  const location = talk.location ? `<span class="talk-location">${escapeHtml(talk.location)}</span>` : '';
  const date = escapeHtml(talk.date || talk.year || '');
  const sessions = talk.sessions || [{ ...talk, slides: talk.slides }];
  const sessionMarkup = sessions.map(session => `<div class="talk-session"><h3>${escapeHtml(session.title || '')}</h3><div class="talk-actions">${talkActions(session)}</div></div>`).join('');
  return `<article class="talk-feature"><div class="talk-header"><p class="talk-event">${event}${location ? `<span class="talk-location-separator"> · </span>${location}` : ''}</p><span class="talk-year">${date}</span></div><div class="talk-sessions">${sessionMarkup}</div></article>`;
}

function serviceItem(item, separator) {
  const title = String(item.title || '');
  const splitAt = title.indexOf(separator);
  const label = splitAt < 0 ? title : title.slice(0, splitAt);
  const detail = splitAt < 0 ? '' : title.slice(splitAt + separator.length);
  const content = `<strong class="service-item-label">${escapeHtml(label)}</strong>${detail ? `<span class="service-item-detail">${escapeHtml(separator + detail)}</span>` : ''}`;
  const href = safeUrl(item.url);
  if (!href) return content;
  const external = /^https?:/.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a class="service-item-link" href="${escapeHtml(href)}"${external}>${content}</a>`;
}

function mentoringSection(profile) {
  const people = (profile.mentoring?.people || []).map(person => `<li>${link(person.url, person.name)}${person.detail ? `<span class="person-detail">(${escapeHtml(person.detail)})</span>` : ''}</li>`).join('');
  const interns = (profile.mentoring?.interns || []).map(person => `<li>${link(person.url, person.name)}${person.detail ? `<span class="person-detail">(${escapeHtml(person.detail)})</span>` : ''}</li>`).join('');
  const teaching = (profile.service?.teaching || []).map(item => `<li>${serviceItem(item, ', ')}</li>`).join('');
  const workshops = (profile.service?.workshops || []).map(item => `<li>${serviceItem(item, ' · ')}</li>`).join('');
  const recognition = (profile.service?.recognition || []).map(item => {
    const [label, ...detail] = item.split(', ');
    return `<li><strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail.join(', '))}</span></li>`;
  }).join('');
  return `<section class="content-section community-section" id="mentoring">${sectionIntro('', 'Mentoring & Service')}<p class="community-intro">${escapeHtml(profile.mentoring?.intro || '')}</p><div class="community-grid"><div class="community-panel academic-panel"><h3>Academic PhD Supervision</h3><ul class="people-list">${people}</ul>${interns ? `<div class="internship-block"><h3>Industry Interns</h3><ul class="people-list">${interns}</ul></div>` : ''}</div><div class="community-panel service-panel"><div class="teaching-block"><h3>Teaching</h3><ul class="service-list teaching-list">${teaching}</ul></div><div class="workshop-block"><h3>Workshop Organizer</h3><ul class="service-list workshop-list">${workshops}</ul></div><div class="conference-block"><h3>Conferences</h3><ul class="community-recognition">${recognition}</ul></div></div></div></section>`;
}

function pulseSection(notes, xProfile) {
  if (!notes.length) return '';
  const cards = notes.map(note => {
    const paragraphs = String(note.content || '').split(/\r?\n\s*\r?\n/).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`).join('');
    const mediaUrl = safeUrl(note.mediaUrl);
    const mediaSize = Number.isInteger(note.mediaWidth) && note.mediaWidth > 0 && Number.isInteger(note.mediaHeight) && note.mediaHeight > 0 ? ` width="${note.mediaWidth}" height="${note.mediaHeight}"` : '';
    const media = mediaUrl ? `<div class="note-media"><img src="${escapeHtml(mediaUrl)}"${mediaSize} alt="${escapeHtml(note.mediaAlt || '')}" loading="lazy"></div>` : '';
    const resource = note.resourceUrl ? link(note.resourceUrl, 'Related link', 'text-arrow with-arrow') : '';
    const postTitle = note.postUrl ? link(note.postUrl, note.topic || 'X', 'note-title') : escapeHtml(note.topic || 'X');
    return `<article class="note"><div class="note-meta"><span>${postTitle}</span>${monthYear(note.date)}</div><div class="note-post" tabindex="0" role="region" aria-label="${escapeHtml(note.topic || 'X post')}">${paragraphs}${media}</div>${resource ? `<div class="note-actions">${resource}</div>` : ''}</article>`;
  }).join('');
  return `<section class="content-section" id="notes"><div class="section-heading"><div><h2>Pulse on ${xProfile ? link(xProfile.url, 'X') : 'X'}</h2></div></div><div class="notes-list" role="region" aria-label="Pulse on X" tabindex="0">${cards}</div></section>`;
}

export function renderHome(profile, topics, papers) {
  const topicMap = new Map(topics.map(topic => [topic.code, topic]));
  const chosen = papers.filter(p => Number.isFinite(p.selected)).sort((a, b) => a.selected - b.selected).slice(0, 6);
  const selected = (chosen.length ? chosen : [...papers].sort(latestFirst).slice(0, 6)).sort(latestFirst);
  const notes = profile.notes || [];
  const xProfile = profile.contact?.links?.find(item => item.label === 'X');
  const [firstName, ...lastNameParts] = profile.name.trim().split(/\s+/);
  const lastName = lastNameParts.join(' ');
  const nickname = profile.shortName?.match(/\(([^)]+)\)/)?.[1];
  const content = `<div class="page-wrap home-page"><div id="top" aria-hidden="true"></div>
    <section class="intro" id="about" aria-labelledby="intro-title"><div class="mobile-intro-portrait"><img src="images/portrait.webp" width="72" height="72" alt="Portrait of ${escapeHtml(profile.name)}"></div><div class="intro-identity"><p class="eyebrow">${escapeHtml(profile.field || profile.role)} · ${escapeHtml(profile.location)}</p><h1 id="intro-title">${escapeHtml(firstName)}${lastName ? `<br><em>${escapeHtml(lastName)}</em>` : ''}${nickname ? `<span class="name-suffix"> (${escapeHtml(nickname)})</span>` : ''}</h1><h2 class="sr-only">Profile</h2><p class="intro-role">${escapeHtml(profile.role)} at ${link('https://pluralis.ai/', profile.affiliation)}<br>${escapeHtml(profile.secondaryRole)} at ${link('https://www.anu.edu.au/', profile.secondaryAffiliation)}</p></div><div class="intro-summary">${profile.bio ? `<p class="intro-lead">${escapeHtml(profile.bio)}</p>` : `<p class="intro-lead">${escapeHtml(profile.intro)}</p>`}<div class="intro-links">${link('/pl/', 'Protocol Learning', 'text-arrow with-arrow')}</div></div></section>
    <section class="content-section" id="research" aria-labelledby="research-title">${sectionIntro('', 'Research').replace('<h2>Research</h2>', '<h2 id="research-title">Research</h2>')}${researchThemes(topics)}</section>
    <section class="content-section" id="selected-work" aria-labelledby="selected-title"><div class="section-heading"><div><h2 id="selected-title">Selected Publications</h2></div>${link('/publications/', 'All publications', 'text-arrow')}</div><div class="paper-list selected-list">${selected.map(p => paperArticle(p, topicMap, { showTopics: true })).join('')}</div></section>
    ${profile.talks?.length ? `<section class="content-section" id="talks">${sectionIntro('', 'Invited Keynotes')}<div class="talk-list">${profile.talks.map(talkFeature).join('')}</div></section>` : ''}
    <section class="content-section" id="background">${sectionIntro('', 'Background')}${profile.about ? `<p class="section-prose">${escapeHtml(profile.about)}</p>` : ''}<div class="timeline">${(profile.background || []).map(item => `<div class="timeline-item"><div><h3>${escapeHtml(item.title)}</h3><p>${item.url ? link(item.url, item.organization) : escapeHtml(item.organization)}</p></div>${item.detail ? `<span>${escapeHtml(item.detail)}</span>` : ''}</div>`).join('')}</div>${profile.collaborators?.length ? `<div class="collaborators"><h3>Researchers I’ve Been Fortunate to Work With</h3><ul class="collaborator-list">${profile.collaborators.map(person => `<li>${link(person.url, person.name)}</li>`).join('')}</ul></div>` : ''}</section>
    ${mentoringSection(profile)}
    ${pulseSection(notes, xProfile)}
    <section class="content-section contact-section" id="contact">${sectionIntro('', 'Contact')}<p class="email-display contact-email">${escapeHtml(profile.contact?.emailDisplay || '')}</p>${socialLinks(profile.contact?.links || [], 'contact-links')}</section>
  </div>`;
  return shell({ title: profile.name, description: profile.intro, path: '/', active: 'profile', content, profile, notes: notes.length > 0 });
}

export function renderLibrary(profile, topics, papers) {
  const topicMap = new Map(topics.map(topic => [topic.code, topic]));
  const activeTopics = topics.filter(topic => papers.some(paper => effectiveTopicCodes(paper, topicMap).includes(topic.code)));
  const count = papers.length;
  const sorted = [...papers].sort(latestFirst);
  const scholar = profile.contact?.links?.find(item => item.label === 'Google Scholar');
  const content = `<div class="page-wrap inner-page"><div class="page-intro archive-intro"><div class="archive-title-row"><h1>Publications</h1><div class="archive-links">${scholar ? link(scholar.url, 'Scholar', 'text-arrow') : ''}</div></div></div>
    <form class="filter-bar" data-publication-filters role="search" aria-label="Filter publications"><div class="filter-field search-field"><label for="publication-search">Search publications</label><input id="publication-search" name="search" type="search" placeholder="Title, author, venue…" autocomplete="off"></div><div class="filter-field"><label for="topic-filter">Topic</label><select id="topic-filter" name="topic"><option value="">All topics</option>${activeTopics.map(topic => `<option value="${escapeHtml(topic.code)}">${escapeHtml(topic.tag || topic.title)}</option>`).join('')}</select></div><div class="filter-field"><label for="type-filter">Type</label><select id="type-filter" name="type"><option value="">All types</option>${[['conference','Conference'],['journal','Journal'],['workshop','Workshop'],['preprint','Preprint'],['thesis','Thesis']].map(([value,label]) => `<option value="${value}">${label}</option>`).join('')}</select></div><div class="filter-field"><label for="role-filter">Author role</label><select id="role-filter" name="role"><option value="">All roles</option><option value="first">First author</option><option value="supervision">Primary supervisor/contributor</option></select></div></form><noscript><p class="filter-noscript">Search and filters require JavaScript; the complete list is grouped by year below.</p></noscript>
    <div class="results-line"><p id="results-count" aria-live="polite">Showing all ${count} publications</p><button type="button" class="clear-filters" data-clear-filters hidden>Clear filters</button></div><div class="no-results" data-no-results hidden><h2>No Matching Publications</h2><p>Try another title, author, venue, type, topic, or role.</p><button type="button" data-clear-filters>Clear filters</button></div>
    <div class="archive-list">${groupedPapers(sorted, topicMap, { showTopics: true, topicFilterLinks: true, groupByVenue: true })}</div>${papers.some(paper => (paper.authors || []).some(author => /\*+\s*$/.test(author))) ? '<p class="equal-contribution"><sup>*</sup> Equal contribution</p>' : ''}
  </div>`;
  return shell({ title: 'Publications', description: 'Publications by Thalaiyasingam Ajanthan in machine learning, optimization and computer vision.', path: '/publications/', active: 'publications', content, profile, notes: profile.notes?.length > 0 });
}

export function renderTopic(profile, topic, topics, papers) {
  const topicMap = new Map(topics.map(item => [item.code, item]));
  const matching = [...papers].filter(p => effectiveTopicCodes(p, topicMap).includes(topic.code)).sort(latestFirst);
  const descriptionLink = topic.code === 'pl' ? ` ${link('https://arxiv.org/abs/2412.07890', 'Read more')}` : '';
  const figure = topic.includes?.length && mainThemeFigures[topic.code] ? mainThemeFigures[topic.code] : null;
  const figureUrl = figure ? escapeHtml(relativeAsset(`/${topic.code}/`, figure.image)) : '';
  const figureMarkup = figure ? `<figure class="topic-theme-figure"><a class="topic-figure-trigger" href="${figureUrl}" data-figure-open="theme-figure-dialog" aria-haspopup="dialog" aria-controls="theme-figure-dialog" aria-label="View larger ${escapeHtml(topic.title)} figure"><img src="${figureUrl}" width="${figure.width}" height="${figure.height}" alt="${escapeHtml(figure.alt)}" loading="eager"></a></figure>` : '';
  const figureDialog = figure ? `<dialog class="figure-dialog" id="theme-figure-dialog" aria-label="Enlarged ${escapeHtml(topic.title)} research figure"><div class="figure-dialog-header"><button type="button" class="figure-dialog-close" data-figure-close autofocus>Close <span aria-hidden="true">×</span></button></div><img src="${figureUrl}" width="${figure.width}" height="${figure.height}" alt="${escapeHtml(figure.alt)}"></dialog>` : '';
  const content = `<div class="page-wrap inner-page topic-page">${link('/#research', '← Research', 'topic-return')}<div class="topic-overview${figure ? ' has-theme-figure' : ''}"><div class="page-intro"><h1>${escapeHtml(topic.title)}</h1><p>${escapeHtml(topic.description)}${descriptionLink}</p></div>${figureMarkup}</div>${figureDialog}
    <div class="section-heading topic-heading"><div><h2 id="topic-papers-title">Papers</h2></div>${link('/publications/', 'All publications', 'text-arrow')}</div>
    ${matching.length ? groupedPapers(matching, topicMap, { showTopics: true }) : '<p class="empty-topic">No publications are currently listed under this topic.</p>'}
    </div>`;
  return shell({ title: topic.title, description: topic.description, path: `/${topic.code}/`, active: 'research', content, profile, notes: profile.notes?.length > 0 });
}

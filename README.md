# Ajanthan's research website

A static site for GitHub Pages. HTML is generated from shared content files and committed to the repository. Building and serving require Node.js 22 or later; there are no runtime packages or external font dependencies.

## Preview and edit

```sh
npm run build
npm run dev
```

Open http://localhost:4173. After editing content or templates, rebuild and refresh the browser.

| File | Edit here |
| --- | --- |
| `data/profile.json` | Biography, experience, mentoring, service, talks, contact links, notes |
| `data/publications.json` | Publications, artifact links, topic assignments, selected papers |
| `data/topics.json` | Research topic names, descriptions, and taxonomy |
| `src/render.mjs` | Shared HTML templates |
| `assets/css/site.css` | Visual design and responsive layout |
| `assets/js/site.js` | Filters, navigation, citation copying |

Topic records use `includes` for broad pages and filters; each paper also carries only the finer tags that fit. The home page groups them into five themes: Protocol learning, Learning dynamics & optimization, Neural network compression, Vision & representation learning, and Discrete optimization.

The build produces the homepage, publication library, BibTeX download and topic pages defined in `data/topics.json`. Existing document URLs are retained. Edit the data and templates rather than generated HTML. Commit the generated files with their source changes before publishing through the repository's GitHub Pages configuration.

For the portrait, replace `images/avatar.jpg`, then run `npm ci` and `npm run images`. This regenerates the small WebP used on the pages. The regular build does not need the image optimizer installed.

## Publications

Each record has a stable `id`, `title`, ordered `authors`, `year`, `venue`, `type`, `topics`, artifact `links`, and `bibtex`. Supported types are `conference`, `journal`, `workshop`, `preprint`, and `thesis`. Local links start with `/`. An asterisk at the end of an author's name denotes equal contribution.

Publication lists abbreviate author names to initials and workshop venues to the conference acronym (for example, “ICML Workshop”); downloaded BibTeX keeps full names and venue details. Every paper PDF is served from the site; copies of arXiv PDFs are stored under `publications/docs/`.

The publication archive combines text, topic, type and author-role filters. “First author” includes shared-first papers marked with the same equal-contribution marker; “Primary supervision” follows second- or last-author position.

Give six representative papers distinct numeric `selected` priorities and a brief `summary`. These priorities choose the homepage set; papers display newest first, with NeurIPS before ICML before ICLR within 2026. Other papers remain in the full library and their topic pages. Keep the BibTeX title, year and authors consistent with the visible record; `npm run check` catches differences.

### Reconcile with Google Scholar

In your Scholar profile, select all articles and export BibTeX. Review the import before applying it:

```sh
npm run publications:import -- /path/to/scholar.bib
npm run publications:import -- /path/to/scholar.bib --report /tmp/scholar-review.json
npm run publications:import -- /path/to/scholar.bib --apply
npm run build
npm run check
```

The default command reports matches, additions and conflicts without changing the catalogue. `--apply` adds unambiguous records and compatible citation updates; it preserves curated summaries, selections and existing artifact links. It never deletes papers. Conflicting authors, dates, venues or identifiers require manual review. New entries start under `misc`; assign their topics and confirm publication status before publishing.

### Check for new work

```sh
npm run publications:check
```

This compares the catalogue with the public DBLP author bibliography and saves `review/publications-review.json`. A monthly GitHub Action, also available through **Run workflow**, uploads the same review report as an artifact. It does not publish changes. Source failures produce a failed check and an explanatory report; they never clear the catalogue. DBLP checks supplement Scholar imports and cannot guarantee an exact Scholar mirror.

The current catalogue contains 56 records. Google Scholar returned 403 during the previous update, so a complete Scholar reconciliation remains pending. Citation badges are calculated in 500-citation steps from the stored counts; their source and retrieval date are recorded with each paper in `data/publications.json` and summarized in `data/metadata.json`.

`scripts/migrate-publications.mjs` is a one-time recovery tool tied to the original Git revision. It is not the update workflow. Future changes belong in the data files or Scholar import.

## Talks and notes

The Oxford research word-art is saved in `images/oxford-research-wordart.png` with its prompt at `images/oxford-research-wordart.prompt.txt`; it is not currently displayed on the homepage.

Talks accept `title`, `event`, `year`, and optional display `date` and `location`. Links use `video` (or `url`), `slides` and `eventUrl`; `videoLabel` overrides the default “Watch talk” label. Slide links may be a single URL or a list of URLs or labeled link objects. Use `sessions` to group several talk titles and slide decks under one event.

X notes use `topic`, `date`, and `content`; a verified `postUrl` links the topic to its canonical X post. The seven current post IDs were matched to the post text on the public account timeline at `teapawt.org/tha_ajanthan` on 16 November 2026. `mediaUrl` and `mediaAlt` add verified post-attached media at the end of the text, with `mediaWidth` and `mediaHeight` reserving its aspect ratio, and `resourceUrl` adds a related paper, project or event. Keep the strip to selected research posts or distinctive opinions. Cards scroll horizontally; each compact card has one internal scroll area containing its text followed by attached media. Do not use images from linked articles unless they were also attached to the X post. Research figures appear only in the five homepage theme entries; topic pages list publications without figures or enlargement dialogs.

The CODEC-FM service entry links to the [organizers' website](https://collaborative-open-decentralized-fomo.github.io/). The KAUST talk entry includes its [event programme](https://www.kaust.edu.sa/events/dtelm25/); ICOMP and ASCOMP share one Casablanca entry with separate slide links.

## Checks

```sh
npm run build
npm run check
npm test
npm ci
npm run test:browser
```

The data check validates citations, topic assignments, generated publication counts, local files and anchor links. Unit tests cover import and refresh behavior. Browser checks use installed Google Chrome and cover desktop/mobile layouts, WCAG contrast and semantics, search, filters, citation copying and use without JavaScript. Screenshots are saved under `test-results/`.

The original HTML5 UP assets and license remain in the repository; the redesigned pages use the new templates and styles.

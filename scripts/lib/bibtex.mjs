// Small BibTeX reader shared by the migration and local Scholar import.
export function latexText(value) {
  const accents = { "'": '\u0301', '`': '\u0300', '^': '\u0302', '"': '\u0308', '~': '\u0303', c: '\u0327' };
  return value
    .replace(/\\([\'`^"~c])\s*\{?([A-Za-z])\}?/g, (_, mark, letter) => (letter + accents[mark]).normalize('NFC'))
    .replace(/\\(ae|AE|oe|OE|ss|o|O|l|L)\b/g, (_, symbol) => ({ae:'æ',AE:'Æ',oe:'œ',OE:'Œ',ss:'ß',o:'ø',O:'Ø',l:'ł',L:'Ł'})[symbol])
    .replace(/\\&/g, '&').replace(/\\_/g, '_').replace(/\\%/g, '%')
    .replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

function readValue(input, start) {
  while (/\s/.test(input[start] || '')) start++;
  const opening = input[start];
  if (opening !== '{' && opening !== '"' && opening !== '(') {
    let end = start;
    while (end < input.length && input[end] !== ',' && input[end] !== '\n') end++;
    return [input.slice(start, end).trim(), end];
  }
  const closing = opening === '{' ? '}' : opening === '(' ? ')' : '"';
  let depth = 1, braces = 0, quoted = false, end = start + 1;
  for (; end < input.length; end++) {
    if (input[end] === '\\') { end++; continue; }
    if (opening === '(') {
      if (input[end] === '"' && braces === 0) { quoted = !quoted; continue; }
      if (quoted) continue;
      if (input[end] === '{') { braces++; continue; }
      if (input[end] === '}' && braces) { braces--; continue; }
      if (braces) continue;
    }
    if (input[end] === opening && opening !== '"') depth++;
    if (input[end] === closing && --depth === 0) break;
  }
  if (depth !== 0) throw new Error('Unbalanced BibTeX value');
  return [input.slice(start + 1, end), end + 1];
}

export function parseBibEntries(input) {
  const entries = [];
  const start = /@([a-zA-Z]+)\s*([({])/g;
  for (let found; (found = start.exec(input));) {
    const type = found[1].toLowerCase();
    if (['comment', 'string', 'preamble'].includes(type)) continue;
    const [body, end] = readValue(input, found.index + found[0].length - 1);
    start.lastIndex = end;
    const comma = body.indexOf(',');
    if (comma < 0) throw new Error(`BibTeX entry is missing a key separator near ${found.index}`);
    const key = body.slice(0, comma).trim();
    const fields = {};
    let at = comma + 1;
    while (at < body.length) {
      while (/[\s,]/.test(body[at] || '') && at < body.length) at++;
      if (at >= body.length) break;
      const match = /^[\w-]+/.exec(body.slice(at));
      if (!match) throw new Error(`Invalid BibTeX field in ${key}: ${body.slice(at, at + 30)}`);
      const name = match[0].toLowerCase();
      at += match[0].length;
      while (/\s/.test(body[at] || '')) at++;
      if (body[at++] !== '=') throw new Error(`BibTeX ${key}.${name} is missing '='`);
      const [value, endValue] = readValue(body, at);
      fields[name] = value.trim();
      at = endValue;
    }
    entries.push({ type, key, fields });
  }
  return entries;
}

export function authorsFromBib(raw = '') {
  // Legacy pages occasionally insert an extra comma before "and".
  return raw.replace(/,\s+and\s+/gi, ' and ').split(/\s+and\s+/i)
    .map(person => {
      const parts = person.split(/,\s*/);
      return latexText(parts.length > 1 ? `${parts.slice(1).join(' ')} ${parts[0]}` : person);
    }).filter(Boolean);
}

export function normalizedTitle(title = '') {
  return latexText(title).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function nameAsBib(name) {
  const clean = name.replace(/\*$/, '');
  const compounds = ['Mohaghegh Dolatabadi', 'P Hewa Koneputugodage', 'Hewa Koneputugodage', 'van den Hengel', 'De Bem', 'Di Stefano', "O'Donnell"];
  const family = compounds.find(part => clean.endsWith(` ${part}`));
  if (family) return `${family}, ${clean.slice(0, -family.length).trim()}`;
  const parts = clean.split(' ');
  return parts.length < 2 ? clean : `${parts.at(-1)}, ${parts.slice(0, -1).join(' ')}`;
}

export function bibtexFor(record, original = '') {
  const kind = record.type === 'conference' || record.type === 'workshop' ? 'inproceedings' : record.type === 'thesis' ? 'phdthesis' : 'article';
  const venueField = record.type === 'conference' || record.type === 'workshop' ? 'booktitle' : record.type === 'thesis' ? 'school' : 'journal';
  const source = parseBibEntries(original)[0]?.fields || {};
  const fields = { ...source };
  delete fields.journal; delete fields.booktitle; delete fields.school;
  fields.title = `{${record.title}}`;
  fields.author = record.authors.map(nameAsBib).join(' and ');
  fields[venueField] = record.venue;
  fields.year = String(record.year);
  if (record.type === 'preprint') {
    const id = arxivId(record.links?.arxiv || '');
    if (id) { fields.eprint = id; fields.archiveprefix = 'arXiv'; fields.url = record.links.arxiv; }
  }
  const body = Object.entries(fields).map(([field, value]) => `  ${field}={${value}}`).join(',\n');
  return `@${kind}{${record.id},\n${body}\n}`;
}

export function formatBibEntry(entry, key = entry.key) {
  const fields = Object.entries(entry.fields).map(([name, value]) => `  ${name}={${value}}`);
  return `@${entry.type}{${key},\n${fields.join(',\n')}\n}`;
}

export function arxivId(text = '') {
  return /(?:arxiv(?:\.org\/(?:abs|pdf)\/|:|\s+))([0-9]{4}\.[0-9]{4,5})/i.exec(text)?.[1] || '';
}

export function doiId(text = '') {
  return /(?:doi(?:\.org\/|\s*[:=]\s*))?(10\.\d{4,9}\/[-._;()/:a-z0-9]+)/i.exec(text)?.[1]?.toLowerCase() || '';
}

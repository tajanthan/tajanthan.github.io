import { bibtexFor } from './bibtex.mjs';

// Primary-source additions checked on 2026-09-23. Keep this separate from the
// HTML migration so provenance stays explicit and the legacy source is intact.
const verifiedDate = '2026-09-23';
const arxiv = id => `https://arxiv.org/abs/${id}`;
const pdf = id => `https://arxiv.org/pdf/${id}`;
const additions = [
  {
    id: 'ramasinghe_llm_adaptation_arxiv26',
    title: 'Communication-Efficient LLM Adaptation over Decentralized GPU Meshes',
    authors: ['Sameera Ramasinghe', 'Shamane Siriwardhana', 'Thalaiyasingam Ajanthan', 'Hadi Mohaghegh Dolatabadi', 'Chamin P Hewa Koneputugodage', 'Gil Avraham', 'Violetta Shevchenko', 'James Snewin', 'Karol Pajak', 'Harry Xi', 'Alexander Long'],
    year: 2026, venue: 'arXiv', type: 'preprint', topics: ['pl'],
    links: { paper: pdf('2609.14339'), arxiv: arxiv('2609.14339') },
    sources: [arxiv('2609.14339')],
  },
  {
    id: 'avraham_agora_arxiv26',
    title: 'Agora: Collective and Permissionless Internet-Scale Pretraining of Large Language Models',
    authors: ['Gil Avraham', 'Violetta Shevchenko', 'Hadi Mohaghegh Dolatabadi', 'Karol Pajak', 'James Snewin', 'Harry Xi', "Rodney O'Donnell", 'Thalaiyasingam Ajanthan', 'Sameera Ramasinghe', 'Chamin Hewa Koneputugodage', 'Shamane Siriwardhana', 'Alexander Long'],
    year: 2026, venue: 'arXiv', type: 'preprint', topics: ['pl'],
    links: { paper: pdf('2607.13332'), arxiv: arxiv('2607.13332'), code: 'https://github.com/PluralisResearch/agora' },
    sources: [arxiv('2607.13332')],
  },
  {
    id: 'koneputugodage_factored_gossip_icml26',
    title: 'Factored Gossip DiLoCo: Reducing Blocking Communication in DiLoCo',
    authors: ['Chamin Hewa Koneputugodage', 'Thalaiyasingam Ajanthan', 'Sameera Ramasinghe', 'Hadi Mohaghegh Dolatabadi', 'Shamane Siriwardhana', 'Gil Avraham', 'Violetta Shevchenko', 'Karol Pajak', 'James Snewin', 'Alexander Long'],
    year: 2026, venue: 'ICML', type: 'conference', topics: ['pl'],
    links: { paper: pdf('2606.22768'), arxiv: arxiv('2606.22768'), blog: 'https://pluralis.ai/blog/factored-gossip-diloco/' },
    sources: [arxiv('2606.22768'), 'https://pluralis.ai/blog/factored-gossip-diloco/'],
  },
  {
    id: 'dolatabadi_numuon_arxiv26',
    title: 'NuMuon: Nuclear-Norm-Constrained Muon for Compressible LLM Training',
    authors: ['Hadi Mohaghegh Dolatabadi', 'Thalaiyasingam Ajanthan', 'Sameera Ramasinghe', 'Chamin P Hewa Koneputugodage', 'Shamane Siriwardhana', 'Violetta Shevchenko', 'Karol Pajak', 'James Snewin', 'Gil Avraham', 'Alexander Long'],
    year: 2026, venue: 'arXiv', type: 'preprint', topics: ['pl', 'dlt'],
    links: { paper: pdf('2603.03597'), arxiv: arxiv('2603.03597') },
    sources: [arxiv('2603.03597')],
  },
  {
    id: 'dolatabadi_sentinel_arxiv26',
    title: 'SENTINEL: Stagewise Integrity Verification for Pipeline Parallel Decentralized Training',
    authors: ['Hadi Mohaghegh Dolatabadi', 'Thalaiyasingam Ajanthan', 'Sameera Ramasinghe', 'Chamin P Hewa Koneputugodage', 'Gil Avraham', 'Yan Zuo', 'Violetta Shevchenko', 'Alexander Long'],
    year: 2026, venue: 'arXiv', type: 'preprint', topics: ['pl'],
    links: { paper: pdf('2603.03592'), arxiv: arxiv('2603.03592') },
    sources: [arxiv('2603.03592')],
  },
  {
    id: 'ajanthan_asyncmesh_arxiv26',
    title: 'AsyncMesh: Fully Asynchronous Optimization for Data and Pipeline Parallelism',
    authors: ['Thalaiyasingam Ajanthan', 'Sameera Ramasinghe', 'Gil Avraham', 'Hadi Mohaghegh Dolatabadi', 'Chamin P Hewa Koneputugodage', 'Violetta Shevchenko', 'Yan Zuo', 'Alexander Long'],
    year: 2026, venue: 'arXiv', type: 'preprint', topics: ['pl'],
    links: { paper: pdf('2601.22442'), arxiv: arxiv('2601.22442'), code: 'https://github.com/PluralisResearch/AsyncMesh' },
    sources: [arxiv('2601.22442')],
  },
];

const selections = [
  ['ajanthan_asyncmesh_arxiv26', 1],
  ['ajanthan_asyncpp_icml25', 2],
  ['markou_reduction_neurips25', 3],
  ['ramasinghe_atmg_cvpr24', 4],
  ['lee_snip_iclr19', 5],
  ['chaudhry_rwalk_eccv2018', 6],
];

export function applyVerifiedPublications(records) {
  const byId = new Map(records.map(record => [record.id, record]));
  for (const value of additions) {
    if (byId.has(value.id)) throw new Error(`Verified addition already exists: ${value.id}`);
    const record = { ...value, bibtex: bibtexFor(value), verified: verifiedDate };
    records.push(record); byId.set(record.id, record);
  }
  const archwp = byId.get('ramasinghe_archwp_iclr26');
  archwp.links.arxiv = arxiv('2606.16768');
  archwp.sources.push(arxiv('2606.16768'), 'https://proceedings.iclr.cc/paper_files/paper/2026/hash/ee8493dfdca7ead9f06c235725f98033-Abstract-Conference.html');
  archwp.verified = verifiedDate;
  const mixtures = byId.get('ramasinghe_mixtures_neurips25');
  mixtures.links.arxiv = arxiv('2606.16384');
  mixtures.sources.push(arxiv('2606.16384'));
  mixtures.verified = verifiedDate;
  for (const [id, priority] of selections) {
    const record = byId.get(id);
    if (!record) throw new Error(`Missing selected publication ${id}`);
    record.selected = priority;
  }
  return records;
}

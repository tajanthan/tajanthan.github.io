document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
if (menuButton && sidebar) {
  const closeMenu = () => {
    sidebar.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  };
  menuButton.addEventListener('click', () => {
    const open = !sidebar.classList.contains('is-open');
    sidebar.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  sidebar.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
      closeMenu();
      menuButton.focus();
    }
  });
}

document.querySelectorAll('[data-figure-open]').forEach(trigger => {
  const dialog = document.getElementById(trigger.dataset.figureOpen);
  if (!dialog || typeof dialog.showModal !== 'function') return;

  trigger.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    dialog.showModal();
    document.documentElement.classList.add('has-figure-dialog');
  });
  dialog.querySelector('[data-figure-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('has-figure-dialog');
    trigger.focus({ preventScroll: true });
  });
});

document.querySelectorAll('[data-copy-bibtex]').forEach(button => {
  if (!navigator.clipboard?.writeText) {
    button.hidden = true;
    return;
  }
  button.addEventListener('click', async () => {
    const code = document.querySelector(`#bib-${CSS.escape(button.dataset.copyBibtex)} code`);
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = 'Copied';
      window.setTimeout(() => { button.textContent = 'Copy citation'; }, 1800);
    } catch {
      button.textContent = 'Select citation to copy';
    }
  });
});

const filters = document.querySelector('[data-publication-filters]');
if (filters) {
  const searchInput = filters.elements.search;
  const topicInput = filters.elements.topic;
  const typeInput = filters.elements.type;
  const roleInput = filters.elements.role;
  const papers = [...document.querySelectorAll('[data-paper]')];
  const count = document.querySelector('#results-count');
  const noResults = document.querySelector('[data-no-results]');
  const clearButtons = [...document.querySelectorAll('[data-clear-filters]')];
  const normalize = value => String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const params = new URLSearchParams(location.search);
  if (params.has('topic') && [...topicInput.options].some(option => option.value === params.get('topic'))) topicInput.value = params.get('topic');
  if (params.has('type') && [...typeInput.options].some(option => option.value === params.get('type'))) typeInput.value = params.get('type');
  if (params.has('role') && [...roleInput.options].some(option => option.value === params.get('role'))) roleInput.value = params.get('role');
  if (params.has('q')) searchInput.value = params.get('q');

  function update() {
    const query = searchInput.value.trim().replace(/\s+/g, ' ');
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    const topic = topicInput.value;
    const type = typeInput.value;
    const role = roleInput.value;
    let visible = 0;
    for (const paper of papers) {
      const matches = (!terms.length || terms.every(term => paper.dataset.search.includes(term))) && (!topic || paper.dataset.topics.split(/\s+/).includes(topic)) && (!type || paper.dataset.type === type) && (!role || paper.dataset.authorRoles.split(/\s+/).includes(role));
      paper.hidden = !matches;
      if (matches) visible += 1;
    }
    document.querySelectorAll('[data-venue-group]').forEach(group => {
      group.hidden = !group.querySelector('[data-paper]:not([hidden])');
    });
    document.querySelectorAll('[data-year-group]').forEach(group => {
      group.hidden = !group.querySelector('[data-paper]:not([hidden])');
    });
    const filtered = Boolean(terms.length || topic || type || role);
    count.textContent = filtered ? `Showing ${visible} of ${papers.length} publications` : `Showing all ${papers.length} publications`;
    noResults.hidden = visible !== 0;
    clearButtons.forEach(button => { button.hidden = !filtered; });
    const url = new URL(location.href);
    ['q', 'topic', 'type', 'role'].forEach(key => url.searchParams.delete(key));
    if (query) url.searchParams.set('q', query);
    if (topic) url.searchParams.set('topic', topic);
    if (type) url.searchParams.set('type', type);
    if (role) url.searchParams.set('role', role);
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  filters.addEventListener('input', update);
  filters.addEventListener('change', update);
  filters.addEventListener('submit', event => event.preventDefault());
  clearButtons.forEach(button => button.addEventListener('click', () => {
    filters.reset();
    update();
    searchInput.focus();
  }));
  update();
}

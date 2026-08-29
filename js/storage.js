const state = {
  catalog: [],
  progress: loadProgress()
};

const elements = {
  completed: document.querySelector('#completed'),
  px: document.querySelector('#px'),
  inProgress: document.querySelector('#inprogress'),
  categoryStat: document.querySelector('#category-stat'),
  percent: document.querySelector('#percent'),
  bar: document.querySelector('#bar-fill'),
  list: document.querySelector('#trophy-list'),
  template: document.querySelector('#trophy-template'),
  search: document.querySelector('#search'),
  category: document.querySelector('#category-filter'),
  status: document.querySelector('#status-filter'),
  exportButton: document.querySelector('#export-button'),
  importButton: document.querySelector('#import-button'),
  importFile: document.querySelector('#import-file')
};

function trophyState(trophy) {
  return state.progress.trophies[trophy.id] || {
    status: 'Non iniziato',
    value: 0,
    note: '',
    proof: ''
  };
}

function updateTrophy(id, patch) {
  const trophy = state.catalog.find((item) => item.id === id);
  const current = trophyState(trophy);
  state.progress.trophies[id] = { ...current, ...patch };
  saveProgress(state.progress);
  render();
}

function visibleTrophies() {
  const search = elements.search.value.trim().toLowerCase();
  const category = elements.category.value;
  const status = elements.status.value;

  return state.catalog.filter((trophy) => {
    const current = trophyState(trophy);
    const content = `${trophy.name} ${trophy.description} ${trophy.category}`.toLowerCase();
    return (category === 'all' || trophy.category === category)
      && (status === 'all' || current.status === status)
      && content.includes(search);
  });
}

function renderStats() {
  const completed = state.catalog.filter((trophy) => trophyState(trophy).status === 'Completato');
  const inProgress = state.catalog.filter((trophy) => trophyState(trophy).status === 'In progress');
  const px = completed.reduce((total, trophy) => total + trophy.px, 0);
  const percentage = state.catalog.length ? Math.round((completed.length / state.catalog.length) * 100) : 0;

  elements.completed.textContent = `${completed.length} / ${state.catalog.length}`;
  elements.px.textContent = px;
  elements.inProgress.textContent = inProgress.length;
  elements.categoryStat.textContent = elements.category.value === 'all' ? 'Tutte' : elements.category.value;
  elements.percent.textContent = `${percentage}%`;
  elements.bar.style.width = `${percentage}%`;
}

function makeCard(trophy) {
  const current = trophyState(trophy);
  const fragment = elements.template.content.cloneNode(true);
  const card = fragment.querySelector('.trophy-card');
  const category = fragment.querySelector('.trophy-category');
  const name = fragment.querySelector('.trophy-name');
  const description = fragment.querySelector('.trophy-description');
  const meta = fragment.querySelector('.meta');
  const detailButton = fragment.querySelector('.detail-button');
  const form = fragment.querySelector('.detail-form');
  const status = fragment.querySelector('.status-input');
  const value = fragment.querySelector('.value-input');
  const proof = fragment.querySelector('.proof-input');
  const note = fragment.querySelector('.note-input');

  category.textContent = trophy.category;
  name.textContent = trophy.name;
  description.textContent = trophy.description;
  meta.innerHTML = `Premio: <b>${trophy.px} PX</b> · Stato: ${current.status} · Progresso: ${current.value} / ${trophy.target} ${trophy.unit}`;
  status.value = current.status;
  value.value = current.value;
  proof.value = current.proof;
  note.value = current.note;

  card.classList.toggle('is-complete', current.status === 'Completato');
  card.classList.toggle('is-progress', current.status === 'In progress');

  detailButton.addEventListener('click', () => {
    const hidden = form.hasAttribute('hidden');
    form.toggleAttribute('hidden', !hidden);
    detailButton.textContent = hidden ? 'Chiudi' : 'Dettaglio';
  });

  status.addEventListener('change', () => updateTrophy(trophy.id, { status: status.value }));
  value.addEventListener('change', () => updateTrophy(trophy.id, { value: Math.max(0, Number(value.value) || 0) }));
  proof.addEventListener('change', () => updateTrophy(trophy.id, { proof: proof.value.trim() }));
  note.addEventListener('change', () => updateTrophy(trophy.id, { note: note.value }));

  fragment.querySelector('.decrease').addEventListener('click', () => {
    updateTrophy(trophy.id, { value: Math.max(0, current.value - 1), status: current.status === 'Non iniziato' ? 'In progress' : current.status });
  });

  fragment.querySelector('.increase').addEventListener('click', () => {
    updateTrophy(trophy.id, { value: current.value + 1, status: current.status === 'Non iniziato' ? 'In progress' : current.status });
  });

  return fragment;
}

function render() {
  const trophies = visibleTrophies();
  elements.list.replaceChildren();

  if (!trophies.length) {
    elements.list.innerHTML = '<div class="empty">Nessun trofeo corrisponde alla ricerca o ai filtri.</div>';
  } else {
    trophies.forEach((trophy) => elements.list.append(makeCard(trophy)));
  }

  renderStats();
}

function bindEvents() {
  [elements.search, elements.category, elements.status].forEach((input) => {
    input.addEventListener(input === elements.search ? 'input' : 'change', render);
  });

  elements.exportButton.addEventListener('click', () => exportProgress(state.progress));
  elements.importButton.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', async () => {
    const [file] = elements.importFile.files;
    if (!file) return;
    try {
      state.progress = await importProgress(file);
      saveProgress(state.progress);
      render();
    } catch {
      alert('Il file selezionato non è un backup valido del tracker.');
    } finally {
      elements.importFile.value = '';
    }
  });
}

async function start() {
  try {
    const response = await fetch('data/trofei.json');
    if (!response.ok) throw new Error('Catalogo non disponibile');
    state.catalog = await response.json();
    bindEvents();
    render();
  } catch {
    elements.list.innerHTML = '<div class="empty">Impossibile caricare il catalogo. Avvia il progetto con un server statico o pubblicalo su GitHub Pages.</div>';
  }
}

start();

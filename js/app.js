const state = {
  catalog: [],
  progress: loadProgress()
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  list: $('#trophy-list'),
  template: $('#trophy-template'),
  search: $('#search'),
  category: $('#category-filter'),
  status: $('#status-filter'),
  registrationDate: $('#registration-date'),
  validatedCount: $('#validated-count'),
  confirmedPx: $('#confirmed-px'),
  inProgressCount: $('#progress-count'),
  pendingCount: $('#pending-count'),
  percentage: $('#percentage'),
  barFill: $('#bar-fill'),
  exportButton: $('#export-button'),
  importButton: $('#import-button'),
  importFile: $('#import-file')
};

const deadlineRules = {
  'off-benvenuto-tra-noi-1': { months: 6 },
  'off-benvenuto-tra-noi-2': { months: 12 },
  'off-giovane-promessa-pro': { months: 12 },
  'off-giovane-promessa-top': { months: 12 },
  'off-la-media-e-importante': { months: 3 },
  'off-partenza-col-botto-1': { days: 15 },
  'off-partenza-col-botto-2': { days: 45 },
  'off-piacere-mio': { days: 30 },
  'off-prime-azioni': { days: 30 }
};

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function defaultTrophyState(trophy) {
  return {
    status: 'Non iniziato',
    value: 0,
    validated: false,
    prerequisites: trophy.prerequisites || '',
    proof: '',
    note: ''
  };
}

function getTrophyState(trophy) {
  return {
    ...defaultTrophyState(trophy),
    ...(state.progress.trophies[trophy.id] || {})
  };
}

function hasCounter(trophy) {
  return Number(trophy.target) > 1;
}

function saveTrophy(trophy, changes) {
  const current = getTrophyState(trophy);
  const next = { ...current, ...changes };

  if (hasCounter(trophy) && !next.validated) {
    if (next.value >= Number(trophy.target)) {
      next.status = 'Completato';
    } else if (next.value > 0) {
      next.status = 'In progress';
    } else {
      next.status = 'Non iniziato';
    }
  }

  if (next.validated) {
    next.status = 'Convalidato';
  } else if (next.status === 'Convalidato') {
    next.status = 'Completato';
  }

  if (!['Completato', 'Convalidato'].includes(next.status)) {
    next.validated = false;
  }

  state.progress.trophies[trophy.id] = next;
  saveProgress(state.progress);
  render();
}

function getDeadline(trophy) {
  const rule = deadlineRules[trophy.id];
  if (!rule) return null;

  if (!state.progress.registrationDate) {
    return {
      className: 'deadline-soon',
      message: 'Imposta la data di iscrizione per calcolare la scadenza'
    };
  }

  const deadline = addDate(
    state.progress.registrationDate,
    rule.days || 0,
    rule.months || 0
  );

  const remainingDays = Math.ceil((deadline - new Date()) / 86400000);

  if (remainingDays < 0) {
    return {
      className: 'deadline-expired',
      message: `Scaduto da ${Math.abs(remainingDays)} giorni`
    };
  }

  if (remainingDays === 0) {
    return { className: 'deadline-expired', message: 'Scade oggi' };
  }

  return {
    className: remainingDays <= 7 ? 'deadline-soon' : 'deadline-ok',
    message: `Scade tra ${remainingDays} giorni · ${deadline.toLocaleDateString('it-IT')}`
  };
}

function getVisibleTrophies() {
  const terms = normalize(elements.search.value).split(/\s+/).filter(Boolean);
  const category = elements.category.value;
  const status = elements.status.value;

  return state.catalog.filter((trophy) => {
    const current = getTrophyState(trophy);
    const currentStatus = current.validated ? 'Convalidato' : current.status;
    const searchable = normalize([
      trophy.name,
      trophy.description,
      trophy.prerequisites,
      current.prerequisites,
      trophy.category
    ].join(' '));

    const categoryMatches = category === 'all' || trophy.category === category;
    const statusMatches = status === 'all' || currentStatus === status;
    const searchMatches = terms.every((term) => searchable.includes(term));

    return categoryMatches && statusMatches && searchMatches;
  });
}

function renderStats() {
  const states = state.catalog.map(getTrophyState);
  const validated = states.filter((item) => item.validated).length;
  const completed = states.filter((item) => item.status === 'Completato' && !item.validated).length;
  const inProgress = states.filter((item) => item.status === 'In progress').length;
  const confirmedPx = state.catalog
    .filter((trophy) => getTrophyState(trophy).validated)
    .reduce((total, trophy) => total + Number(trophy.px || 0), 0);
  const percent = state.catalog.length
    ? Math.round((validated / state.catalog.length) * 100)
    : 0;

  elements.validatedCount.textContent = `${validated} / ${state.catalog.length}`;
  elements.confirmedPx.textContent = confirmedPx;
  elements.inProgressCount.textContent = inProgress;
  elements.pendingCount.textContent = completed;
  elements.percentage.textContent = `${percent}%`;
  elements.barFill.style.width = `${percent}%`;
}

function renderCard(trophy) {
  const current = getTrophyState(trophy);
  const counterEnabled = hasCounter(trophy);
  const statusText = current.validated ? 'Convalidato' : current.status;
  const fragment = elements.template.content.cloneNode(true);

  const card = fragment.querySelector('.trophy-card');
  const category = fragment.querySelector('.trophy-category');
  const name = fragment.querySelector('.trophy-name');
  const description = fragment.querySelector('.trophy-description');
  const prerequisiteText = fragment.querySelector('.trophy-prerequisites');
  const deadline = fragment.querySelector('.trophy-deadline');
  const meta = fragment.querySelector('.meta');
  const detailButton = fragment.querySelector('.detail-button');
  const form = fragment.querySelector('.detail-form');
  const statusInput = fragment.querySelector('.status-input');
  const progressField = fragment.querySelector('.progress-field');
  const valueInput = fragment.querySelector('.value-input');
  const validatedInput = fragment.querySelector('.validated-input');
  const prerequisitesInput = fragment.querySelector('.prerequisites-input');
  const proofInput = fragment.querySelector('.proof-input');
  const noteInput = fragment.querySelector('.note-input');

  category.textContent = trophy.category;
  name.textContent = trophy.name;
  description.textContent = trophy.description;
  meta.innerHTML = `Premio: <b>${trophy.px} PX</b> · Stato: ${statusText}${counterEnabled ? ` · Progresso: ${current.value} / ${trophy.target} ${trophy.unit}` : ''}`;

  if (current.prerequisites) {
    prerequisiteText.hidden = false;
    prerequisiteText.textContent = `Prerequisiti: ${current.prerequisites}`;
  }

  const deadlineInfo = getDeadline(trophy);
  if (deadlineInfo) {
    deadline.hidden = false;
    deadline.className = `trophy-deadline ${deadlineInfo.className}`;
    deadline.textContent = deadlineInfo.message;
  }

  statusInput.value = current.status === 'Convalidato' ? 'Completato' : current.status;
  valueInput.value = current.value;
  validatedInput.checked = current.validated;
  validatedInput.disabled = current.status !== 'Completato' && !current.validated;
  prerequisitesInput.value = current.prerequisites;
  proofInput.value = current.proof;
  noteInput.value = current.note;

  if (!counterEnabled) progressField.hidden = true;

  card.classList.toggle('is-progress', statusText === 'In progress');
  card.classList.toggle('is-complete', statusText === 'Completato');
  card.classList.toggle('is-validated', statusText === 'Convalidato');

  detailButton.addEventListener('click', () => {
    const isHidden = form.hasAttribute('hidden');
    form.toggleAttribute('hidden', !isHidden);
    detailButton.textContent = isHidden ? 'Chiudi' : 'Dettaglio';
  });

  statusInput.addEventListener('change', () => saveTrophy(trophy, { status: statusInput.value }));
  valueInput.addEventListener('change', () => saveTrophy(trophy, { value: Math.max(0, Number(valueInput.value) || 0) }));
  validatedInput.addEventListener('change', () => saveTrophy(trophy, { validated: validatedInput.checked }));
  prerequisitesInput.addEventListener('change', () => saveTrophy(trophy, { prerequisites: prerequisitesInput.value.trim() }));
  proofInput.addEventListener('change', () => saveTrophy(trophy, { proof: proofInput.value.trim() }));
  noteInput.addEventListener('change', () => saveTrophy(trophy, { note: noteInput.value }));

  fragment.querySelector('.decrease').addEventListener('click', () => {
    saveTrophy(trophy, { value: Math.max(0, current.value - 1) });
  });

  fragment.querySelector('.increase').addEventListener('click', () => {
    saveTrophy(trophy, { value: current.value + 1 });
  });

  return fragment;
}

function render() {
  const trophies = getVisibleTrophies();
  elements.list.replaceChildren();

  if (!trophies.length) {
    elements.list.innerHTML = '<p class="empty">Nessun trofeo corrisponde a ricerca e filtri.</p>';
  } else {
    trophies.forEach((trophy) => elements.list.append(renderCard(trophy)));
  }

  renderStats();
}

async function start() {
  try {
    const response = await fetch('data/trofei.json');
    if (!response.ok) throw new Error('Catalogo non disponibile');

    state.catalog = await response.json();
    elements.registrationDate.value = state.progress.registrationDate || '';

    elements.search.addEventListener('input', render);
    elements.category.addEventListener('change', render);
    elements.status.addEventListener('change', render);
    elements.registrationDate.addEventListener('change', () => {
      state.progress.registrationDate = elements.registrationDate.value;
      saveProgress(state.progress);
      render();
    });
    elements.exportButton.addEventListener('click', () => exportProgress(state.progress));
    elements.importButton.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', async () => {
      const [file] = elements.importFile.files;
      if (!file) return;
      try {
        state.progress = await importProgress(file);
        elements.registrationDate.value = state.progress.registrationDate || '';
        saveProgress(state.progress);
        render();
      } catch {
        alert('Backup JSON non valido.');
      } finally {
        elements.importFile.value = '';
      }
    });

    render();
  } catch {
    elements.list.innerHTML = '<p class="empty">Impossibile caricare <code>data/trofei.json</code>. Controlla che nome e percorso siano esatti.</p>';
  }
}

start();

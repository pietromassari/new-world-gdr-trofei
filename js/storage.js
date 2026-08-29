const STORAGE_KEY = 'new-world-gdr-trophy-progress';

function emptyProgress() {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    registrationDate: '',
    trophies: {}
  };
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === 'object'
      ? { ...emptyProgress(), ...saved }
      : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

function saveProgress(progress) {
  progress.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function exportProgress(progress) {
  const content = JSON.stringify(progress, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'progresso-trofei.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);

        if (!imported || typeof imported !== 'object' || !imported.trophies || typeof imported.trophies !== 'object') {
          throw new Error('Il file non contiene un backup del tracker valido.');
        }

        resolve({ ...emptyProgress(), ...imported });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Impossibile leggere il file selezionato.'));
    reader.readAsText(file);
  });
}

function addDate(dateText, days = 0, months = 0) {
  const date = new Date(`${dateText}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (months) {
    date.setMonth(date.getMonth() + months);
  }

  if (days) {
    date.setDate(date.getDate() + days);
  }

  return date;
}

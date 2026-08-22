const STORAGE_KEY = 'new-world-gdr-trophy-progress';

function defaultProgress() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    trophies: {}
  };
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === 'object' ? { ...defaultProgress(), ...saved } : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

function saveProgress(progress) {
  progress.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function exportProgress(progress) {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'progresso-trofei.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!imported || typeof imported !== 'object' || typeof imported.trophies !== 'object') {
          throw new Error('Formato non valido');
        }
        resolve({ ...defaultProgress(), ...imported });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

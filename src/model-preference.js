export const MODEL_STORAGE_KEY = 'anestesiahelppi.local-ai.model.v1';

export function restoreModel(allowed, fallback, getStorage = () => window.localStorage) {
  try {
    const saved = getStorage().getItem(MODEL_STORAGE_KEY);
    return { model: allowed.includes(saved) ? saved : fallback, available: true };
  } catch {
    return { model: fallback, available: false };
  }
}

export function saveModel(model, allowed, getStorage = () => window.localStorage) {
  if (!allowed.includes(model)) return false;
  try {
    getStorage().setItem(MODEL_STORAGE_KEY, model);
    return true;
  } catch {
    return false;
  }
}

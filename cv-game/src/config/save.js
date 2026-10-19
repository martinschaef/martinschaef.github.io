// Save game in localStorage: the run's registry values plus the level you were in.
// A save is written when a level starts and whenever a quest flag changes. Picked-up
// papers and squashed bugs are flags too, so they stay gone after CONTINUE.

const SAVE_KEY = 'careerQuest.save.v1';
const FIELDS = ['flags', 'papersFound', 'bugsSquashed', 'maxHp', 'chips'];

// Default values for a fresh run
export const NEW_RUN = { flags: {}, papersFound: 0, bugsSquashed: 0, maxHp: 3, chips: 0 };

// localStorage can be missing or throw (private mode, file://, storage full); saving is best-effort
const storage = () => { try { return window.localStorage; } catch { return null; } };

export function writeSave(registry, scene) {
    const s = storage();
    if (!s || !scene) return;
    const data = { scene, savedAt: Date.now() };
    FIELDS.forEach(f => { data[f] = registry.get(f); });
    try { s.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* best-effort */ }
}

export function readSave() {
    const s = storage();
    if (!s) return null;
    try {
        const data = JSON.parse(s.getItem(SAVE_KEY));
        return data && typeof data.scene === 'string' && data.flags && typeof data.flags === 'object' ? data : null;
    } catch { return null; }
}

export function clearSave() {
    const s = storage();
    try { if (s) s.removeItem(SAVE_KEY); } catch { /* best-effort */ }
}

// Put a run's values into the registry: a save to continue, or NEW_RUN for a fresh start
export function loadRun(registry, data) {
    FIELDS.forEach(f => registry.set(f, f === 'flags' ? { ...(data.flags || {}) } : (data[f] ?? NEW_RUN[f])));
}

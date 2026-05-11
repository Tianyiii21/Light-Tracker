export type Mood = "clear" | "soft" | "heavy" | "quiet";

export interface JournalEntry {
  id: string;
  date: string; // ISO string
  mood: Mood;
  gratitudes: string[];
  lanternColor: string;
  closingLine?: string; // AI-generated closing line, saved after release
}

const STORAGE_KEY = "i-see-the-light-entries";

export const getMoodColor = (mood: Mood): string => {
  switch (mood) {
    case "clear": return "rgb(215,165,75)";
    case "soft": return "rgb(175,155,215)";
    case "heavy": return "rgb(120,130,205)";
    case "quiet": return "rgb(210,155,155)";
    default: return "rgb(215,165,75)";
  }
};

export const loadEntries = (): JournalEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load entries", e);
    return [];
  }
};

export const saveEntry = (entry: JournalEntry) => {
  try {
    const entries = loadEntries();
    entries.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Failed to save entry", e);
  }
};

/** Update the closingLine on an existing entry by id. */
export const updateEntryClosingLine = (id: string, closingLine: string) => {
  try {
    const entries = loadEntries();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx !== -1) {
      entries[idx] = { ...entries[idx], closingLine };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  } catch (e) {
    console.error("Failed to update closing line", e);
  }
};

/** Returns true if the user has already released a lantern today. */
export const hasReleasedToday = (): boolean => {
  const entries = loadEntries();
  const today = new Date().toDateString();
  return entries.some((e) => new Date(e.date).toDateString() === today);
};

/** Returns today's entry, or null if none exists. */
export const getTodayEntry = (): JournalEntry | null => {
  const entries = loadEntries();
  const today = new Date().toDateString();
  return entries.find((e) => new Date(e.date).toDateString() === today) ?? null;
};

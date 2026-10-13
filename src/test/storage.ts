/** In-memory browser storage for mock-only tests (including Node 26 runners). */
export function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(String(key)) ?? null,
    setItem: (key, value) => { values.set(String(key), String(value)); },
    removeItem: key => { values.delete(String(key)); },
    key: index => Array.from(values.keys())[index] ?? null,
  };
}

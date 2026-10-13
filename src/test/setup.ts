import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom does not implement localStorage/sessionStorage natively; provide a
// minimal in-memory implementation so services that persist state (auth token,
// student list) can be exercised in tests.
function makeStorage(): Storage {
  const map = new Map<string, string>();
  const s: Storage = {
    get length() {
      return map.size;
    },
    key(i: number) {
      return [...map.keys()][i] ?? null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
  };
  return s;
}

Object.defineProperty(window, "localStorage", {
  writable: true,
  configurable: true,
  value: makeStorage(),
});
Object.defineProperty(window, "sessionStorage", {
  writable: true,
  configurable: true,
  value: makeStorage(),
});

// Stand-ins for the native modules, so the session, API and schedule code can
// run in Node for src/lib/races.check.ts. `useSyncExternalStore` returns the
// current snapshot, which lets the check read the stores outside React.
import { registerHooks } from "node:module";

const STUBS = {
  react: "export const useSyncExternalStore = (subscribe, getSnapshot) => getSnapshot();",
  "react-native": "export const Platform = { OS: 'web' };",
  "expo-file-system": "export class File {}\nexport const Paths = {};",
  "expo-secure-store": [
    "export const getItemAsync = async () => null;",
    "export const setItemAsync = async () => {};",
    "export const deleteItemAsync = async () => {};",
  ].join("\n"),
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in STUBS) return { url: `stub:${specifier}`, format: "module", shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("stub:")) {
      return { format: "module", source: STUBS[url.slice(5)], shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

// On "web" the session keeps its token in localStorage.
const items = new Map();
globalThis.localStorage = {
  getItem: (key) => items.get(key) ?? null,
  setItem: (key, value) => items.set(key, String(value)),
  removeItem: (key) => items.delete(key),
};
process.env.EXPO_PUBLIC_API_URL = "http://gym.test";

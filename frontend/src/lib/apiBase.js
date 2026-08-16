// Where the API lives, on its own so nothing has to import a module that
// imports it back.
//
// This used to be declared in `services/api.js`, which was fine while that file
// was the bottom of the graph. #141 gave `lib/tokens.js` a refresh call of its
// own, and `services/api.js` needs `lib/tokens.js` for the interceptors — a
// cycle that happens to work, because both sides only read the other's bindings
// inside a callback, and would stop working the first time somebody moved a
// read to module scope. One constant in one leaf module is cheaper than that
// trap.
//
// `services/api.js` re-exports it, so `API_BASE_URL` can still be imported from
// there and every existing caller is unchanged.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/';

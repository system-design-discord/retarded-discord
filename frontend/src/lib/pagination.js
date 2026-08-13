// Every list endpoint in this API is paginated — DRF's PageNumberPagination with
// PAGE_SIZE 50 — so the body is `{count, next, previous, results}` and never a
// bare array. Reading it as an array is issue #77, which four components hit
// independently. One helper, so the fifth cannot.

/**
 * The rows out of a list response, whether or not it is paginated.
 *
 * Tolerates an un-paginated body on purpose: a few endpoints answer with a
 * plain object or array (the permission read, for one), and a caller should not
 * have to know which kind it is talking to.
 */
export function unwrapList(response) {
  const body = response?.data;
  if (Array.isArray(body)) return body;
  return body?.results ?? [];
}

/**
 * Every row across every page, in order.
 *
 * A chat that renders `results` alone shows the first 50 messages and silently
 * loses the rest — and because `Message.Meta.ordering` is `created_at` ascending,
 * the 50 it keeps are the *oldest*, so the conversation appears frozen in the
 * past. Following `next` is what makes "a page refresh shows the full history"
 * true rather than nearly true.
 *
 * `maxPages` is a guard, not a feature: it stops a runaway loop if the server
 * ever returns a `next` that points at itself.
 */
export async function fetchAllPages(client, url, { params, maxPages = 20 } = {}) {
  const rows = [];
  let response = await client.get(url, { params });

  for (let page = 0; page < maxPages; page += 1) {
    rows.push(...unwrapList(response));

    const next = response?.data?.next;
    if (!next) break;

    // `next` is an absolute URL built by DRF from the incoming request, so it
    // already carries the query string. Handing axios the whole thing would
    // stack it onto baseURL; the path and search are what we want.
    const { pathname, search } = new URL(next, window.location.origin);
    response = await client.get(`${pathname}${search}`, { baseURL: '' });
  }

  return rows;
}

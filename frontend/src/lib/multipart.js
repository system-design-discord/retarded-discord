/**
 * One rule for "this write might be carrying a file".
 *
 * Three screens now edit an image — the profile, a group and a channel — and
 * all three PATCH a body whose `avatar` is either a `File` the user just picked
 * or a value that has nothing to do with files. Sending JSON with a `File` in
 * it silently stores nothing; sending multipart for a plain rename turns every
 * other field into a string.
 *
 * So the decision is made once, here, and the three services ask rather than
 * each carrying their own copy of the `instanceof File` branch — #104 is the
 * cautionary tale about a half-wired upload.
 *
 * Never set `Content-Type` by hand alongside a `FormData`: the browser has to
 * write the multipart boundary, and naming the type strips it.
 */

/** True when `body` carries a `File` under any key. */
export function hasFile(body) {
  return Object.values(body ?? {}).some((value) => value instanceof File);
}

/**
 * `body` unchanged when it carries no file, otherwise the same fields as
 * `FormData`. `undefined` and `null` are dropped rather than sent as the
 * strings "undefined" and "null", which is what multipart would make of them.
 */
export function toRequestBody(body) {
  if (!hasFile(body)) return body;

  const form = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, value);
  });
  return form;
}

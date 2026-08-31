/**
 * Normalize service base URLs.
 *
 * Accepts either full URLs ("http://ai-interview:8001") or bare hostnames
 * ("preppilot-ai-interview.onrender.com" — what Render's `fromService`
 * `property: host` yields) and always returns a scheme-prefixed, trailing-
 * slash-free base URL suitable for appending endpoint paths.
 */
const normalizeUrl = (raw, defaultScheme = 'https') => {
  if (!raw) return '';
  let url = String(raw).trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = `${defaultScheme}://${url}`;
  return url;
};

const aiUrl = (envVar) => normalizeUrl(process.env[envVar]);

module.exports = { normalizeUrl, aiUrl };

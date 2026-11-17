import { PAGINATION } from './constants.js';

export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function buildPaginatedResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function buildSearchClause(fields, searchTerm) {
  if (!searchTerm || !fields.length) return { clause: '', params: [] };
  const conditions = fields.map((f) => `${f} LIKE ?`).join(' OR ');
  const params = fields.map(() => `%${searchTerm}%`);
  return { clause: `(${conditions})`, params };
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

export function replaceTemplatePlaceholders(template, data) {
  let result = template;
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value ?? '');
  });
  // Any placeholder with no matching key (e.g. a custom authority_type or faculty role
  // that isn't assigned for this particular course) is blanked rather than left as raw
  // {{...}} text — matches docxtemplater's nullGetter behavior on the DOCX pipeline, so
  // a template referencing an authority/faculty placeholder degrades gracefully instead
  // of visibly breaking whenever that specific signatory isn't present.
  return result.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '');
}

export async function generateCertificateNumber(prefix = 'CERT') {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}/${year}/${random}`;
}

/** Turns a free-text label into a lowercase_underscore key (e.g. for dynamic template placeholders). */
export function slugify(label) {
  return String(label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** Strips characters unsafe for filenames/ZIP entry paths (used by bulk certificate downloads). */
export function sanitizeFilename(name) {
  return String(name || 'unnamed')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'unnamed';
}

/** Escapes text so it matches literally inside a regular expression. */
export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive "contains" pattern for a user's search text. */
export const searchPattern = (text: string) => new RegExp(escapeRegExp(text), 'i');

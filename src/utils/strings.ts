/**
 * Converts a string to kebab-case format
 * @param str - The string to convert
 * @returns The kebab-case version of the string
 * @example
 * toKebabCase("Push-ups") // returns "push-ups"
 * toKebabCase("Bench Press") // returns "bench-press"
 */
export const toKebabCase = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

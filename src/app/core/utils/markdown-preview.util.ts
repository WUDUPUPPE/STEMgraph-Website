/**
 * Macht aus einem README (Markdown) einen kurzen Fließtext für die Vorschau.
 * Die erste Zeile (Überschrift) wird übersprungen, Markdown-Zeichen entfernt.
 */
export function toPreviewText(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .slice(1)
    .join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

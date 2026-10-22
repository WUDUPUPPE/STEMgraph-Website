/**
 * Gibt jedem Keyword eine eigene Farbe.
 * Die Farbe wird aus den Buchstaben des Keywords berechnet, deshalb hat
 * dasselbe Keyword überall (Graph, Liste, Tooltip) immer dieselbe Farbe.
 */

const SATURATION = 75;
const LIGHTNESS = 62;

/** Farbton (0-360) für ein Keyword. */
export function KeywordHue(keyword: string): number {
  const text = keyword.toLowerCase().trim();
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  // goldener Winkel -> ähnliche Wörter bekommen trotzdem gut unterscheidbare Farben
  return Math.round(Math.abs(hash * 137.508) % 360);
}

/** Farbe als CSS-Wert, z. B. für Text. */
export function KeywordColor(keyword: string): string {
  return `hsl(${KeywordHue(keyword)}, ${SATURATION}%, ${LIGHTNESS}%)`;
}

/** Durchsichtige Variante, z. B. als Hintergrund der Keyword-Chips. */
export function KeywordBackground(keyword: string): string {
  return `hsla(${KeywordHue(keyword)}, ${SATURATION}%, ${LIGHTNESS}%, 0.2)`;
}

/** Sättigung und Helligkeit als Wert von 0 bis 1 (für three.js). */
export const Keyword_Saturation = SATURATION / 100;
export const Keyword_Lightness = LIGHTNESS / 100;
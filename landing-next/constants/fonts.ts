// Hebrew fonts from Google Fonts

export interface HebrewFont {
  id: string;
  name: string; // Google Fonts family name
  label: string; // Display label in Hebrew
  category: 'sans-serif' | 'serif' | 'display';
  weights: number[];
}

export const HEBREW_FONTS: HebrewFont[] = [
  // Sans-Serif fonts
  {
    id: 'heebo',
    name: 'Heebo',
    label: 'Heebo - מודרני',
    category: 'sans-serif',
    weights: [400, 500, 700],
  },
  {
    id: 'rubik',
    name: 'Rubik',
    label: 'Rubik - עגול',
    category: 'sans-serif',
    weights: [400, 500, 700],
  },
  {
    id: 'assistant',
    name: 'Assistant',
    label: 'Assistant - קל',
    category: 'sans-serif',
    weights: [400, 500, 700],
  },
  {
    id: 'noto-sans-hebrew',
    name: 'Noto Sans Hebrew',
    label: 'Noto Sans Hebrew - ניטרלי',
    category: 'sans-serif',
    weights: [400, 500, 700],
  },
  {
    id: 'varela-round',
    name: 'Varela Round',
    label: 'Varela Round - רך',
    category: 'sans-serif',
    weights: [400], // Only regular weight available
  },
  {
    id: 'alef',
    name: 'Alef',
    label: 'Alef - קלאסי',
    category: 'sans-serif',
    weights: [400, 700],
  },
  // Serif fonts
  {
    id: 'frank-ruhl-libre',
    name: 'Frank Ruhl Libre',
    label: 'Frank Ruhl Libre - אלגנטי',
    category: 'serif',
    weights: [400, 500, 700],
  },
  {
    id: 'david-libre',
    name: 'David Libre',
    label: 'David Libre - קלאסי',
    category: 'serif',
    weights: [400, 500, 700],
  },
  // Display fonts
  {
    id: 'secular-one',
    name: 'Secular One',
    label: 'Secular One - בולט',
    category: 'display',
    weights: [400], // Only regular weight available
  },
  {
    id: 'suez-one',
    name: 'Suez One',
    label: 'Suez One - דרמטי',
    category: 'display',
    weights: [400], // Only regular weight available
  },
];

// Get font by ID
export function getFontById(id: string): HebrewFont | undefined {
  return HEBREW_FONTS.find((font) => font.id === id);
}

// Get font by name
export function getFontByName(name: string): HebrewFont | undefined {
  return HEBREW_FONTS.find((font) => font.name === name);
}

// Build Google Fonts URL for a specific font
export function buildGoogleFontUrl(fontName: string, weights: number[] = [400, 500, 700]): string {
  const font = getFontByName(fontName);
  const actualWeights = font ? font.weights.filter((w) => weights.includes(w)) : weights;
  const weightParam = actualWeights.join(';');
  const familyParam = fontName.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightParam}&display=swap`;
}

// Default font
export const DEFAULT_FONT = HEBREW_FONTS[0]; // Heebo

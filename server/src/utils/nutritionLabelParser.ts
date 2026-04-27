export interface ParsedNutrition {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

const KJ_TO_KCAL = 4.184;

function firstNumber(line: string): number | null {
  const match = line.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

function findLine(lines: string[], pattern: RegExp): string | undefined {
  return lines.find((l) => pattern.test(l));
}

function extractCalories(lines: string[]): number | null {
  const energyIndex = lines.findIndex((l) => /energy/i.test(l));
  if (energyIndex === -1) return null;

  // Search the energy line and the next line for Cal/kcal first
  const candidates = [lines[energyIndex], lines[energyIndex + 1]].filter(Boolean);
  for (const line of candidates) {
    const calMatch = line.match(/(\d+\.?\d*)\s*(?:cal|kcal)\b/i);
    if (calMatch) return parseFloat(calMatch[1]);
  }

  // Fall back to kJ conversion. OCR sometimes misreads 'J' as ')' and may drop the 'k'
  // from the per-serve value while keeping it on the per-100g value. The per-serve kJ
  // is always the first number on the energy line, so use that when any kJ marker is present.
  const energyLine = lines[energyIndex];
  if (/k[J)]/i.test(energyLine)) {
    const firstNum = firstNumber(energyLine);
    if (firstNum) return Math.round(firstNum / KJ_TO_KCAL);
  }

  return null;
}

// When OCR drops decimal points, macro values end up 10x too large (e.g. 10.7g -> 107).
// Cross-checking against the parsed calorie total reveals this: if estimated calories
// from macros are more than 2x the label calories, divide any macro >= 100 by 10.
function correctDroppedDecimals(result: ParsedNutrition): ParsedNutrition {
  const { calories, protein, fat, carbs } = result;
  if (!calories) return result;

  const estimated = (protein ?? 0) * 4 + (fat ?? 0) * 9 + (carbs ?? 0) * 4;
  if (estimated <= calories * 2) return result;

  const fix = (v: number | null) => (v !== null && v >= 100 ? parseFloat((v / 10).toFixed(1)) : v);

  return { calories, protein: fix(protein), fat: fix(fat), carbs: fix(carbs) };
}

export function parseNutritionLabel(text: string): ParsedNutrition {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const proteinLine = findLine(lines, /^protein\b/i);
  const fatLine = findLine(lines, /^fat[,\s]/i) ?? findLine(lines, /^fat\b/i);
  const carbLine = findLine(lines, /^carbohydrate/i);

  const raw: ParsedNutrition = {
    calories: extractCalories(lines),
    protein: proteinLine ? firstNumber(proteinLine) : null,
    fat: fatLine ? firstNumber(fatLine) : null,
    carbs: carbLine ? firstNumber(carbLine) : null,
  };

  return correctDroppedDecimals(raw);
}

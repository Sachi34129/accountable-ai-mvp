// Minimal deterministic CSV parser for v1 ingestion.
// Notes:
// - This is strict and supports commas inside quoted fields.
// - If the input is ambiguous, we reject instead of guessing.

export function parseCsvStrict(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) throw new Error('CSV must include header + at least 1 row');

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    if (inQuotes) throw new Error('CSV contains an unterminated quote');
    return out;
  };

  const headers = parseLine(lines[0]!).map((h) => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map((l) => parseLine(l).map((v) => v.replace(/^"|"$/g, '').trim()));
  return { headers, rows };
}



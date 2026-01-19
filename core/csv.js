import { safeTrim } from './utils';

function normalizeHeader(header) {
  return safeTrim(header).replace(/\s+/g, ' ');
}

export function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  while (rows.length > 0 && rows[rows.length - 1].every((x) => safeTrim(x) === '')) {
    rows.pop();
  }

  return rows;
}

export function rowsToObjects(rows) {
  if (!rows || rows.length === 0) return { headers: [], objects: [] };

  const headers = rows[0].map(normalizeHeader);

  const objects = rows.slice(1).map((row, idx) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    obj.__rowIndex = idx + 2;
    return obj;
  });

  const hasTitle = headers.includes('Title');
  const cleaned = hasTitle
    ? objects.filter((o) => safeTrim(o.Title) !== '')
    : objects;

  return { headers, objects: cleaned };
}

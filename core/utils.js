export function safeTrim(value) {
  return (value ?? '').toString().trim();
}

export function prettyJSON(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export function computeCoverage(headers, rows) {
  const cov = {};
  (headers || []).forEach((h) => {
    let filled = 0;
    for (const r of rows || []) {
      if (safeTrim(r?.[h]) !== '') filled++;
    }
    const total = (rows || []).length;
    cov[h] = {
      filled,
      total,
      pct: total ? Math.round((filled / total) * 100) : 0,
    };
  });
  return cov;
}

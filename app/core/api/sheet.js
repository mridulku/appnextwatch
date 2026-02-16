import { useEffect, useState } from 'react';
import { parseCSV, rowsToObjects } from '../utils/csv';

export function useSheet(csvUrl) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  async function reload() {
    setStatus('loading');
    setError('');

    try {
      const url = (csvUrl || '').trim();
      if (!url) throw new Error('Missing CSV URL');

      const res = await fetch(url);
      if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);

      const text = await res.text();
      const rowsArr = parseCSV(text);
      const { headers: h, objects } = rowsToObjects(rowsArr);

      setHeaders(h);
      setRows(objects);
      setLastFetchedAt(new Date());
      setStatus('ok');
    } catch (e) {
      setHeaders([]);
      setRows([]);
      setStatus('error');
      setError(e?.message || 'Failed to load sheet');
    }
  }

  useEffect(() => {
    if ((csvUrl || '').trim()) reload();
  }, [csvUrl]);

  return { headers, rows, status, error, lastFetchedAt, reload };
}

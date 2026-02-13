const WIKI_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

export function getWikiTitleFromUrl(url) {
  if (!url) return '';
  try {
    const match = url.match(/\/wiki\/(.+)$/i);
    if (!match) return '';
    return decodeURIComponent(match[1].replace(/_/g, ' '));
  } catch (error) {
    return '';
  }
}

export async function fetchWikiSummary(title) {
  if (!title) return null;
  try {
    const response = await fetch(`${WIKI_SUMMARY_URL}${encodeURIComponent(title)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

export function extractWikiImage(summary) {
  return summary?.originalimage?.source || summary?.thumbnail?.source || '';
}

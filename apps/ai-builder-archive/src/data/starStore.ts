import type { DigestSnippet, StarredSnippet } from "../types/archive";

const STAR_STORAGE_KEY = "ai-builder-archive.starred.v1";

function readStoredStars(): StarredSnippet[] {
  try {
    const raw = window.localStorage.getItem(STAR_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StarredSnippet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredStars(stars: StarredSnippet[]) {
  window.localStorage.setItem(STAR_STORAGE_KEY, JSON.stringify(stars));
}

export function loadStarredSnippets() {
  return readStoredStars().sort(
    (left, right) =>
      new Date(right.starredAt).getTime() - new Date(left.starredAt).getTime(),
  );
}

export function isSnippetStarred(snippetId: string, stars: StarredSnippet[]) {
  return stars.some((star) => star.snippet.id === snippetId);
}

export function toggleSnippetStar(
  snippet: DigestSnippet,
  stars: StarredSnippet[],
) {
  const exists = isSnippetStarred(snippet.id, stars);
  const nextStars = exists
    ? stars.filter((star) => star.snippet.id !== snippet.id)
    : [{ snippet, starredAt: new Date().toISOString() }, ...stars];

  writeStoredStars(nextStars);
  return loadStarredSnippets();
}

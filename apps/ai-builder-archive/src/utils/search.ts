import type { DigestSnippet, SourceFilter } from "../types/archive";

export function matchesSnippet(
  snippet: DigestSnippet,
  query: string,
  sourceFilter: SourceFilter,
) {
  if (sourceFilter !== "all" && snippet.sourceType !== sourceFilter) {
    return false;
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const searchable = [
    snippet.title,
    snippet.takeaway,
    snippet.summary,
    snippet.sourceName,
    snippet.authorName ?? "",
    snippet.tags.join(" "),
    snippet.entities.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return normalizedQuery
    .split(/\s+/)
    .every((part) => searchable.includes(part));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

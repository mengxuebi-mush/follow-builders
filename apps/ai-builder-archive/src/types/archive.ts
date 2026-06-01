export type SourceType = "x" | "podcast" | "blog";

export type DigestSnippet = {
  id: string;
  date: string;
  sourceType: SourceType;
  sourceName: string;
  authorName?: string;
  title: string;
  takeaway: string;
  summary: string;
  url: string;
  publishedAt?: string;
  tags: string[];
  entities: string[];
  createdAt: string;
};

export type ArchiveDay = {
  schemaVersion: 1;
  date: string;
  generatedAt: string;
  feedGeneratedAt?: string;
  snippets: DigestSnippet[];
};

export type ArchiveDaySummary = {
  date: string;
  title: string;
  snippetCount: number;
  sourceCounts: Record<SourceType, number>;
  generatedAt: string;
};

export type ArchiveManifest = {
  schemaVersion: 1;
  days: ArchiveDaySummary[];
};

export type SearchIndex = {
  schemaVersion: 1;
  generatedAt: string;
  snippets: DigestSnippet[];
};

export type SourceFilter = "all" | SourceType;

export type StarredSnippet = {
  snippet: DigestSnippet;
  starredAt: string;
};

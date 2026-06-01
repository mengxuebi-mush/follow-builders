import type {
  ArchiveDay,
  ArchiveDaySummary,
  ArchiveManifest,
  DigestSnippet,
  SearchIndex,
  SourceFilter,
} from "../types/archive";
import { matchesSnippet } from "../utils/search";

export type SearchOptions = {
  query?: string;
  sourceFilter?: SourceFilter;
};

export interface ArchiveRepository {
  listDays(): Promise<ArchiveDaySummary[]>;
  getDay(date: string): Promise<ArchiveDay | null>;
  searchSnippets(options: SearchOptions): Promise<DigestSnippet[]>;
  getSnippetById(id: string): Promise<DigestSnippet | null>;
}

export class JsonArchiveRepository implements ArchiveRepository {
  private manifest?: ArchiveManifest;
  private searchIndex?: SearchIndex;
  private days = new Map<string, ArchiveDay>();

  constructor(private readonly basePath = "/archive") {}

  async listDays() {
    const manifest = await this.loadManifest();
    return manifest.days;
  }

  async getDay(date: string) {
    if (this.days.has(date)) {
      return this.days.get(date) ?? null;
    }

    try {
      const response = await fetch(`${this.basePath}/days/${date}.json`, {
        cache: "no-cache",
      });

      if (!response.ok) {
        return null;
      }

      const day = (await response.json()) as ArchiveDay;
      this.days.set(date, day);
      return day;
    } catch {
      return null;
    }
  }

  async searchSnippets({ query = "", sourceFilter = "all" }: SearchOptions) {
    const index = await this.loadSearchIndex();
    return index.snippets.filter((snippet) =>
      matchesSnippet(snippet, query, sourceFilter),
    );
  }

  async getSnippetById(id: string) {
    const index = await this.loadSearchIndex();
    return index.snippets.find((snippet) => snippet.id === id) ?? null;
  }

  private async loadManifest() {
    if (this.manifest) {
      return this.manifest;
    }

    const response = await fetch(`${this.basePath}/manifest.json`, {
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error("Archive manifest could not be loaded.");
    }

    this.manifest = (await response.json()) as ArchiveManifest;
    return this.manifest;
  }

  private async loadSearchIndex() {
    if (this.searchIndex) {
      return this.searchIndex;
    }

    const response = await fetch(`${this.basePath}/search-index.json`, {
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error("Archive search index could not be loaded.");
    }

    this.searchIndex = (await response.json()) as SearchIndex;
    return this.searchIndex;
  }
}

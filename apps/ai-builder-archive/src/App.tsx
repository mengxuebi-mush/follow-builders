import { useEffect, useMemo, useState } from "react";
import { ArchiveNav } from "./components/ArchiveNav";
import { EmptyState } from "./components/EmptyState";
import { FilterBar } from "./components/FilterBar";
import { InsightCard } from "./components/InsightCard";
import { SourceFilterBar } from "./components/SourceFilterBar";
import { JsonArchiveRepository } from "./data/archiveRepository";
import {
  isSnippetStarred,
  loadStarredSnippets,
  toggleSnippetStar,
} from "./data/starStore";
import type {
  ArchiveDay,
  ArchiveDaySummary,
  DigestSnippet,
  SourceFilter,
  StarredSnippet,
} from "./types/archive";
import { matchesSnippet } from "./utils/search";

const repository = new JsonArchiveRepository();
const NAV_COLLAPSED_STORAGE_KEY = "ai-builder-archive.nav-collapsed.v1";

function App() {
  const [days, setDays] = useState<ArchiveDaySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<ArchiveDay | null>(null);
  const [activeView, setActiveView] = useState<"day" | "starred">("day");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [searchResults, setSearchResults] = useState<DigestSnippet[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [stars, setStars] = useState<StarredSnippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(() => {
    try {
      return localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let isMounted = true;

    async function loadArchive() {
      try {
        const nextDays = await repository.listDays();
        if (!isMounted) {
          return;
        }

        setDays(nextDays);
        setSelectedDate(nextDays[0]?.date ?? null);
        setStars(loadStarredSnippets());
      } catch (archiveError) {
        setError(
          archiveError instanceof Error
            ? archiveError.message
            : "Archive could not be loaded.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadArchive();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        NAV_COLLAPSED_STORAGE_KEY,
        String(isNavCollapsed),
      );
    } catch {
      // Ignore storage failures; the rail remains usable for the session.
    }
  }, [isNavCollapsed]);

  useEffect(() => {
    let isMounted = true;

    async function loadSelectedDay() {
      if (!selectedDate) {
        setSelectedDay(null);
        return;
      }

      const day = await repository.getDay(selectedDate);
      if (isMounted) {
        setSelectedDay(day);
      }
    }

    loadSelectedDay();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const selectedSummary = days.find((day) => day.date === selectedDate);
  const isSearching = query.trim().length > 0;

  useEffect(() => {
    let isMounted = true;

    async function runGlobalSearch() {
      if (!isSearching) {
        setSearchResults([]);
        setIsSearchLoading(false);
        return;
      }

      setIsSearchLoading(true);
      try {
        const results = await repository.searchSnippets({
          query,
          sourceFilter: "all",
        });
        if (isMounted) {
          setSearchResults(results);
        }
      } finally {
        if (isMounted) {
          setIsSearchLoading(false);
        }
      }
    }

    runGlobalSearch();

    return () => {
      isMounted = false;
    };
  }, [isSearching, query]);

  const sourceFilterBaseSnippets = useMemo(() => {
    if (isSearching) {
      return searchResults;
    }

    return activeView === "starred"
      ? stars.map((star) => star.snippet)
      : selectedDay?.snippets ?? [];
  }, [activeView, isSearching, searchResults, selectedDay, stars]);

  const sourceFilterCounts = useMemo(
    () =>
      sourceFilterBaseSnippets.reduce<Record<SourceFilter, number>>(
        (counts, snippet) => {
          counts.all += 1;
          counts[snippet.sourceType] += 1;
          return counts;
        },
        { all: 0, x: 0, podcast: 0, blog: 0 },
      ),
    [sourceFilterBaseSnippets],
  );

  const visibleSnippets = useMemo(() => {
    return sourceFilterBaseSnippets.filter((snippet) =>
      matchesSnippet(snippet, "", sourceFilter),
    );
  }, [sourceFilterBaseSnippets, sourceFilter]);

  function handleSelectDay(date: string) {
    setSelectedDate(date);
    setActiveView("day");
    setQuery("");
  }

  function handleToggleStar(snippet: DigestSnippet) {
    setStars((currentStars) => toggleSnippetStar(snippet, currentStars));
  }

  return (
    <main
      className={`app-shell ${
        isNavCollapsed ? "app-shell--rail-collapsed" : ""
      }`}
    >
      <ArchiveNav
        days={days}
        selectedDate={selectedDate}
        activeView={activeView}
        isCollapsed={isNavCollapsed}
        query={query}
        starredCount={stars.length}
        onQueryChange={setQuery}
        onSelectDay={handleSelectDay}
        onToggleCollapsed={() => setIsNavCollapsed((isCollapsed) => !isCollapsed)}
        onShowStarred={() => {
          setActiveView("starred");
          setQuery("");
        }}
      />

      <section className="reading-pane">
        <div className="mobile-topbar">
          <select
            aria-label="Select archive day"
            value={selectedDate ?? ""}
            onChange={(event) => handleSelectDay(event.target.value)}
          >
            {days.map((day) => (
              <option key={day.date} value={day.date}>
                {day.title}
              </option>
            ))}
          </select>
          <button
            className={activeView === "starred" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("starred")}
          >
            ★ {stars.length}
          </button>
          <label className="nav-search nav-search--mobile">
            <span>Search all archives</span>
            <input
              type="search"
              value={query}
              placeholder="Search all archives..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <FilterBar
          selectedDay={selectedSummary}
          activeView={activeView}
          isSearching={isSearching}
          query={query}
          visibleCount={visibleSnippets.length}
        />

        <SourceFilterBar
          counts={sourceFilterCounts}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
        />

        {isLoading ? (
          <EmptyState
            title="Loading the archive"
            body="The latest digest issue is being pulled from local archive files."
          />
        ) : error ? (
          <EmptyState title="Archive unavailable" body={error} />
        ) : days.length === 0 ? (
          <EmptyState
            title="No archive yet"
            body="Run the daily capture once to create the first issue."
          />
        ) : isSearching && isSearchLoading ? (
          <EmptyState
            title="Searching the archive"
            body="Looking across every saved issue and source type."
          />
        ) : activeView === "starred" && !isSearching && stars.length === 0 ? (
          <EmptyState
            title="No starred insights"
            body="Star the insights worth revisiting and they will collect here."
          />
        ) : visibleSnippets.length === 0 ? (
          <EmptyState
            title="No matching insights"
            body={
              isSearching
                ? "Search runs across all archived issues. Try a broader phrase or switch the source filter."
                : "Try a broader search or switch the source filter."
            }
          />
        ) : (
          <div className="snippet-stack" aria-label="Digest insights">
            {visibleSnippets.map((snippet) => (
              <InsightCard
                key={snippet.id}
                snippet={snippet}
                isStarred={isSnippetStarred(snippet.id, stars)}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;

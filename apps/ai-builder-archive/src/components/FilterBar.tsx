import type { ArchiveDaySummary } from "../types/archive";

type FilterBarProps = {
  selectedDay?: ArchiveDaySummary;
  activeView: "day" | "starred";
  isSearching: boolean;
  query: string;
  visibleCount: number;
};

const issueDateFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatInsightCount(count: number) {
  return `${count} visible ${count === 1 ? "insight" : "insights"}`;
}

export function FilterBar({
  selectedDay,
  activeView,
  isSearching,
  query,
  visibleCount,
}: FilterBarProps) {
  const heading = isSearching
    ? "Search results"
    : activeView === "starred"
      ? "Starred insights"
      : selectedDay
        ? `${issueDateFormatter.format(new Date(`${selectedDay.date}T12:00:00`))} Digest`
        : "Latest briefing";
  const eyebrow = isSearching
    ? "All archives"
    : activeView === "starred"
      ? "Saved reading"
      : null;
  const countLabel = isSearching
    ? `${visibleCount} matches for "${query.trim()}"`
    : formatInsightCount(visibleCount);

  return (
    <div className="filter-panel">
      <div className="issue-heading">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{heading}</h2>
        <p>{countLabel}</p>
      </div>
    </div>
  );
}

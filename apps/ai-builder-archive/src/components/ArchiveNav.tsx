import type { ArchiveDaySummary } from "../types/archive";

type ArchiveNavProps = {
  days: ArchiveDaySummary[];
  selectedDate: string | null;
  activeView: "day" | "starred";
  isCollapsed: boolean;
  query: string;
  starredCount: number;
  onQueryChange: (query: string) => void;
  onSelectDay: (date: string) => void;
  onToggleCollapsed: () => void;
  onShowStarred: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  weekday: "short",
});

function formatInsightCount(count: number) {
  return `${count} ${count === 1 ? "insight" : "insights"}`;
}

export function ArchiveNav({
  days,
  selectedDate,
  activeView,
  isCollapsed,
  query,
  starredCount,
  onQueryChange,
  onSelectDay,
  onToggleCollapsed,
  onShowStarred,
}: ArchiveNavProps) {
  const hasQuery = query.trim().length > 0;

  return (
    <aside
      className={`archive-rail ${isCollapsed ? "is-collapsed" : ""}`}
      aria-label="Archive navigation"
    >
      <div className="rail-top">
        <button
          className="rail-toggle"
          type="button"
          aria-expanded={!isCollapsed}
          aria-label={
            isCollapsed ? "Expand archive navigation" : "Collapse archive navigation"
          }
          onClick={onToggleCollapsed}
        >
          <span aria-hidden="true">{isCollapsed ? "›" : "‹"}</span>
        </button>
      </div>

      <div className="rail-content" aria-hidden={isCollapsed}>
        <div className="rail-heading">
          <p className="eyebrow">Daily briefings</p>
          <h1>AI Builder Archive</h1>
        </div>

        <button
          className={`starred-link ${
            activeView === "starred" && !hasQuery ? "is-active" : ""
          }`}
          type="button"
          onClick={onShowStarred}
        >
          <span aria-hidden="true">★</span>
          <span>Starred</span>
          <strong>{starredCount}</strong>
        </button>

        <label className="nav-search">
          <span>Search all archives</span>
          <input
            type="search"
            value={query}
            placeholder="agents, coding, OpenAI..."
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>

        <nav className="day-list" aria-label="Previous days">
          {days.map((day) => (
            <button
              className={`day-link ${
                activeView === "day" && selectedDate === day.date && !hasQuery
                  ? "is-active"
                  : ""
              }`}
              key={day.date}
              type="button"
              onClick={() => onSelectDay(day.date)}
            >
              <span>
                {dateFormatter.format(new Date(`${day.date}T12:00:00`))}
              </span>
              <small>{formatInsightCount(day.snippetCount)}</small>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

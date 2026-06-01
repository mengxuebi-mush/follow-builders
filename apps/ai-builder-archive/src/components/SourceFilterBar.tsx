import type { SourceFilter } from "../types/archive";

type SourceFilterBarProps = {
  counts: Record<SourceFilter, number>;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (filter: SourceFilter) => void;
};

const filters: Array<{ value: SourceFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "x", label: "X" },
  { value: "podcast", label: "Podcasts" },
  { value: "blog", label: "Blogs" },
];

export function SourceFilterBar({
  counts,
  sourceFilter,
  onSourceFilterChange,
}: SourceFilterBarProps) {
  return (
    <div className="source-filter-row">
      <div className="segment-control" aria-label="Source filter">
        {filters.map((filter) => (
          <button
            className={sourceFilter === filter.value ? "is-active" : ""}
            key={filter.value}
            type="button"
            onClick={() => onSourceFilterChange(filter.value)}
          >
            <span className="filter-label">{filter.label}</span>
            <span
              className="filter-count"
              aria-label={`${counts[filter.value]} ${
                counts[filter.value] === 1 ? "insight" : "insights"
              }`}
            >
              {counts[filter.value]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

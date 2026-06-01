import type { MouseEvent } from "react";
import type { DigestSnippet } from "../types/archive";

type InsightCardProps = {
  snippet: DigestSnippet;
  isStarred: boolean;
  onToggleStar: (snippet: DigestSnippet) => void;
};

const sourceLabels = {
  x: "X post",
  podcast: "Podcast",
  blog: "Blog",
};

export function InsightCard({
  snippet,
  isStarred,
  onToggleStar,
}: InsightCardProps) {
  const kicker =
    snippet.authorName && snippet.authorName !== snippet.sourceName
      ? snippet.authorName
      : null;
  const sourceName =
    snippet.sourceType === "x" ||
    snippet.sourceName === sourceLabels[snippet.sourceType]
      ? null
      : snippet.sourceName;
  const handleSourceClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign(snippet.url);
  };

  return (
    <article className={`insight-card insight-card--${snippet.sourceType}`}>
      <header className="card-meta">
        <div className="source-identity">
          <span className="source-pill">{sourceLabels[snippet.sourceType]}</span>
          {sourceName ? <span className="source-name">{sourceName}</span> : null}
        </div>
        <div className="card-actions">
          <a className="source-link" href={snippet.url} onClick={handleSourceClick}>
            <span aria-hidden="true">↗</span>
            <span className="sr-only">Open source</span>
          </a>
          <button
            className="star-button"
            type="button"
            aria-label={isStarred ? "Remove star" : "Star insight"}
            aria-pressed={isStarred}
            onClick={() => onToggleStar(snippet)}
          >
            <span aria-hidden="true">{isStarred ? "★" : "☆"}</span>
          </button>
        </div>
      </header>

      <div className="card-body">
        {kicker ? <p className="card-kicker">{kicker}</p> : null}
        <h3>{snippet.title}</h3>
        <p className="takeaway">{snippet.takeaway}</p>
        <p>{snippet.summary}</p>
      </div>

      <footer className="card-footer">
        <div className="tag-list" aria-label="Tags">
          {snippet.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </footer>
    </article>
  );
}

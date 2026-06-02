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

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

function getCardKicker(snippet: DigestSnippet) {
  if (!snippet.authorName || snippet.authorName === snippet.sourceName) {
    return null;
  }

  if (snippet.sourceType === "x") {
    return null;
  }

  return snippet.authorName;
}

function getTimestamp(snippet: DigestSnippet) {
  const rawTimestamp = snippet.publishedAt ?? snippet.date;
  const timestamp = new Date(rawTimestamp);

  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  const hasTime = rawTimestamp.includes("T") || /\d{1,2}:\d{2}/.test(rawTimestamp);

  return {
    dateTime: timestamp.toISOString(),
    label: hasTime
      ? dateTimeFormatter.format(timestamp)
      : dateFormatter.format(timestamp),
  };
}

export function InsightCard({
  snippet,
  isStarred,
  onToggleStar,
}: InsightCardProps) {
  const kicker = getCardKicker(snippet);
  const timestamp = getTimestamp(snippet);
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
          {timestamp ? (
            <time className="source-timestamp" dateTime={timestamp.dateTime}>
              {timestamp.label}
            </time>
          ) : null}
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

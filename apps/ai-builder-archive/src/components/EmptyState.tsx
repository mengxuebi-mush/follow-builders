type EmptyStateProps = {
  title: string;
  body: string;
};

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-live="polite">
      <p className="eyebrow">Archive note</p>
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

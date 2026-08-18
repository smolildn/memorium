export function ArchiveBadge({ date }: { date: string }) {
  const year = date.slice(0, 4);
  return (
    <span className="archive-badge" title={`Archived memory from ${year}`}>
      Archived · {year}
    </span>
  );
}

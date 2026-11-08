import { Link } from "react-router-dom";
import Icon from "../common/Icon";
import { playPronunciation } from "../../services/dictionaryService";
import { formatRelativeDate } from "../../utils/format";

function StatsLine({ stats }) {
  if (!stats?.seen) return <span>Not practised yet</span>;
  const accuracy = Math.round((stats.correct / stats.seen) * 100);
  return (
    <span>
      Practised {stats.seen} {stats.seen === 1 ? "time" : "times"} · {accuracy}% correct
    </span>
  );
}

export default function WordCard({ entry, stats, expanded, onToggle, onEdit, onDelete }) {
  const needsDefinition = !entry.definition;
  const detailsId = `word-details-${entry.id}`;

  return (
    <article
      className={`rounded-2xl border transition-colors ${
        expanded ? "border-border-strong bg-surface-raised" : "border-border bg-surface hover:border-border-strong"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="flex w-full items-start gap-3 rounded-2xl px-4 py-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-base font-semibold text-text-primary">{entry.word}</span>
            {entry.phonetic && <span className="text-xs text-text-secondary">{entry.phonetic}</span>}
            {entry.pos && <span className="chip">{entry.pos}</span>}
            {needsDefinition && (
              <span className="chip border-warning/40 bg-warning/10 text-warning">Needs definition</span>
            )}
          </div>
          {!needsDefinition && (
            <p
              className={`m-0 mt-1 text-sm leading-relaxed text-text-secondary ${expanded ? "" : "line-clamp-1"}`}
            >
              {entry.definition}
            </p>
          )}
        </div>
        <Icon
          name="chevronDown"
          size={18}
          className={`mt-1 shrink-0 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div id={detailsId} className="space-y-3 border-t border-border px-4 pb-3 pt-3">
          {entry.example && (
            <p className="m-0 text-sm leading-relaxed text-text-secondary">
              <span className="text-text-muted">Example: </span>
              {entry.example}
            </p>
          )}

          {entry.source?.sentence && (
            <blockquote className="m-0 border-l-2 border-border-strong pl-3 text-sm italic leading-relaxed text-text-secondary">
              “{entry.source.sentence}”
            </blockquote>
          )}

          {entry.note && (
            <p className="m-0 rounded-lg bg-background px-3 py-2 text-sm text-text-primary">
              <span className="text-text-muted">Note: </span>
              {entry.note}
            </p>
          )}

          {entry.synonyms?.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Synonyms">
              {entry.synonyms.map((synonym) => (
                <span key={synonym} className="chip">
                  {synonym}
                </span>
              ))}
            </div>
          )}

          {entry.origin && (
            <p className="m-0 text-xs italic leading-relaxed text-text-secondary">
              <span className="not-italic text-text-muted">Origin: </span>
              {entry.origin}
            </p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
            {entry.source?.bookTitle && (
              <span>
                From{" "}
                {entry.source.bookId ? (
                  <Link to={`/read/${entry.source.bookId}`} className="text-text-secondary underline-offset-2 hover:underline">
                    {entry.source.bookTitle}
                  </Link>
                ) : (
                  entry.source.bookTitle
                )}
                {entry.source.page ? `, p. ${entry.source.page}` : ""}
              </span>
            )}
            <span>Added {formatRelativeDate(entry.createdAt)}</span>
            <StatsLine stats={stats} />
          </div>

          <div className="-mx-2 flex flex-wrap gap-1">
            {entry.audio && (
              <button type="button" className="btn btn-ghost min-h-9 px-2.5" onClick={() => playPronunciation(entry.audio)}>
                <Icon name="volume" size={16} /> Listen
              </button>
            )}
            <button type="button" className="btn btn-ghost min-h-9 px-2.5" onClick={() => onEdit(entry)}>
              <Icon name="edit" size={16} /> {needsDefinition ? "Add definition" : "Edit"}
            </button>
            <button
              type="button"
              className="btn btn-ghost min-h-9 px-2.5 hover:!text-danger"
              onClick={() => onDelete(entry)}
            >
              <Icon name="trash" size={16} /> Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

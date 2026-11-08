export default function ResultScreen({ score, total, missed, onRetryMissed, onRestart, onChangeMode }) {
  const percent = total ? Math.round((score / total) * 100) : 0;
  const message =
    percent === 100 ? "Perfect score!" : percent >= 80 ? "Great job!" : percent >= 50 ? "Good progress" : "Keep practising";
  const ringColor =
    percent === 100 ? "var(--color-success)" : percent >= 50 ? "var(--color-accent)" : "var(--color-danger)";

  return (
    <div className="flex animate-fade-in flex-col items-center gap-6 py-6 text-center">
      <div
        className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-[3px]"
        style={{ borderColor: ringColor }}
      >
        <span className="text-3xl font-semibold tabular-nums">
          {score}/{total}
        </span>
        <span className="text-xs text-text-secondary">{percent}%</span>
      </div>

      <div>
        <p className="m-0 text-lg font-medium">{message}</p>
        <p className="m-0 mt-1 text-sm text-text-secondary">
          {score} of {total} correct. Your progress has been saved.
        </p>
      </div>

      {missed.length > 0 && (
        <div className="card w-full p-4 text-left">
          <p className="m-0 mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">Words to review</p>
          <ul className="m-0 list-none space-y-3 p-0">
            {missed.map((word) => (
              <li key={word.id}>
                <span className="text-sm font-medium">{word.word}</span>
                {word.pos && <span className="ml-2 text-xs text-text-secondary">{word.pos}</span>}
                <p className="m-0 mt-0.5 text-sm text-text-secondary">{word.definition}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        {missed.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={onRetryMissed}>
            Retry missed ({missed.length})
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onChangeMode}>
          Change mode
        </button>
        <button type="button" className="btn btn-primary" onClick={onRestart}>
          New session
        </button>
      </div>
    </div>
  );
}

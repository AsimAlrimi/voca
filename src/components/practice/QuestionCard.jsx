import Icon from "../common/Icon";
import { DIRECTIONS } from "../../utils/practice";

export default function QuestionCard({ question, selectedId, onChoose, onNext, isLast }) {
  const answered = selectedId !== null;
  const isCorrect = answered && question.choices.find((c) => c.id === selectedId)?.correct;
  const { target } = question;
  const toWord = question.type === DIRECTIONS.definitionToWord;

  return (
    <div className="animate-fade-in">
      <div className="card mb-5 p-5">
        <p className="m-0 mb-3 text-xs uppercase tracking-widest text-text-muted">
          {toWord ? "Which word means…" : "What does this word mean?"}
        </p>
        {toWord ? (
          <p className="m-0 text-base leading-relaxed text-text-primary md:text-[17px]">{target.definition}</p>
        ) : (
          <p className="m-0 flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-semibold tracking-tight">{target.word}</span>
            {target.phonetic && <span className="text-sm text-text-secondary">{target.phonetic}</span>}
          </p>
        )}
        {target.pos && <span className="chip mt-3">{target.pos}</span>}
      </div>

      <div className="mb-5 flex flex-col gap-2.5" role="group" aria-label="Answer choices">
        {question.choices.map((choice, index) => {
          const chosen = selectedId === choice.id;
          let tone = "border-border bg-surface hover:border-border-strong hover:bg-surface-raised";
          let badge = null;
          if (answered) {
            if (choice.correct) {
              tone = "border-success bg-success/10";
              badge = { text: "Correct", className: "bg-success/15 text-success" };
            } else if (chosen) {
              tone = "border-danger bg-danger/10";
              badge = { text: "Your answer", className: "bg-danger/15 text-danger" };
            } else {
              tone = "border-border bg-surface opacity-50";
            }
          }
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice.id)}
              disabled={answered}
              aria-pressed={chosen}
              className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-default ${tone}`}
            >
              <span className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised text-[11px] text-text-muted md:flex">
                {index + 1}
              </span>
              <span className={`flex-1 ${toWord ? "text-[15px] font-medium" : "text-sm leading-relaxed"}`}>
                {choice.label}
              </span>
              {badge && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${badge.className}`}>{badge.text}</span>
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3.5 ${isCorrect ? "border-success/50" : "border-danger/50"} bg-surface`}
          role="status"
        >
          <p className={`m-0 flex items-center gap-2 text-sm font-medium ${isCorrect ? "text-success" : "text-danger"}`}>
            <Icon name={isCorrect ? "check" : "x"} size={16} strokeWidth={2.5} />
            {isCorrect ? "Correct!" : `The answer is “${target.word}”`}
          </p>
          {!toWord || !isCorrect ? (
            <p className="m-0 mt-1.5 text-sm leading-relaxed text-text-secondary">
              <span className="font-medium text-text-primary">{target.word}</span> — {target.definition}
            </p>
          ) : null}
          {(target.example || target.source?.sentence) && (
            <p className="m-0 mt-1.5 text-sm italic leading-relaxed text-text-secondary">
              “{target.source?.sentence || target.example}”
            </p>
          )}
        </div>
      )}

      {answered ? (
        <button type="button" className="btn btn-primary min-h-12 w-full text-[15px]" onClick={onNext} autoFocus>
          {isLast ? "See results" : "Next question"}
          <span className="hidden text-xs font-normal opacity-50 md:inline">Enter</span>
        </button>
      ) : (
        <p className="m-0 hidden text-center text-xs text-text-muted md:block">Press 1, 2 or 3 to answer</p>
      )}
    </div>
  );
}

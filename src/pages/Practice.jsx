import { useState, useEffect, useCallback } from "react";

const VOCAB = [
  {
    id: 1,
    word: "ephemeral",
    phonetic: "/ɪˈfɛm(ə)r(ə)l/",
    pos: "adjective",
    definition: "Lasting for a very short time; transitory.",
    example: "The ephemeral beauty of the cherry blossoms makes them all the more precious.",
  },
  {
    id: 2,
    word: "sonder",
    phonetic: "/ˈsɒndə/",
    pos: "noun",
    definition: "The realization that each passerby has a life as vivid and complex as your own.",
    example: "Walking through the airport, she felt a wave of sonder looking at the crowd.",
  },
  {
    id: 3,
    word: "mellifluous",
    phonetic: "/mɛˈlɪflʊəs/",
    pos: "adjective",
    definition: "Sweet or musical; pleasant to hear.",
    example: "Her mellifluous voice filled the quiet hall.",
  },
  {
    id: 4,
    word: "obfuscate",
    phonetic: "/ˈɒbfʌskeɪt/",
    pos: "verb",
    definition: "To render obscure, unclear, or unintelligible; to confuse or bewilder.",
    example: "The jargon seemed designed to obfuscate rather than clarify.",
  },
  {
    id: 5,
    word: "liminal",
    phonetic: "/ˈlɪmɪn(ə)l/",
    pos: "adjective",
    definition: "Of or relating to a transitional stage; occupying a position on both sides of a boundary.",
    example: "The empty corridor had a strange liminal quality at 3am.",
  },
  {
    id: 6,
    word: "petrichor",
    phonetic: "/ˈpɛtrɪkɔː/",
    pos: "noun",
    definition: "The pleasant, earthy smell produced when rain falls on dry ground.",
    example: "She stepped outside after the storm, breathing in the petrichor.",
  },
  {
    id: 7,
    word: "sanguine",
    phonetic: "/ˈsæŋɡwɪn/",
    pos: "adjective",
    definition: "Optimistic or positive, especially in a difficult situation.",
    example: "He remained sanguine about the outcome despite the setbacks.",
  },
  {
    id: 8,
    word: "laconic",
    phonetic: "/ləˈkɒnɪk/",
    pos: "adjective",
    definition: "Using very few words; brief and concise in speech or expression.",
    example: "Her laconic reply left little room for interpretation.",
  },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildQuestion(vocab) {
  const shuffled = shuffle(vocab);
  const correct = shuffled[0];
  const distractors = shuffled.slice(1, 3);
  const choices = shuffle([correct, ...distractors]);
  return { correct, choices };
}

function buildSession(vocab) {
  return shuffle(vocab).map((entry) => {
    const others = vocab.filter((w) => w.id !== entry.id);
    const distractors = shuffle(others).slice(0, 2);
    return {
      correct: entry,
      choices: shuffle([entry, ...distractors]),
    };
  });
}

// ── Result screen ─────────────────────────────────────────────────────────────
function ResultScreen({ score, total, missed, onRestart, onRetryMissed }) {
  const pct = Math.round((score / total) * 100);
  const grade =
    pct === 100 ? "Perfect! 🎉" : pct >= 80 ? "Great job!" : pct >= 50 ? "Keep going!" : "Keep practicing!";

  return (
    <div className="flex flex-col items-center text-center py-10 gap-6">
      {/* Score ring */}
      <div
        className="flex flex-col items-center justify-center rounded-full"
        style={{
          width: 120,
          height: 120,
          border: `3px solid ${pct === 100 ? "#1d9e75" : pct >= 60 ? "var(--color-accent)" : "#e24b4a"}`,
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 600, color: "var(--color-text-primary)" }}>
          {score}/{total}
        </span>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{pct}%</span>
      </div>

      <div>
        <p style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>{grade}</p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
          {score} correct out of {total} questions
        </p>
      </div>

      {/* Missed words */}
      {missed.length > 0 && (
        <div
          className="w-full rounded-xl p-4 text-left"
          style={{ background: "var(--color-surface)", border: "0.5px solid var(--color-border)" }}
        >
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10, fontWeight: 500 }}>
            WORDS TO REVIEW
          </p>
          <div className="flex flex-col gap-2">
            {missed.map((q) => (
              <div key={q.correct.id}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {q.correct.word}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 8 }}>
                  {q.correct.pos}
                </span>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  {q.correct.definition}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {missed.length > 0 && (
          <button
            onClick={onRetryMissed}
            className="rounded-lg px-4 py-2 text-sm font-medium cursor-pointer"
            style={{
              background: "var(--color-surface)",
              border: "0.5px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          >
            Retry missed ({missed.length})
          </button>
        )}
        <button
          onClick={onRestart}
          className="rounded-lg px-4 py-2 text-sm font-medium cursor-pointer"
          style={{
            background: "var(--color-accent)",
            border: "none",
            color: "var(--color-background)",
          }}
        >
          New session
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Practice() {
  const [session, setSession] = useState(() => buildSession(VOCAB));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null); // word string chosen
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState([]);
  const [done, setDone] = useState(false);
  const [animate, setAnimate] = useState(false);

  const current = session[index];
  const isCorrect = selected === current?.correct.word;
  const answered = selected !== null;

  const startSession = useCallback((questions) => {
    setSession(questions);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setMissed([]);
    setDone(false);
  }, []);

  const handleChoice = (word) => {
    if (answered) return;
    setSelected(word);
    if (word === current.correct.word) {
      setScore((s) => s + 1);
    } else {
      setMissed((m) => [...m, current]);
    }
  };

  const handleNext = () => {
    setAnimate(true);
    setTimeout(() => {
      if (index + 1 >= session.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
        setSelected(null);
      }
      setAnimate(false);
    }, 180);
  };

  // keyboard shortcut: 1/2/3 to pick, Enter/Space to advance
  useEffect(() => {
    const onKey = (e) => {
      if (done) return;
      if (!answered && ["1", "2", "3"].includes(e.key)) {
        const i = parseInt(e.key) - 1;
        if (current.choices[i]) handleChoice(current.choices[i].word);
      }
      if (answered && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, done, current, index]);

  const progress = ((index + (answered ? 1 : 0)) / session.length) * 100;

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>
            Practice
          </h1>
          {!done && (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
              {index + 1} of {session.length}
            </p>
          )}
        </div>
        {!done && (
          <span
            className="rounded-full px-3 py-1 text-xs"
            style={{
              background: "var(--color-surface)",
              border: "0.5px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            {score} correct
          </span>
        )}
      </div>

      {/* Progress bar */}
      {!done && (
        <div
          className="w-full rounded-full mb-8 overflow-hidden"
          style={{ height: 3, background: "var(--color-surface-raised)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: "var(--color-accent)" }}
          />
        </div>
      )}

      {done ? (
        <ResultScreen
          score={score}
          total={session.length}
          missed={missed}
          onRestart={() => startSession(buildSession(VOCAB))}
          onRetryMissed={() => startSession(missed.map((q) => {
            const others = VOCAB.filter((w) => w.id !== q.correct.id);
            const distractors = shuffle(others).slice(0, 2);
            return { correct: q.correct, choices: shuffle([q.correct, ...distractors]) };
          }))}
        />
      ) : (
        <div
          style={{
            opacity: animate ? 0 : 1,
            transform: animate ? "translateY(6px)" : "translateY(0)",
            transition: "opacity 0.18s, transform 0.18s",
          }}
        >
          {/* Definition card */}
          <div
            className="rounded-xl p-5 mb-6"
            style={{
              background: "var(--color-surface)",
              border: "0.5px solid var(--color-border)",
            }}
          >
            <p
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              Definition
            </p>
            <p
              style={{
                fontSize: 16,
                color: "var(--color-text-primary)",
                lineHeight: 1.65,
              }}
            >
              {current.correct.definition}
            </p>
            {current.correct.pos && (
              <span
                className="inline-block mt-3 rounded px-1.5 py-0.5 text-xs"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "0.5px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {current.correct.pos}
              </span>
            )}
          </div>

          {/* Choices */}
          <div className="flex flex-col gap-3 mb-6">
            {current.choices.map((choice, i) => {
              const isChosen = selected === choice.word;
              const isRight = choice.word === current.correct.word;

              let borderColor = "var(--color-border)";
              let bgColor = "var(--color-surface)";
              let textColor = "var(--color-text-primary)";
              let badgeText = null;

              if (answered) {
                if (isRight) {
                  borderColor = "#1d9e75";
                  bgColor = "rgba(29,158,117,0.07)";
                  badgeText = "correct";
                } else if (isChosen && !isRight) {
                  borderColor = "#e24b4a";
                  bgColor = "rgba(226,75,74,0.07)";
                  textColor = "var(--color-text-secondary)";
                  badgeText = "wrong";
                } else {
                  textColor = "var(--color-text-muted)";
                }
              }

              return (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice.word)}
                  disabled={answered}
                  className="rounded-xl px-4 py-3.5 text-left flex items-center justify-between gap-3 transition-all"
                  style={{
                    background: bgColor,
                    border: `0.5px solid ${borderColor}`,
                    cursor: answered ? "default" : "pointer",
                    outline: "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: 22,
                        height: 22,
                        fontSize: 11,
                        background: "var(--color-surface-raised)",
                        border: "0.5px solid var(--color-border)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 500, color: textColor }}>
                      {choice.word}
                    </span>
                    {choice.phonetic && answered && isRight && (
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {choice.phonetic}
                      </span>
                    )}
                  </div>
                  {badgeText && (
                    <span
                      className="text-xs rounded-full px-2 py-0.5 flex-shrink-0"
                      style={{
                        background: isRight ? "rgba(29,158,117,0.15)" : "rgba(226,75,74,0.15)",
                        color: isRight ? "#1d9e75" : "#e24b4a",
                      }}
                    >
                      {badgeText}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback + example */}
          {answered && (
            <div
              className="rounded-xl px-4 py-3.5 mb-6"
              style={{
                background: "var(--color-surface)",
                border: `0.5px solid ${isCorrect ? "#1d9e75" : "#e24b4a"}`,
              }}
            >
              <p
                className="text-xs font-medium mb-1.5"
                style={{ color: isCorrect ? "#1d9e75" : "#e24b4a" }}
              >
                {isCorrect ? "Correct!" : `The answer was "${current.correct.word}"`}
              </p>
              {current.correct.example && (
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                  <span style={{ color: "var(--color-text-muted)" }}>e.g. </span>
                  {current.correct.example}
                </p>
              )}
            </div>
          )}

          {/* Next button */}
          {answered && (
            <button
              onClick={handleNext}
              className="w-full rounded-xl py-3 text-sm font-medium cursor-pointer"
              style={{
                background: "var(--color-accent)",
                border: "none",
                color: "var(--color-background)",
              }}
            >
              {index + 1 >= session.length ? "See results" : "Next →"}
              <span
                className="ml-2 text-xs opacity-40"
                style={{ fontWeight: 400 }}
              >
                or press Enter
              </span>
            </button>
          )}

          {/* Hint */}
          {!answered && (
            <p
              className="text-center text-xs mt-4"
              style={{ color: "var(--color-text-muted)" }}
            >
              Press 1, 2, or 3 to choose
            </p>
          )}
        </div>
      )}
    </div>
  );
}
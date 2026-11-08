import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useVocabulary from "../hooks/useVocabulary";
import useToast from "../hooks/useToast";
import PageHeader from "../components/layout/PageHeader";
import StatusMessage from "../components/common/StatusMessage";
import Icon from "../components/common/Icon";
import PracticeSetup from "../components/practice/PracticeSetup";
import QuestionCard from "../components/practice/QuestionCard";
import ResultScreen from "../components/practice/ResultScreen";
import { recordAnswer } from "../services/practiceService";
import { DIRECTIONS, MIN_WORDS, buildSession, isEligible } from "../utils/practice";

export default function Practice() {
  const { words, stats, status, error, reload } = useVocabulary();
  const toast = useToast();

  const [direction, setDirection] = useState(DIRECTIONS.definitionToWord);
  const [size, setSize] = useState(10);
  const [session, setSession] = useState(null); // { questions, index, selectedId, score, missed, done }
  const [notice, setNotice] = useState(null);

  const eligible = useMemo(() => words.filter(isEligible), [words]);
  const withoutDefinition = words.length - eligible.length;

  const start = useCallback(
    (onlyIds = null) => {
      const { questions, skipped } = buildSession(words, { direction, size, stats, onlyIds });
      // "Retry missed" may legitimately have 1–2 questions; distractors still come from all words.
      const minimum = onlyIds ? 1 : MIN_WORDS;
      if (questions.length < minimum) {
        setSession(null);
        setNotice(
          skipped > 0
            ? direction === DIRECTIONS.definitionToWord
              ? "Too many of your definitions are similar to each other to make a fair quiz. Edit similar definitions or save more words."
              : "Some of your definitions are too similar to make a fair quiz in this mode. Try “Definition → Word”, edit similar definitions, or save more words."
            : `You need at least ${MIN_WORDS} words with definitions to practise.`
        );
        return;
      }
      setNotice(null);
      setSession({ questions, index: 0, selectedId: null, score: 0, missed: [], done: false });
    },
    [words, direction, size, stats]
  );

  const current = session && !session.done ? session.questions[session.index] : null;

  const choose = useCallback(
    (choiceId) => {
      if (!current || session.selectedId !== null) return;
      const correct = current.choices.find((c) => c.id === choiceId)?.correct ?? false;
      setSession((s) => ({
        ...s,
        selectedId: choiceId,
        score: s.score + (correct ? 1 : 0),
        missed: correct ? s.missed : [...s.missed, current.target],
      }));
      recordAnswer(current.target.id, correct).catch((err) => {
        console.error("Saving practice result failed", err);
        toast.show("Your answer couldn't be saved to practice history.", { type: "error" });
      });
    },
    [current, session, toast]
  );

  const next = useCallback(() => {
    setSession((s) => {
      if (!s || s.selectedId === null) return s;
      if (s.index + 1 >= s.questions.length) return { ...s, done: true };
      return { ...s, index: s.index + 1, selectedId: null };
    });
  }, []);

  const finishAndReload = useCallback(() => {
    reload(); // refresh stats so the next session prioritises correctly
  }, [reload]);

  useEffect(() => {
    if (session?.done) finishAndReload();
  }, [session?.done, finishAndReload]);

  // Keyboard: 1–3 to answer, Enter to continue.
  useEffect(() => {
    if (!current) return undefined;
    const onKey = (event) => {
      if (event.target.closest?.("input, textarea, select")) return;
      if (session.selectedId === null && /^[1-9]$/.test(event.key)) {
        const choice = current.choices[Number(event.key) - 1];
        if (choice) choose(choice.id);
      } else if (session.selectedId !== null && event.key === "Enter" && event.target.tagName !== "BUTTON") {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, session, choose, next]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <>
        <PageHeader title="Practice" />
        <StatusMessage type="loading" title="Loading your words…" />
      </>
    );
  }
  if (status === "error") {
    return (
      <>
        <PageHeader title="Practice" />
        <StatusMessage
          type="error"
          title="Couldn't load your vocabulary"
          message={error?.message}
          action={
            <button type="button" className="btn btn-secondary" onClick={reload}>
              Try again
            </button>
          }
        />
      </>
    );
  }

  if (eligible.length < MIN_WORDS) {
    return (
      <>
        <PageHeader title="Practice" />
        <StatusMessage
          icon="practice"
          title={`Save at least ${MIN_WORDS} words to practise`}
          message={
            `You have ${eligible.length} word${eligible.length === 1 ? "" : "s"} with a definition.` +
            (withoutDefinition ? ` ${withoutDefinition} saved word${withoutDefinition === 1 ? " needs" : "s need"} a definition first.` : "") +
            " Select words while reading to save them."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/" className="btn btn-secondary no-underline">
                <Icon name="library" size={16} /> Open Library
              </Link>
              <Link to="/vocabulary" className="btn btn-primary no-underline">
                <Icon name="vocabulary" size={16} /> Vocabulary
              </Link>
            </div>
          }
        />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <PageHeader title="Practice" subtitle="Review the words you saved while reading." />
        <PracticeSetup
          direction={direction}
          size={size}
          eligibleCount={eligible.length}
          onDirectionChange={setDirection}
          onSizeChange={setSize}
          onStart={() => start()}
          notice={
            notice && (
              <p role="alert" className="card m-0 flex items-start gap-2 p-4 text-sm text-text-secondary">
                <Icon name="info" size={16} className="mt-0.5 shrink-0" />
                {notice}
              </p>
            )
          }
        />
      </>
    );
  }

  if (session.done) {
    return (
      <>
        <PageHeader title="Practice" />
        <ResultScreen
          score={session.score}
          total={session.questions.length}
          missed={session.missed}
          onRetryMissed={() => start(session.missed.map((w) => w.id))}
          onRestart={() => start()}
          onChangeMode={() => setSession(null)}
        />
      </>
    );
  }

  const answeredCount = session.index + (session.selectedId !== null ? 1 : 0);
  const progress = (answeredCount / session.questions.length) * 100;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Practice"
        subtitle={`Question ${session.index + 1} of ${session.questions.length}`}
        action={
          <>
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary">
              {session.score} correct
            </span>
            <button type="button" className="btn btn-ghost min-h-9 px-2.5" onClick={() => setSession(null)}>
              End
            </button>
          </>
        }
      />
      <div
        className="mb-6 h-1 w-full overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-valuenow={answeredCount}
        aria-valuemin={0}
        aria-valuemax={session.questions.length}
        aria-label="Session progress"
      >
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <QuestionCard
        key={current.id + session.index}
        question={current}
        selectedId={session.selectedId}
        onChoose={choose}
        onNext={next}
        isLast={session.index + 1 >= session.questions.length}
      />
    </div>
  );
}

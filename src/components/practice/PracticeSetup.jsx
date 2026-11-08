import { DIRECTIONS } from "../../utils/practice";

const MODES = [
  { value: DIRECTIONS.definitionToWord, title: "Definition → Word", description: "Read a definition, pick the word." },
  { value: DIRECTIONS.wordToDefinition, title: "Word → Definition", description: "See a word, pick its meaning." },
  { value: DIRECTIONS.mixed, title: "Mixed", description: "A bit of both." },
];
const SIZES = [5, 10, 20];

export default function PracticeSetup({ direction, size, eligibleCount, onDirectionChange, onSizeChange, onStart, notice }) {
  return (
    <div className="space-y-6">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-3 p-0 text-xs font-medium uppercase tracking-wider text-text-muted">Practice mode</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODES.map((mode) => {
            const selected = direction === mode.value;
            return (
              <label
                key={mode.value}
                className={`flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                  selected ? "border-text-secondary bg-surface-raised" : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                <input
                  type="radio"
                  name="practice-mode"
                  value={mode.value}
                  checked={selected}
                  onChange={() => onDirectionChange(mode.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-text-primary">{mode.title}</span>
                <span className="text-xs text-text-secondary">{mode.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-3 p-0 text-xs font-medium uppercase tracking-wider text-text-muted">Questions</legend>
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          {SIZES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={size === value}
              onClick={() => onSizeChange(value)}
              className={`min-h-9 min-w-14 rounded-lg px-3 text-sm transition-colors ${
                size === value ? "bg-surface-hover font-medium text-text-primary" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>

      {notice}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" className="btn btn-primary min-h-12 px-6 text-[15px]" onClick={onStart}>
          Start practice
        </button>
        <p className="m-0 text-sm text-text-secondary">
          {eligibleCount} word{eligibleCount === 1 ? "" : "s"} available · the ones you know least come first
        </p>
      </div>
    </div>
  );
}

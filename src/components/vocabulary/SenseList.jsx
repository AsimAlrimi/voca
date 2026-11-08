/** Selectable list of dictionary meanings (shared by add/edit word dialogs). */
export default function SenseList({ senses, selectedIndex, onSelect }) {
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label="Meanings">
      {senses.map((sense, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={`${sense.pos}-${index}`}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(index)}
            className={`block w-full rounded-xl border px-3 py-2 text-left transition-colors ${
              selected ? "border-border-strong bg-surface-raised" : "border-transparent hover:bg-surface-raised/60"
            }`}
          >
            {sense.pos && <span className="chip mb-1 mr-1.5">{sense.pos}</span>}
            <span className={`text-sm leading-relaxed ${selected ? "text-text-primary" : "text-text-secondary"}`}>
              {sense.definition}
            </span>
          </button>
        );
      })}
    </div>
  );
}

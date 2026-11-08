import { useState } from "react";

const VISIBLE_PER_GROUP = 3;

function groupSenses(senses, meanings) {
  if (meanings?.length) return meanings.map((m) => ({ pos: m.pos, indices: m.senses }));
  const groups = [];
  senses.forEach((sense, index) => {
    let group = groups.find((g) => g.pos === sense.pos);
    if (!group) groups.push((group = { pos: sense.pos, indices: [] }));
    group.indices.push(index);
  });
  return groups;
}

/**
 * Dictionary meanings grouped by part of speech; one can be selected.
 * The selected meaning shows its example and synonyms to make the differences clear.
 * `senses` is the flat list (selection index); `meanings` (optional) gives the grouping.
 */
export default function SenseList({ senses, meanings, selectedIndex, onSelect }) {
  const groups = groupSenses(senses, meanings);
  const [expanded, setExpanded] = useState(() => new Set());
  const multipleGroups = groups.length > 1;

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Meanings">
      {groups.map((group) => {
        const isExpanded = expanded.has(group.pos);
        // Always keep the selected meaning visible, even inside a collapsed group.
        const visible = group.indices.filter(
          (index, position) => isExpanded || position < VISIBLE_PER_GROUP || index === selectedIndex
        );
        const hidden = group.indices.length - visible.length;

        return (
          <section key={group.pos || "other"} aria-label={group.pos || "Other"}>
            {(multipleGroups || group.pos) && (
              <h3 className="m-0 mb-1 flex items-baseline gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                {group.pos || "Other"}
                {group.indices.length > 1 && (
                  <span className="font-normal normal-case tracking-normal">{group.indices.length} meanings</span>
                )}
              </h3>
            )}
            <div className="space-y-1">
              {visible.map((index) => {
                const sense = senses[index];
                const selected = index === selectedIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onSelect(index)}
                    className={`block w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                      selected ? "border-border-strong bg-surface-hover" : "border-transparent hover:bg-surface-hover/60"
                    }`}
                  >
                    <span className={`block text-sm leading-relaxed ${selected ? "text-text-primary" : "text-text-secondary"}`}>
                      {sense.definition}
                    </span>
                    {selected && sense.example && (
                      <span className="mt-1 block text-xs italic leading-relaxed text-text-secondary">
                        “{sense.example}”
                      </span>
                    )}
                    {selected && sense.synonyms?.length > 0 && (
                      <span className="mt-1.5 flex flex-wrap gap-1" aria-label="Synonyms">
                        {sense.synonyms.slice(0, 6).map((s) => (
                          <span key={s} className="chip">
                            {s}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {hidden > 0 && (
              <button
                type="button"
                className="mt-0.5 min-h-8 px-3 text-xs font-medium text-text-secondary hover:text-text-primary"
                onClick={() => setExpanded((current) => new Set(current).add(group.pos))}
              >
                Show {hidden} more {group.pos ? `${group.pos} ` : ""}meaning{hidden === 1 ? "" : "s"}
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

// Practice session generation. React-free and storage-free (pure functions).

export const MIN_WORDS = 3;
export const CHOICES_PER_QUESTION = 3;
export const DIRECTIONS = {
  definitionToWord: "definition-to-word",
  wordToDefinition: "word-to-definition",
  mixed: "mixed",
};

/** Unbiased Fisher–Yates shuffle (returns a new array). */
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function normalizeDefinition(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set(["a", "an", "the", "of", "to", "or", "and", "in", "on", "for", "with", "by", "as", "that", "is", "be", "something", "someone"]);

function contentWords(text) {
  return new Set(normalizeDefinition(text).split(" ").filter((w) => w && !STOP_WORDS.has(w)));
}

/**
 * Two definitions are "distinct" when neither is empty, they aren't identical after
 * normalisation, one doesn't contain the other, and they don't share most of their content words.
 */
export function areDefinitionsDistinct(a, b) {
  const na = normalizeDefinition(a);
  const nb = normalizeDefinition(b);
  if (!na || !nb || na === nb) return false;
  if (na.includes(nb) || nb.includes(na)) return false;

  const wa = contentWords(a);
  const wb = contentWords(b);
  if (!wa.size || !wb.size) return true;
  let shared = 0;
  wa.forEach((w) => {
    if (wb.has(w)) shared += 1;
  });
  const overlap = shared / Math.min(wa.size, wb.size);
  return overlap < 0.8;
}

export function isEligible(word) {
  return normalizeDefinition(word.definition).length >= 3;
}

/** Least-known and least-recently practised words first, with a little randomness. */
export function prioritize(words, stats = new Map(), random = Math.random) {
  const score = (word) => {
    const s = stats.get(word.id);
    if (!s?.seen) return 0 + random() * 0.5; // never practised: highest priority
    const accuracy = s.correct / s.seen;
    const daysAgo = s.lastPracticedAt ? (Date.now() - s.lastPracticedAt) / 86_400_000 : 30;
    return 0.5 + accuracy - Math.min(daysAgo, 30) / 60 + random() * 0.5;
  };
  return words
    .map((word) => ({ word, score: score(word) }))
    .sort((a, b) => a.score - b.score)
    .map((item) => item.word);
}

function pickDistractors(target, pool, isValid, random) {
  const others = pool.filter((w) => w.id !== target.id && w.wordKey !== target.wordKey);
  // Prefer the same part of speech so wrong answers are plausible.
  const samePos = shuffle(others.filter((w) => target.pos && w.pos === target.pos), random);
  const rest = shuffle(others.filter((w) => !(target.pos && w.pos === target.pos)), random);

  const picked = [];
  for (const candidate of [...samePos, ...rest]) {
    if (isValid(candidate, picked)) picked.push(candidate);
    if (picked.length === CHOICES_PER_QUESTION - 1) break;
  }
  return picked.length === CHOICES_PER_QUESTION - 1 ? picked : null;
}

/** Builds one question or returns null when no unambiguous question is possible. */
export function buildQuestion(target, pool, type, random = Math.random) {
  // In both directions, the target's definition must be distinct from every distractor's
  // definition — otherwise two answers could be correct. For word → definition, distractor
  // definitions must also differ from each other.
  const isValid = (candidate, picked) =>
    areDefinitionsDistinct(target.definition, candidate.definition) &&
    (type === DIRECTIONS.definitionToWord ||
      picked.every((p) => areDefinitionsDistinct(p.definition, candidate.definition)));

  const distractors = pickDistractors(target, pool, isValid, random);
  if (!distractors) return null;

  const options = shuffle([target, ...distractors], random);
  return {
    id: `${target.id}-${type}`,
    type,
    target,
    choices: options.map((word) => ({
      id: word.id,
      label: type === DIRECTIONS.definitionToWord ? word.word : word.definition,
      correct: word.id === target.id,
    })),
  };
}

/**
 * Builds a practice session.
 * Returns { questions, skipped } where skipped counts words with no unambiguous question.
 */
export function buildSession(words, { direction, size = 10, stats, onlyIds = null, random = Math.random }) {
  const pool = words.filter(isEligible);
  const candidates = prioritize(onlyIds ? pool.filter((w) => onlyIds.includes(w.id)) : pool, stats, random);

  const questions = [];
  let skipped = 0;
  for (const target of candidates) {
    if (questions.length >= size) break;
    let types;
    if (direction === DIRECTIONS.mixed) {
      types = random() < 0.5
        ? [DIRECTIONS.definitionToWord, DIRECTIONS.wordToDefinition]
        : [DIRECTIONS.wordToDefinition, DIRECTIONS.definitionToWord];
    } else {
      types = [direction];
    }
    const question = types.map((type) => buildQuestion(target, pool, type, random)).find(Boolean);
    if (question) questions.push(question);
    else skipped += 1;
  }
  return { questions: shuffle(questions, random), skipped };
}

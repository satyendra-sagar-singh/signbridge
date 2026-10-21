// Text → ISL gloss pipeline.
//
// Steps: validate → split sentences → normalise → match vocabulary phrases/words
// → drop English function words → apply simple ISL ordering rules → add
// question marker → fingerspell unknown words (optional).
//
// This is a rule-based MVP, not a linguistically complete ISL translator.
// The ordering rules are deliberately small and documented in README.md.

import vocabulary from '../data/islVocabulary.json';
import { normaliseSlang } from './slang.js';
import { normaliseProfanity } from './profanity.js';

export const MAX_INPUT_LENGTH = 300;

// English words with no standalone ISL sign in this MVP (articles, copulas, auxiliaries…).
const FILLER_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'am',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'to',
  'of',
  'do',
  'does',
  'did',
  'will',
  'would',
  'shall',
  'should',
  'could',
  'may',
  'might',
  'this',
  'that',
  'there',
  'some',
  'any',
  'very',
  'really',
  'just',
  'so',
  'and',
  'but',
  'or',
  'for',
  'with',
  'at',
  'in',
  'on',
]);

// WH-words whose gloss is moved to the end of the sentence (common ISL pattern).
const WH_GLOSSES = new Set(['WHAT', 'WHERE', 'WHEN', 'WHO', 'WHY', 'HOW', 'WHICH', 'HOW-MANY']);
const QUESTION_START =
  /^(how|what|where|when|who|why|which|are|is|do|does|can|could|will|should|would|did|have|has)\b/;

const CONTRACTIONS = [
  [/\bi'm\b/g, 'i am'],
  [/\bi've\b/g, 'i have'],
  [/\bi'll\b/g, 'i will'],
  [/\bi'd\b/g, 'i would'],
  [/\byou're\b/g, 'you are'],
  [/\byou've\b/g, 'you have'],
  [/\bwhat's\b/g, 'what is'],
  [/\bwhere's\b/g, 'where is'],
  [/\bhow's\b/g, 'how is'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\blet's\b/g, 'let us'],
];

/** Build lookup tables once from the JSON vocabulary. */
function buildIndex(vocab) {
  const byGloss = new Map();
  const phrases = []; // { words: string[], entry }
  for (const entry of vocab.signs) {
    byGloss.set(entry.gloss, entry);
    for (const w of entry.words) {
      phrases.push({ words: w.toLowerCase().split(/\s+/), entry });
    }
  }
  // Longest phrases first so "thank you" wins over "you".
  phrases.sort((a, b) => b.words.length - a.words.length);
  const maxPhraseLength = phrases.reduce((m, p) => Math.max(m, p.words.length), 1);
  return { byGloss, phrases, maxPhraseLength };
}

const INDEX = buildIndex(vocabulary);

export function getSignEntry(gloss) {
  return INDEX.byGloss.get(gloss) || null;
}

export function listVocabulary() {
  return vocabulary.signs.filter((s) => s.kind !== 'marker');
}

/** Validates raw input. Returns an error message string, or null when valid. */
export function validateInput(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return 'Please type a sentence to translate.';
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return `Please keep your text under ${MAX_INPUT_LENGTH} characters (currently ${text.length}).`;
  }
  if (!/[a-z0-9]/i.test(text)) {
    return 'The text needs at least one word or number. Symbols alone cannot be signed.';
  }
  return null;
}

function normalise(sentence) {
  let s = sentence.toLowerCase().replace(/[’‘]/g, "'");
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep);
  // Profanity first (asterisk/leet spellings), then slang on the cleaned text.
  const profanity = normaliseProfanity(s);
  const slang = normaliseSlang(profanity.text);
  s = slang.text;
  const tokens = s
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/['-]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  return { tokens, rewrites: slang.rewrites, profanity: profanity.matches, text: s };
}

function matchPhrase(tokens, pos) {
  for (const p of INDEX.phrases) {
    const n = p.words.length;
    if (pos + n > tokens.length) continue;
    let ok = true;
    for (let i = 0; i < n; i++) {
      if (tokens[pos + i] !== p.words[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { entry: p.entry, length: n };
  }
  return null;
}

function translateSentence(sentence, options) {
  const { tokens, rewrites, profanity, text } = normalise(sentence);
  const isQuestion = /\?\s*$/.test(sentence) || QUESTION_START.test(text);
  const items = [];
  const unsupported = [];
  let i = 0;
  while (i < tokens.length) {
    const match = matchPhrase(tokens, i);
    if (match) {
      items.push({
        gloss: match.entry.gloss,
        kind: match.entry.kind === 'marker' ? 'marker' : 'sign',
        source: tokens.slice(i, i + match.length).join(' '),
      });
      i += match.length;
      continue;
    }
    const word = tokens[i];
    if (/^\d+$/.test(word)) {
      // Numbers above ten are signed digit by digit.
      for (const digit of word) items.push({ gloss: `NUM-${digit}`, kind: 'sign', source: word });
      i += 1;
      continue;
    }
    if (!FILLER_WORDS.has(word)) {
      unsupported.push(word);
      if (options.fingerspell) {
        for (const ch of word.toUpperCase()) {
          if (/[A-Z]/.test(ch)) {
            items.push({ gloss: ch, kind: 'fingerspell', source: word });
          }
        }
      }
    }
    i += 1;
  }

  // Ordering rule: WH question words go to the end of the sentence.
  // Collapse immediate repeats ("omg ... lit" → WOW WOW).
  const deduped = items.filter(
    (it, idx) =>
      idx === 0 ||
      it.kind === 'fingerspell' ||
      it.gloss !== items[idx - 1].gloss ||
      items[idx - 1].kind === 'fingerspell',
  );
  items.length = 0;
  items.push(...deduped);
  const whItems = items.filter((it) => it.kind === 'sign' && WH_GLOSSES.has(it.gloss));
  const rest = items.filter((it) => !(it.kind === 'sign' && WH_GLOSSES.has(it.gloss)));
  const ordered = [...rest, ...whItems];

  if (isQuestion && ordered.length) {
    ordered.push({ gloss: 'QUESTION', kind: 'marker', source: '?' });
  }
  return { items: ordered, unsupported, rewrites, profanity };
}

/**
 * Translate free text into an ordered list of ISL gloss items.
 * @returns {{ok:boolean, error?:string, items:Array, unsupported:string[], notes:string[], glossString:string}}
 */
export function translate(text, options = {}) {
  const opts = { fingerspell: true, ...options };
  const error = validateInput(text);
  if (error)
    return {
      ok: false,
      error,
      items: [],
      unsupported: [],
      notes: [],
      rewrites: [],
      profanity: [],
      glossString: '',
    };

  const sentences = text
    .split(/(?<=[.!?,;])\s+|\n+/) // clauses are ordered independently
    .map((s) => s.trim())
    .filter(Boolean);

  const items = [];
  const unsupported = [];
  const notes = [];
  const rewrites = [];
  const profanity = [];
  for (const sentence of sentences) {
    const r = translateSentence(sentence, opts);
    items.push(...r.items);
    unsupported.push(...r.unsupported);
    rewrites.push(...r.rewrites);
    profanity.push(...r.profanity);
  }
  if (profanity.length) {
    notes.push(`Bad words signed: ${profanity.map((m) => m.word).join(', ')}.`);
  }

  const uniqueUnsupported = [...new Set(unsupported)];
  if (rewrites.length) {
    notes.push(`Understood ${rewrites.map((r) => `“${r.from}” as “${r.to}”`).join(', ')}.`);
  }
  if (uniqueUnsupported.length) {
    notes.push(
      opts.fingerspell
        ? `No sign in the vocabulary for: ${uniqueUnsupported.join(', ')}. These words are fingerspelled letter by letter.`
        : `No sign in the vocabulary for: ${uniqueUnsupported.join(', ')}. These words were skipped.`,
    );
  }
  if (items.length === 0) {
    return {
      ok: false,
      error:
        'None of these words are in the ISL vocabulary yet. Try one of the example phrases or simpler words.',
      items: [],
      unsupported: uniqueUnsupported,
      notes,
      rewrites,
      profanity,
      glossString: '',
    };
  }

  const enriched = items.map((it, idx) => {
    const entry = it.kind === 'fingerspell' ? null : getSignEntry(it.gloss);
    return {
      id: `${idx}-${it.gloss}`,
      ...it,
      label:
        it.kind === 'fingerspell'
          ? `${it.gloss} (fingerspell "${it.source}")`
          : entry?.kind === 'number'
            ? `${entry.value}`
            : it.gloss,
      description:
        entry?.description || (it.kind === 'fingerspell' ? `Fingerspelled letter ${it.gloss}` : ''),
      expression: entry?.expression || 'neutral',
    };
  });

  return {
    ok: true,
    items: enriched,
    unsupported: uniqueUnsupported,
    notes,
    rewrites,
    profanity,
    glossString: enriched
      .map((e) => (e.kind === 'fingerspell' ? `fs-${e.gloss}` : e.gloss))
      .join(' '),
  };
}

// Profanity normaliser. Nothing is censored or softened: every swear word has
// its own sign in the vocabulary. This module only maps masked, leet and
// variant spellings (f*ck, sh1t, bc, bkl…) onto the canonical word the
// vocabulary matcher knows, and reports each match so the UI can show
// "f*ck → FUCK".

// [pattern, canonical word(s)]
const RULES = [
  [
    /\bf+u+c+k+(?:ing|in|ed|er|ers|s|off)?\b|\bf\*+(?:ck|k)\w*|\bfu\*+k\w*|\bfck\w*|\bfuk\w*|\bf[\W_]?u[\W_]?c[\W_]?k\w*|\beff\s+off\b|\bf\s+off\b/g,
    'fuck',
  ],
  [/\bwtf\b|\bwth\b/g, 'what fuck'],
  [/\bstfu\b/g, 'shut up fuck'],
  [/\bmotherf\w*\b|\bmf\b|\bmofo\b/g, 'motherfucker'],
  [/\bbullshit\b|\bbull\s+shit\b|\bbs\b/g, 'bullshit'],
  [/\bsh+i+t+(?:ty|s|ting|e)?\b|\bsh\*+t\w*|\bsh1t\w*/g, 'shit'],
  [/\bb+i+t+c+h+(?:es|y|ing)?\b|\bb\*+tch\w*|\bb1tch\w*/g, 'bitch'],
  [/\ba+s+h+o+l+e+s?\b|\ba\*+hole\w*|\barsehole\w*/g, 'asshole'],
  [/\bass\b|\basses\b|\b@ss\b|\barse\b/g, 'ass'],
  [/\bbastards?\b/g, 'bastard'],
  [/\bdicks?\b|\bd\*ck\w*|\bcocks?\b|\bpricks?\b|\bdickhead\w*/g, 'dick'],
  [/\bcunts?\b|\bc\*nt\w*/g, 'cunt'],
  [/\bp+i+s+s+(?:ed)?\s*off\b/g, 'piss off'],
  [/\bpissed\b/g, 'angry'],
  [/\bpiss\b/g, 'piss'],
  [/\bslut\w*|\bwhores?\b|\bhoe\b|\bhoes\b/g, 'whore'],
  [/\bscrew(?:ed)?\s+you\b|\bscrew\s+(?:this|that|it)\b|\bscrew\s+off\b/g, 'fuck'],
  [/\bdamn(?:ed|it)?\b|\bdammit\b|\bgoddamn\w*/g, 'damn'],
  [/\bhell\b(?!o)/g, 'hell'],
  [/\bcrap(?:py)?\b/g, 'crap'],
  [
    /\bbloody\b|\bfreaking\b|\bfrigging\b|\bfricking\b|\bfriggin\b|\beffing\b|\bflipping\b/g,
    'damn',
  ],
  [/\bsucks?\b/g, 'sucks'],
  [
    /\bjerks?\b|\bmorons?\b|\bidiots?\b|\bidiotic\b|\bdumb(?:ass)?\b|\bfools?\b|\blosers?\b|\bdumbo\b/g,
    'idiot',
  ],
  [/\bshut\s*up\b|\bshaddup\b|\bchup\s*kar\b|\bchup\b/g, 'shut up'],
  [
    /\bget\s+lost\b|\bgo\s+away\b|\bbugger\s+off\b|\bchal\s+hat\b|\bnikal\b|\bbhaag\s+yahan\s+se\b/g,
    'get lost',
  ],
  // Hinglish
  [
    /\bbhen\s*chod\w*|\bbhenchod\w*|\bbehen\s*chod\w*|\bbehenchod\w*|\bbc\b|\bbkl\b|\bbehen\s+ke\s+lode\b/g,
    'bhenchod',
  ],
  [/\bmadar\s*chod\w*|\bmadarchod\w*|\bmc\b|\bmaa\s+ki\s+\w+\b/g, 'madarchod'],
  [/\bbhosdi\w*|\bbsdk\b|\bbhosad\w*/g, 'bhosdike'],
  [/\bchutiy[ae]\w*|\bchutiyap\w*|\bchu\*+\w*|\bchutia\w*/g, 'chutiya'],
  [/\bchut\b|\bchoot\b/g, 'chut'],
  [/\bgaand\w*|\bgand\b|\bgandu\w*|\bgaandu\w*/g, 'gandu'],
  [/\blund\b|\blauda\b|\blawda\b|\blode\b|\blodu\b/g, 'lund'],
  [/\brandi\b|\brand\b|\brandwa\b/g, 'randi'],
  [/\bharami\b|\bharam\s*khor\w*|\bharamkhor\w*|\bharamzad\w*/g, 'harami'],
  [/\bkamin[aie]\b|\bkamine\b/g, 'kamina'],
  [/\bkutt[aei]\b|\bkutte\s+ki\s+\w+\b|\bkutta\s+kamina\b/g, 'kutta'],
  [/\bsaal[aei]\b|\bsal[aei]\b|\bsaale\b/g, 'saala'],
  [/\bbakchod\w*|\bbakchodi\b/g, 'bakchod'],
  [/\btatti\b|\btatte\b/g, 'tatti'],
  [
    /\bpagal\b|\bpaagal\b|\bullu\b|\bgadh[ae]\b|\bbewakoof\b|\bbevkoof\b|\bbuddhu\b|\bnalayak\b|\bbevakoof\b/g,
    'pagal',
  ],
  [/\bbakwaas\b|\bbakwas\b|\bfaltu\b/g, 'bakwaas'],
  [/\bghatiya\b|\bghatia\b/g, 'ghatiya'],
];

/**
 * @param {string} text lowercased sentence
 * @returns {{ text: string, matches: Array<{word: string, to: string}> }}
 */
export function normaliseProfanity(text) {
  const matches = [];
  let out = ` ${text} `;
  for (const [re, canonical] of RULES) {
    re.lastIndex = 0;
    out = out.replace(re, (m) => {
      const word = m.trim();
      if (!word) return m;
      matches.push({ word, to: canonical });
      return ` ${canonical} `;
    });
  }
  return { text: out.replace(/\s+/g, ' ').trim(), matches };
}

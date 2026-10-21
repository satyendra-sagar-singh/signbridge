// Profanity handling. Detects English and Hinglish swear words (including
// common asterisk / leetspeak spellings) and applies one of three policies
// chosen by the user:
//   censor  – replace with the CENSORED marker sign (avatar covers its mouth)
//   soften  – replace with the nearest neutral meaning (or drop intensifiers)
//   spell   – keep the word so it is fingerspelled letter by letter
// Every match is reported so the UI can say what happened.

export const PROFANITY_POLICIES = ['censor', 'soften', 'spell']
export const CENSOR_TOKEN = 'censoredword'

// [pattern, softened replacement]. '' drops the word (pure intensifiers).
const STRONG = [
  [/\bf+u+c+k+(?:ing|in|ed|er|ers|s|off)?\b|\bf\*+(?:ck|k)\w*|\bfu\*+k\w*|\bfck\w*|\bfuk\w*|\bf[\W_]?u[\W_]?c[\W_]?k\w*/g, ''],
  [/\bwtf\b|\bwth\b/g, 'what'],
  [/\bstfu\b/g, 'quiet'],
  [/\bsh+i+t+(?:ty|s|ting)?\b|\bsh\*+t\w*|\bsh1t\w*|\bbullshit\b|\bbs\b/g, 'bad'],
  [/\bb+i+t+c+h+(?:es|y|ing)?\b|\bb\*+tch\w*|\bb1tch\w*/g, 'bad person'],
  [/\ba+s+h+o+l+e+s?\b|\ba\*+hole\w*|\b@ss\w*|\barse(?:hole)?s?\b/g, 'bad person'],
  [/\bass\b|\basses\b/g, 'bad'],
  [/\bbastards?\b/g, 'bad person'],
  [/\bdicks?\b|\bd\*ck\w*|\bcocks?\b|\bpricks?\b/g, 'bad person'],
  [/\bcunts?\b|\bc\*nt\w*/g, 'bad person'],
  [/\bp+i+s+(?:ed|ing)?\s*off\b|\bpissed\b/g, 'angry'],
  [/\bpiss\b/g, 'bad'],
  [/\bmotherf\w*\b|\bmf\b|\bmofo\b/g, 'bad person'],
  [/\bslut\w*|\bwhores?\b|\bhoe?s?\b/g, 'bad person'],
  [/\bscrew(?:ed)?\s+you\b|\bscrew\s+(?:this|that|it)\b/g, 'bad'],
  // Hinglish
  [/\bbhen\s*chod\w*|\bbhenchod\w*|\bbehen\s*chod\w*|\bbc\b|\bbkl\b|\bbhosdi\w*|\bbsdk\b/g, ''],
  [/\bmadar\s*chod\w*|\bmadarchod\w*|\bmc\b/g, ''],
  [/\bchut\w*|\bchoot\w*/g, 'bad person'],
  [/\bgaand\w*|\bgand\b|\bgandu\w*|\bgaandu\w*/g, 'bad person'],
  [/\blund\b|\blauda\b|\blawda\b|\blode\b/g, 'bad person'],
  [/\brandi\b|\brand\b/g, 'bad person'],
  [/\bharami\b|\bharam\s*khor\w*|\bharamkhor\w*/g, 'bad person'],
  [/\bkamin[aie]\b|\bkutt[aei]\b(?=\s*(?:ka|ki|ke|saal|sala|tu|tum|hai)\b)/g, 'bad person'],
  [/\bsaal[aei]\b|\bsal[aei]\b|\bsaale\b/g, 'bad person'],
  [/\bbakchod\w*|\bbakchodi\b/g, 'nonsense'],
  [/\btatti\b|\btatte\b/g, 'bad'],
  [/\bchutiy[ae]\w*|\bchutiyap\w*|\bchu\*+\w*/g, 'stupid'],
]

const MILD = [
  [/\bdamn(?:ed|it)?\b|\bdammit\b|\bgoddamn\w*/g, 'bad'],
  [/\bhell\b(?!o)/g, 'bad'],
  [/\bcrap(?:py)?\b/g, 'bad'],
  [/\bbloody\b|\bfreaking\b|\bfrigging\b|\bfricking\b|\bfriggin\b|\beffing\b|\bflipping\b/g, ''],
  [/\bsucks?\b/g, 'bad'],
  [/\bjerks?\b|\bmorons?\b|\bidiots?\b|\bidiotic\b|\bdumb(?:ass)?\b|\bfools?\b|\bloser\b/g, 'stupid'],
  [/\bshut\s*up\b|\bshaddup\b|\bchup\b|\bchup\s*kar\b/g, 'quiet'],
  [/\bpagal\b|\bpaagal\b|\bullu\b|\bgadh[ae]\b|\bbewakoof\b|\bbevkoof\b|\bbuddhu\b|\bnalayak\b/g, 'stupid'],
  [/\bbakwaas\b|\bbakwas\b|\bfaltu\b|\bnonsense\b|\brubbish\b/g, 'nonsense'],
  [/\bnikal\b|\bbhaag\b|\bget\s+lost\b|\bgo\s+away\b|\bbugger\s+off\b|\bchal\s+hat\b/g, 'go'],
]

/**
 * @param {string} text lowercased sentence
 * @param {'censor'|'soften'|'spell'} policy
 * @returns {{ text: string, matches: Array<{word: string, action: string, replacement: string}> }}
 */
export function applyProfanityPolicy(text, policy = 'censor') {
  const matches = []
  let out = ` ${text} `
  const run = (rules, strength) => {
    for (const [re, soft] of rules) {
      re.lastIndex = 0
      out = out.replace(re, (m) => {
        const word = m.trim()
        if (!word) return m
        let replacement
        let action
        if (policy === 'spell') {
          replacement = word.replace(/[^a-z]/g, '') || word
          action = 'spelled'
        } else if (policy === 'soften' || strength === 'mild') {
          // mild words are always softened: a bleep for "damn" is overkill
          replacement = soft
          action = soft ? 'softened' : 'dropped'
        } else {
          replacement = CENSOR_TOKEN
          action = 'censored'
        }
        matches.push({ word, action, replacement: replacement || '(dropped)' })
        return ` ${replacement} `
      })
    }
  }
  run(STRONG, 'strong')
  run(MILD, 'mild')
  return { text: out.replace(/\s+/g, ' ').trim(), matches }
}

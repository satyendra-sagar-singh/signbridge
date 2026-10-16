// Slang, texting abbreviations and colloquial/Hinglish phrases → standard
// English the vocabulary matcher understands. Rules are applied in order to
// the lowercased sentence; each applied rule is reported so the UI can show
// "understood “wassup” as “how are you”".

const RULES = [
  // greetings & small talk
  [/\b(wassup|whassup|wazzup|what'?s up|whats up|sup|howdy|how'?s it going|how are you doing|how do you do|how are things|how r u|hru|how u doin'?|kaise ho|kaisi ho|kya haal hai|kya haal)\b/g, 'how are you'],
  [/\b(hiya|heya|yo|hey there|hello there|hi there)\b/g, 'hello'],
  [/\b(nice to meet you|pleased to meet you|good to meet you)\b/g, 'good meet you'],
  [/\b(good night|gn|gud night|nighty night)\b/g, 'night good'],
  [/\b(i'?m fine|i am fine|i'?m good|i am good|i'?m ok|i'?m okay|all good|im fine|im good|fine thanks|theek hoon|thik hoon|main theek hoon)\b/g, 'me good'],
  [/\b(brb|be right back)\b/g, 'wait me come'],
  [/\b(ttyl|talk to you later)\b/g, 'later talk'],
  [/\b(gtg|g2g|got to go|gotta go|have to go)\b/g, 'me must go'],
  [/\b(idk|dunno|don'?t know|do not know|no idea|pata nahi|pata nahin)\b/g, 'me know no'],
  [/\b(ikr|i know right)\b/g, 'yes me know'],
  [/\b(np|no problem|no worries|no prob|koi baat nahi|koi baat nahin|it'?s ok|its ok|it'?s okay|its okay|it'?s fine)\b/g, 'ok'],
  [/\b(yw|you'?re welcome|ur welcome|you are welcome|most welcome)\b/g, 'welcome'],
  [/\b(thx|thnx|thanx|tysm|tyvm|ty|thank u|thanks a lot|thanks so much|thank you so much|thanks a ton|shukriya|dhanyawad|dhanyavaad|many thanks|cheers)\b/g, 'thank you'],
  [/\b(pls|plz|plzz|plss|please please|kripya)\b/g, 'please'],
  [/\b(sry|soz|my bad|apologies|maaf karo|maaf kijiye|maaf)\b/g, 'sorry'],
  [/\b(congratz|congratz|gz|gg)\b/g, 'congrats'],
  [/\b(hbd|happy birthday|happy bday|janamdin mubarak)\b/g, 'birthday happy'],
  [/\b(k|kk|okie|okies|okay okay|alright then|theek hai|thik hai|thik h|theek h|acha|accha|achha|haanji|ji haan|ji)\b/g, 'ok'],
  [/\b(ya|yah|yea|yass|yasss|yup|yupp|yeh|haa|haan ji|ha)\b/g, 'yes'],
  [/\b(nah|naah|nope|nopes|na|nahi ji|nay)\b/g, 'no'],
  // contractions of speech
  [/\bgonna\b/g, 'going to'],
  [/\bwanna\b/g, 'want to'],
  [/\bgotta\b/g, 'must'],
  [/\bhafta\b/g, 'must'],
  [/\bneed to\b/g, 'need'],
  [/\bhave to\b/g, 'must'],
  [/\bhas to\b/g, 'must'],
  [/\blemme\b/g, 'let me'],
  [/\bgimme\b/g, 'give me'],
  [/\bkinda\b/g, ''],
  [/\bsorta\b/g, ''],
  [/\bouta\b/g, 'out of'],
  [/\by'?all\b/g, 'you'],
  [/\bain'?t\b/g, 'not'],
  [/\bcuz\b|\bcoz\b|\bcos\b|\bbcoz\b|\bbcz\b|\bbc\b/g, 'because'],
  // texting abbreviations
  [/\bu'?re\b/g, 'you are'],
  [/\bu\b/g, 'you'],
  [/\bur\b/g, 'your'],
  [/\br\b/g, 'are'],
  [/\bn\b/g, 'and'],
  [/\bw\/\B|\bw\b/g, 'with'],
  [/\bm\b/g, 'am'],
  [/\bb\b/g, 'be'],
  [/\bc\b/g, 'see'],
  [/\by\b/g, 'why'],
  [/\bwat\b|\bwut\b|\bwht\b/g, 'what'],
  [/\bwen\b|\bwhn\b/g, 'when'],
  [/\bwer\b|\bwhr\b/g, 'where'],
  [/\bhw\b/g, 'how'],
  [/\bhv\b/g, 'have'],
  [/\bgud\b|\bgd\b|\bgr8\b|\bgreat\b/g, 'good'],
  [/\bgr8\b/g, 'good'],
  [/\b2day\b|\btoday\b/g, 'today'],
  [/\b2moro\b|\b2morrow\b|\btmrw\b|\btmr\b|\btomo\b/g, 'tomorrow'],
  [/\bl8r\b|\bl8er\b/g, 'later'],
  [/\bb4\b/g, 'before'],
  [/\bbtw\b|\bimo\b|\bimho\b|\bfyi\b|\btbh\b|\bngl\b|\bsmh\b|\bfml\b/g, ''],
  [/\bomw\b/g, 'me come now'],
  [/\basap\b/g, 'fast'],
  [/\bnvm\b/g, 'never mind'],
  [/\bbff\b|\bbestie\b|\bbestfriend\b|\bbest friend\b/g, 'friend'],
  [/\bbro\b|\bbruh\b|\bbruv\b|\bdude\b|\bmate\b|\bbuddy\b|\bpal\b|\byaar\b|\byar\b|\bbhai\b|\bbhaiya\b/g, 'friend'],
  [/\bbae\b|\bgf\b|\bbf\b|\bboyfriend\b|\bgirlfriend\b|\bhubby\b|\bwifey\b|\bjaan\b/g, 'love'],
  [/\bfam\b/g, 'family'],
  [/\bgrub\b|\bgrab a bite\b|\bbite to eat\b/g, 'food'],
  [/\bchow\b/g, 'food'],
  [/\bhangry\b/g, 'hungry angry'],
  [/\bsleepyhead\b/g, 'sleepy'],
  [/\bchillin'?\b|\bchillax\b|\bchilling\b/g, 'relax'],
  [/\blit\b|\bdope\b|\bepic\b|\bbanger\b/g, 'awesome'],
  [/\bmeh\b|\bwhatever\b|\bwhatevs\b/g, 'maybe'],
  [/\bsus\b/g, 'wrong'],
  [/\bcap\b|\bno cap\b/g, 'true'],
  [/\bfr\b|\bfrfr\b|\bfor real\b|\bsrsly\b/g, 'true'],
  [/\bbasically\b|\bliterally\b|\bactually\b|\blike\s+(?=(?:so|really|very|totally)\b)/g, ''],
  [/\btotally\b|\babsolutely\b|\bdefinitely\b/g, 'yes'],
  // Hinglish common words
  [/\bmujhe\b|\bmain\b|\bmein\b|\bmujhko\b|\bmera\b|\bmeri\b|\bmere\b/g, 'me'],
  [/\btum\b|\baap\b|\btumhe\b|\btumhara\b|\btumhari\b|\baapka\b|\baapki\b|\btu\b/g, 'you'],
  [/\bchahiye\b|\bchahiya\b|\bchaiye\b/g, 'need'],
  [/\bkya\b/g, 'what'],
  [/\bkyun\b|\bkyu\b|\bkyon\b/g, 'why'],
  [/\bkahan\b|\bkaha\b|\bkidhar\b/g, 'where'],
  [/\bkab\b/g, 'when'],
  [/\bkaun\b|\bkon\b/g, 'who'],
  [/\bkaise\b|\bkaisa\b|\bkaisi\b/g, 'how'],
  [/\bchalo\b|\bchal\b|\bjao\b|\bjaana\b|\bjana\b/g, 'go'],
  [/\bbhook\b|\bbhookh\b|\bbhukha\b|\bbhuki\b/g, 'hungry'],
  [/\bpyaas\b|\bpyas\b/g, 'thirsty'],
  [/\bmadad\b|\bmadat\b|\bsahayata\b/g, 'help'],
  [/\bsamjha\b|\bsamjhi\b|\bsamajh gaya\b|\bsamajh gayi\b/g, 'understand'],
  [/\bnahin\b|\bnahi\b|\bmat\b/g, 'no'],
  [/\bhaan\b|\bhan\b/g, 'yes'],
  [/\bbahut\b|\bbohot\b|\bbohat\b/g, 'very'],
  [/\baur\b/g, 'and'],
  [/\bhai\b|\bhain\b|\bho\b|\bhoon\b|\bhun\b|\bhu\b|\bhoga\b|\bhogi\b|\btha\b|\bthi\b|\bthe\b/g, ''],
]

/**
 * @param {string} sentence lowercased sentence
 * @returns {{ text: string, rewrites: Array<{from: string, to: string}> }}
 */
export function normaliseSlang(sentence) {
  let text = ` ${sentence} `
  const rewrites = []
  for (const [re, replacement] of RULES) {
    re.lastIndex = 0
    text = text.replace(re, (match) => {
      const from = match.trim()
      const to = replacement.trim()
      if (from && from !== to && !/^(the|today|good|great)$/.test(from)) rewrites.push({ from, to: to || '(dropped)' })
      return replacement ? ` ${replacement} ` : ' '
    })
  }
  // de-duplicate rewrites
  const seen = new Set()
  const unique = rewrites.filter((r) => {
    const key = `${r.from}→${r.to}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { text: text.replace(/\s+/g, ' ').trim(), rewrites: unique }
}

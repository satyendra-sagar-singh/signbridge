import { describe, expect, it } from 'vitest'
import { translate, validateInput, MAX_INPUT_LENGTH } from '../src/translation/translate.js'

const glosses = (r) => r.items.map((i) => i.gloss)

describe('validateInput', () => {
  it('rejects empty, too long and letter-less input', () => {
    expect(validateInput('')).toMatch(/type a sentence/i)
    expect(validateInput('   ')).toMatch(/type a sentence/i)
    expect(validateInput('a'.repeat(MAX_INPUT_LENGTH + 1))).toMatch(/under/i)
    expect(validateInput('!!! ???')).toMatch(/word or number/i)
    expect(validateInput('hello')).toBeNull()
  })
})

describe('translate', () => {
  it('translates the example phrases', () => {
    expect(glosses(translate('Hello.'))).toEqual(['HELLO'])
    expect(glosses(translate('Thank you.'))).toEqual(['THANK-YOU'])
    expect(glosses(translate('I need help.'))).toEqual(['ME', 'NEED', 'HELP'])
    expect(glosses(translate('I need water.'))).toEqual(['ME', 'NEED', 'WATER'])
  })

  it('moves WH-words to the end and adds the question marker', () => {
    expect(glosses(translate('How are you?'))).toEqual(['YOU', 'HOW', 'QUESTION'])
    expect(glosses(translate('What is your name?'))).toEqual(['YOU', 'NAME', 'WHAT', 'QUESTION'])
  })

  it('drops filler words and handles contractions', () => {
    expect(glosses(translate("I'm going home"))).toEqual(['ME', 'GO', 'HOME'])
    expect(glosses(translate("I don't understand."))).toEqual(['ME', 'NO', 'UNDERSTAND'])
  })

  it('handles multiple sentences', () => {
    expect(glosses(translate('Hello. I need water.'))).toEqual(['HELLO', 'ME', 'NEED', 'WATER'])
  })

  it('fingerspells unknown words and reports them', () => {
    const r = translate('I need xyz')
    expect(r.ok).toBe(true)
    expect(r.unsupported).toEqual(['xyz'])
    expect(glosses(r)).toEqual(['ME', 'NEED', 'X', 'Y', 'Z'])
    expect(r.items[2].kind).toBe('fingerspell')
    expect(r.notes[0]).toMatch(/fingerspelled/i)
  })

  it('skips unknown words when fingerspelling is off', () => {
    const r = translate('I need xyz', { fingerspell: false })
    expect(glosses(r)).toEqual(['ME', 'NEED'])
  })

  it('fails gracefully when nothing is translatable', () => {
    const r = translate('the a an', { fingerspell: false })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/vocabulary/i)
  })

  it('normalises slang and texting abbreviations and reports the rewrites', () => {
    const r = translate('wassup bro?')
    expect(glosses(r)).toEqual(['YOU', 'FRIEND', 'HOW', 'QUESTION'])
    expect(r.rewrites).toEqual(expect.arrayContaining([{ from: 'wassup', to: 'how are you' }, { from: 'bro', to: 'friend' }]))
    expect(r.notes.join(' ')).toMatch(/understood/i)
    expect(glosses(translate('thx, gonna grab chai brb'))).toEqual(['THANK-YOU', 'GO', 'TAKE', 'TEA', 'WAIT', 'ME', 'COME'])
    expect(glosses(translate('idk tbh'))).toEqual(['ME', 'UNDERSTAND', 'NO'])
    // comma clauses keep their own word order and question marker
    expect(glosses(translate('wassup bro, call me pls'))).toEqual(['YOU', 'FRIEND', 'HOW', 'QUESTION', 'PHONE', 'ME', 'PLEASE'])
  })

  it('understands Hinglish words', () => {
    expect(glosses(translate('mujhe paani chahiye'))).toEqual(['ME', 'WATER', 'NEED'])
    expect(glosses(translate('kya haal hai?'))).toEqual(['YOU', 'HOW', 'QUESTION'])
  })

  it('signs numbers: 0–10 as one sign, larger numbers digit by digit', () => {
    expect(glosses(translate('I need 2 books'))).toEqual(['ME', 'NEED', 'NUM-2', 'BOOK'])
    expect(glosses(translate('call 108'))).toEqual(['PHONE', 'NUM-1', 'NUM-0', 'NUM-8'])
    const r = translate('ten')
    expect(r.items[0]).toMatchObject({ gloss: 'NUM-10', label: '10' })
  })

  it('signs swear words with their own signs, no censoring, and reports them', () => {
    const r = translate('what the f*ck, this is sh1t')
    expect(glosses(r)).toEqual(['FUCK', 'WHAT', 'QUESTION', 'SHIT'])
    expect(r.profanity).toEqual([{ word: 'f*ck', to: 'fuck' }, { word: 'sh1t', to: 'shit' }])
    expect(r.notes.join(' ')).toMatch(/Bad words signed: f\*ck, sh1t/)
    expect(r.unsupported).toEqual([])
    expect(r.items[0].expression).toBe('frown')
  })

  it('maps abbreviations and insults to signs', () => {
    expect(glosses(translate('wtf is this'))).toEqual(['FUCK', 'WHAT', 'QUESTION'])
    expect(glosses(translate('shut up you idiot'))).toEqual(['SHUT-UP', 'YOU', 'IDIOT'])
    expect(glosses(translate('this damn phone sucks'))).toEqual(['DAMN', 'PHONE', 'CRAP'])
  })

  it('signs Hinglish swear words and variants', () => {
    expect(glosses(translate('tu pagal hai'))).toEqual(['YOU', 'IDIOT'])
    expect(glosses(translate('bc kya kar raha hai?'))).toEqual(['BHENCHOD', 'DO', 'WHAT', 'QUESTION'])
    expect(glosses(translate('saale chutiya'))).toEqual(['SAALA', 'CHUTIYA'])
  })

  it('returns an error for invalid input', () => {
    expect(translate('').ok).toBe(false)
  })

  it('enriches items with labels and descriptions', () => {
    const r = translate('hello')
    expect(r.items[0]).toMatchObject({ gloss: 'HELLO', label: 'HELLO', expression: 'smile' })
    expect(r.items[0].description.length).toBeGreaterThan(10)
    expect(r.glossString).toBe('HELLO')
  })
})

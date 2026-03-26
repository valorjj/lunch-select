// Korean Hangul decomposition/composition utilities
// Unicode range: 가 (0xAC00) to 힣 (0xD7A3)
// syllable = 0xAC00 + (initial * 21 + medial) * 28 + final

const INITIALS = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

const MEDIALS = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
];

const FINALS = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

const HANGUL_BASE = 0xAC00;

export function isSyllable(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0xAC00 && code <= 0xD7A3;
}

export function decompose(syllable: string): string[] {
  if (!isSyllable(syllable)) return [syllable];
  const code = syllable.charCodeAt(0) - HANGUL_BASE;
  const finalIdx = code % 28;
  const medialIdx = ((code - finalIdx) / 28) % 21;
  const initialIdx = Math.floor(((code - finalIdx) / 28) / 21);

  const result = [INITIALS[initialIdx], MEDIALS[medialIdx]];
  if (FINALS[finalIdx]) {
    result.push(FINALS[finalIdx]);
  }
  return result;
}

export function decomposeWord(word: string): string[] {
  const jamos: string[] = [];
  for (const char of word) {
    jamos.push(...decompose(char));
  }
  return jamos;
}

export function isJamo(char: string): boolean {
  return INITIALS.includes(char) || MEDIALS.includes(char) || FINALS.includes(char);
}

export function isConsonant(char: string): boolean {
  return INITIALS.includes(char);
}

export function isVowel(char: string): boolean {
  return MEDIALS.includes(char);
}

export { INITIALS, MEDIALS, FINALS };

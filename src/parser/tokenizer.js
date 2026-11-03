import { UNSUPPORTED_OPERATORS } from './grammar.js';

const OPERATORS = new Set(['+', '-', '*', '/']);
const PARENTHESES = new Set(['(', ')']);
const IDENTIFIER_START = /[A-Za-z_]/;
const IDENTIFIER_PART = /[A-Za-z0-9_]/;
const DIGIT = /\d/;

export class TokenizeError extends SyntaxError {
  constructor(message, start, end = start + 1) {
    super(`${message} at character ${start}.`);
    this.name = 'TokenizeError';
    this.start = start;
    this.end = end;
  }
}

function numberToken(source, start) {
  let end = start;

  if (source[end] === '.') {
    end += 1;
    while (DIGIT.test(source[end] ?? '')) end += 1;
  } else {
    while (DIGIT.test(source[end] ?? '')) end += 1;
    if (source[end] === '.') {
      end += 1;
      while (DIGIT.test(source[end] ?? '')) end += 1;
    }
  }

  if (source[end] === '.') {
    let malformedEnd = end + 1;
    while (/[\d.]/.test(source[malformedEnd] ?? '')) malformedEnd += 1;
    throw new TokenizeError(`Malformed numeric literal "${source.slice(start, malformedEnd)}"`, start, malformedEnd);
  }

  const raw = source.slice(start, end);
  return { token: { type: 'NUMBER', value: Number(raw), raw, start, end }, end };
}

/**
 * Convert an expression string to a token stream.
 *
 * Token offsets are zero-based and `end` is exclusive. Decimal literals may
 * have digits on either side of a single decimal point (`.5` and `5.` are
 * valid); a second decimal point in the same literal is a lexical error.
 */
export function tokenize(source) {
  if (typeof source !== 'string') throw new TypeError('Expression source must be a string.');
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) { index += 1; continue; }
    if (character === '*' && source[index + 1] === '*') {
      throw new TokenizeError('Unsupported operator "**"', index, index + 2);
    }
    if (OPERATORS.has(character)) {
      tokens.push({ type: 'OPERATOR', value: character, start: index, end: index + 1 });
      index += 1;
      continue;
    }
    if (PARENTHESES.has(character)) {
      tokens.push({ type: 'PAREN', value: character, start: index, end: index + 1 });
      index += 1;
      continue;
    }
    if (DIGIT.test(character) || (character === '.' && DIGIT.test(source[index + 1] ?? ''))) {
      const number = numberToken(source, index);
      tokens.push(number.token);
      index = number.end;
      continue;
    }
    if (IDENTIFIER_START.test(character)) {
      const start = index;
      index += 1;
      while (IDENTIFIER_PART.test(source[index] ?? '')) index += 1;
      tokens.push({ type: 'IDENTIFIER', value: source.slice(start, index), start, end: index });
      continue;
    }
    if (UNSUPPORTED_OPERATORS.has(character)) {
      throw new TokenizeError(`Unsupported operator "${character}"`, index, index + 1);
    }
    throw new TokenizeError(`Invalid character "${character}"`, index);
  }
  tokens.push({ type: 'EOF', value: '', start: index, end: index });
  return tokens;
}

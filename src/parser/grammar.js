/** The grammar displayed in documentation and implemented by Parser. */
export const GRAMMAR = `E  → T E'
E' → + T E' | - T E' | ε
T  → U T'
T' → * U T' | / U T' | ε
U  → + U | - U | P
P  → ( E ) | id | num`;

export const PRECEDENCE = Object.freeze({ '+': 1, '-': 1, '*': 2, '/': 2 });
export const ADDITIVE_OPERATORS = Object.freeze(new Set(['+', '-']));
export const MULTIPLICATIVE_OPERATORS = Object.freeze(new Set(['*', '/']));
export const UNARY_OPERATORS = Object.freeze(new Set(['+', '-']));
export const UNSUPPORTED_OPERATORS = Object.freeze(new Set(['%', '**', '^']));

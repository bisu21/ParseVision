const BINARY_OPERATORS = new Set(['+', '-', '*', '/']);
const UNARY_OPERATORS = new Set(['+', '-']);
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NUMBER_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
const NODE_TYPES = new Set(['Literal', 'Identifier', 'BinaryExpression', 'UnaryExpression']);

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function isNode(value) {
  return value !== null && typeof value === 'object' && NODE_TYPES.has(value.type);
}

/** Create a BinaryExpression with one of ParseVision's four arithmetic operators. */
export function binaryExpression(operator, left, right) {
  assert(BINARY_OPERATORS.has(operator), `Unsupported binary operator "${operator}".`);
  assert(isNode(left), 'BinaryExpression left must be an AST node.');
  assert(isNode(right), 'BinaryExpression right must be an AST node.');
  return { type: 'BinaryExpression', operator, left, right };
}

export function unaryExpression(operator, argument) {
  assert(UNARY_OPERATORS.has(operator), `Unsupported unary operator "${operator}".`);
  assert(isNode(argument), 'UnaryExpression argument must be an AST node.');
  return { type: 'UnaryExpression', operator, argument };
}

export function identifier(name) {
  assert(typeof name === 'string' && IDENTIFIER_PATTERN.test(name), 'Identifier name must match the initial identifier grammar.');
  return { type: 'Identifier', name };
}

/**
 * Create a Literal. Pass raw numeric text alone, or preserve the compatible
 * `literal(number, raw)` form used by the parser.
 */
export function literal(valueOrRaw, suppliedRaw) {
  const raw = suppliedRaw ?? valueOrRaw;
  assert(typeof raw === 'string' && NUMBER_PATTERN.test(raw), `Invalid numeric literal text "${raw}".`);
  const value = suppliedRaw === undefined ? Number(raw) : valueOrRaw;
  assert(typeof value === 'number' && Number.isFinite(value), 'Literal value must be a finite number.');
  assert(Number(raw) === value, `Literal value does not match raw text "${raw}".`);
  return { type: 'Literal', value, raw };
}

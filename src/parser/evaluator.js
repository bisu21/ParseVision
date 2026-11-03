/**
 * Expression evaluator for ParseVision's arithmetic AST.
 *
 * Evaluates semantic plain-object AST nodes:
 * - BinaryExpression (+, -, *, /)
 * - UnaryExpression (+, -)
 * - Literal / NumericLiteral
 * - Identifier (resolved via environment map)
 *
 * Arithmetic semantics:
 * - Addition, subtraction, multiplication, and division
 * - Left associativity and operator precedence are encoded in the AST structure
 * - Prefix unary + returns the numeric operand
 * - Prefix unary - negates the numeric operand
 * - Identifiers are resolved via the provided env map; throws ReferenceError if unresolved
 * - Division by zero evaluates to Infinity / -Infinity according to IEEE 754 arithmetic
 */

export function evaluate(node, env = {}) {
  if (!node || typeof node !== 'object') {
    throw new TypeError('Evaluation requires a valid AST node object.');
  }

  switch (node.type) {
    case 'Literal':
    case 'NumericLiteral': {
      const val = typeof node.value === 'number' ? node.value : Number(node.raw ?? node.value);
      if (!Number.isFinite(val)) {
        throw new TypeError(`Invalid literal value: ${node.value ?? node.raw}`);
      }
      return val;
    }

    case 'Identifier': {
      if (typeof node.name !== 'string' || node.name.length === 0) {
        throw new TypeError('Identifier node requires a valid name property.');
      }
      if (env && Object.prototype.hasOwnProperty.call(env, node.name)) {
        const val = Number(env[node.name]);
        if (Number.isNaN(val)) {
          throw new TypeError(`Identifier "${node.name}" in environment is not a valid number: ${env[node.name]}`);
        }
        return val;
      }
      throw new ReferenceError(`Unresolved identifier "${node.name}".`);
    }

    case 'UnaryExpression': {
      if (!node.argument || typeof node.argument !== 'object') {
        throw new TypeError('UnaryExpression requires an argument child node.');
      }
      const argVal = evaluate(node.argument, env);
      if (node.operator === '+') {
        return +argVal;
      }
      if (node.operator === '-') {
        return -argVal;
      }
      throw new TypeError(`Unsupported unary operator "${node.operator}".`);
    }

    case 'BinaryExpression': {
      if (!node.left || typeof node.left !== 'object') {
        throw new TypeError('BinaryExpression requires a left child node.');
      }
      if (!node.right || typeof node.right !== 'object') {
        throw new TypeError('BinaryExpression requires a right child node.');
      }
      const leftVal = evaluate(node.left, env);
      const rightVal = evaluate(node.right, env);

      switch (node.operator) {
        case '+':
          return leftVal + rightVal;
        case '-':
          return leftVal - rightVal;
        case '*':
          return leftVal * rightVal;
        case '/':
          return leftVal / rightVal;
        default:
          throw new TypeError(`Unsupported binary operator "${node.operator}".`);
      }
    }

    default:
      throw new TypeError(`Unsupported AST node type "${node.type}".`);
  }
}

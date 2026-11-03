const SUPPORTED_TYPES = new Set(['Literal', 'Identifier', 'BinaryExpression', 'UnaryExpression']);

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

/**
 * Validate that a value is a valid AST node according to ParseVision's schema.
 * Rejects unsupported types, missing required properties, and circular references.
 */
export function validateNode(node, visited = new Set()) {
  assert(node !== null && typeof node === 'object', 'An AST node object is required for traversal.');
  assert(!visited.has(node), 'AST cannot contain circular references.');
  assert(SUPPORTED_TYPES.has(node.type), `Unsupported AST node type "${node.type}".`);

  if (node.type === 'BinaryExpression') {
    assert(typeof node.operator === 'string' && node.operator.length > 0, 'BinaryExpression requires an operator.');
    assert(node.left !== null && typeof node.left === 'object', 'BinaryExpression requires a valid left child node.');
    assert(node.right !== null && typeof node.right === 'object', 'BinaryExpression requires a valid right child node.');
  } else if (node.type === 'UnaryExpression') {
    assert(typeof node.operator === 'string' && node.operator.length > 0, 'UnaryExpression requires an operator.');
    assert(node.argument !== null && typeof node.argument === 'object', 'UnaryExpression requires a valid argument child node.');
  } else if (node.type === 'Identifier') {
    assert(typeof node.name === 'string' && node.name.length > 0, 'Identifier requires a valid name.');
  } else if (node.type === 'Literal') {
    assert(
      (typeof node.raw === 'string' && node.raw.length > 0) || (typeof node.value === 'number' && Number.isFinite(node.value)),
      'Literal requires valid raw text or a finite numeric value.'
    );
  }
}

/**
 * Format an AST node into a consistent string representation:
 * Identifier(name), Literal(raw|value), BinaryExpression(op), UnaryExpression(op).
 */
export function formatNode(node) {
  validateNode(node);
  switch (node.type) {
    case 'BinaryExpression':
      return `BinaryExpression(${node.operator})`;
    case 'UnaryExpression':
      return `UnaryExpression(${node.operator})`;
    case 'Identifier':
      return `Identifier(${node.name})`;
    case 'Literal':
      return `Literal(${node.raw ?? node.value})`;
    default:
      throw new TypeError(`Unsupported AST node type "${node.type}".`);
  }
}

function resolveRepresentation(node, options) {
  if (options.asNodes) return node;
  if (typeof options.format === 'function') return options.format(node);
  return formatNode(node);
}

/**
 * Preorder traversal (Node → Left → Right).
 * Visits the current node before visiting its children.
 * For unary expressions, visits operator before operand.
 */
export function preorder(node, options = {}) {
  const result = [];
  function walk(current, visited) {
    validateNode(current, visited);
    const nextVisited = new Set(visited);
    nextVisited.add(current);

    result.push(resolveRepresentation(current, options));

    if (current.type === 'BinaryExpression') {
      walk(current.left, nextVisited);
      walk(current.right, nextVisited);
    } else if (current.type === 'UnaryExpression') {
      walk(current.argument, nextVisited);
    }
  }
  walk(node, new Set());
  return result;
}

/**
 * Inorder traversal (Left → Node → Right for binary expressions).
 * For unary expressions, visits operator before operand by documented convention,
 * as inorder traversal is naturally defined for binary trees.
 */
export function inorder(node, options = {}) {
  const result = [];
  function walk(current, visited) {
    validateNode(current, visited);
    const nextVisited = new Set(visited);
    nextVisited.add(current);

    const repr = resolveRepresentation(current, options);

    if (current.type === 'BinaryExpression') {
      walk(current.left, nextVisited);
      result.push(repr);
      walk(current.right, nextVisited);
    } else if (current.type === 'UnaryExpression') {
      // Inorder convention for unary: visit operator before operand
      result.push(repr);
      walk(current.argument, nextVisited);
    } else {
      result.push(repr);
    }
  }
  walk(node, new Set());
  return result;
}

/**
 * Postorder traversal (Left → Right → Node).
 * Visits children before the current node.
 * For unary expressions, visits operand before operator.
 */
export function postorder(node, options = {}) {
  const result = [];
  function walk(current, visited) {
    validateNode(current, visited);
    const nextVisited = new Set(visited);
    nextVisited.add(current);

    const repr = resolveRepresentation(current, options);

    if (current.type === 'BinaryExpression') {
      walk(current.left, nextVisited);
      walk(current.right, nextVisited);
      result.push(repr);
    } else if (current.type === 'UnaryExpression') {
      // Postorder convention for unary: visit operand before operator
      walk(current.argument, nextVisited);
      result.push(repr);
    } else {
      result.push(repr);
    }
  }
  walk(node, new Set());
  return result;
}

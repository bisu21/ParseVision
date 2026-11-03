/** Centralized visual tokens for AST nodes adhering to design specifications. */
export const ROOT_NODE_STYLE = Object.freeze({
  fill: '#EF4444',
  border: '#B91C1C',
  stroke: '#B91C1C',
  text: '#FFFFFF',
  badgeBg: '#B91C1C',
  badgeText: '#FFFFFF',
  label: 'Root Node'
});

export const NODE_STYLES = Object.freeze({
  Root: ROOT_NODE_STYLE,
  BinaryExpression: Object.freeze({
    fill: '#3B82F6',
    border: '#1D4ED8',
    stroke: '#1D4ED8',
    text: '#FFFFFF',
    badgeBg: '#1D4ED8',
    badgeText: '#FFFFFF',
    label: 'BinaryExpression'
  }),
  UnaryExpression: Object.freeze({
    fill: '#F97316',
    border: '#C2410C',
    stroke: '#C2410C',
    text: '#431407',
    badgeBg: '#C2410C',
    badgeText: '#FFFFFF',
    label: 'UnaryExpression'
  }),
  Identifier: Object.freeze({
    fill: '#22C55E',
    border: '#15803D',
    stroke: '#15803D',
    text: '#052E16',
    badgeBg: '#15803D',
    badgeText: '#FFFFFF',
    label: 'Identifier'
  }),
  Literal: Object.freeze({
    fill: '#FACC15',
    border: '#CA8A04',
    stroke: '#CA8A04',
    text: '#422006',
    badgeBg: '#CA8A04',
    badgeText: '#FFFFFF',
    label: 'NumericLiteral'
  }),
  NumericLiteral: Object.freeze({
    fill: '#FACC15',
    border: '#CA8A04',
    stroke: '#CA8A04',
    text: '#422006',
    badgeBg: '#CA8A04',
    badgeText: '#FFFFFF',
    label: 'NumericLiteral'
  })
});

export const TRAVERSAL_STYLES = Object.freeze({
  activeStroke: '#416FD0',
  activeStrokeWidth: 2.5,
  badgeFill: '#416FD0',
  badgeText: '#FFFFFF',
  visitedBadgeFill: '#68758A',
  visitedBadgeText: '#FFFFFF'
});

export const CONNECTOR_STYLE = Object.freeze({
  stroke: '#94A3B8',
  strokeWidth: 2,
  activeStroke: '#2156B5',
  activeStrokeWidth: 2.5
});

export const NODE_DIMENSIONS = Object.freeze({
  width: 64,
  height: 64,
  minWidth: 64,
  horizontalPadding: 8,
  cornerRadius: 12,
  levelGap: 126,
  siblingGap: 60,
  margin: 36,
  badgeRadius: 11,
  subtitleGap: 4,
  subtitleHeight: 20,
  totalHeight: 88
});

/**
 * Resolves the visual style tokens for an AST node type.
 * Enforces that root nodes always receive the prominent ROOT_NODE_STYLE (red),
 * while child nodes strictly derive their color from their AST node type.
 */
export function getNodeStyle(type, isRoot = false) {
  if (isRoot) return ROOT_NODE_STYLE;
  return NODE_STYLES[type] || NODE_STYLES.Literal;
}

/**
 * Returns canonical legend item descriptors synchronized with the active node style tokens.
 */
export function getLegendItems() {
  return [
    {
      type: 'Root',
      label: ROOT_NODE_STYLE.label || 'Root Node',
      fill: ROOT_NODE_STYLE.fill,
      border: ROOT_NODE_STYLE.border,
      text: ROOT_NODE_STYLE.text,
      fontBold: true,
      classNames: 'font-semibold'
    },
    {
      type: 'BinaryExpression',
      label: NODE_STYLES.BinaryExpression.label,
      fill: NODE_STYLES.BinaryExpression.fill,
      border: NODE_STYLES.BinaryExpression.border,
      text: NODE_STYLES.BinaryExpression.text,
      classNames: ''
    },
    {
      type: 'UnaryExpression',
      label: NODE_STYLES.UnaryExpression.label,
      fill: NODE_STYLES.UnaryExpression.fill,
      border: NODE_STYLES.UnaryExpression.border,
      text: NODE_STYLES.UnaryExpression.text,
      classNames: ''
    },
    {
      type: 'Identifier',
      label: NODE_STYLES.Identifier.label,
      fill: NODE_STYLES.Identifier.fill,
      border: NODE_STYLES.Identifier.border,
      text: NODE_STYLES.Identifier.text,
      classNames: ''
    },
    {
      type: 'NumericLiteral',
      label: NODE_STYLES.NumericLiteral.label,
      fill: NODE_STYLES.NumericLiteral.fill,
      border: NODE_STYLES.NumericLiteral.border,
      text: NODE_STYLES.NumericLiteral.text,
      classNames: ''
    }
  ];
}



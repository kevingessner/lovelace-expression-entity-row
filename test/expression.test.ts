import { ExpressionConfig, parseExpression, extractEntitiesFromExpression, evaluateExpression } from '../src/expression';

test('simple expression', () => {
     const expr = {
         add: [1, 2],
     };
     expect(parseExpression(expr)).toBe(null);
     expect(evaluateExpression(expr, {})).toBe(3);
});

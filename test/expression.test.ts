import { HassEntities } from 'home-assistant-js-websocket';
import { ExpressionConfig, parseExpression, extractEntitiesFromExpression, evaluateExpression } from '../src/expression';

function makeStates(entities: { [key: string]: any }) {
    var res: HassEntities = {}
    const context = { id: "", user_id: null, parent_id: null };
    for (const k in entities) {
        res[k] = { entity_id: k, state: entities[k].toString(), last_changed: '', last_updated: '', attributes: {}, context };
    }
    return res;
}

test('simple expression', () => {
     const expr = {
         add: [1, 2],
     };
     expect(parseExpression(expr)).toBe(null);
     expect(evaluateExpression(expr, {})).toBe(3);
});

test('expression with errors', () => {
     const expr = {
         subtract: [2],
     };
     const parsed = parseExpression(expr);
     expect(parsed).not.toBeNull();
     expect(parsed!.message).toBe("expression.subtract: must have exactly 2 elements");
});

test('expression with nested errors', () => {
     const expr = {
         add: [
            {
                add: ['sensor.foo', '']
            },
            3,
         ],
     };
     const parsed = parseExpression(expr);
     expect(parsed).not.toBeNull();
     expect(parsed!.message).toBe("expression.add.0.add.1: zero-length string is not valid");
});

test('expression with entities', () => {
     const expr = {
         subtract: [
            {
                add: ['sensor.foo', 'sensor.bar', 4]
            },
            1,
         ],
     };
     const parsed = parseExpression(expr);
     expect(parsed).toBeNull();
     const entities = extractEntitiesFromExpression(expr);
     expect(entities).toEqual(['sensor.foo', 'sensor.bar']);
     const val = evaluateExpression(expr, makeStates({'sensor.foo': 1.5, 'sensor.bar': 3.2, 'sensor.qaz': 11}));
     expect(val).toBeCloseTo(7.7);
});

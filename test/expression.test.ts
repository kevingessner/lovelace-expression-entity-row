import { HassEntities } from 'home-assistant-js-websocket';
import { ExpressionConfig, ParsedExpression, parseExpression } from '../src/expression';

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
         add: [1, '2'],
     };
     const parsed = parseExpression(expr);
     expect(parsed).not.toBeInstanceOf(Error);
     expect((parsed as ParsedExpression).evaluate({})).toBe(3);
     expect((parsed as ParsedExpression).toString()).toEqual('(1 + 2)');
});

test('expression with errors', () => {
     const expr = {
         subtract: [2],
     };
     const parsed = parseExpression(expr);
     expect(parsed).toBeInstanceOf(Error);
     expect((parsed as Error).message).toBe("expression.subtract: must have exactly 2 elements");
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
     expect(parsed).toBeInstanceOf(Error);
     expect((parsed as Error).message).toBe("expression.add.0.add.1: zero-length string is not valid");
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
     if (parsed instanceof Error) {
         fail(`got an error: ${parsed}`);
     }
     const entities = parsed.entities();
     expect(entities).toEqual(['sensor.foo', 'sensor.bar']);
     const val = parsed.evaluate(makeStates({'sensor.foo': 1.50001, 'sensor.bar': 3.2, 'sensor.qaz': 11}));
     expect(val).toBeCloseTo(7.7);
     expect(parsed.toString()).toEqual('((1.5 [sensor.foo] + 3.2 [sensor.bar] + 4) - 1)');
});

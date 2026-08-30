import { HassEntities } from 'home-assistant-js-websocket';

export type ExpressionConfig = string | number | AddExpression | SubtractExpression

interface AddExpression {
    add: ExpressionConfig[]
}

interface SubtractExpression {
    subtract: ExpressionConfig[]
}

type ParseResult = string | null

/**
 * Parse and validate the given expression
 */
export function parseExpression(expr: ExpressionConfig): ParseResult {
    return _parseExpression(expr, 'root');
}

function _parseExpression(expr: ExpressionConfig, path: string): ParseResult {
    switch (typeof expr) {
        case 'number':
            return null;
        case 'string':
            if (expr.length == 0) {
                return `${path}: zero-length string is not valid`;
            }
            return null;
        case 'object':
            if (expr.add !== undefined) {
                return _parseExpressionArray(expr.add, `${path}.add`);
            }
            if (expr.subtract !== undefined) {
                if (expr.subtract.length != 2) {
                    return `${path}.subtract: must have exactly 2 elements`;
                }
                return _parseExpressionArray(expr.subtract, `${path}.subtract`);
            }
        default:
            return `Unknown expression type ${typeof expr}`;
    }
}

function _parseExpressionArray(exprs: ExpressionConfig[], path: string): ParseResult {
    if (exprs.length == 0) {
        return `${path}: must have any elements`;
    }
    for (let i = 0; i < exprs.length; i++) {
        const res = _parseExpression(exprs[i], `${path}.${i}`);
        if (res) return res;
    }
    return null;
}

/**
 * Returns all the entities referenced in the given expression
 */
export function extractEntitiesFromExpression(expr: ExpressionConfig): string[] {
    switch (typeof expr) {
        case 'number':
            return [];
        case 'string':
            return [expr];
        case 'object':
            if (expr.add !== undefined) {
                return _extractEntitiesArray(expr.add);
            }
            if (expr.subtract !== undefined) {
                return _extractEntitiesArray(expr.subtract);
            }
    }
    throw new Exception(`bad expr: ${expr}`);
}

function _extractEntitiesArray(exprs: ExpressionConfig[]): string[] {
    let res = [];
    for (let i = 0; i < exprs.length; i++) {
        res = res.concat(extractEntitiesFromExpression(exprs[i]));
    }
    return res;
}

/**
 * Evaluates the expression with the given entity state values.
 */
export function evaluateExpression(expr: ExpressionConfig, states: HassEntities): number | null {
    switch (typeof expr) {
        case 'number':
            return expr;
        case 'string':
            if (states[expr] && states[expr].state !== undefined) {
                const f = parseFloat(states[expr].state);
                if (!isNaN(f)) return f;
            }
            const f = parseFloat(expr);
            if (!isNaN(f)) return f;
            return null;
        case 'object':
            if (expr.add !== undefined) {
                return expr.add.reduce((a, b) => evaluateExpression(a) + evaluateExpression(b), 0);
            }
            if (expr.subtract !== undefined) {
                return evaluateExpression(expr.subtract[0], states) - evaluateExpression(expr.subtract[1], states);
            }
    }
    throw new Exception(`bad expr: ${expr}`);
}

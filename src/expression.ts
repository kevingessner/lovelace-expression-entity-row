import { HassEntities } from 'home-assistant-js-websocket';

export type ExpressionConfig = string | number | AddExpression | SubtractExpression

interface AddExpression {
    add: ExpressionConfig[];
}

interface SubtractExpression {
    subtract: ExpressionConfig[];
}

type ParseResult = Error | null

function isAdd(expr: ExpressionConfig): expr is AddExpression {
    return (expr as AddExpression).add !== undefined;
}

function isSubtract(expr: ExpressionConfig): expr is SubtractExpression {
    return (expr as SubtractExpression).subtract !== undefined;
}

/**
 * Parse and validate the given expression
 */
export function parseExpression(expr: ExpressionConfig): ParseResult {
    return _parseExpression(expr, 'expression');
}

function _parseExpression(expr: ExpressionConfig, path: string): ParseResult {
    switch (typeof expr) {
        case 'number':
            return null;
        case 'string':
            if (expr.length == 0) {
                return new Error(`${path}: zero-length string is not valid`);
            }
            return null;
        case 'object':
            if (isAdd(expr)) {
                return _parseExpressionArray(expr.add, `${path}.add`);
            }
            if (isSubtract(expr)) {
                if (expr.subtract.length != 2) {
                    return new Error(`${path}.subtract: must have exactly 2 elements`);
                }
                return _parseExpressionArray(expr.subtract, `${path}.subtract`);
            }
            break;
    }
    return new Error(`Unknown expression type ${typeof expr}`);
}

function _parseExpressionArray(exprs: ExpressionConfig[], path: string): ParseResult {
    if (exprs.length == 0) {
        return new Error(`${path}: must have any elements`);
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
            if (isAdd(expr)) {
                return _extractEntitiesArray(expr.add);
            }
            if (isSubtract(expr)) {
                return _extractEntitiesArray(expr.subtract);
            }
            break;
    }
    throw new Error(`bad expr: ${expr}`);
}

function _extractEntitiesArray(exprs: ExpressionConfig[]): string[] {
    let res: string[] = [];
    for (let i = 0; i < exprs.length; i++) {
        res = res.concat(extractEntitiesFromExpression(exprs[i]));
    }
    return res;
}

/**
 * Evaluates the expression with the given entity state values.
 */
export function evaluateExpression(expr: ExpressionConfig, states: HassEntities): number | Error {
    switch (typeof expr) {
        case 'number':
            return expr;
        case 'string':
            const f = parseFloat(expr);
            if (!Number.isNaN(f)) return f;
            if (states[expr] && states[expr].state !== undefined) {
                const f = parseFloat(states[expr].state);
                if (!Number.isNaN(f)) return f;
                return new Error(`bad entity state: ${expr} = ${states[expr]}`);
            }
            return new Error(`bad string: ${expr}`);
        case 'object':
            if (isAdd(expr)) {
                let total = 0;
                for (const e of expr.add) {
                    const val = evaluateExpression(e, states);
                    if (val instanceof Error) return val;
                    total += val;
                }
                return total;
            }
            if (isSubtract(expr)) {
                const left = evaluateExpression(expr.subtract[0], states);
                const right = evaluateExpression(expr.subtract[1], states);
                return left instanceof Error ? left :
                    right instanceof Error ? right :
                    left - right;
            }
            break;
    }
    return new Error(`bad expr: ${expr}`);
}

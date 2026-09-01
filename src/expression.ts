import { HassEntities } from 'home-assistant-js-websocket';

/** Config types. */

export type ExpressionConfig = string | number | AddExpressionConfig | SubtractExpressionConfig

interface AddExpressionConfig {
    add: ExpressionConfig[];
}

interface SubtractExpressionConfig {
    subtract: ExpressionConfig[];
}

function isAdd(expr: ExpressionConfig): expr is AddExpressionConfig {
    return (expr as AddExpressionConfig).add !== undefined;
}

function isSubtract(expr: ExpressionConfig): expr is SubtractExpressionConfig {
    return (expr as SubtractExpressionConfig).subtract !== undefined;
}

/** Parsed types. */

export interface ParsedExpression {
    kind: string;
    path: string;
    entities(): string[];
    evaluate(states: HassEntities): number | Error;
}

class NumberExpression implements ParsedExpression {
    kind = "number";
    path: string;
    private _value: number;
    constructor(path: string, value: number) {
        this.path = path;
        this._value = value;
    }
    entities(): string[] {
        return [];
    }
    evaluate(): number | Error {
        return this._value;
    }
}

class EntityIdExpression implements ParsedExpression {
    kind = "entity_id";
    path: string;
    private _entity_id: string;
    constructor(path: string, entity_id: string) {
        this.path = path;
        this._entity_id = entity_id;
    }
    entities(): string[] {
        return [this._entity_id];
    }
    evaluate(states: HassEntities): number | Error {
        if (states[this._entity_id] && states[this._entity_id].state !== undefined) {
            const f = parseFloat(states[this._entity_id].state);
            if (!Number.isNaN(f)) return f;
            return new Error(`bad entity state: ${this._entity_id} = ${states[this._entity_id]}`);
        }
        return new Error(`unknown entity: ${this._entity_id}`);
    }
}

class AddExpression implements ParsedExpression {
    kind = "add";
    path: string;
    private _sub_exprs: ParsedExpression[];
    constructor(path: string, sub_exprs: ParsedExpression[]) {
        this.path = path;
        this._sub_exprs = sub_exprs;
    }
    entities(): string[] {
        let res: string[] = [];
        for (let i = 0; i < this._sub_exprs.length; i++) {
            res = res.concat(this._sub_exprs[i].entities());
        }
        return res;
    }
    evaluate(states: HassEntities): number | Error {
        let total = 0;
        for (const e of this._sub_exprs) {
            const val = e.evaluate(states);
            if (val instanceof Error) return val;
            total += val;
        }
        return total;
    }
}

class SubtractExpression implements ParsedExpression {
    kind = "subtract";
    path: string;
    private _left: ParsedExpression;
    private _right: ParsedExpression;
    constructor(path: string, left: ParsedExpression, right: ParsedExpression) {
        this.path = path;
        this._left = left;
        this._right = right;
    }
    entities(): string[] {
        return this._left.entities().concat(this._right.entities());
    }
    evaluate(states: HassEntities): number | Error {
        const leftResult = this._left.evaluate(states);
        const rightResult = this._right.evaluate(states);
        return leftResult instanceof Error ? leftResult :
            rightResult instanceof Error ? rightResult :
            leftResult - rightResult;
    }
}

type ParseResult = Error | ParsedExpression

/**
 * Parse and validate the given expression
 */
export function parseExpression(expr: ExpressionConfig): ParseResult {
    return _parseExpression(expr, 'expression');
}

function _parseExpression(expr: ExpressionConfig, path: string): ParseResult {
    switch (typeof expr) {
        case 'number':
            return new NumberExpression(path, expr);
        case 'string':
            if (expr.length == 0) {
                return new Error(`${path}: zero-length string is not valid`);
            }
            const f = parseFloat(expr);
            if (!Number.isNaN(f)) {
                return new NumberExpression(path, f);
            }
            return new EntityIdExpression(path, expr);
        case 'object':
            if (isAdd(expr)) {
                const subExprs = _parseExpressionArray(expr.add, `${path}.add`);
                if (subExprs instanceof Error) {
                    return subExprs;
                }
                return new AddExpression(path, subExprs);
            }
            if (isSubtract(expr)) {
                const subExprs = _parseExpressionArray(expr.subtract, `${path}.subtract`);
                if (subExprs instanceof Error) {
                    return subExprs;
                }
                if (subExprs.length != 2) {
                    return new Error(`${path}.subtract: must have exactly 2 elements`);
                }
                return new SubtractExpression(path, subExprs[0], subExprs[1]);
            }
            break;
    }
    return new Error(`Unknown expression type ${typeof expr}`);
}

function _parseExpressionArray(exprs: ExpressionConfig[], path: string): ParsedExpression[] | Error {
    if (exprs.length == 0) {
        return new Error(`${path}: must have any elements`);
    }
    const res = [];
    for (let i = 0; i < exprs.length; i++) {
        const parsed = _parseExpression(exprs[i], `${path}.${i}`);
        if (parsed instanceof Error) return parsed;
        res.push(parsed);
    }
    return res;
}

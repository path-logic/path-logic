/**
 * @file arithmetic.ts
 * Lightweight arithmetic expression evaluator.
 *
 * Implements a recursive descent parser for the grammar:
 *
 *   expr   ::= term (('+' | '-') term)*
 *   term   ::= factor (('*' | '/') factor)*
 *   factor ::= '-' factor | '(' expr ')' | NUMBER
 *
 * Supports: + - * / ( )  unary minus  decimal numbers
 * Does NOT support: exponentiation, functions, variables, bitwise ops.
 *
 * Design goals:
 *  - Zero dependencies
 *  - Synchronous
 *  - No use of eval() or Function()
 *  - No allocations at idle (functions are module-level, not closures)
 *  - Throws descriptive errors for invalid input
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** All token types the lexer can produce. */
type Token = string; // number literal or single-char operator

// ─────────────────────────────────────────────────────────────────────────────
// Lexer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tokenise a cleaned arithmetic string into an array of tokens.
 *
 * Each token is either:
 *  - A numeric literal (e.g. "42", "3.14")
 *  - A single-character operator from the set  + - * / ( )
 *
 * Whitespace is silently skipped.
 * Throws on any other character.
 *
 * @param expr - The expression string to tokenise.  Must already have
 *               currency symbols and alphabetic chars stripped by the caller.
 */
export function tokenize(expr: string): Array<Token> {
    const tokens: Array<Token> = [];
    let i = 0;

    while (i < expr.length) {
        const ch = expr.charAt(i);

        // Skip whitespace
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
            i++;
            continue;
        }

        // Single-char operators
        if ('+-*/()'.includes(ch)) {
            tokens.push(ch);
            i++;
            continue;
        }

        // Numeric literal (integer or decimal)
        if ((ch >= '0' && ch <= '9') || ch === '.') {
            let num = '';
            let dotCount = 0;
            while (i < expr.length) {
                const c = expr.charAt(i);
                if (c >= '0' && c <= '9') {
                    num += c;
                    i++;
                } else if (c === '.') {
                    dotCount++;
                    if (dotCount > 1) {
                        throw new SyntaxError(
                            `Invalid number: multiple decimal points near position ${i}`
                        );
                    }
                    num += c;
                    i++;
                } else {
                    break;
                }
            }
            tokens.push(num);
            continue;
        }

        throw new SyntaxError(`Unexpected character '${ch}' at position ${i}`);
    }

    return tokens;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser / evaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate a cleaned arithmetic expression string.
 *
 * Uses recursive descent to respect standard operator precedence
 * (* / before + -) and left-to-right associativity.
 *
 * @param expr  The expression to evaluate.  Currency symbols (`$`, `,`)
 *              and letter characters should be stripped before calling;
 *              use {@link cleanExpression} for that.
 * @returns     The numeric result.
 * @throws      {@link SyntaxError} for malformed expressions.
 * @throws      {@link RangeError}  for division by zero or non-finite results.
 */
export function evalArithmetic(expr: string): number {
    if (expr.trim() === '') {
        throw new SyntaxError('Expression is empty');
    }

    const tokens = tokenize(expr);
    let pos = 0;

    /** Return the token at the current position without consuming it. */
    const peek = (): Token | undefined => tokens[pos];

    /** Consume and return the token at the current position. */
    const consume = (): Token => {
        const t = tokens[pos];
        if (t === undefined) {
            throw new SyntaxError('Unexpected end of expression');
        }
        pos++;
        return t;
    };

    /**
     * expr ::= term (('+' | '-') term)*
     */
    function parseExpr(): number {
        let lhs = parseTerm();
        for (;;) {
            const op = peek();
            if (op !== '+' && op !== '-') break;
            consume();
            const rhs = parseTerm();
            lhs = op === '+' ? lhs + rhs : lhs - rhs;
        }
        return lhs;
    }

    /**
     * term ::= factor (('*' | '/') factor)*
     */
    function parseTerm(): number {
        let lhs = parseFactor();
        for (;;) {
            const op = peek();
            if (op !== '*' && op !== '/') break;
            consume();
            const rhs = parseFactor();
            if (op === '/') {
                if (rhs === 0) {
                    throw new RangeError('Division by zero');
                }
                lhs = lhs / rhs;
            } else {
                lhs = lhs * rhs;
            }
        }
        return lhs;
    }

    /**
     * factor ::= '-' factor | '(' expr ')' | NUMBER
     */
    function parseFactor(): number {
        const t = peek();

        if (t === undefined) {
            throw new SyntaxError('Unexpected end of expression: expected a number or "("');
        }

        // Unary minus
        if (t === '-') {
            consume();
            return -parseFactor();
        }

        // Parenthesised sub-expression
        if (t === '(') {
            consume(); // consume '('
            const val = parseExpr();
            const closing = peek();
            if (closing !== ')') {
                throw new SyntaxError(
                    closing === undefined
                        ? 'Missing closing parenthesis'
                        : `Expected ")" but got "${closing}"`
                );
            }
            consume(); // consume ')'
            return val;
        }

        // Stray closing paren or operator in factor position
        if ('+-*/()'.includes(t)) {
            throw new SyntaxError(`Unexpected operator "${t}" where a number was expected`);
        }

        // Number literal
        const num = parseFloat(consume());
        if (isNaN(num)) {
            throw new SyntaxError(`Cannot parse "${t}" as a number`);
        }
        return num;
    }

    const result = parseExpr();

    // Trailing tokens mean the expression wasn't fully consumed
    if (pos < tokens.length) {
        throw new SyntaxError(
            `Unexpected token "${tokens[pos]}" at position ${pos} — expression was not fully parsed`
        );
    }

    if (!isFinite(result)) {
        throw new RangeError(`Result is not finite: ${result}`);
    }

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips characters that users commonly type in financial inputs before
 * passing the expression to {@link evalArithmetic}.
 *
 * Removes: `$`, `,`, and any alphabetic character.
 * Preserves: digits, `.`, `+`, `-`, `*`, `/`, `(`, `)`, and whitespace.
 *
 * @example
 * cleanExpression('$1,500 / 12')   // '1500 / 12'
 * cleanExpression('100 + 50 USD')  // '100 + 50 '
 */
export function cleanExpression(expr: string): string {
    return expr.replace(/[$,]/g, '').replace(/[a-zA-Z]/g, '');
}

/**
 * Evaluate an expression that may contain currency characters.
 * Returns `null` instead of throwing for any invalid input, making it
 * safe to call from template event handlers and reactive pipelines.
 *
 * @example
 * tryEvalArithmetic('$100 + $50')   // 150
 * tryEvalArithmetic('not math')     // null
 * tryEvalArithmetic('10 / 0')       // null
 */
export function tryEvalArithmetic(expr: string): number | null {
    try {
        const cleaned = cleanExpression(expr).trim();
        if (cleaned === '') return null;
        return evalArithmetic(cleaned);
    } catch {
        return null;
    }
}

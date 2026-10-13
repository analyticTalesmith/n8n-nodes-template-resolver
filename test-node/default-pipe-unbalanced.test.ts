import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Lexer } from '../nodes/TemplateResolver/lexer';
import { Parser } from '../nodes/TemplateResolver/parser';
import { Interpreter } from '../nodes/TemplateResolver/interpreter';
import type { TemplateValue } from '../nodes/TemplateResolver/types';

function render(template: string, vars: Record<string, TemplateValue>): string {
	const tokens = new Lexer(template).tokenize();
	const ast = new Parser(tokens).parse();
	return new Interpreter(new Map(Object.entries(vars))).interpret(ast);
}

test("dp-03 a lone apostrophe in an unquoted default still lets the pipe split off the filter", () => {
	assert.equal(render("${{x ?? it's | trim}}", { y: 1 }), "it's", 'the apostrophe is plain text, so trim is split off and applied');
});

test('dp-03 an unterminated double quote in a default still lets the pipe split off the filter', () => {
	assert.equal(render('${{x ?? "abc | trim}}', { y: 1 }), 'abc', 'the unclosed quote is plain text, so trim is split off and applied; the default strip drops the leading quote as before');
});

test('dp-03 a balanced quoted default holding a pipe still renders whole', () => {
	assert.equal(render('${{x ?? "a|b"}}', { y: 1 }), 'a|b', 'the balanced quotes keep the pipe inside the default');
});

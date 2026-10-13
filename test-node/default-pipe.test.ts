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

test('dp-01 a double-quoted default holding a pipe renders whole when the variable is missing', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render('${{x ?? "a|b"}}', { y: 1 });
		},
		'rendering a default that contains a pipe must not throw an unknown filter error',
	);
	assert.equal(output, 'a|b', 'the default text keeps its pipe and renders whole');
});

test('dp-02 a filter after a default holding a pipe still applies to the whole default', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render('${{x ?? "a|b" | head=2}}', { y: 1 });
		},
		'rendering a pipe-holding default followed by a filter must not throw',
	);
	assert.equal(output, 'a|', 'head=2 is applied to the whole default a|b, giving a|');
});

test('dp-03 a single-quoted default holding a pipe renders whole', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render("${{x ?? 'a|b'}}", { y: 1 });
		},
		'rendering a single-quoted default that contains a pipe must not throw',
	);
	assert.equal(output, 'a|b', 'the single-quoted default keeps its pipe and renders whole');
});

test('guard dp-03 a pipe-free default followed by a filter renders as before', () => {
	assert.equal(render('${{x ?? "d" | trim}}', { y: 1 }), 'd', 'the default d is trimmed and rendered');
});

test('guard dp-03 chained filters without a default render as before', () => {
	assert.equal(render('${{text | trim | head=3}}', { text: '  hello ' }), 'hel', 'trim then head=3 on "  hello " gives hel');
});

test('dp-03 an existing value is not replaced by a default holding a pipe', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render('${{x ?? "a|b"}}', { x: 'v' });
		},
		'a present variable with a pipe-holding default must not throw an unknown filter error',
	);
	assert.equal(output, 'v', 'a present variable renders its own value, not the default');
});

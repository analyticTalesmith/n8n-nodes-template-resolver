import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Lexer } from '../nodes/TemplateResolver/lexer';
import { Parser } from '../nodes/TemplateResolver/parser';
import { Interpreter } from '../nodes/TemplateResolver/interpreter';
import type { TemplateValue, Token } from '../nodes/TemplateResolver/types';
import { SyntaxError as TemplateSyntaxError } from '../nodes/TemplateResolver/errors';
import { extractAllVariables } from '../nodes/TemplateResolver/utils';

function render(template: string, vars: Record<string, TemplateValue>): string {
	const tokens = new Lexer(template).tokenize();
	const ast = new Parser(tokens).parse();
	return new Interpreter(new Map(Object.entries(vars))).interpret(ast);
}

function lex(template: string): Token[] {
	return new Lexer(template).tokenize();
}

function lexError(template: string): TemplateSyntaxError {
	let caught: unknown;
	try {
		lex(template);
	} catch (error) {
		caught = error;
	}
	assert.ok(caught instanceof TemplateSyntaxError, 'lexing throws a template SyntaxError');
	return caught as TemplateSyntaxError;
}

test('rb-01 variable detection ignores everything inside a RAW block', () => {
	assert.deepEqual(
		extractAllVariables('{{RAW}}${{name}} {{IF zz}}{{END_RAW}}'),
		[],
		'names inside a RAW block are not variables',
	);
});

test('rb-01 variable detection still finds variables outside a RAW block', () => {
	assert.deepEqual(
		extractAllVariables('{{RAW}}${{a}}{{END_RAW}} ${{b}}'),
		['b'],
		'only the variable outside the RAW block is detected',
	);
});

test('rb-01 variable detection ignores a RAW block whose tags have spaces inside the braces', () => {
	assert.deepEqual(
		extractAllVariables('{{ RAW }}${{name}}{{ END_RAW }}'),
		[],
		'a spaced RAW block hides its variables',
	);
});

test('rb-01 variable detection ignores a RAW block closed with a tab inside the braces', () => {
	assert.deepEqual(
		extractAllVariables('{{RAW}}${{a}}{{\tEND_RAW }} ${{b}}'),
		['b'],
		'only the variable outside the RAW block is detected',
	);
});

test('rb-04 a tag after a multi-line RAW block reports the right position', () => {
	const err = lexError('{{RAW}}\nx\r\ny\n{{END_RAW}}\n{{RAW}}z');
	assert.match(err.message, /Unclosed/, 'the message says the block is Unclosed');
	assert.equal(err.line, 5, 'the error is on line 5');
	assert.equal(err.column, 1, 'the error is at column 1');
});

test('rb-04 an unknown tag right after a RAW block reports the right position', () => {
	const err = lexError('{{RAW}}\n\n{{END_RAW}}{{BOGUS}}');
	assert.match(err.message, /Unknown/, 'the message says the tag is Unknown');
	assert.equal(err.line, 3, 'the error is on line 3');
	assert.equal(err.column, 12, 'the error is at column 12');
});

test('rb-03 a RAW block keeps blank lines and spaces when rendered inside an IF', () => {
	assert.equal(
		render('{{IF t}}{{RAW}}\n\n  a\n\n\n  b  \n{{END_RAW}}{{END_IF}}|', { t: true }),
		'\n\n  a\n\n\n  b  \n|',
		'the raw text comes out exactly as written',
	);
});

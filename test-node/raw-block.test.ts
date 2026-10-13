import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Lexer } from '../nodes/TemplateResolver/lexer';
import { Parser } from '../nodes/TemplateResolver/parser';
import { Interpreter } from '../nodes/TemplateResolver/interpreter';
import { TokenType } from '../nodes/TemplateResolver/types';
import type { TemplateValue, Token } from '../nodes/TemplateResolver/types';
import { SyntaxError as TemplateSyntaxError } from '../nodes/TemplateResolver/errors';

function render(template: string, vars: Record<string, TemplateValue>): string {
	const tokens = new Lexer(template).tokenize();
	const ast = new Parser(tokens).parse();
	return new Interpreter(new Map(Object.entries(vars))).interpret(ast);
}

function lex(template: string): Token[] {
	return new Lexer(template).tokenize();
}

test('rb-01 a RAW block lexes to one literal Text token', () => {
	const content = '{{IF x}} ${{name}} {{# c #}} { }';
	let tokens: Token[] = [];
	assert.doesNotThrow(
		() => {
			tokens = lex(`{{RAW}}${content}{{END_RAW}}`);
		},
		'tokenizing a RAW block must not throw an unknown tag error',
	);
	const meaningful = tokens.filter((t) => t.type !== TokenType.EOF);
	assert.equal(meaningful.length, 1, 'the RAW block yields exactly one token besides end of input');
	assert.equal(meaningful[0].type, TokenType.TEXT, 'the single token is a Text token');
	assert.equal(meaningful[0].value, content, 'the Text token holds the raw content unchanged');
});

test('rb-01 a RAW block renders its content literally with no variables', () => {
	const content = '{{IF x}} ${{name}} {{# c #}} { }';
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render(`{{RAW}}${content}{{END_RAW}}`, {});
		},
		'rendering a RAW block must not throw',
	);
	assert.equal(output, content, 'the output is the raw content exactly as written');
});

test('rb-02 a RAW block in a FOR body appears once per iteration', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render('{{FOR a AS x}}[{{RAW}}${{x}}{{END_RAW}}${{x}}]{{END_FOR}}', { a: [1, 2] });
		},
		'rendering a RAW block inside a FOR body must not throw',
	);
	assert.equal(output, '[${{x}}1][${{x}}2]', 'each iteration prints the raw text then the loop value');
});

test('rb-02 a RAW block in an untaken IF branch does not appear', () => {
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render('{{IF f}}{{RAW}}{{IF}}{{END_RAW}}{{END_IF}}z', { f: false });
		},
		'rendering a RAW block inside an untaken IF must not throw',
	);
	assert.equal(output, 'z', 'the untaken branch contributes nothing, only z remains');
});

test('rb-03 RAW keeps leading and trailing spaces and turns CRLF into LF', () => {
	let tokens: Token[] = [];
	assert.doesNotThrow(
		() => {
			tokens = lex('{{RAW}}  a\r\n b  {{END_RAW}}');
		},
		'tokenizing a RAW block with spaces and CRLF must not throw',
	);
	const meaningful = tokens.filter((t) => t.type !== TokenType.EOF);
	assert.equal(meaningful.length, 1, 'the block yields exactly one token besides end of input');
	assert.equal(meaningful[0].type, TokenType.TEXT, 'the token is a Text token');
	assert.equal(meaningful[0].value, '  a\n b  ', 'spaces are kept and CRLF becomes LF');
});

test('rb-04 an unclosed RAW block throws a SyntaxError at the RAW tag position', () => {
	let caught: unknown;
	try {
		lex('a{{RAW}}b');
	} catch (error) {
		caught = error;
	}
	assert.ok(caught instanceof TemplateSyntaxError, 'an unclosed RAW throws a template SyntaxError');
	const err = caught as TemplateSyntaxError;
	assert.match(err.message, /Unclosed/, 'the message says the block is Unclosed');
	assert.match(err.message, /RAW/, 'the message names RAW');
	assert.equal(err.line, 1, 'the error is reported on line 1');
	assert.equal(err.column, 2, 'the error is reported at column 2, where the RAW tag starts');
});

test('guard rb-05 a template without RAW renders unchanged', () => {
	assert.equal(render('a ${{n}} b', { n: 'X' }), 'a X b', 'a plain variable template renders as before');
});

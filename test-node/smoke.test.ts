import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Lexer } from '../nodes/TemplateResolver/lexer';
import { Parser } from '../nodes/TemplateResolver/parser';
import { Interpreter } from '../nodes/TemplateResolver/interpreter';

test('renders a variable through the lexer, parser and interpreter', () => {
	const tokens = new Lexer('Hi ${{name}}').tokenize();
	const ast = new Parser(tokens).parse();
	const output = new Interpreter(new Map([['name', 'Ada']])).interpret(ast);
	assert.equal(output, 'Hi Ada');
});

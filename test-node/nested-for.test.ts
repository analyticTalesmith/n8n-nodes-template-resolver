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

test('nf-01 outer item, @index0 and @first resolve after an inner loop', () => {
	const template =
		'{{FOR a AS x}}{{FOR b AS y}}${{y}}{{END_FOR}}[${{x}}|${{@index0}}|${{@first}}]{{END_FOR}}';
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render(template, { a: ['A1', 'A2'], b: ['b1', 'b2'] });
		},
		'rendering text after an inner loop must not throw for the outer variable',
	);
	assert.equal(output, 'b1b2[A1|0|true]b1b2[A2|1|false]', 'outer item, @index0 and @first keep the outer loop values after the inner loop');
});

test('nf-02 sibling inner loops keep the outer item between and after them', () => {
	const template =
		'{{FOR a AS x}}${{x}}:{{FOR b AS y}}${{y}}{{END_FOR}}/${{x}}:{{FOR c AS z}}${{z}}{{END_FOR}}/${{x}};{{END_FOR}}';
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render(template, { a: ['A1', 'A2'], b: ['b1', 'b2'], c: ['c1'] });
		},
		'rendering after each sibling inner loop must not throw for the outer variable',
	);
	assert.equal(output, 'A1:b1b2/A1:c1/A1;A2:b1b2/A2:c1/A2;', 'the outer item resolves between and after sibling inner loops');
});

test('nf-02 a three-level nested loop keeps every enclosing item after the inner loops', () => {
	const template =
		'{{FOR a AS x}}{{FOR b AS y}}{{FOR c AS z}}${{z}}{{END_FOR}}(${{y}}){{END_FOR}}<${{x}}>{{END_FOR}}';
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render(template, { a: ['A1', 'A2'], b: ['b1', 'b2'], c: ['c1', 'c2'] });
		},
		'rendering after the innermost and middle loops must not throw',
	);
	assert.equal(
		output,
		'c1c2(b1)c1c2(b2)<A1>c1c2(b1)c1c2(b2)<A2>',
		'the middle item resolves after the innermost loop and the outermost item after the middle loop',
	);
});

test('nf-03 a TABLE row loop inside a FOR keeps the outer variable in rows and after the table', () => {
	const template =
		'{{FOR a AS x}}{{TABLE}}{{HEADER}}Outer|Inner{{END_HEADER}}{{FOR b AS y}}{{ROW}}${{x}}|${{y}}{{END_ROW}}{{END_FOR}}{{END_TABLE}}after ${{x}};{{END_FOR}}';
	let output = '';
	assert.doesNotThrow(
		() => {
			output = render(template, { a: ['A1', 'A2'], b: ['b1', 'b2'] });
		},
		'rendering a table row loop and the text after it must not throw for the outer variable',
	);
	assert.ok(output.includes('| A1 | b1 |'), 'first outer iteration, first row shows the outer item');
	assert.ok(output.includes('| A1 | b2 |'), 'later rows in the first outer iteration still show the outer item');
	assert.ok(output.includes('after A1;'), 'text after the table in the first outer iteration resolves the outer item');
	assert.ok(output.includes('| A2 | b2 |'), 'second outer iteration rows show the second outer item');
	assert.ok(output.includes('after A2;'), 'text after the table in the second outer iteration resolves the outer item');
});

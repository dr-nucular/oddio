module.exports = {
	root: true,
	extends: ['eslint:recommended', 'prettier'],
	plugins: ['svelte3', 'import'],
	overrides: [{ files: ['*.svelte'], processor: 'svelte3/svelte3' }],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	rules: {
		// disallow declaration of variables already declared in the outer scope
		'no-shadow': 'error',

		// ensure named imports coupled with named exports
		// https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/named.md#when-not-to-use-it
		'import/named': 'error',

		// ensure default import coupled with default export
		// https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/default.md#when-not-to-use-it
		'import/default': 'off',

		// disallow duplicate imports
		// https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-duplicates.md
		'import/no-duplicates': 'error',

		// If a variable is never reassigned, using the const declaration is better.
		'prefer-const': 'error',

		// check unused vars, but not unused arguments
		'no-unused-vars': ['error', { args: 'none' }],
	}
};

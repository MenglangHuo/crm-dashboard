import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
	{
		ignores: [
			".next/**",
			"node_modules/**",
			"public/**",
			"next-env.d.ts",
			"tsconfig.tsbuildinfo",
		],
	},
	...tseslint.configs.recommended,
	{
		linterOptions: {
			reportUnusedDisableDirectives: "warn",
		},
		plugins: {
			"unused-imports": unusedImports,
			"@next/next": {
				rules: {
					"no-img-element": {
						create: () => ({}),
					},
				},
			},
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"no-unused-vars": "off",
			"no-var": "error",
			"prefer-const": "error",
			"no-duplicate-imports": "error",
			"no-debugger": "error",
			"unused-imports/no-unused-imports": "error",
			"unused-imports/no-unused-vars": [
				"error",
				{
					"vars": "all",
					"varsIgnorePattern": "^_",
					"args": "after-used",
					"argsIgnorePattern": "^_",
					"caughtErrors": "none",
					"ignoreRestSiblings": true,
				},
			],
		},
	},
);

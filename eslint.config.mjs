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
			reportUnusedDisableDirectives: "off",
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
			"prefer-const": "warn",
			"unused-imports/no-unused-imports": "warn",
			"unused-imports/no-unused-vars": "off",
		},
	},
);

import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import prettier from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'examples/**',
      'scripts/**',
      'eslint.config.mjs',
      'vitest.config.ts',
      '**/*.test.ts',
      '**/*.test.js',
      'src/test-helpers/**',
      'src/integration/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: {
          defaultProject: 'tsconfig.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  perfectionist.configs['recommended-natural'],
  {
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowDirectConstAssertionInArrowFunctions: true,
          allowExpressions: true,
          allowHigherOrderFunctions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
    },
  },
  eslintConfigPrettier
);

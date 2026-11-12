import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const dateMessage = 'Date-only strings parse as UTC midnight; build from components or use mediodia() from lib/format.'

export default defineConfig(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': ['error', { allow: ['error', 'warn'] }],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date'] > Literal.arguments[value=type(string)]", message: dateMessage },
        { selector: "NewExpression[callee.name='Date'] > TemplateLiteral.arguments", message: dateMessage },
        {
          selector: "NewExpression[callee.name='Date'] > BinaryExpression.arguments[operator='+'][right.type='Literal'][right.value=type(string)]",
          message: dateMessage,
        },
        { selector: "CallExpression[callee.property.name='toISOString']", message: 'toISOString() shifts local dates to UTC; use isoDate() from lib/format.' },
      ],
    },
  },
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
)

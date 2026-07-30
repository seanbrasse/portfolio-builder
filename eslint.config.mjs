import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * MODE-5 is the rule the noir theme stands on: every color in the system is a
 * CSS custom property, and component code contains zero hex literals. Broken
 * in one place, noir stops being a token remap and becomes a rewrite — which
 * section 14 lists as a medium-severity risk whose stated mitigation is
 * exactly this lint rule.
 *
 * Two files are exempt, both deliberately:
 *   - `src/lib/tokens.ts` is where the values are defined.
 *   - `src/lib/og.tsx` rasterises through Satori, which has no cascade to
 *     resolve custom properties against. It reads its values from `tokens.ts`
 *     rather than writing its own, so there is still one source of truth.
 */
const noHexLiterals = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/lib/tokens.ts', 'src/lib/og.tsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
        message:
          'No hex colors outside src/lib/tokens.ts (MODE-5). Add a token there and read it as a CSS custom property.',
      },
      {
        selector:
          'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]',
        message:
          'No hex colors outside src/lib/tokens.ts (MODE-5). Add a token there and read it as a CSS custom property.',
      },
      {
        selector: 'Literal[value=/^(?:rgba?|hsla?)\\(/]',
        message:
          'No literal color functions outside src/lib/tokens.ts (MODE-5). Add a token there instead.',
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  noHexLiterals,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'public/**', '.cache/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Règle maison : une donnée de joueur ne doit JAMAIS passer par du HTML brut.
      // On construit le DOM avec h() (src/ui/dom.ts), qui n'utilise que des nœuds texte.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]',
          message: 'innerHTML/outerHTML interdits : utilise h() de src/ui/dom.ts (anti-XSS).',
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: 'insertAdjacentHTML interdit : utilise h() de src/ui/dom.ts (anti-XSS).',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);

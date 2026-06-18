import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Pre-Next.js single-file prototype — kept for reference, not part of the build.
    "_legacy/**",
  ]),
  {
    rules: {
      // React Compiler advisory rule. Every occurrence in this app is an intentional,
      // correct pattern that the rule can't distinguish: client-only mount init that
      // must not run during SSR (localStorage / Math.random / window measurements would
      // cause hydration mismatches in a render or lazy initializer), and game-over /
      // phase-transition detection derived from board state. Refactoring working game
      // logic to satisfy it adds risk without benefit, so it's disabled here.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;

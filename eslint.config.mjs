import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      ".worktrees/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "docs/skills-drafts/**"
    ]
  }
];

export default config;

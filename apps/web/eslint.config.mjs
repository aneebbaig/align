import next from "eslint-config-next";

export default [
  {
    ignores: ["src/generated/**", ".next/**", "node_modules/**"],
  },
  ...next,
  {
    rules: {
      // Cosmetic - apostrophes/quotes in JSX copy are intentional.
      "react/no-unescaped-entities": "off",
      // Newer strict React 19 rules: keep visible as warnings rather than
      // blocking CI on long-standing working patterns. Tighten over time.
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

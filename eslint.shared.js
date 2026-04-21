const tsParser = require("@typescript-eslint/parser");

function createComplexityConfig(level, max) {
  return [
    {
      ignores: [
        "node_modules/**",
        ".expo/**",
        "coverage/**",
        "convex/_generated/**",
      ],
    },
    {
      files: ["**/*.{js,cjs,mjs,ts,tsx}"],
      languageOptions: {
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      rules: {
        complexity: [level, { max }],
      },
    },
  ];
}

module.exports = {
  createComplexityConfig,
};

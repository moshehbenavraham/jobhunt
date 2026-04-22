export default {
  '**/*.{js,mjs,cjs,ts,tsx}': ['biome check --write'],
  '**/*.{json,md,yaml,yml,css,html}': ['prettier --write'],
  '**/*.sh': ['shfmt -w -i 2 -ci -sr', 'shellcheck'],
};

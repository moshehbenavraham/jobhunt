# Localization contract

jobhunt verifies English, German, French, and Japanese output (`en`, `de`,
`fr`, and `ja`) against one canonical workflow graph.

This is intentionally different from copying every mode into a language
directory. Copied modes drift when safety rules, schemas, paths, or lifecycle
features change. The canonical modes always load `modes/_shared.md` and
`modes/_profile.md`; `language.output` controls human-facing prose, while
`market.ruleset` independently controls compensation and employment
heuristics. Machine Summary keys, enum values, tracker statuses, paths, and
commands remain canonical.

Run the parity check with:

```bash
npm run locales:test
```

The check covers all current evaluation, document, application, follow-up,
interview, offer, analytics, discovery, tracker, and training modes. It fails
when a canonical mode disappears, a mode tells the worker to infer output
language from the JD, or a verified locale no longer resolves through the
shared policy.

The Go dashboard localizes operator chrome without translating tracker data or
report bodies:

```bash
npm run dashboard -- --lang de
JOBHUNT_LANG=ja npm run dashboard
```

Supported dashboard values are `en`, `de`, `fr`, and `ja`, including regional
forms such as `de-DE` and `ja_JP`. Unsupported values fail explicitly.
Additional languages require a complete catalog, canonical-mode parity tests,
and native review; partial locale packs are not accepted.

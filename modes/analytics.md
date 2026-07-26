# Mode: analytics — Funnel, Velocity, and Channel Yield

Run the zero-token, header-aware analytics contract:

```bash
npm run analytics
npm run analytics -- --summary
npm run analytics -- --benchmarks=config/benchmarks.yml
```

The output combines current tracker state with the append-only status ledger:

- cumulative applied/responded/interviewed/offered/hired counts
- rates with numerator, denominator, minimum sample, and directional benchmark
- median/p75 stage velocity only when at least three observed completions exist
- censored in-flight counts and malformed-ledger diagnostics
- ATS vendor and direct/agency/unknown yield with minimum samples

Final Rejected/Discarded state proves only that an application was submitted;
intermediate stages require observed transitions. Channel yield is
observational, not causal: vendor, agency, role mix, timing, and candidate fit
are confounded. Never describe a weak channel as discriminatory or a strong
channel as causal.

The shipped benchmark ranges are explicitly illustrative. Copy
`templates/benchmarks.yml` to `config/benchmarks.yml` and replace each source,
year, range, and caveat with candidate-relevant evidence before treating it as
external calibration.

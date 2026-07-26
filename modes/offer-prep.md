# Mode: offer-prep — Sensitive Offer Review and Negotiation Draft

Prepare a human-reviewed offer analysis. Never accept an offer, send a message,
or claim legal/tax certainty.

## Inputs and storage

- Keep original sensitive documents under ignored `offers/`.
- For PDF/image documents, produce a local extracted-text companion under
  `offers/`; retain the original separately.
- Read the role report, profile compensation priorities, prior salary
  observations, and candidate constraints.

## Method

1. Extract terms only when an exact excerpt exists in the companion text.
2. Separate base, bonus, equity, signing bonus, benefits, location/work model,
   employment classification, dates, leave, probation/termination, IP, and
   restrictive covenants.
3. Record ambiguities and risks with severity, exact evidence, and whether
   professional legal/tax advice may be appropriate.
4. Draft clarification questions and a negotiation message in the candidate's
   voice. Keep it explicitly draft-only.
5. Build the strict version-1 input and run:

   ```bash
   npm run offer:prep -- --input=tmp/offer-prep.json
   ```

The tool hashes (but does not copy) both local sources and writes paired
Markdown/JSON artifacts under ignored `interview-prep/offers/`. Its contract
fixes `humanReviewRequired: true`, `sendPerformedByTool: false`, and
`acceptancePerformedByTool: false`.

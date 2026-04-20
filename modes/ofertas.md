# Mode: ofertas -- Multi-Offer Comparison

Use a weighted 10-dimension scoring matrix:

| Dimension            | Weight | 1-5 criteria                                               |
| -------------------- | ------ | ---------------------------------------------------------- |
| North Star alignment | 25%    | 5 = exact target role, 1 = unrelated                       |
| CV match             | 15%    | 5 = 90%+ match, 1 = under 40%                              |
| Level                | 15%    | 5 = staff+, 4 = senior, 3 = upper mid, 2 = mid, 1 = junior |
| Estimated comp       | 10%    | 5 = top quartile, 1 = below market                         |
| Growth trajectory    | 10%    | 5 = clear path up, 1 = dead end                            |
| Remote quality       | 5%     | 5 = full remote async, 1 = onsite only                     |
| Company reputation   | 5%     | 5 = top employer, 1 = major concerns                       |
| Tech stack modernity | 5%     | 5 = strong current AI/ML stack, 1 = legacy                 |
| Speed to offer       | 5%     | 5 = fast process, 1 = 6+ months                            |
| Cultural signals     | 5%     | 5 = builder culture, 1 = bureaucratic                      |

For each offer:

- score each dimension
- calculate the weighted total
- produce a final ranking
- recommend based on both fit and realistic time-to-offer

If the offers are not already in context, ask the user for them as text, URLs, or references to previously evaluated jobs.

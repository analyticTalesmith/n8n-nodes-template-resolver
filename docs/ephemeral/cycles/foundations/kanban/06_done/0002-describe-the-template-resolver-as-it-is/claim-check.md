# Claim check

A fresh claim checker (no part in writing the documents) read every cited claim in `docs/living/architecture/overview.md` and `docs/living/architecture/modules/template-resolver.md` against the pinned commit 712fcfd7f7af0b329e6506120a25f0db8e58de06, using only `git show` at that commit.

First pass, about 175 claims: overview about 42 supported, 11 partly, 2 unsupported, 3 citation wrong; module about 108 supported, 7 partly, none unsupported. Three factual errors (a non-existent `skills/` directory under `.process/`, a missing key yielding `undefined` rather than `null`, a wrong stray-tag example) and about eleven wrong or narrow citations.

All were corrected by the research lead in the recovered documents; the evidence check reports no findings. Open questions the checker judged answerable from source were answered or left open with the reason (Q6 answered).

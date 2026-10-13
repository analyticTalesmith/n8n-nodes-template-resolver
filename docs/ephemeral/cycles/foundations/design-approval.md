---
summary: Foundations cycle design: restore tests, CI, Tier 0 fixes, restructure into core and n8n, AST analyze, golden harness.
approved_by: "Jon (front approval)"
approved_on: 2026-10-13
approves:
- 7f60caadcad8202c55176816505a320c25e3abeff5d16b854db8493fc041d005 docs/ephemeral/cycles/foundations/CYCLE.md
- 0511630f7ee0068e907bcbc351631404bda87d82f8961ab3ddebe67fdfbc0b94 docs/ephemeral/cycles/foundations/test-plan.md
- c1b4698142e0f1b62082beca69106292be77e67aab3757f350e0dad47dd70134 docs/living/decisions/adr/0001-house-style-for-every-block.md
- b6ad28c22ac4c8d9bc2c978853ec65c7b30c53191fa555df8a7ec084986d1a2e docs/living/decisions/adr/0002-standalone-block-tag-lines-vanish.md
- 71146ea0b49e2aab540090838c199e26a2fecc25ab0b188d9012316cced779a7 docs/living/decisions/adr/0003-unknown-names-are-always-errors.md
- e63f8df52277b45e85e5ee7227a0de76b2695cf9ecaa03cbb8e49eda120c5513 docs/living/decisions/adr/0004-render-returns-a-structured-result.md
- 89626b51aade13f000706dd1174019f740f444a30c68c45459ff5984f5a1872c docs/living/decisions/adr/0005-dependency-free-token-estimator.md
- 9e879a55cc23e04fd2ce17f32c427d56c39280acf7abe779104ecab3bdb8822e docs/living/decisions/adr/0006-n8n-node-imports-core-directly.md
- 5ef04617039dcb4bdbe61ddc761040437fe689efb4b4386efc02598fe68de579 docs/ephemeral/work/0005-add-the-ci-workflow/spec.md
- f17cd3515edbaa0ddee84253baaf80833f57ba93197b107f8f97137f451a467c docs/ephemeral/work/0006-parse-pipe-defaults-else-if-and-tag-argu/spec.md
- a4ce0a8773d88821aec02bf5f5b1b8cdc33bfce3022208b298677230701ca796 docs/ephemeral/work/0007-string-inputs-keep-commas-and-index-like/spec.md
- ef47b02fad933d3391b4ea95f7dd6810a0316dcf8fe2331bb08d27251c4b990e docs/ephemeral/work/0008-conditions-evaluate-negation-boolean-wor/spec.md
- 2df0e7d56a6857abc6fed82fba6fd5ca00b5304f5f2ebe89a87c8c95123d38e0 docs/ephemeral/work/0009-table-cells-escape-pipes-and-newlines/spec.md
- 656bbd549baa4cc127b2a51f83173249107626cf66a101e11e643fa5728a4bba docs/ephemeral/work/0010-nested-for-keeps-outer-loop-variables/spec.md
- ae4ad6699b79a11775505d40c4a164075d7571a045381009bb1a6d9b3ff8eca4 docs/ephemeral/work/0011-restructure-into-a-pure-core-and-a-thin/spec.md
- 9f956781ab0dcc49ba7547badb3687861bdd020945d89055c476a61cba2355ef docs/ephemeral/work/0012-derive-variable-and-filter-usage-from-th/spec.md
- e3f2554709f319230fb35555f24b47478e1b3e40ceedc7ceafab5830f5ee3096 docs/ephemeral/work/0013-add-the-golden-file-test-harness/spec.md
- 7d79f6775ab2bbf6b650dfc96307b5039c295313c0b9c855df75180548e2f4b2 docs/ephemeral/work/0004-restore-jest-and-make-it-the-default-tes/spec.md
cards:
  - .gitkeep
  - 0002-describe-the-template-resolver-as-it-is
  - 0005-add-the-ci-workflow
  - 0006-parse-pipe-defaults-else-if-and-tag-argu
  - 0007-string-inputs-keep-commas-and-index-like
  - 0008-conditions-evaluate-negation-boolean-wor
  - 0009-table-cells-escape-pipes-and-newlines
  - 0010-nested-for-keeps-outer-loop-variables
  - 0011-restructure-into-a-pure-core-and-a-thin
  - 0012-derive-variable-and-filter-usage-from-th
  - 0013-add-the-golden-file-test-harness
  - .gitkeep
  - 0004-restore-jest-and-make-it-the-default-tes
modules:
  - template-resolver
  - build-tooling
max_iterations: 60
max_spawns: 80
max_cost:
cost_unit:
sweep_rounds: 3
approval_hash: fe929096fac82b1589c8f389da11a00d41bc4129413e70f790e8fbd44b7e83ba
---

# Design approval

<!-- Only a human runs approve-design.mjs after reading the design and accepted risks. List CYCLE.md and every approved requirement, design and reviewer brief in approves. -->

## Design in brief

## Red team

## Analyze

## Risks accepted

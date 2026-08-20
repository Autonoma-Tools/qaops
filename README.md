# QAOps: The Gating Policy the Definition Pages Skip

A GitHub Actions gating policy for a typical CI pipeline: a declarative `gating-policy.yml` classifying every check as blocking or reporting, the workflow that enforces it end to end including a gated build verification suite, and an override-record template with a validator script that rejects incomplete or expired records.

> Companion code for the Autonoma blog post: **[QAOps: The Gating Policy the Definition Pages Skip](https://getautonoma.com/blog/qaops)**

## Requirements

Node 18 or newer. The only dependency is `js-yaml`, used by the override validator.

## Quickstart

```bash
git clone https://github.com/Autonoma-Tools/qaops.git
cd qaops
npm install
npm run validate:overrides
```

## Project structure

```
.
├── .github/
│   └── workflows/
│       └── gating-policy.yml   # the workflow that enforces the policy
├── gating-policy.yml           # the policy itself: 15 checks, one gate each
├── overrides/
│   └── override.example.yml    # one filled-in override record
├── scripts/
│   └── validate-override.js    # rejects incomplete or expired records
├── examples/
│   ├── invalid-override.yml    # deliberately broken record, for the demo
│   └── validate-demo.sh        # runs the validator against both
└── package.json
```

- `gating-policy.yml` — the human-readable source of truth. Every check in the pipeline, classified as `blocks_merge`, `blocks_deploy`, or `reports_only`, with an owner, a time budget, and the reason for the classification.
- `.github/workflows/gating-policy.yml` — the enforcement half. Blocking jobs have no `continue-on-error`; reporting jobs have it set to `true` and upload their reports as artifacts; the deploy job depends only on the gates that are allowed to stop it.
- `overrides/` — the escape hatch. One record per override, five required fields, validated in CI.
- `scripts/validate-override.js` — refuses any record missing a field or already past its expiry.
- `examples/` — a deliberately invalid record plus a demo script that proves the validator accepts the good one and rejects the bad one.

## A note on the workflow

`.github/workflows/gating-policy.yml` is a reference artifact, not this repository's own CI. It assumes the host application it is dropped into has `lint`, `typecheck`, `test`, and `build` npm scripts and Playwright suites at `tests/bvt`, `tests/visual`, and the repository root. Copy it into that application and adjust the job names to your check names. GitHub Actions is disabled on this repository so the reference workflow does not run against a codebase that has none of those.

## Overrides

Every gate needs a documented escape hatch, or it quietly becomes a suggestion. A record in `overrides/` requires all five of `check`, `requested_by`, `reason`, `follow_up_issue`, and `expires_on`. Validate the directory:

```bash
node scripts/validate-override.js overrides
```

Exits `0` when every record is complete and unexpired, `1` otherwise, printing which field failed for which file. To see both outcomes end to end:

```bash
./examples/validate-demo.sh
```

## About

This repository is maintained by [Autonoma](https://getautonoma.com) as reference material for the linked blog post. Autonoma builds autonomous AI agents that plan, execute, and maintain end-to-end tests directly from your codebase.

If something here is wrong, out of date, or unclear, please [open an issue](https://github.com/Autonoma-Tools/qaops/issues/new).

## License

Released under the [MIT License](./LICENSE) © 2026 Autonoma Labs.

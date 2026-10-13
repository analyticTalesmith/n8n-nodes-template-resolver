# Spec

## Acceptance criteria

- ci-01: the workflow runs on push to main and on pull_request, on a matrix of ubuntu-latest and windows-latest with the lts/* Node version
- ci-02: the workflow runs npm ci, npm run build and npm test in that order
- ci-03: .gitignore no longer ignores .github and git does not ignore the workflow file
- ci-04: with dependencies installed, npm run build exits 0 and writes the compiled node entry listed in package.json n8n.nodes

# Spec

## Acceptance criteria

- gf-01: the harness discovers every case folder and passes when output equals the expected file exactly
- gf-02: a mismatch fails with the case name and the first differing line
- gf-03: an expected-error.txt case passes when rendering throws a message containing that text
- gf-04: UPDATE_GOLDEN=1 rewrites the expected files instead of failing
- gf-05: the shipped suite holds at least eight cases and they all pass against the real resolver

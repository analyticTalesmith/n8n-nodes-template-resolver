# Spec

## Acceptance criteria

- an-01: analyze reports variables used in output tags, IF, ELSEIF, CASE, FOR sources, LIST_ITEM conditions and table cells
- an-02: variables on either side of AND, OR and comparison operators, including the right side of contains, are reported
- an-03: FOR item variables, @-metadata and operator words such as NOT are not reported as inputs
- an-04: a variable with a ?? default is reported optional and the node strict mode accepts it unmapped
- an-05: analyze lists every filter used with its name, and an unknown filter is reported as a diagnostic
- an-06: strict mode no longer rejects a template whose only unmapped names are FOR item variables
- an-07: the regex-based extractAllVariables no longer exists in core

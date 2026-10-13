---
id: stg-build-slices
type: stage
summary: Build slices from red to green
state: built
code: I04
phase: implement
form: make
owner: build
who: agent
risk: A big-bang diff.
skip: never
minimal: yes
today: exists
spine: yes
links:
  - pairs-with: stg-red-first-tests
---

# Build slices from red to green

Make the red test pass with the smallest change, one slice at a time, committing each. The fix changes the cause the record names and nothing else. For a spike, prototype, recover or documentation-only cycle the build is the probe, the demo, the pinning tests or the document edit, with nothing red to turn green.

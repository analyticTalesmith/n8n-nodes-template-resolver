head: ${{summary | head=11}}
tail: ${{summary | tail=6}}
trim: [${{padded | trim}}]
escape_md: ${{note | escape_md}}
upper: ${{name | upper}}
lower: ${{name | lower}}
title: ${{name | title}}
replace: ${{name | replace:find="a",with="4"}}
quote: ${{name | quote}}
round: ${{price | round=2}}
default: ${{nick | default="n/a"}}
join: ${{tags | join=", "}}
length: ${{tags | length}}
first: ${{tags | first}}
last: ${{tags | last}}
sort: ${{tags | sort}}
unique and join: ${{dupes | unique | join="+"}}
slice: ${{tags | slice:start=1,end=3}}
lines: ${{poem | lines}}
json: ${{config | json}}
indent:
${{poem | indent=2}}
fence:
${{code | fence=js}}
heading_offset:
${{doc | heading_offset=1}}
{{IF tags.length > 2 AND level between [1, 5]}}
Many tags at a usable level.
{{END_IF}}
{{CASE level}}
{{WHEN 1, 2}}
Level: low
{{WHEN >= 3}}
Level: high
{{END_CASE}}

# Team status

{{LIST}}
{{LIST_ITEM}}Kickoff done{{END_LIST_ITEM}}
{{FOR people AS p limit=cfg.size}}
{{IF p.on}}
{{LIST_ITEM}}${{p.name}} is on, ${{@index1}} of ${{@total}}{{END_LIST_ITEM}}
{{ELSEIF p.name == "Bo"}}
{{LIST_ITEM}}${{p.name}} is away{{END_LIST_ITEM}}
{{ELSE}}
{{LIST_ITEM}}${{p.name}} is off 😀{{END_LIST_ITEM}}
{{END_IF}}
{{ELSE}}
{{LIST_ITEM}}Nobody listed{{END_LIST_ITEM}}
{{END_FOR}}
{{LIST_ITEM hidden}}Never shown{{END_LIST_ITEM}}
{{FOR tags AS t}}
{{LIST_ITEM}}Tag ${{t}}
{{END_FOR}}
{{FOR nobody AS n}}
{{LIST_ITEM}}${{n}}{{END_LIST_ITEM}}
{{ELSE}}
{{LIST_ITEM}}No leavers{{END_LIST_ITEM}}
{{END_FOR}}
{{LIST_ITEM}}Wrap up{{END_LIST_ITEM}}
{{END_LIST}}

Done.

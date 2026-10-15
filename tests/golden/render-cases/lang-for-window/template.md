{{FOR people AS p limit=cfg.size offset=cfg.skip}}
- ${{@index1}}/${{@total}} ${{p}}
{{FOR tags AS t offset=@index1}}
  * ${{t}}
{{ELSE}}
  * no tags
{{END_FOR}}
{{END_FOR}}
{{FOR people AS p offset=9}}
- ${{p}}
{{ELSE}}
Nobody beyond nine 😀
{{END_FOR}}

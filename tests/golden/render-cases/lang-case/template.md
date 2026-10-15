{{FOR people AS p}}
{{CASE p.role}}
{{WHEN "admin", "owner"}}
- ${{p.name}}: manages
{{WHEN other}}
- ${{p.name}}: same as ${{other}}
{{WHEN == "guest"}}
- ${{p.name}}: guest
{{DEFAULT}}
- ${{p.name}}: member
{{END_CASE}}
{{END_FOR}}
{{CASE score}}
{{WHEN < 50}}
Score: low
{{WHEN >= 90}}
Score: top
{{DEFAULT}}
Score: mid
{{END_CASE}}

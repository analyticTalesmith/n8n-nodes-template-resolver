{{SECTION "Role" level=1}}
You are a ${{role}}.
{{END_SECTION}}
{{SECTION "Context"}}
{{IF context}}
${{context}}
{{END_IF}}
{{END_SECTION}}

Answer in ${{format}}.

{{SECTION "Rules"}}
{{FOR rules AS r}}
- ${{r}}
{{END_FOR}}
{{END_SECTION}}

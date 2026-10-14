Name: ${{name}}

{{- IF vip}} (VIP){{END_IF}}

Tags:{{FOR tags AS t -}}
    ${{t}},
{{- END_FOR}}


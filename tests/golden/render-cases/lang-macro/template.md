# ${{title}}
{{CALL greet(owner)}}
{{FOR people AS p}}
{{CALL row(p, "item")}}
{{END_FOR}}
{{CALL footer()}}
{{DEFINE greet(who)}}
Hello, ${{who}}!
{{END_DEFINE}}
{{DEFINE row(name, kind)}}
- {{CALL tag(kind)}} ${{name}}
{{END_DEFINE}}
{{DEFINE tag(k)}}[${{k}}]{{END_DEFINE -}}
{{DEFINE footer()}}-- ${{title}} --{{END_DEFINE -}}

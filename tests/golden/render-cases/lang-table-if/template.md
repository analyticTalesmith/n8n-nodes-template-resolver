## Servers

{{TABLE}}
{{HEADER}}Name|Status|Load{{END_HEADER}}
{{IF showAll}}
{{FOR servers AS s limit=cfg.size}}
{{IF s.up}}
{{ROW}}${{s.name}}|up|${{s.load}}{{END_ROW}}
{{ELSEIF s.name == "beta"}}
{{ROW}}${{s.name}}|maintenance
{{ELSE}}
{{ROW}}${{s.name}}|down 😀
{{END_IF}}
{{ELSE}}
{{ROW}}hidden|-|-{{END_ROW}}
{{END_FOR}}
{{ELSE}}
{{ROW}}not shown|-|-{{END_ROW}}
{{END_IF}}
{{IF spare}}
{{FOR spare AS sp}}
{{ROW}}${{sp}}|spare|-{{END_ROW}}
{{END_FOR}}
{{END_IF}}
{{ROW}}total|${{count}}|-{{END_ROW}}
{{END_TABLE}}

Done.

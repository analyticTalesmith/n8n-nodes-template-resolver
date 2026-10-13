{{IF score >= 90}}Grade A{{ELSEIF score >= 75 AND passed}}Grade B{{ELSE}}Retry{{END_IF}}
{{IF name contains "ann" AND NOT(banned)}}Welcome ${{name}}{{END_IF}}

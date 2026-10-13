{{FOR teams AS team}}${{@index1}}. ${{team.name}}: {{FOR team.members AS m}}${{m}}{{IF @notLast}}, {{END_IF}}{{END_FOR}} (team ${{team.name}} of ${{@index1}}{{IF @last}}, last{{END_IF}})
{{END_FOR}}
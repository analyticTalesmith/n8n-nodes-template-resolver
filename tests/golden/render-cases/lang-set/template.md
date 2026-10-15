{{SET greeting = "Hello"}}
{{SET names = people | sort}}
{{SET total = base + extra}}
{{SET shout = name | upper | head=3}}
${{greeting}} ${{shout}}, total ${{total}}
{{FOR names AS n limit=2}}
before=${{label}}
{{SET label = n | upper}}
- ${{@index1}}/${{@total}} ${{label}}
{{END_FOR}}
{{IF show}}
{{SET greeting = "Bye"}}
${{greeting}}
{{END_IF}}
${{greeting}}

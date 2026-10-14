import re
p = r"C:\Users\Emiliano\Desktop\Proyectos\P1\src\components\OLTListSidebar.tsx"
s = open(p, 'r', encoding='utf-8').read()
# find and remove any remaining "<span ... >!</span>" leftover (duplicate)
pat = re.compile(r"\n\{ponWorst !== 'normal' && \(\n\s*<span[^>]*>!</span>\n\s*\)\}", re.M)
matches = list(pat.finditer(s))
print("leftover dup count:", len(matches))
s2 = pat.sub("", s, count=100)
open(p, 'w', encoding='utf-8').write(s2)
print("done")
EOF
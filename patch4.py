p = r"C:\Users\Emiliano\Desktop\Proyectos\P1\src\components\OLTListSidebar.tsx"
s = open(p, 'r', encoding='utf-8').read()
old = '<span className="truncate">{pon.name}</span>'
new = ('<span className="truncate">{pon.name}</span>\n'
       '                                    {ponWorst !== \'normal\' && (\n'
       '                                      <AlertTriangle className={`w-3.5 h-3.5 ml-1 heartbeat ${ponWorst === \'offline\' ? \'text-red-500\' : \'text-amber-400\'}`} />\n'
       '                                    )}')
assert s.count(old) == 2, "need 2 pon name occurrences, got %d" % s.count(old)
s = s.replace(old, new, s.count(old))
open(p, 'w', encoding='utf-8').write(s)
print("OK")
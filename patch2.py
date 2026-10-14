import re
p = r"C:\Users\Emiliano\Desktop\Proyectos\P1\src\components\OLTListSidebar.tsx"
s = open(p, 'r', encoding='utf-8').read()

# 1) import AlertTriangle after X in lucide list
s = s.replace("  X\n} from 'lucide-react';", "  X,\n  AlertTriangle\n} from 'lucide-react';", 1)

# 2) heartbeat subtle animation
s = s.replace(
    "@keyframes heartbeat { 0%{transform:scale(1);} 14%{transform:scale(1.35);} 28%{transform:scale(1);} 42%{transform:scale(1.35);} 70%{transform:scale(1);} }",
    "@keyframes heartbeat { 0%{transform:scale(1);} 16%{transform:scale(1.1);} 32%{transform:scale(1);} }",
    1
)
s = s.replace(
    ".heartbeat { animation: heartbeat 1.4s ease-in-out infinite; }",
    ".heartbeat { animation: heartbeat 2.6s ease-in-out infinite; }",
    1
)

# 3) Replace OLT-name badge with triangle icon (both red/amber)
olt_pattern = re.compile(
    r"\{oltWorst !== 'normal' && \(\n\s*<span[\s\S]*?>\n\s*!\s*\n\s*</span>\n\s*\)\}",
    re.M
)
olt_repl = (
    "{oltWorst !== 'normal' && (\n"
"                          <AlertTriangle\n"
"                            className={`w-4 h-4 ml-1 heartbeat ${oltWorst === 'offline' ? 'text-red-500' : 'text-amber-400'}`}\n"
"                            title={undefined}\n"
"                          />\n"
"                        )}"
)
n_old = olt_pattern.search(s)
assert n_old, "OLT badge block not found"
s = olt_pattern.sub(olt_repl, s, count=1)

# 4) Replace per-PON badge (single line)
pon_pattern = re.compile(
    r"\{ponWorst !== 'normal' && \(\n\s*<span class=\"text-\[11px\] font-bold leading-none \${ponWorst === 'offline' \? 'text-red-500' : 'text-orange-400'\} heartbeat\" title=\{\ponWorst === 'offline' \? 'Hay cajas sin.*\(off\)' : 'Hay cajas atenuadas'\}>!</span>\n\s*\)\}",
    re.M
)
pon_repl = '''{ponWorst !== 'normal' && (
  <AlertTriangle className={`w-3.5 h-3.5 ml-1 heartbeat ${ponWorst === 'offline' ? 'text-red-500' : 'text-amber-400'}`} />
)}'''
pn = pon_pattern.search(s)
assert pn, "PON badge block not found"
s = pon_pattern.sub(pon_repl, s, count=1)

open(p, 'w', encoding='utf-8').write(s)
print("OK")
EOF
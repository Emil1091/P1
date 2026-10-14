import re
p = r"C:\Users\Emiliano\Desktop\Proyectos\P1\src\components\OLTListSidebar.tsx"
s = open(p, 'r', encoding='utf-8').read()

# 1) import AlertTriangle
old_imp = "  X\n} from 'lucide-react';"
assert old_imp in s, "imp missing"
s = s.replace(old_imp, "  X,\n  AlertTriangle\n} from 'lucide-react';", 1)

# 2) heartbeat
s = s.replace(
    "@keyframes heartbeat { 0%{transform:scale(1);} 14%{transform:scale(1.35);} 28%{transform:scale(1);} 42%{transform:scale(1.35);} 70%{transform:scale(1);} }",
    "@keyframes heartbeat { 0%{transform:scale(1);} 16%{transform:scale(1.12);} 32%{transform:scale(1);} }",
    1
)
s = s.replace(
    ".heartbeat { animation: heartbeat 1.4s ease-in-out infinite; }",
    ".heartbeat { animation: heartbeat 2.6s ease-in-out infinite; }",
    1
)

# 3) OLT badge
olt_pattern = re.compile(
    r"\{oltWorst !== 'normal' && \(\n\s*<span[\s\S]*?>\n\s*!\s*\n\s*</span>\n\s*\)\}",
    re.M
)
olt_repl = (
    "{oltWorst !== 'normal' && (\n"
    "                          <AlertTriangle\n"
    "                            className={`w-4 h-4 ml-1 heartbeat ${oltWorst === 'offline' ? 'text-red-500' : 'text-amber-400'}`}\n"
    "                          />\n"
    "                        )}"
)
positions_olt = list(olt_pattern.finditer(s))
assert len(positions_olt) == 1, "expected one OLT badge block"
s = olt_pattern.sub(olt_repl, s, count=1)

# 4) PON badge
import re as _re
# find line containing ponWorst and '>'
needle = "  <span className={`text-[11px] font-bold leading-none ${ponWorst === 'offline' ? 'text-red-500' : 'text-orange-400'} heartbeat`}"
idx = s.find(needle)
assert idx >= 0, "pon badge not found"
# replace from idx until next newline+)} 
end = s.find(")}", idx) + 2
s = s[:idx] + "{ponWorst !== 'normal' && (\n  <AlertTriangle\n    className={`w-3.5 h-3.5 ml-1 heartbeat ${ponWorst === 'offline' ? 'text-red-500' : 'text-amber-400'}`}\n  />\n)}"[0:0] + s  # dummy

# Instead do a proper targeted replacement:
s = open(p, 'r', encoding='utf-8').read()  # reset because of dummy
# redo changes on fresh s
s2 = open(p, 'r', encoding='utf-8').read()
# apply import/heartbeat/olt badge by re-doing
s2 = s2.replace("  X\n} from 'lucide-react';", "  X,\n  AlertTriangle\n} from 'lucide-react';", 1)
s2 = s2.replace(
    "@keyframes heartbeat { 0%{transform:scale(1);} 14%{transform:scale(1.35);} 28%{transform:scale(1);} 42%{transform:scale(1.35);} 70%{transform:scale(1);} }",
    "@keyframes heartbeat { 0%{transform:scale(1);} 16%{transform:scale(1.12);} 32%{transform:scale(1);} }",
    1
)
s2 = s2.replace(
    ".heartbeat { animation: heartbeat 1.4s ease-in-out infinite; }",
    ".heartbeat { animation: heartbeat 2.6s ease-in-out infinite; }",
    1
)
positions_olt = list(olt_pattern.finditer(s2))
assert len(positions_olt) == 1, "expected one OLT badge block"
s2 = olt_pattern.sub(olt_repl, s2, count=1)

# pon badge: replace the entire line containing ponWorst ... '>' '!' '</span>'
import re
s2_lines = s2.splitlines()
out = []
for line in s2_lines:
    if "ponWorst !== 'normal'" in line and "leading-none" in line:
        indent = line[:len(line)-len(line.lstrip())]
        out.append(f"{indent}<AlertTriangle className={{`w-3.5 h-3.5 ml-1 heartbeat ${{ponWorst === 'offline' ? 'text-red-500' : 'text-amber-400'}}`}} />")
        # wrap in conditional
        # reconstruct as a conditional block
        out[-1] = f"{indent}{{ponWorst !== 'normal' && ("
        out.append(f"{indent}  <AlertTriangle className={{`w-3.5 h-3.5 ml-1 heartbeat ${{ponWorst === 'offline' ? 'text-red-500' : 'text-amber-400'}}`}} />")
        out.append(f"{indent})}}")
    else:
        out.append(line)
s2 = "\n".join(out)

open(p, 'w', encoding='utf-8').write(s2)
print("OK")
EOF
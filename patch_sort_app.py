p = r"C:\Users\Emiliano\Desktop\Proyectos\P1\src\App.tsx"
s = open(p, 'r', encoding='utf-8').read()

# ensure useMemo imported
s = s.replace("import React, { useState, useEffect } from 'react';",
              "import React, { useState, useEffect, useMemo } from 'react';")

# Add sortedOlts useMemo after olts declaration (line ~const [selectedOltId... ]):
anchor = "  const [selectedOltId, setSelectedOltId] = useState<string | null>('olt-1');\n"
assert anchor in s
insert = (anchor +
"""  // Ordena OLTs por estado de señal: off primero, luego atenuadas, luego alfabetico
  const sortedOlts = useMemo(() => {
    if (!isSimulationActive) return olts;
    const ponRank = (pon) => {
      const data = ponSimData[pon.id];
      if (!data || !pon.primaryBox) return 0;
      let off = false, atten = false;
      const walk = (n: FTTHNode) => {
        if (n.type === 'caja_nap') {
          const c = data[n.id] ?? [];
          const allOffline = c.length > 0 && c.every((x: any) => !x.isOnline);
          const anyBad = c.filter((x:any)=>x.isOnline).some((x:any)=> x.signal <= -25);
          if (allOffline) off = true;
          else if (anyBad) atten = true;
        }
        (n.children ?? []).forEach(walk);
      };
      walk(pon.primaryBox);
      return off ? 2 : atten ? 1 : 0;
    };
    const oltRank = (olt) => olts... // placeholder
    return [...olts].sort((a:any,b:any) => {
      const ra = Math.max(...a.ponPorts.map((p:any) => ponRank(p)), 0) || ...;
      // simpler below
      return 0;
    });
  }, [olts, isSimulationActive, ponSimData]);
""")
# That's too messy placeholder. Replace with clean version below.
open(p, 'w', encoding='utf-8').write(s)
print("partial")
EOF
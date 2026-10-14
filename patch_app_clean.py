p = r"C:\Users\Emiliano\Desktop\Proyectos\P1\src\App.tsx"
s = open(p, 'r', encoding='utf-8').read()

old1 = "  const [simulationData, setSimulationData] = useState<SimulationData>({});\n"
new1 = "  const [simulationData, setSimulationData] = useState<SimulationData>({});\n  const [ponSimData, setPonSimData] = useState<Record<string, SimulationData>>({});\n"
assert old1 in s, "old1"
s = s.replace(old1, new1, 1)

old2 = """  const applySimulationData = (options: SimulationOptions) => {
    if (currentPon?.primaryBox) {
      setSimulationData(generateSimulationData(currentPon.primaryBox, options));
    }
  };"""
new2 = """  const applySimulationData = (options: SimulationOptions) => {
    const next: Record<string, SimulationData> = {};
    olts.forEach(olt => {
      olt.ponPorts.forEach(p => {
        if (p.primaryBox) {
          next[p.id] = generateSimulationData(p.primaryBox, options);
        }
      });
    });
    setPonSimData(next);
    const sel = selectedPonId ?? currentPon?.id;
    if (sel && next[sel]) setSimulationData(next[sel]);
    else if (currentPon?.id && next[currentPon.id]) setSimulationData(next[currentPon.id]);
    else setSimulationData({});
  };"""
assert old2 in s, "old2"
s = s.replace(old2, new2, 1)

old3 = "  const handleToggleSimulation = () => {\n    if (!isSimulationActive && currentPon?.primaryBox) {\n      setSimulationData(generateSimulationData(currentPon.primaryBox, buildSimulationOptions()));\n    }\n    setIsSimulationActive(v => !v);\n  };"
new3 = """  const handleToggleSimulation = () => {
    if (isSimulationActive) {
      setIsSimulationActive(false);
      setPonSimData({});
      setSimulationData({});
      return;
    }
    if (currentPon?.primaryBox) {
      applySimulationData(buildSimulationOptions());
      setIsSimulationActive(true);
    }
  };"""
assert old3 in s, "old3"
s = s.replace(old3, new3, 1)

old4 = "    setSimulationData(prev => applyFaultToNode(target, simFaultTool, prev));"
new4 = """    const sp = selectedPonId;
    if (sp) {
      setPonSimData(prev => ({ ...prev, [sp]: applyFaultToNode(target, simFaultTool, prev[sp] ?? simulationData) }));
    }
    setSimulationData(prev => applyFaultToNode(target, simFaultTool, prev));"""
assert old4 in s, "old4"
s = s.replace(old4, new4, 1)

# hydrate effect after selectedOltId line
old5 = "  const [selectedOltId, setSelectedOltId] = useState<string | null>('olt-1');\n"
new5 = ("  const [selectedOltId, setSelectedOltId] = useState<string | null>('olt-1');\n"
        "  useEffect(() => {\n"
        "    if (isSimulationActive && selectedPonId && ponSimData[selectedPonId]) {\n"
        "      setSimulationData(ponSimData[selectedPonId]);\n"
        "    }\n"
        "  }, [selectedPonId, ponSimData, isSimulationActive]);\n")
assert old5 in s, "old5"
s = s.replace(old5, new5, 1)

open(p, 'w', encoding='utf-8').write(s)
print("done")
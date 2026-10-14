import React, { useState, useEffect } from 'react';
import {
  Network,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import type { OLTDevice, FTTHNode, BreadcrumbStep, PONPort, SimulationData, SimulationScenario, SimulationScope, FaultEvent } from './types/ftth';
import { OLTListSidebar } from './components/OLTListSidebar';
import { SynopticTreeCanvas } from './components/SynopticTreeCanvas';
import { CreateOLTModal } from './components/CreateOLTModal';
import { EditOLTModal } from './components/EditOLTModal';
import { EditBoxModal } from './components/EditBoxModal';
import { HierarchyBreadcrumbBar } from './components/HierarchyBreadcrumbBar';
import { DropdownSearchBar } from './components/DropdownSearchBar';
import type { SearchResultItem } from './components/DropdownSearchBar';
import { SimulationPanel } from './components/SimulationPanel';
import { generateSimulationData, getSecondaryBoxes, applyFaultToNode, findNodeById } from './utils/simulation';
import type { SimulationOptions } from './utils/simulation';

const STORAGE_KEY = 'ftth_designer_olts_v2';

const initialDefaultOLTs: OLTDevice[] = [
  {
    id: 'olt-1',
    name: 'OLT Central',
    brand: 'Huawei',
    model: 'MA5800-X7',
    chassisType: 'modular',
    slotsCount: 2,
    portsPerSlot: 8,
    ponPorts: [
      {
        id: 'pon-1-1-1',
        name: 'S1-PON01',
        slotIndex: 1,
        portIndex: 1,
        slotPort: '0/1/1',
        primaryBox: {
          id: 'pri-01',
          name: 'Caja Primaria 1x4',
          type: 'caja_primaria',
          ratio: 4,
          location: 'Cámara Subterránea Mitre',
          isCollapsed: false,
          children: [
            {
              id: 'sec-01',
              name: 'Secundario #1 (1x4)',
              type: 'caja_secundaria',
              ratio: 4,
              parentPortIndex: 1,
              location: 'Poste 12 - Av. San Martín',
              isCollapsed: false,
              children: [
                {
                  id: 'nap-01',
                  name: 'NAP #1 (1x8)',
                  type: 'caja_nap',
                  ratio: 8,
                  parentPortIndex: 1,
                  location: 'Poste 14 - Esquina Belgrano',
                  children: []
                },
                {
                  id: 'nap-02',
                  name: 'NAP #2 (1x8)',
                  type: 'caja_nap',
                  ratio: 8,
                  parentPortIndex: 2,
                  location: 'Poste 16 - Calle Rivadavia',
                  children: []
                }
              ]
            },
            {
              id: 'sec-02',
              name: 'Secundario #2 (1x4)',
              type: 'caja_secundaria',
              ratio: 4,
              parentPortIndex: 2,
              location: 'Poste 24 - Barrio Norte',
              isCollapsed: true,
              children: []
            }
          ]
        }
      },
      {
        id: 'pon-1-1-2',
        name: 'S1-PON02',
        slotIndex: 1,
        portIndex: 2,
        slotPort: '0/1/2',
      }
    ]
  }
];

export function App() {
  const [olts, setOlts] = useState<OLTDevice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Error leyendo localStorage:", e);
    }
    return initialDefaultOLTs;
  });

  const [selectedOltId, setSelectedOltId] = useState<string | null>('olt-1');
  const [selectedPonId, setSelectedPonId] = useState<string | null>('pon-1-1-1');
  const [expandedOltIds, setExpandedOltIds] = useState<string[]>(['olt-1']);

  // Modales
  const [isCreateOltModalOpen, setIsCreateOltModalOpen] = useState(false);
  const [editingOlt, setEditingOlt] = useState<OLTDevice | null>(null);
  const [editingNode, setEditingNode] = useState<FTTHNode | null>(null);

  // ─── Simulación de señal ────────────────────────────────────────────────────
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [simulationData, setSimulationData] = useState<SimulationData>({});
  const [ponSimData, setPonSimData] = useState<Record<string, SimulationData>>({});
  const [simScenario, setSimScenario] = useState<SimulationScenario>('aleatorio');
  const [simScope, setSimScope] = useState<SimulationScope>('mitad');
  const [simTargetSecondaryId, setSimTargetSecondaryId] = useState<string | null>(null);
  const [simFaultTool, setSimFaultTool] = useState<FaultEvent | null>(null);

  useEffect(() => {
    if (!isSimulationActive) return;
    setOlts(prev => {
      const ponRank = (pon: any): number => {
        const data = ponSimData[pon.id];
        if (!data || !pon.primaryBox) return 0;
        let off = false, atten = false;
        const walk = (n: FTTHNode) => {
          if (n.type === 'caja_nap') {
            const c = data[n.id] ?? [];
            if (c.length > 0 && c.every((x: any) => !x.isOnline)) off = true;
            else if (c.filter((x:any)=>x.isOnline).some((x:any)=> x.signal <= -25)) atten = true;
          }
          (n.children ?? []).forEach(walk);
        };
        walk(pon.primaryBox);
        return off ? 2 : atten ? 1 : 0;
      };
      const oltRank = (o: any): number => Math.max(0, ...o.ponPorts.map((p: any) => ponRank(p)));
      const ordered = [...prev].sort((a, b) => oltRank(b) - oltRank(a) || a.name.localeCompare(b.name));
      if (ordered.map(o => o.id).join('|') === prev.map(o => o.id).join('|')) return prev;
      return ordered;
    });
  }, [ponSimData, isSimulationActive]);
  useEffect(() => {
    if (isSimulationActive && selectedPonId && ponSimData[selectedPonId]) {
      setSimulationData(ponSimData[selectedPonId]);
    }
  }, [selectedPonId, ponSimData, isSimulationActive]);


  const buildSimulationOptions = (): SimulationOptions => {
    const opts: SimulationOptions = { scenario: simScenario, scope: simScope };
    if (simScenario === 'secundario_off') {
      const isValid = secondaryOptions.some(o => o.id === simTargetSecondaryId);
      opts.targetSecondaryId = isValid ? simTargetSecondaryId ?? undefined : secondaryOptions[0]?.id;
    }
    return opts;
  };

  const applySimulationData = (options: SimulationOptions) => {
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
  };

  const handleToggleSimulation = () => {
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
  };

  const handleRegenerateSimulation = () => {
    applySimulationData(buildSimulationOptions());
  };

  const handleChangeScenario = (scenario: SimulationScenario) => {
    setSimScenario(scenario);
    if (scenario === 'secundario_off' && secondaryOptions.length > 0 && !simTargetSecondaryId) {
      setSimTargetSecondaryId(secondaryOptions[0].id);
    }
    if (isSimulationActive) {
      const opts: SimulationOptions = { scenario, scope: simScope };
      if (scenario === 'secundario_off') {
        opts.targetSecondaryId = (simTargetSecondaryId && secondaryOptions.some(o => o.id === simTargetSecondaryId))
          ? simTargetSecondaryId
          : secondaryOptions[0]?.id;
      }
      applySimulationData(opts);
    }
  };

  const handleChangeScope = (scope: SimulationScope) => {
    setSimScope(scope);
    if (isSimulationActive) {
      applySimulationData({ scenario: simScenario, scope, targetSecondaryId: simTargetSecondaryId ?? undefined });
    }
  };

  const handleChangeTargetSecondary = (id: string) => {
    setSimTargetSecondaryId(id);
    if (isSimulationActive) {
      applySimulationData({ scenario: simScenario, scope: simScope, targetSecondaryId: id });
    }
  };

  // Herramienta manual: aplicar falla a la caja clickeada en el canvas
  const handleApplyFault = (boxId: string) => {
    if (!simFaultTool || !currentPon?.primaryBox) return;
    const isPonChip = boxId === currentPon.id;
    const target = isPonChip ? currentPon.primaryBox : findNodeById(currentPon.primaryBox, boxId);
    if (!target) return;
    const sp = selectedPonId;
    if (sp) {
      setPonSimData(prev => ({ ...prev, [sp]: applyFaultToNode(target, simFaultTool, prev[sp] ?? simulationData) }));
    }
    setSimulationData(prev => applyFaultToNode(target, simFaultTool, prev));
  };

  // Selección de caja y barra de ruta de fibra
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>('nap-01');
  useEffect(() => {
    if (isSimulationActive && selectedPonId && ponSimData[selectedPonId]) {
      setSimulationData(ponSimData[selectedPonId]);
    }
  }, [selectedPonId, ponSimData, isSimulationActive]);

  const [breadcrumbSteps, setBreadcrumbSteps] = useState<BreadcrumbStep[]>([    { id: 'pri-01', name: 'Caja Primaria 1x4', type: 'caja_primaria', location: 'Cámara Subterránea Mitre' },
    { id: 'sec-01', name: 'Secundario #1 (1x4)', type: 'caja_secundaria', portUsed: 1, location: 'Poste 12 - Av. San Martín' },
    { id: 'nap-01', name: 'NAP #1 (1x8)', type: 'caja_nap', portUsed: 1, location: 'Poste 14 - Esquina Belgrano' },
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(olts));
    } catch (e) {
      console.error("Error guardando en localStorage:", e);
    }
  }, [olts]);

  const currentOlt = olts.find(o => o.id === selectedOltId) || olts[0];
  const currentPon = currentOlt?.ponPorts.find(p => p.id === selectedPonId) || currentOlt?.ponPorts[0];
  const secondaryOptions = getSecondaryBoxes(currentPon?.primaryBox);

  const handleToggleExpandOlt = (oltId: string) => {
    setExpandedOltIds(prev =>
      prev.includes(oltId) ? prev.filter(id => id !== oltId) : [...prev, oltId]
    );
  };

  const handleSelectPon = (oltId: string, ponId: string) => {
    setSelectedOltId(oltId);
    setSelectedPonId(ponId);
    if (!expandedOltIds.includes(oltId)) {
      setExpandedOltIds(prev => [...prev, oltId]);
    }
  };

  const handleCreateOlt = (newOlt: OLTDevice) => {
    setOlts(prev => [...prev, newOlt]);
    setSelectedOltId(newOlt.id);
    setSelectedPonId(newOlt.ponPorts[0]?.id || null);
    setExpandedOltIds(prev => [...prev, newOlt.id]);
  };

  const handleSaveEditedOlt = (updatedOlt: OLTDevice) => {
    setOlts(prev => prev.map(o => o.id === updatedOlt.id ? updatedOlt : o));
  };

  const handleAddPonDirect = (oltId: string, slotIndex = 1) => {
    setOlts(prev =>
      prev.map(olt => {
        if (olt.id === oltId) {
          const slotPorts = olt.ponPorts.filter(p => p.slotIndex === slotIndex);
          const nextPortIndex = slotPorts.length + 1;
          const slotPort = olt.chassisType === 'modular' ? `0/${slotIndex}/${nextPortIndex}` : `0/${olt.ponPorts.length + 1}`;
          const ponName = olt.chassisType === 'modular' ? `S${slotIndex}-PON${nextPortIndex < 10 ? '0' + nextPortIndex : nextPortIndex}` : `PON ${nextPortIndex < 10 ? '0' + nextPortIndex : nextPortIndex}`;

          const newPon: PONPort = {
            id: `pon-${olt.id}-${slotIndex}-${Date.now().toString().slice(-4)}`,
            name: ponName,
            slotIndex,
            portIndex: nextPortIndex,
            slotPort,
          };

          return {
            ...olt,
            ponPorts: [...olt.ponPorts, newPon]
          };
        }
        return olt;
      })
    );
  };

  const handleDeleteOlt = (oltId: string) => {
    setOlts(prev => {
      const filtered = prev.filter(o => o.id !== oltId);
      if (filtered[0]) {
        setSelectedOltId(filtered[0].id);
        setSelectedPonId(filtered[0].ponPorts[0]?.id || null);
      }
      return filtered;
    });
  };

  const handleUpdatePrimaryBox = (updatedBox: FTTHNode | undefined) => {
    if (!selectedOltId || !selectedPonId) return;

    setOlts(prev =>
      prev.map(olt => {
        if (olt.id === selectedOltId) {
          return {
            ...olt,
            ponPorts: olt.ponPorts.map(pon => {
              if (pon.id === selectedPonId) {
                return {
                  ...pon,
                  primaryBox: updatedBox
                };
              }
              return pon;
            })
          };
        }
        return olt;
      })
    );
  };

  const handleSaveEditedBox = (updatedFields: Partial<FTTHNode>) => {
    if (!editingNode || !currentPon?.primaryBox) return;

    const updateRecursively = (node: FTTHNode): FTTHNode => {
      if (node.id === editingNode.id) {
        return { ...node, ...updatedFields };
      }
      return {
        ...node,
        children: (node.children || []).map(updateRecursively)
      };
    };

    const newTree = updateRecursively(currentPon.primaryBox);
    handleUpdatePrimaryBox(newTree);

    setBreadcrumbSteps(prev =>
      prev.map(step => step.id === editingNode.id ? { ...step, ...updatedFields } : step)
    );
  };

  const handleClearCurrentPon = () => {
    const confirmClear = window.confirm(`¿Estás seguro de que deseas borrar todo el diagrama del ${currentPon?.name}?`);
    if (confirmClear) {
      handleUpdatePrimaryBox(undefined);
      setSelectedBoxId(null);
      setBreadcrumbSteps([]);
    }
  };

  // Desplegar forzosamente toda la ruta hasta la caja buscada
  const handleSelectSearchResult = (result: SearchResultItem) => {
    setSelectedOltId(result.oltId);
    setSelectedPonId(result.ponId);
    if (!expandedOltIds.includes(result.oltId)) {
      setExpandedOltIds(prev => [...prev, result.oltId]);
    }

    const targetOlt = olts.find(o => o.id === result.oltId);
    const targetPon = targetOlt?.ponPorts.find(p => p.id === result.ponId);

    if (targetPon?.primaryBox) {
      const pathSteps: BreadcrumbStep[] = [];
      const nodeIdsToExpand = new Set<string>();

      const findPathAndExpand = (node: FTTHNode, trail: BreadcrumbStep[]): boolean => {
        const currentTrail = [...trail, { id: node.id, name: node.name, type: node.type, portUsed: node.parentPortIndex, location: node.location }];
        if (node.id === result.boxId) {
          pathSteps.push(...currentTrail);
          trail.forEach(t => nodeIdsToExpand.add(t.id));
          return true;
        }
        for (const child of node.children || []) {
          if (findPathAndExpand(child, currentTrail)) {
            nodeIdsToExpand.add(node.id);
            return true;
          }
        }
        return false;
      };

      findPathAndExpand(targetPon.primaryBox, []);

      // Aplicar expansión a todas las cajas de la ruta
      const expandNodesInTree = (node: FTTHNode): FTTHNode => {
        const shouldBeOpen = nodeIdsToExpand.has(node.id) ? false : node.isCollapsed;
        return {
          ...node,
          isCollapsed: shouldBeOpen,
          children: (node.children || []).map(expandNodesInTree)
        };
      };

      const expandedTree = expandNodesInTree(targetPon.primaryBox);

      // Guardar el árbol con las ramas abiertas
      setOlts(prev =>
        prev.map(o => {
          if (o.id === result.oltId) {
            return {
              ...o,
              ponPorts: o.ponPorts.map(p => p.id === result.ponId ? { ...p, primaryBox: expandedTree } : p)
            };
          }
          return o;
        })
      );

      setSelectedBoxId(result.boxId);
      setBreadcrumbSteps(pathSteps);
    }
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(olts, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FTTH-Redes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          setOlts(parsed);
          if (parsed[0]) {
            setSelectedOltId(parsed[0].id);
            setSelectedPonId(parsed[0].ponPorts[0]?.id || null);
          }
        } else {
          alert("El archivo no tiene el formato correcto.");
        }
      } catch (err) {
        alert("Error al leer el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-12 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-500 shadow-sm">
            <Network className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-bold text-white tracking-tight">
              FTTH Diagrama de Llaves
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Topología Libre
            </span>
          </div>
        </div>

        {/* Buscador Dropdown integrado y acciones */}
        <div className="flex items-center gap-3">
          <DropdownSearchBar
            olts={olts}
            onSelectResult={handleSelectSearchResult}
          />

          <div className="h-4 w-[1px] bg-slate-800" />

          <button
            onClick={handleClearCurrentPon}
            className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 text-[11px] font-semibold text-red-300 hover:text-red-100 flex items-center gap-1 transition"
            title="Borrar todo el árbol del PON actual"
          >
            <Trash2 className="w-3 h-3" />
            <span>Borrar PON</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800" />

          <label
            className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-1 transition"
            title="Importar proyecto JSON"
          >
            <Upload className="w-3 h-3" />
            <span>Importar</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={handleExportJSON}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-1 transition"
            title="Descargar proyecto en JSON"
          >
            <Download className="w-3 h-3" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        <OLTListSidebar
          olts={olts}
          selectedOltId={selectedOltId}
          selectedPonId={selectedPonId}
          expandedOltIds={expandedOltIds}
          onToggleExpandOlt={handleToggleExpandOlt}
          onSelectPon={handleSelectPon}
          onOpenCreateOltModal={() => setIsCreateOltModalOpen(true)}
          onOpenEditOltModal={(olt) => setEditingOlt(olt)}
          onAddPonDirect={handleAddPonDirect}
          onDeleteOlt={handleDeleteOlt}
          isSimulationActive={isSimulationActive}
          ponSimData={isSimulationActive ? ponSimData : undefined}
          simulationPanel={
            <SimulationPanel
              isActive={isSimulationActive}
              onToggle={handleToggleSimulation}
              onRegenerate={handleRegenerateSimulation}
              simData={simulationData}
              selectedBoxId={selectedBoxId}
              selectedBoxName={breadcrumbSteps[breadcrumbSteps.length - 1]?.name}
              scenario={simScenario}
              scope={simScope}
              targetSecondaryId={simTargetSecondaryId}
              secondaryOptions={secondaryOptions}
              onScenarioChange={handleChangeScenario}
              onScopeChange={handleChangeScope}
              onTargetSecondaryChange={handleChangeTargetSecondary}
              faultTool={simFaultTool}
              onFaultToolChange={setSimFaultTool}
            />
          }
        />

        <main className="flex-1 relative overflow-hidden bg-[#0b0f19] flex flex-col p-4 gap-3">
          {currentPon ? (
            <>
              <HierarchyBreadcrumbBar
                oltName={currentOlt?.name || 'OLT'}
                ponName={currentPon.name}
                slotPort={currentPon.slotPort}
                steps={breadcrumbSteps}
              />

              <div className="flex-1 relative overflow-hidden rounded-xl border border-slate-800/60 bg-[#0b0f19]/80">
                <SynopticTreeCanvas
                  pon={currentPon}
                  oltName={currentOlt?.name || 'OLT'}
                  selectedBoxId={selectedBoxId}
                  onSelectBox={(boxId, steps) => {
                    setSelectedBoxId(boxId);
                    setBreadcrumbSteps(steps);
                  }}
                  onUpdatePrimaryBox={handleUpdatePrimaryBox}
                  onOpenEditBoxModal={(node) => setEditingNode(node)}
                  simulationData={isSimulationActive ? simulationData : undefined}
                  faultTool={isSimulationActive ? simFaultTool : null}
                  onApplyFault={isSimulationActive ? handleApplyFault : undefined}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              Selecciona un puerto PON del panel izquierdo para desplegar su cuadro sinóptico.
            </div>
          )}
        </main>
      </div>

      {isCreateOltModalOpen && (
        <CreateOLTModal
          onClose={() => setIsCreateOltModalOpen(false)}
          onSave={handleCreateOlt}
        />
      )}

      {editingOlt && (
        <EditOLTModal
          olt={editingOlt}
          onClose={() => setEditingOlt(null)}
          onSave={handleSaveEditedOlt}
        />
      )}

      {editingNode && (
        <EditBoxModal
          node={editingNode}
          onClose={() => setEditingNode(null)}
          onSave={handleSaveEditedBox}
        />
      )}
    </div>
  );
}
export default App;

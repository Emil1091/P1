import React, { useState } from 'react';
import {
  Network,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import type { OLTDevice, FTTHNode } from './types/ftth';
import { OLTListSidebar } from './components/OLTListSidebar';
import { SynopticTreeCanvas } from './components/SynopticTreeCanvas';
import { CreateOLTModal } from './components/CreateOLTModal';

// Inicialización de OLT con bandejas y topología 1x4 + 1x4 + 1x8
const initialOLTs: OLTDevice[] = [
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
          isCollapsed: false,
          children: [
            {
              id: 'sec-01',
              name: 'Secundario #1 (1x4)',
              type: 'caja_secundaria',
              ratio: 4,
              parentPortIndex: 1,
              isCollapsed: false,
              children: [
                {
                  id: 'nap-01',
                  name: 'NAP #1 (1x8)',
                  type: 'caja_nap',
                  ratio: 8,
                  parentPortIndex: 1,
                  children: []
                },
                {
                  id: 'nap-02',
                  name: 'NAP #2 (1x8)',
                  type: 'caja_nap',
                  ratio: 8,
                  parentPortIndex: 2,
                  children: []
                },
                {
                  id: 'nap-03',
                  name: 'NAP #3 (1x8)',
                  type: 'caja_nap',
                  ratio: 8,
                  parentPortIndex: 3,
                  children: []
                },
                {
                  id: 'nap-04',
                  name: 'NAP #4 (1x8)',
                  type: 'caja_nap',
                  ratio: 8,
                  parentPortIndex: 4,
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
              isCollapsed: true,
              children: [
                {
                  id: 'nap-05',
                  name: 'NAP #1 (1x8)',
                  type: 'caja_nap',
                  ratio: 8,
                  parentPortIndex: 1,
                  children: []
                }
              ]
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
      },
      {
        id: 'pon-1-1-3',
        name: 'S1-PON03',
        slotIndex: 1,
        portIndex: 3,
        slotPort: '0/1/3',
      },
      {
        id: 'pon-1-2-1',
        name: 'S2-PON01',
        slotIndex: 2,
        portIndex: 1,
        slotPort: '0/2/1',
      }
    ]
  },
  {
    id: 'olt-2',
    name: 'OLT Pop Norte',
    brand: 'ZTE',
    model: 'C320',
    chassisType: 'modular',
    slotsCount: 2,
    portsPerSlot: 4,
    ponPorts: [
      {
        id: 'pon-2-1-1',
        name: 'S1-PON01',
        slotIndex: 1,
        portIndex: 1,
        slotPort: '0/1/1',
      }
    ]
  }
];

export function App() {
  const [olts, setOlts] = useState<OLTDevice[]>(initialOLTs);
  const [selectedOltId, setSelectedOltId] = useState<string | null>('olt-1');
  const [selectedPonId, setSelectedPonId] = useState<string | null>('pon-1-1-1');
  const [expandedOltIds, setExpandedOltIds] = useState<string[]>(['olt-1']);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const currentOlt = olts.find(o => o.id === selectedOltId) || olts[0];
  const currentPon = currentOlt?.ponPorts.find(p => p.id === selectedPonId) || currentOlt?.ponPorts[0];

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

  const handleClearCurrentPon = () => {
    const confirmClear = window.confirm(`¿Estás seguro de que deseas borrar todo el diagrama del ${currentPon?.name}?`);
    if (confirmClear) {
      handleUpdatePrimaryBox(undefined);
    }
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(olts, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FTTH-OLTs-Sinoptico-${new Date().toISOString().slice(0, 10)}.json`;
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
      {/* Header */}
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
              1x4 + 1x4 + 1x8
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        {/* Sidebar OLTs con bandejas */}
        <OLTListSidebar
          olts={olts}
          selectedOltId={selectedOltId}
          selectedPonId={selectedPonId}
          expandedOltIds={expandedOltIds}
          onToggleExpandOlt={handleToggleExpandOlt}
          onSelectPon={handleSelectPon}
          onOpenCreateOltModal={() => setIsCreateModalOpen(true)}
          onDeleteOlt={handleDeleteOlt}
        />

        {/* Lienzo del Cuadro Sinóptico de Llaves */}
        <main className="flex-1 relative overflow-hidden bg-[#0b0f19]">
          {currentPon ? (
            <SynopticTreeCanvas
              pon={currentPon}
              onUpdatePrimaryBox={handleUpdatePrimaryBox}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              Selecciona un puerto PON del panel izquierdo para desplegar su cuadro sinóptico.
            </div>
          )}
        </main>
      </div>

      {/* Modal Crear OLT */}
      {isCreateModalOpen && (
        <CreateOLTModal
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateOlt}
        />
      )}
    </div>
  );
}
export default App;

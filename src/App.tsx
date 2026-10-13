import React, { useState } from 'react';
import {
  Network,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import type { OLTDevice, FTTHNode } from './types/ftth';
import { calculateFTTHPowers } from './utils/opticalBudget';
import { OLTListSidebar } from './components/OLTListSidebar';
import { TreeBracketCanvas } from './components/TreeBracketCanvas';

// Proyecto base inicial con OLT de ejemplo y topología 1x4 + 1x4 + 1x8
const initialOLTs: OLTDevice[] = [
  {
    id: 'olt-1',
    name: 'OLT Central - Huawei MA5800',
    location: 'Cabecera Central / Sala TI',
    portsCount: 8,
    ponPorts: [
      {
        id: 'pon-1-1',
        name: 'PON 01',
        slotPort: '0/1/1',
        txPower: 4.8,
        primaryBox: {
          id: 'pri-01',
          name: 'Caja Primaria 01',
          type: 'caja_primaria',
          ratio: 4,
          location: 'Cámara Subterránea 01',
          children: [
            {
              id: 'sec-01',
              name: 'Caja Secundario 01',
              type: 'caja_secundaria',
              ratio: 4,
              parentPortIndex: 1,
              location: 'Poste 12 - Av. San Martín',
              children: [
                {
                  id: 'nap-01',
                  name: 'Caja NAP 01',
                  type: 'caja_nap',
                  ratio: 8,
                  parentPortIndex: 1,
                  location: 'Poste 14 - Esquina Mitre',
                  children: []
                },
                {
                  id: 'nap-02',
                  name: 'Caja NAP 02',
                  type: 'caja_nap',
                  ratio: 8,
                  parentPortIndex: 2,
                  location: 'Poste 16 - Calle Belgrano',
                  children: []
                }
              ]
            },
            {
              id: 'sec-02',
              name: 'Caja Secundario 02',
              type: 'caja_secundaria',
              ratio: 4,
              parentPortIndex: 2,
              location: 'Poste 24 - Barrio Norte',
              children: [
                {
                  id: 'nap-03',
                  name: 'Caja NAP 01',
                  type: 'caja_nap',
                  ratio: 8,
                  parentPortIndex: 1,
                  location: 'Poste 26 - Pasaje Los Álamos',
                  children: []
                }
              ]
            }
          ]
        }
      },
      {
        id: 'pon-1-2',
        name: 'PON 02',
        slotPort: '0/1/2',
        txPower: 4.8,
      },
      {
        id: 'pon-1-3',
        name: 'PON 03',
        slotPort: '0/1/3',
        txPower: 4.8,
      },
      {
        id: 'pon-1-4',
        name: 'PON 04',
        slotPort: '0/1/4',
        txPower: 4.8,
      }
    ]
  },
  {
    id: 'olt-2',
    name: 'OLT Nodo Norte - ZTE C320',
    location: 'Pop Norte / Nodo Distribuidor',
    portsCount: 4,
    ponPorts: [
      {
        id: 'pon-2-1',
        name: 'PON 01',
        slotPort: '0/1/1',
        txPower: 5.0,
      },
      {
        id: 'pon-2-2',
        name: 'PON 02',
        slotPort: '0/1/2',
        txPower: 5.0,
      }
    ]
  }
];

export function App() {
  const [olts, setOlts] = useState<OLTDevice[]>(() => {
    return initialOLTs.map(olt => ({
      ...olt,
      ponPorts: olt.ponPorts.map(pon => ({
        ...pon,
        primaryBox: pon.primaryBox ? calculateFTTHPowers(pon.primaryBox, pon.txPower) : undefined
      }))
    }));
  });

  const [selectedOltId, setSelectedOltId] = useState<string | null>('olt-1');
  const [selectedPonId, setSelectedPonId] = useState<string | null>('pon-1-1');
  const [expandedOltIds, setExpandedOltIds] = useState<string[]>(['olt-1']);

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

  const handleAddOlt = () => {
    const oltNum = olts.length + 1;
    const newOlt: OLTDevice = {
      id: `olt-${Date.now().toString().slice(-4)}`,
      name: `OLT Nodo ${oltNum}`,
      location: `Cabecera ${oltNum}`,
      portsCount: 4,
      ponPorts: [
        { id: `pon-${Date.now()}-1`, name: 'PON 01', slotPort: '0/1/1', txPower: 4.8 },
        { id: `pon-${Date.now()}-2`, name: 'PON 02', slotPort: '0/1/2', txPower: 4.8 },
      ]
    };
    setOlts(prev => [...prev, newOlt]);
    setSelectedOltId(newOlt.id);
    setSelectedPonId(newOlt.ponPorts[0].id);
    setExpandedOltIds(prev => [...prev, newOlt.id]);
  };

  const handleAddPon = (oltId: string) => {
    setOlts(prev =>
      prev.map(olt => {
        if (olt.id === oltId) {
          const nextIndex = olt.ponPorts.length + 1;
          const newPon = {
            id: `pon-${olt.id}-${nextIndex}`,
            name: `PON 0${nextIndex}`,
            slotPort: `0/1/${nextIndex}`,
            txPower: 4.8,
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

  const handleUpdatePrimaryBox = (updatedBox: FTTHNode | undefined) => {
    if (!selectedOltId || !selectedPonId) return;

    setOlts(prev =>
      prev.map(olt => {
        if (olt.id === selectedOltId) {
          return {
            ...olt,
            ponPorts: olt.ponPorts.map(pon => {
              if (pon.id === selectedPonId) {
                const calculated = updatedBox
                  ? calculateFTTHPowers(updatedBox, pon.txPower)
                  : undefined;
                return {
                  ...pon,
                  primaryBox: calculated
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
    a.download = `FTTH-OLTs-${new Date().toISOString().slice(0, 10)}.json`;
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
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/20">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              FTTH Tree Topology Designer
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                1x4 + 1x4 + 1x8
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Diseño jerárquico balanceado por OLT y puertos PON con validación física de puertos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleClearCurrentPon}
            className="px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-800/60 text-xs font-semibold text-red-300 hover:text-red-100 flex items-center gap-1.5 transition shadow-sm"
            title="Borrar todo el árbol del PON actual"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Borrar PON</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800" />

          <label
            className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition"
            title="Importar proyecto JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition"
            title="Descargar proyecto en JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <OLTListSidebar
          olts={olts}
          selectedOltId={selectedOltId}
          selectedPonId={selectedPonId}
          expandedOltIds={expandedOltIds}
          onToggleExpandOlt={handleToggleExpandOlt}
          onSelectPon={handleSelectPon}
          onAddOlt={handleAddOlt}
          onAddPon={handleAddPon}
        />

        <main className="flex-1 relative overflow-hidden bg-[#090d16]">
          {currentPon ? (
            <TreeBracketCanvas
              pon={currentPon}
              onUpdatePrimaryBox={handleUpdatePrimaryBox}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Selecciona un puerto PON del panel izquierdo para visualizar su árbol de red.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
export default App;

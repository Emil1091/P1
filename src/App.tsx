import React, { useState, useEffect } from 'react';
import {
  Network,
  Download,
  Upload,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Image,
  RefreshCw,
  Trash2,
  RotateCcw
} from 'lucide-react';
import type { DiagramNode, NodeType } from './types/ftth';
import { calculateOpticalPowers } from './utils/opticalBudget';
import { TopologyCanvas } from './components/TopologyCanvas';
import { Sidebar } from './components/Sidebar';
import { SpliceTrayModal } from './components/SpliceTrayModal';
import {
  loginWithGoogle,
  logoutUser,
  saveProjectToFirestore,
  loadProjectFromFirestore,
  auth
} from './services/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

const initialNetworkTopology: DiagramNode = {
  id: 'olt-root',
  name: 'OLT Central - Chasis 1',
  type: 'olt',
  power: 5.0,
  position: { x: 220, y: 320 },
  cableFibers: 48,
  children: [
    {
      id: 'pon-1',
      name: 'Puerto PON 0/1/1',
      type: 'pon',
      power: 4.8,
      position: { x: 540, y: 320 },
      cableFibers: 24,
      children: [
        {
          id: 'mufa-1',
          name: 'Mufa Troncal 01 (Cierre Domo)',
          type: 'mufa',
          position: { x: 860, y: 320 },
          cableFibers: 24,
          fibers: 24,
          splices: [
            { from: 1, to: 'out', toFiber: 1 },
            { from: 2, to: 'out', toFiber: 2 },
          ],
          children: [
            {
              id: 'sp-1',
              name: 'Splitter Primario 1:4',
              type: 'splitter',
              ratio: 4,
              position: { x: 1180, y: 220 },
              children: [
                {
                  id: 'nap-01',
                  name: 'Caja NAP-01 (1:8)',
                  type: 'nap',
                  ratio: 8,
                  position: { x: 1480, y: 150 },
                  children: [
                    {
                      id: 'client-1',
                      name: 'Cliente ONT - Casa 12',
                      type: 'client',
                      position: { x: 1780, y: 110 },
                      children: []
                    },
                    {
                      id: 'client-2',
                      name: 'Cliente ONT - Casa 14',
                      type: 'client',
                      position: { x: 1780, y: 190 },
                      children: []
                    }
                  ]
                },
                {
                  id: 'nap-02',
                  name: 'Caja NAP-02 (1:8)',
                  type: 'nap',
                  ratio: 8,
                  position: { x: 1480, y: 290 },
                  children: []
                }
              ]
            },
            {
              id: 'sp-2',
              name: 'Splitter Primario 1:8',
              type: 'splitter',
              ratio: 8,
              position: { x: 1180, y: 440 },
              children: []
            }
          ]
        }
      ]
    }
  ]
};

export function App() {
  const [network, setNetwork] = useState<DiagramNode | null>(() => calculateOpticalPowers(initialNetworkTopology));
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMufaModal, setActiveMufaModal] = useState<DiagramNode | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('offline');

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setSyncStatus('synced');
        try {
          const cloudData = await loadProjectFromFirestore(currentUser.uid);
          if (cloudData) {
            setNetwork(calculateOpticalPowers(cloudData));
          }
        } catch (e) {
          console.error("Error al cargar proyecto desde la nube:", e);
        }
      } else {
        setSyncStatus('offline');
      }
    });
    return () => unsub();
  }, []);

  const updateNodeInTree = (root: DiagramNode, id: string, updater: (node: DiagramNode) => DiagramNode): DiagramNode => {
    if (root.id === id) {
      return updater(root);
    }
    return {
      ...root,
      children: (root.children || []).map(child => updateNodeInTree(child, id, updater)),
    };
  };

  const removeNodeFromTree = (root: DiagramNode, id: string): DiagramNode => {
    return {
      ...root,
      children: (root.children || [])
        .filter(child => child.id !== id)
        .map(child => removeNodeFromTree(child, id)),
    };
  };

  const handleNetworkChange = (newTree: DiagramNode | null) => {
    if (!newTree) {
      setNetwork(null);
      setSelectedNode(null);
      return;
    }
    const calculated = calculateOpticalPowers(newTree);
    setNetwork(calculated);

    if (selectedNode) {
      const findNode = (n: DiagramNode, id: string): DiagramNode | null => {
        if (n.id === id) return n;
        for (const c of n.children || []) {
          const found = findNode(c, id);
          if (found) return found;
        }
        return null;
      };
      const refreshed = findNode(calculated, selectedNode.id);
      if (refreshed) setSelectedNode(refreshed);
    }

    if (user) {
      setSyncStatus('saving');
      const timer = setTimeout(async () => {
        try {
          await saveProjectToFirestore(user.uid, calculated);
          setSyncStatus('synced');
        } catch (err) {
          console.error(err);
          setSyncStatus('offline');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  };

  // Botón para borrar todo el lienzo en blanco
  const handleClearAll = () => {
    const confirmClear = window.confirm("¿Estás seguro de que deseas borrar todo el lienzo? Se eliminarán todos los elementos.");
    if (confirmClear) {
      handleNetworkChange(null);
    }
  };

  // Restaurar topología demo inicial
  const handleResetDemo = () => {
    handleNetworkChange(calculateOpticalPowers(initialNetworkTopology));
  };

  // Crear nodo raíz si el lienzo está en blanco
  const handleCreateRoot = () => {
    const newRoot: DiagramNode = {
      id: 'olt-root',
      name: 'OLT Central',
      type: 'olt',
      power: 5.0,
      position: { x: 300, y: 300 },
      cableFibers: 48,
      children: []
    };
    handleNetworkChange(newRoot);
  };

  const handleToggleCollapse = (id: string) => {
    if (!network) return;
    const updated = updateNodeInTree(network, id, node => ({
      ...node,
      isCollapsed: !node.isCollapsed,
    }));
    handleNetworkChange(updated);
  };

  const handleUpdatePosition = (id: string, pos: { x: number; y: number }) => {
    if (!network) return;
    const updated = updateNodeInTree(network, id, node => ({
      ...node,
      position: pos,
    }));
    handleNetworkChange(updated);
  };

  const handleAddChild = (parentNode: DiagramNode, type: NodeType) => {
    if (!network) return;
    const newId = `${type}-${Date.now().toString().slice(-4)}`;
    const offset = (parentNode.children?.length || 0) * 110;
    const parentPos = parentNode.position || { x: 300, y: 300 };

    const newNode: DiagramNode = {
      id: newId,
      name: `${type.toUpperCase()} ${newId.slice(-3)}`,
      type,
      ratio: type === 'splitter' || type === 'nap' ? 8 : undefined,
      cableFibers: 12,
      fibers: 12,
      position: { x: parentPos.x + 300, y: parentPos.y - 60 + offset },
      children: [],
    };

    const updated = updateNodeInTree(network, parentNode.id, node => ({
      ...node,
      isCollapsed: false,
      children: [...(node.children || []), newNode],
    }));

    handleNetworkChange(updated);
  };

  const handleAddQuickNode = (type: NodeType) => {
    if (!network) {
      handleCreateRoot();
      return;
    }
    const target = selectedNode || network;
    handleAddChild(target, type);
  };

  const handleDeleteNode = (id: string) => {
    if (!network) return;
    if (id === network.id) {
      handleClearAll();
      return;
    }
    const updated = removeNodeFromTree(network, id);
    if (selectedNode?.id === id) setSelectedNode(null);
    handleNetworkChange(updated);
  };

  const handleUpdateSelectedProps = (partial: Partial<DiagramNode>) => {
    if (!selectedNode || !network) return;
    const updated = updateNodeInTree(network, selectedNode.id, node => ({
      ...node,
      ...partial,
    }));
    handleNetworkChange(updated);
  };

  const handleExportJSON = () => {
    if (!network) {
      alert("No hay elementos en el diagrama para exportar.");
      return;
    }
    const jsonStr = JSON.stringify(network, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FTTH-Topologia-${new Date().toISOString().slice(0, 10)}.json`;
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
        if (parsed.id && parsed.children) {
          handleNetworkChange(parsed);
        } else {
          alert("El archivo no tiene el formato correcto de topología FTTH.");
        }
      } catch (err) {
        alert("Error al leer el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleExportSVG = () => {
    const svgElem = document.querySelector('svg.pointer-events-none');
    if (!svgElem) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElem);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FTTH-Diagrama-${new Date().toISOString().slice(0, 10)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/20">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              FTTH GIS & Topology Designer
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO v1.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Diseño, documentación y cálculo óptico de redes de fibra óptica (FTTx / Planta Externa)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium">
            {syncStatus === 'synced' && (
              <>
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Guardado en nube</span>
              </>
            )}
            {syncStatus === 'saving' && (
              <>
                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="text-amber-400">Guardando...</span>
              </>
            )}
            {syncStatus === 'offline' && (
              <>
                <CloudOff className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Modo Local</span>
              </>
            )}
          </div>

          <div className="h-5 w-[1px] bg-slate-800" />

          {/* Botón Borrar Todo el Lienzo */}
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-800/60 text-xs font-semibold text-red-300 hover:text-red-100 flex items-center gap-1.5 transition shadow-sm"
            title="Borrar todos los elementos y dejar el lienzo en blanco"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Borrar Lienzo</span>
          </button>

          {/* Botón Cargar Demo */}
          <button
            onClick={handleResetDemo}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition"
            title="Restaurar topología de demostración"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cargar Demo</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800" />

          <label
            className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition"
            title="Importar archivo JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition"
            title="Descargar topología en JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={handleExportSVG}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition"
            title="Exportar plano en SVG"
          >
            <Image className="w-3.5 h-3.5" />
            <span>Exportar SVG</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span className="text-xs text-slate-300 font-mono">{user.displayName || user.email}</span>
              <button
                onClick={() => logoutUser()}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => loginWithGoogle().catch(() => alert("Firebase Auth requiere credenciales activas o ejecutar en localhost."))}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Conectar Google</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          root={network}
          selectedNode={selectedNode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectNode={setSelectedNode}
          onUpdateNode={handleUpdateSelectedProps}
          onAddQuickNode={handleAddQuickNode}
        />

        <main className="flex-1 relative overflow-hidden">
          <TopologyCanvas
            root={network}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onToggleCollapse={handleToggleCollapse}
            onOpenSplices={setActiveMufaModal}
            onAddChild={handleAddChild}
            onDeleteNode={handleDeleteNode}
            onUpdatePosition={handleUpdatePosition}
            onCreateRoot={handleCreateRoot}
          />
        </main>
      </div>

      {activeMufaModal && (
        <SpliceTrayModal
          node={activeMufaModal}
          onClose={() => setActiveMufaModal(null)}
          onUpdate={(updated) => {
            if (!network) return;
            const newTree = updateNodeInTree(network, updated.id, () => updated);
            handleNetworkChange(newTree);
          }}
        />
      )}
    </div>
  );
}
export default App;

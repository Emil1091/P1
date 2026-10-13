import React, { useState } from 'react';
import { Search, MapPin, Radio, Split, X } from 'lucide-react';
import type { OLTDevice, FTTHNode } from '../types/ftth';

interface SearchResultItem {
  boxId: string;
  boxName: string;
  boxType: string;
  location?: string;
  oltId: string;
  oltName: string;
  ponId: string;
  ponName: string;
}

interface BoxSearchModalProps {
  olts: OLTDevice[];
  onClose: () => void;
  onSelectResult: (result: SearchResultItem) => void;
}

export const BoxSearchModal: React.FC<BoxSearchModalProps> = ({ olts, onClose, onSelectResult }) => {
  const [query, setQuery] = useState('');

  // Aplanar y buscar en todas las cajas de todas las OLTs y PONs
  const results: SearchResultItem[] = [];

  const collectBoxes = (node: FTTHNode, olt: OLTDevice, ponId: string, ponName: string) => {
    const textToMatch = `${node.name} ${node.location || ''} ${node.notes || ''}`.toLowerCase();
    if (textToMatch.includes(query.toLowerCase())) {
      results.push({
        boxId: node.id,
        boxName: node.name,
        boxType: node.type,
        location: node.location,
        oltId: olt.id,
        oltName: olt.name,
        ponId,
        ponName,
      });
    }

    (node.children || []).forEach(child => collectBoxes(child, olt, ponId, ponName));
  };

  if (query.trim().length > 0) {
    olts.forEach(olt => {
      olt.ponPorts.forEach(pon => {
        if (pon.primaryBox) {
          collectBoxes(pon.primaryBox, olt, pon.id, pon.name);
        }
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-20 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Barra de input buscador */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Buscar caja por nombre, poste, calle o código (ej. NAP, Mitre, 104)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {query.trim().length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Escribe el nombre o ubicación de una caja para localizar su ruta de fibra.
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No se encontraron cajas con "{query}".
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.boxId}
                onClick={() => {
                  onSelectResult(item);
                  onClose();
                }}
                className="p-2.5 rounded-lg hover:bg-slate-800/60 cursor-pointer flex items-center justify-between text-xs transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-slate-800 border border-slate-700/60">
                    {item.boxType === 'caja_nap' ? (
                      <Radio className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Split className="w-4 h-4 text-sky-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-200 block">{item.boxName}</span>
                    {item.location && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" /> {item.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-[10px] font-mono text-slate-400">
                  <span className="text-slate-300 block">{item.oltName}</span>
                  <span className="text-amber-400">{item.ponName}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

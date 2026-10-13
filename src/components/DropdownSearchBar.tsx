import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Radio, Split, X } from 'lucide-react';
import type { OLTDevice, FTTHNode } from '../types/ftth';

export interface SearchResultItem {
  boxId: string;
  boxName: string;
  boxType: string;
  location?: string;
  oltId: string;
  oltName: string;
  ponId: string;
  ponName: string;
}

interface DropdownSearchBarProps {
  olts: OLTDevice[];
  onSelectResult: (result: SearchResultItem) => void;
}

export const DropdownSearchBar: React.FC<DropdownSearchBarProps> = ({ olts, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div ref={containerRef} className="relative select-none">
      {/* Barra de input integrado */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus-within:border-indigo-500 rounded-lg px-2.5 py-1 text-xs w-64 transition">
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar caja (ej. NAP, poste, calle)..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          className="w-full bg-transparent text-slate-200 placeholder:text-slate-500 focus:outline-none text-xs"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="text-slate-500 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Menú Flotante Dropdown de Resultados (NO tapa la pantalla) */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-80 max-h-80 overflow-y-auto bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md z-50 divide-y divide-slate-800/50 animate-in fade-in slide-in-from-top-2">
          {results.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              No se encontraron cajas con "{query}".
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.boxId}
                onClick={() => {
                  onSelectResult(item);
                  setIsOpen(false);
                }}
                className="p-2.5 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between text-xs transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="p-1 rounded bg-slate-800 border border-slate-700/60 flex-shrink-0">
                    {item.boxType === 'caja_nap' ? (
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Split className="w-3.5 h-3.5 text-sky-400" />
                    )}
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-slate-200 block truncate">{item.boxName}</span>
                    {item.location && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-[10px] font-mono text-slate-400 flex-shrink-0 pl-2">
                  <span className="text-slate-300 block truncate max-w-[80px]">{item.oltName}</span>
                  <span className="text-amber-400">{item.ponName}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { X, Box, MapPin, FileText, Split } from 'lucide-react';
import type { FTTHNode, SplitterRatio } from '../types/ftth';

interface EditBoxModalProps {
  node: FTTHNode;
  onClose: () => void;
  onSave: (updated: Partial<FTTHNode>) => void;
}

export const EditBoxModal: React.FC<EditBoxModalProps> = ({ node, onClose, onSave }) => {
  const [name, setName] = useState(node.name);
  const [location, setLocation] = useState(node.location || '');
  const [notes, setNotes] = useState(node.notes || '');
  const [ratio, setRatio] = useState<SplitterRatio>(node.ratio || 4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim() || node.name,
      location: location.trim(),
      notes: notes.trim(),
      ratio,
    });
    onClose();
  };

  const getTypeName = () => {
    switch (node.type) {
      case 'caja_primaria': return 'Caja Primaria';
      case 'caja_secundaria': return 'Caja Secundaria';
      case 'caja_nap': return 'Caja NAP';
      default: return 'Caja';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Editar {getTypeName()}</h2>
              <p className="text-[11px] text-slate-400">Datos técnicos y ubicación física</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nombre / Identificador</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ubicación Física (Poste, Cámara, Calle)</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Poste 14 - Mitre y San Martín"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <Split className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ratio del Splitter Balanceado</span>
            </label>
            <select
              value={ratio}
              onChange={(e) => setRatio(Number(e.target.value) as SplitterRatio)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value={2}>Splitter 1:2 (2 salidas)</option>
              <option value={4}>Splitter 1:4 (4 salidas)</option>
              <option value={8}>Splitter 1:8 (8 salidas)</option>
              <option value={16}>Splitter 1:16 (16 salidas)</option>
              <option value={32}>Splitter 1:32 (32 salidas)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Observaciones / Notas</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Cámara inundable, conector SC/APC verde..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 transition"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

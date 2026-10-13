import React, { useState } from 'react';
import { X, Server, Layers, Cpu } from 'lucide-react';
import type { OLTDevice, OLTChassisType } from '../types/ftth';

interface EditOLTModalProps {
  olt: OLTDevice;
  onClose: () => void;
  onSave: (updatedOlt: OLTDevice) => void;
}

export const EditOLTModal: React.FC<EditOLTModalProps> = ({ olt, onClose, onSave }) => {
  const [name, setName] = useState(olt.name);
  const [brand, setBrand] = useState(olt.brand);
  const [model, setModel] = useState(olt.model);
  const [chassisType, setChassisType] = useState<OLTChassisType>(olt.chassisType);
  const [slotsCount, setSlotsCount] = useState(olt.slotsCount);
  const [portsPerSlot, setPortsPerSlot] = useState(olt.portsPerSlot);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...olt,
      name: name.trim() || olt.name,
      brand,
      model: model.trim() || olt.model,
      chassisType,
      slotsCount: chassisType === 'modular' ? slotsCount : 1,
      portsPerSlot,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Editar Cabecera OLT</h2>
              <p className="text-[11px] text-slate-400">Modificar datos de chasis y configuración</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Marca</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Huawei">Huawei</option>
                <option value="ZTE">ZTE</option>
                <option value="Fiberhome">Fiberhome</option>
                <option value="VSOL">V-SOL</option>
                <option value="Nokia">Nokia</option>
                <option value="C-Data">C-Data</option>
                <option value="Otra">Otra Marca</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Modelo</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Tipo de Chasis / Montaje</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChassisType('modular')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  chassisType === 'modular'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Modular</span>
                </div>
                <span className="text-[10px] text-slate-400 block">Con bandejas / slots</span>
              </button>

              <button
                type="button"
                onClick={() => setChassisType('pizzabox')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  chassisType === 'pizzabox'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pizzabox / 1U</span>
                </div>
                <span className="text-[10px] text-slate-400 block">Puertos integrados</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {chassisType === 'modular' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Cantidad de Bandejas (Slots)
                </label>
                <select
                  value={slotsCount}
                  onChange={(e) => setSlotsCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1 Bandeja</option>
                  <option value={2}>2 Bandejas</option>
                  <option value={4}>4 Bandejas</option>
                  <option value={7}>7 Bandejas</option>
                  <option value={15}>15 Bandejas</option>
                </select>
              </div>
            )}

            <div className={chassisType === 'pizzabox' ? 'col-span-2' : ''}>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Puertos PON por {chassisType === 'modular' ? 'Bandeja' : 'Equipo'}
              </label>
              <select
                value={portsPerSlot}
                onChange={(e) => setPortsPerSlot(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={4}>4 Puertos PON</option>
                <option value={8}>8 Puertos PON</option>
                <option value={16}>16 Puertos PON</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
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
              Guardar OLT
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

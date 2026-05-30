import React, { useState, useEffect } from 'react';
import { ProjectData } from '../types';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

interface SIPOCData {
  suppliers: string[];
  inputs: string[];
  process: string[];
  outputs: string[];
  customers: string[];
}

interface ColumnProps {
  title: string;
  column: keyof SIPOCData;
  color: string;
  data: SIPOCData;
  updateItem: (column: keyof SIPOCData, index: number, value: string) => void;
  removeItem: (column: keyof SIPOCData, index: number) => void;
  addItem: (column: keyof SIPOCData) => void;
}

const Column: React.FC<ColumnProps> = ({ title, column, color, data, updateItem, removeItem, addItem }) => (
  <div className="flex-1 min-w-[180px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
    <div className={`p-3 ${color} text-white font-bold text-center text-sm uppercase tracking-wider`}>
      {title}
    </div>
    <div className="p-3 flex-1 space-y-2 bg-slate-50/50">
      {data[column].map((item, idx) => (
        <div key={`${column}-${idx}`} className="group relative">
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(column, idx, e.target.value)}
            placeholder="..."
            className="w-full p-2 pr-8 text-xs border border-slate-200 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <button
            onClick={() => removeItem(column, idx)}
            className="absolute right-2 top-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={() => addItem(column)}
        className="w-full py-2 border-2 border-dashed border-slate-200 rounded text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-1 text-[10px] font-bold uppercase"
      >
        <Plus className="w-3 h-3" /> Lägg till
      </button>
    </div>
  </div>
);

const VisualSIPOC: React.FC<Props> = ({ project, updateProject }) => {
  const initialData: SIPOCData = project.toolData?.['t_sipoc']?.visualData || {
    suppliers: [],
    inputs: [],
    process: [],
    outputs: [],
    customers: []
  };

  const [data, setData] = useState<SIPOCData>(initialData);

  const syncData = (newData: SIPOCData) => {
    setData(newData);
    const updatedToolData = {
      ...project.toolData,
      't_sipoc': {
        ...project.toolData?.['t_sipoc'],
        visualData: newData,
        content: `Suppliers: ${newData.suppliers.join(', ')}\nInputs: ${newData.inputs.join(', ')}\nProcess: ${newData.process.join(' -> ')}\nOutputs: ${newData.outputs.join(', ')}\nCustomers: ${newData.customers.join(', ')}`
      }
    };
    updateProject({ toolData: updatedToolData });
  };

  const addItem = (column: keyof SIPOCData) => {
    const newData = { ...data, [column]: [...data[column], ''] };
    syncData(newData);
  };

  const updateItem = (column: keyof SIPOCData, index: number, value: string) => {
    const newCol = [...data[column]];
    newCol[index] = value;
    const newData = { ...data, [column]: newCol };
    syncData(newData);
  };

  const removeItem = (column: keyof SIPOCData, index: number) => {
    const newCol = data[column].filter((_, i) => i !== index);
    const newData = { ...data, [column]: newCol };
    syncData(newData);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap lg:flex-nowrap gap-4 items-stretch">
        <Column title="Suppliers" column="suppliers" color="bg-slate-700" data={data} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
        <div className="hidden lg:flex items-center text-slate-300"><ArrowRight /></div>
        <Column title="Inputs" column="inputs" color="bg-blue-600" data={data} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
        <div className="hidden lg:flex items-center text-slate-300"><ArrowRight /></div>
        <Column title="Process" column="process" color="bg-emerald-600" data={data} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
        <div className="hidden lg:flex items-center text-slate-300"><ArrowRight /></div>
        <Column title="Outputs" column="outputs" color="bg-amber-600" data={data} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
        <div className="hidden lg:flex items-center text-slate-300"><ArrowRight /></div>
        <Column title="Customers" column="customers" color="bg-indigo-600" data={data} updateItem={updateItem} removeItem={removeItem} addItem={addItem} />
      </div>
      
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
        <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Tips för SIPOC</h4>
        <p className="text-xs text-blue-700 leading-relaxed">
          Börja med <strong>Process</strong> (5-7 steg) och <strong>Outputs</strong>. Identifiera sedan vem som tar emot dessa (Customers) och vad som krävs för att starta processen (Inputs/Suppliers).
        </p>
      </div>
    </div>
  );
};

export default VisualSIPOC;

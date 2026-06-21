import React, { useState } from 'react';
import { ProjectData } from '../types';
import { Plus, Trash2, ArrowDown, Settings2, AlertCircle } from 'lucide-react';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

interface ProcessStep {
  id: string;
  type: 'task' | 'decision' | 'start' | 'end';
  text: string;
  valueAdd: boolean;
}

const VisualProcessMap: React.FC<Props> = ({ project, updateProject }) => {
  const initialSteps: ProcessStep[] = project.toolData?.['t_process_map']?.visualData || [
    { id: '1', type: 'start', text: 'Start', valueAdd: true }
  ];

  const [steps, setSteps] = useState<ProcessStep[]>(initialSteps);

  const syncData = (newSteps: ProcessStep[]) => {
    setSteps(newSteps);
    const updatedToolData = {
      ...project.toolData,
      't_process_map': {
        ...project.toolData?.['t_process_map'],
        visualData: newSteps,
        content: newSteps.map(s => `[${s.type.toUpperCase()}] ${s.text} (${s.valueAdd ? 'VA' : 'NVA'})`).join('\n')
      }
    };
    updateProject({ toolData: updatedToolData });
  };

  const addStep = (index: number) => {
    const newStep: ProcessStep = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'task',
      text: '',
      valueAdd: true
    };
    const newSteps = [...steps];
    newSteps.splice(index + 1, 0, newStep);
    syncData(newSteps);
  };

  const updateStep = (index: number, updates: Partial<ProcessStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    syncData(newSteps);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const newSteps = steps.filter((_, i) => i !== index);
    syncData(newSteps);
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-4">
      <div className="space-y-4 flex flex-col items-center">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className="group relative w-full flex items-center gap-4">
              {/* Step Card */}
              <div className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                step.type === 'decision' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 rotate-1 text-slate-800 dark:text-amber-200' : 
                step.type === 'start' || step.type === 'end' ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-full text-center text-slate-800 dark:text-slate-200' :
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              } ${!step.valueAdd ? 'border-dashed border-red-300 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 text-red-800 dark:text-red-200' : ''}`}>
                
                <div className="flex items-center gap-3">
                  <select
                    value={step.type}
                    onChange={(e) => updateStep(idx, { type: e.target.value as any })}
                    className="bg-transparent text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 outline-none"
                  >
                    <option value="task" className="dark:bg-slate-900 dark:text-white">Aktivitet</option>
                    <option value="decision" className="dark:bg-slate-900 dark:text-white">Beslut</option>
                    <option value="start" className="dark:bg-slate-900 dark:text-white">Start</option>
                    <option value="end" className="dark:bg-slate-900 dark:text-white">Slut</option>
                  </select>
                  
                  <input
                    type="text"
                    value={step.text}
                    onChange={(e) => updateStep(idx, { text: e.target.value })}
                    placeholder="Beskriv steget..."
                    className="flex-1 bg-transparent font-medium text-slate-800 dark:text-white outline-none text-sm"
                  />

                  <button
                    onClick={() => updateStep(idx, { valueAdd: !step.valueAdd })}
                    className={`p-1.5 rounded-md transition-colors ${step.valueAdd ? 'text-emerald-500 hover:bg-emerald-50' : 'text-red-500 bg-red-50'}`}
                    title={step.valueAdd ? "Value Add" : "Non-Value Add"}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => removeStep(idx)}
                    className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Add Button Between Steps */}
              <button
                onClick={() => addStep(idx)}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {idx < steps.length - 1 && (
              <div className="py-2">
                <ArrowDown className="w-5 h-5 text-slate-300" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="mt-12 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded"></div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Value Add</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-50 dark:bg-red-950/20 border-2 border-dashed border-red-300 dark:border-red-900/40 rounded"></div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Non-Value Add (Waste)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/40 rotate-1 rounded"></div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Beslutspunkt</span>
        </div>
      </div>
    </div>
  );
};

export default VisualProcessMap;

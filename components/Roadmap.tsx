import React from 'react';
import { ProjectData, Phase } from '../types';
import { TOOLS_LIBRARY } from '../data/toolsData';
import { CheckSquare, Square, Info, Wrench } from 'lucide-react';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const Roadmap: React.FC<Props> = ({ project, updateProject }) => {
  const toggleTool = (toolId: string) => {
    const currentTools = project.selectedTools || [];
    let newTools: string[];

    if (currentTools.includes(toolId)) {
      newTools = currentTools.filter(id => id !== toolId);
    } else {
      newTools = [...currentTools, toolId];
    }
    updateProject({ selectedTools: newTools });
  };

  const phases = Object.values(Phase);

  const getPhaseColor = (phase: Phase) => {
    switch(phase) {
      case Phase.DEFINE: return 'border-blue-500 bg-blue-50 dark:bg-blue-950/45 text-blue-700 dark:text-blue-300';
      case Phase.MEASURE: return 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300';
      case Phase.ANALYZE: return 'border-purple-500 bg-purple-50 dark:bg-purple-950/45 text-purple-700 dark:text-purple-300';
      case Phase.IMPROVE: return 'border-pink-500 bg-pink-50 dark:bg-pink-950/45 text-pink-700 dark:text-pink-300';
      case Phase.CONTROL: return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-300';
      default: return 'border-slate-500 bg-slate-50 dark:bg-slate-900';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between mb-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">DMAIC Roadmap</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm">Välj vilka verktyg du planerar att använda i detta projekt. Anpassa verktygslådan efter projektets komplexitet.</p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                <Wrench className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 dark:bg-blue-900/40 border border-blue-500 rounded-sm animate-pulse"></span> Vald</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-750 rounded-sm"></span> Ej vald</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {phases.map((phase) => (
          <div key={phase} className="flex flex-col space-y-3">
            <div className={`p-3 rounded-t-lg border-b-4 font-bold text-center uppercase tracking-wide shadow-sm ${getPhaseColor(phase)}`}>
              {phase}
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-b-lg p-2 space-y-2 h-full border-x border-b dark:border-slate-800/20">
              {TOOLS_LIBRARY.filter(t => t.phase === phase).map(tool => {
                const isSelected = (project.selectedTools || []).includes(tool.id);
                return (
                  <div 
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`
                      relative p-3 rounded-md border cursor-pointer transition-all duration-200 group
                      ${isSelected 
                        ? 'bg-white dark:bg-slate-800 border-blue-400 dark:border-blue-500 shadow-md transform scale-[1.02]' 
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm opacity-80 hover:opacity-100'}
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                        <span className={`font-semibold text-sm ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                            {tool.name}
                        </span>
                        {isSelected 
                            ? <CheckSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 group-hover:text-slate-400" />
                        }
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {tool.description}
                    </p>
                    {tool.recommended && (
                        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                        </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Roadmap;
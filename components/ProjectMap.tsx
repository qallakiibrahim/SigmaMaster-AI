import React from 'react';
import { Phase, ProjectData } from '../types';
import { TOOLS_LIBRARY } from '../data/toolsData';
import { CheckCircle2, Circle, PlayCircle, ArrowRight, FileText, Layout } from 'lucide-react';

interface Props {
  project: ProjectData;
  onViewChange: (view: any) => void;
}

const ProjectMap: React.FC<Props> = ({ project, onViewChange }) => {
  const phases = [
    { id: Phase.DEFINE, label: 'Define', color: 'blue', description: 'Definiera problemet och målet' },
    { id: Phase.MEASURE, label: 'Measure', color: 'emerald', description: 'Mät nuläget och samla data' },
    { id: Phase.ANALYZE, label: 'Analyze', color: 'amber', description: 'Analysera rotorsaker' },
    { id: Phase.IMPROVE, label: 'Improve', color: 'indigo', description: 'Förbättra processen' },
    { id: Phase.CONTROL, label: 'Control', color: 'rose', description: 'Säkra resultatet' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'In Progress': return <PlayCircle className="w-5 h-5 text-blue-500 animate-pulse" />;
      default: return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  const getPhaseTools = (phaseId: Phase) => {
    return TOOLS_LIBRARY.filter(t => t.phase === phaseId && project.selectedTools.includes(t.id));
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Projektflöde</h2>
          <p className="text-slate-500 font-medium">Hela DMAIC-resan för {project.name}</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => onViewChange('A3Report')}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 text-sm font-bold"
            >
                <FileText className="w-4 h-4" /> Generera A3 Rapport
            </button>
        </div>
      </div>

      {/* Visual Flow - Vertical for better mobile support and detail */}
      <div className="space-y-4 relative">
        {/* Vertical Line */}
        <div className="absolute left-10 top-0 bottom-0 w-1 bg-slate-100 rounded-full hidden md:block"></div>

        {phases.map((phase, idx) => {
          const status = project.tollgateStatus[phase.id] || 'Not Started';
          const tools = getPhaseTools(phase.id);
          
          const colorClasses: Record<string, string> = {
            blue: 'bg-blue-600 shadow-blue-200',
            emerald: 'bg-emerald-600 shadow-emerald-200',
            amber: 'bg-amber-600 shadow-amber-200',
            indigo: 'bg-indigo-600 shadow-indigo-200',
            rose: 'bg-rose-600 shadow-rose-200',
          };

          return (
            <div key={phase.id} className="relative flex items-start gap-8 group">
              {/* Phase Number/Icon */}
              <div className={`relative z-10 w-20 h-20 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl transition-all group-hover:scale-110 shrink-0 ${colorClasses[phase.color]}`}>
                {idx + 1}
              </div>

              {/* Content Card */}
              <div className="flex-1 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{phase.label}</h3>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                            status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                            {status}
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">{phase.description}</p>
                  </div>
                  <button 
                    onClick={() => onViewChange(phase.id)}
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                  >
                    Öppna Fas <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {tools.length > 0 ? tools.map(tool => (
                      <div key={tool.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Verktyg</div>
                        <div className="text-xs font-bold text-slate-700 truncate">{tool.name}</div>
                      </div>
                    )) : (
                      <div className="col-span-full py-4 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 text-xs font-medium">
                        Inga verktyg aktiverade för denna fas
                      </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectMap;

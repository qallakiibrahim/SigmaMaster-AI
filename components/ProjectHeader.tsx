import React from 'react';
import { Phase, ProjectData } from '../types';
import { Target, Activity, Search, Settings, ShieldCheck, Share2, FileDown, FileText, ChevronLeft, Clock } from 'lucide-react';

interface Props {
  project: ProjectData;
  currentView: string;
  onViewChange: (view: any) => void;
  onToggleHistory?: () => void;
}

const ProjectHeader: React.FC<Props> = ({ project, currentView, onViewChange, onToggleHistory }) => {
  const phases = [
    { id: Phase.DEFINE, label: 'Define', icon: Target, color: 'blue' },
    { id: Phase.MEASURE, label: 'Measure', icon: Activity, color: 'emerald' },
    { id: Phase.ANALYZE, label: 'Analyze', icon: Search, color: 'amber' },
    { id: Phase.IMPROVE, label: 'Improve', icon: Settings, color: 'indigo' },
    { id: Phase.CONTROL, label: 'Control', icon: ShieldCheck, color: 'rose' },
  ];

  return (
    <div className="bg-blue-600 text-white -mx-8 -mt-8 mb-8 px-8 pt-6 pb-12 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
      
      <div className="relative z-10">
        {/* Breadcrumb */}
        <button 
          onClick={() => onViewChange('ProjectList')}
          className="flex items-center gap-1 text-blue-100 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Tillbaka till projekt
        </button>

        {/* Project Title & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">{project.name}</h1>
            <p className="text-blue-100 text-sm font-medium opacity-80">{project.problemStatement?.substring(0, 100) || 'Ingen beskrivning'}...</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg text-xs font-bold transition-all">
              <Share2 className="w-4 h-4" /> Dela
            </button>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg text-xs font-bold transition-all">
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={() => onViewChange('A3Report')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            >
              <FileText className="w-4 h-4" /> A3 Rapport
            </button>
            <button 
              onClick={onToggleHistory}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            >
              <Clock className="w-4 h-4" /> Historik
            </button>
            <div className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">
              Aktiv
            </div>
          </div>
        </div>

        {/* Phase Navigation */}
        <div className="flex flex-wrap gap-2">
          {phases.map((phase) => {
            const isActive = currentView === phase.id;
            return (
              <button
                key={phase.id}
                onClick={() => onViewChange(phase.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all ${
                  isActive 
                    ? 'bg-white text-blue-600 shadow-xl scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <phase.icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-blue-200'}`} />
                {phase.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;

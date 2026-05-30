import React from 'react';
import { Phase, ProjectData } from '../types';
import { CheckCircle, Lock, Unlock } from 'lucide-react';

interface Props {
  phase: Phase;
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const Tollgate: React.FC<Props> = ({ phase, project, updateProject }) => {
  const status = project.tollgateStatus?.[phase] || 'Not Started';
  const isApproved = status === 'Approved';

  const handleApprove = () => {
    const newStatus = { ...project.tollgateStatus, [phase]: 'Approved' as const };
    
    // Auto-start next phase logic could go here
    let nextPhaseUpdate = {};
    if (phase === Phase.DEFINE) nextPhaseUpdate = { [Phase.MEASURE]: 'In Progress' };
    else if (phase === Phase.MEASURE) nextPhaseUpdate = { [Phase.ANALYZE]: 'In Progress' };
    else if (phase === Phase.ANALYZE) nextPhaseUpdate = { [Phase.IMPROVE]: 'In Progress' };
    else if (phase === Phase.IMPROVE) nextPhaseUpdate = { [Phase.CONTROL]: 'In Progress' };

    updateProject({ 
        tollgateStatus: { ...newStatus, ...nextPhaseUpdate }
    });
  };

  const handleReopen = () => {
      const newStatus = { ...project.tollgateStatus, [phase]: 'In Progress' as const };
      updateProject({ tollgateStatus: newStatus });
  };

  const getChecklist = () => {
      switch(phase) {
          case Phase.DEFINE: return ['Project Charter Godkänd', 'VOC Insamlad', 'Projektmål satta'];
          case Phase.MEASURE: return ['Datainsamling klar', 'MSA Genomförd', 'Nuläge (Baseline) fastställt'];
          case Phase.ANALYZE: return ['Rotorsaker identifierade', 'Hypoteser testade', 'Pareto-analys klar'];
          case Phase.IMPROVE: return ['Lösningar genererade', 'Riskbedömning gjord', 'Pilot genomförd'];
          case Phase.CONTROL: return ['Kontrollplan klar', 'SOP Uppdaterade', 'Projektet överlämnat'];
          default: return [];
      }
  };

  return (
    <div className={`border-t-4 p-6 rounded-lg shadow-sm transition-colors ${isApproved ? 'bg-green-50 border-green-500' : 'bg-white border-slate-300'}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-800">Tollgate: {phase} Review</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isApproved ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
                        {status}
                    </span>
                </div>
                <p className="text-slate-600 mb-4">
                    Verifiera att följande steg är klara innan du stänger fasen och går vidare.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getChecklist().map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                             <CheckCircle className={`w-4 h-4 ${isApproved ? 'text-green-600' : 'text-slate-300'}`} />
                             {item}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col items-center gap-2 min-w-[150px]">
                {isApproved ? (
                    <button 
                        onClick={handleReopen}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-600 rounded-md font-medium hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Unlock className="w-4 h-4" /> Öppna Fas
                    </button>
                ) : (
                    <button 
                        onClick={handleApprove}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md font-bold hover:bg-green-700 transition-colors shadow-md animate-pulse"
                    >
                        <Lock className="w-4 h-4" /> Godkänn Fas
                    </button>
                )}
                <span className="text-xs text-slate-400 mt-1">Signeras av Black Belt</span>
            </div>
        </div>
    </div>
  );
};

export default Tollgate;
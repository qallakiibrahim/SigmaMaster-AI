import React, { useState } from 'react';
import { ProjectData, Phase } from '../types';
import { TOOLS_LIBRARY } from '../data/toolsData';
import { CheckCircle, Circle, Clock, Plus } from 'lucide-react';
import ToolContainer from './ToolContainer';
import PhaseLayout from './PhaseLayout';
import Tollgate from './Tollgate';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const ImprovePhase: React.FC<Props> = ({ project, updateProject }) => {
  const [newAction, setNewAction] = useState('');

  const addAction = () => {
    if (!newAction) return;
    const newImp = {
      id: Date.now().toString(),
      action: newAction,
      status: 'Planned' as const
    };
    updateProject({ improvements: [...project.improvements, newImp] });
    setNewAction('');
  };

  const toggleStatus = (id: string) => {
    const updated = project.improvements.map(imp => {
      if (imp.id === id) {
        const nextStatus = imp.status === 'Planned' ? 'In Progress' : imp.status === 'In Progress' ? 'Done' : 'Planned';
        return { ...imp, status: nextStatus };
      }
      return imp;
    });
    updateProject({ improvements: updated });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'In Progress': return <Clock className="w-5 h-5 text-amber-500" />;
      default: return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  const explicitlyRendered = ['t_brainstorm', 't_pugh', 't_doe', 't_pilot', 't_pokayoke'];
  const otherTools = TOOLS_LIBRARY.filter(t => t.phase === Phase.IMPROVE && !explicitlyRendered.includes(t.id));

  return (
    <PhaseLayout 
        phase={Phase.IMPROVE} 
        title="Förbättra processen" 
        description="Generera, välj ut och implementera lösningar. Genomför pilottester för att verifiera förbättringar."
        tollgateContent={<Tollgate phase={Phase.IMPROVE} project={project} updateProject={updateProject} />}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        
        <ToolContainer toolId="t_brainstorm" project={project} updateProject={updateProject}>
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Improve: Lösningsgenerering & Åtgärder</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Brainstorma fram lösningar och spåra implementering.</p>

            <div className="flex gap-4 mb-8">
            <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Beskriv en förbättringsåtgärd..."
                className="flex-1 p-3 border border-slate-300 dark:border-slate-800 rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
            />
            <button
                onClick={addAction}
                className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-medium flex items-center gap-2"
            >
                <Plus className="w-4 h-4" /> Lägg till
            </button>
            </div>

            <div className="space-y-3">
            {project.improvements.length === 0 && (
                <p className="text-slate-400 dark:text-slate-500 text-center py-8">Inga åtgärder planerade ännu.</p>
            )}
            {project.improvements.map((imp) => (
                <div
                key={imp.id}
                onClick={() => toggleStatus(imp.id)}
                className="flex items-center p-4 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer transition-colors"
                >
                <div className="mr-4">
                    {getStatusIcon(imp.status)}
                </div>
                <div className="flex-1">
                    <p className={`font-medium ${imp.status === 'Done' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                    {imp.action}
                    </p>
                </div>
                <div className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {imp.status}
                </div>
                </div>
            ))}
            </div>
        </div>
      </ToolContainer>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ToolContainer toolId="t_pugh" project={project} updateProject={updateProject} />
        <ToolContainer toolId="t_doe" project={project} updateProject={updateProject} />
        <ToolContainer toolId="t_pilot" project={project} updateProject={updateProject} />
        <ToolContainer toolId="t_pokayoke" project={project} updateProject={updateProject} />
        
        {/* Dynamically render any other tools selected in Roadmap for this phase */}
        {otherTools.map(tool => (
          <ToolContainer key={tool.id} toolId={tool.id} project={project} updateProject={updateProject} />
        ))}
      </div>
    </div>
  </PhaseLayout>
);
};

export default ImprovePhase;
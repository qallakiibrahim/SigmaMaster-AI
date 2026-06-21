import React, { useState } from 'react';
import { ProjectData, Phase } from '../types';
import { TOOLS_LIBRARY } from '../data/toolsData';
import { generateInsight } from '../services/geminiService';
import ToolContainer from './ToolContainer';
import VisualSIPOC from './VisualSIPOC';
import PhaseLayout from './PhaseLayout';
import Tollgate from './Tollgate';
import { Wand2, Loader2, FileText, Users, Target, Briefcase, Map as MapIcon } from 'lucide-react';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const DefinePhase: React.FC<Props> = ({ project, updateProject }) => {
  const [loading, setLoading] = useState(false);

  const handleAICharter = async () => {
    if (!project.problemStatement) return;
    setLoading(true);
    
    const context = `
      Projekt: ${project.name}
      Affärsnytta: ${project.businessCase}
      Intressenter: ${project.stakeholders}
    `;

    const prompt = `
      Skapa ett formellt "Project Charter" baserat på följande information:
      Problemformulering: "${project.problemStatement}"
      Affärsnytta (Business Case): "${project.businessCase}"
      
      Generera två specifika sektioner:
      1. Ett SMART Mål (Specific, Measurable, Achievable, Relevant, Time-bound).
      2. En Omfattningsbeskrivning (Scope) som tydliggör In-Scope och Out-of-Scope.
      
      Returnera svaret strukturerat så jag kan fylla i fälten.
    `;

    const suggestion = await generateInsight(prompt, context);
    updateProject({ goal: suggestion });
    setLoading(false);
  };

  const explicitlyRendered = ['t_charter', 't_sipoc', 't_voc', 't_kano', 't_stakeholder', 't_problem'];
  const otherTools = TOOLS_LIBRARY.filter(t => t.phase === Phase.DEFINE && !explicitlyRendered.includes(t.id));

  return (
    <PhaseLayout 
        phase={Phase.DEFINE} 
        title="Definiera problemet" 
        description="Identifiera och kvantifiera problemets omfattning. Fastställ projektmål, omfattning och kundkrav."
        tollgateContent={<Tollgate phase={Phase.DEFINE} project={project} updateProject={updateProject} />}
    >
      <div className="space-y-8 pb-10">
        
        {/* Project Charter Section - Full Width */}
        <ToolContainer toolId="t_charter" project={project} updateProject={updateProject} className="h-auto">
          <div className="space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Define: Project Charter</h2>
                    <p className="text-slate-400 dark:text-slate-400 text-sm">Grunden för projektet. Definiera problemet och målet tydligt.</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Projektnamn</label>
                <input
                type="text"
                value={project.name}
                onChange={(e) => updateProject({ name: e.target.value })}
                className="w-full p-3 border border-slate-300 dark:border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg font-medium bg-white dark:bg-slate-950 text-slate-800 dark:text-white"
                placeholder="T.ex. Optimering av..."
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Context */}
                <div className="space-y-5">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <Briefcase className="w-5 h-5 text-slate-500 dark:text-slate-400" /> Strategisk Kontext
                    </h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Problemformulering</label>
                        <textarea
                        value={project.problemStatement}
                        onChange={(e) => updateProject({ problemStatement: e.target.value })}
                        rows={5}
                        className="w-full p-3 border border-slate-300 dark:border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-zinc-200"
                        placeholder="Vad är felet? Var uppstår det? Hur ofta?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Affärsnytta (Business Case)</label>
                        <textarea
                        value={project.businessCase}
                        onChange={(e) => updateProject({ businessCase: e.target.value })}
                        rows={4}
                        className="w-full p-3 border border-slate-300 dark:border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-zinc-200"
                        placeholder="Hur påverkar detta sista raden? Kostnader, intäkter, risker?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nyckelintressenter</label>
                        <div className="relative">
                            <Users className="absolute top-3 left-3 w-4 h-4 text-slate-400 dark:text-slate-550" />
                            <input
                            type="text"
                            value={project.stakeholders}
                            onChange={(e) => updateProject({ stakeholders: e.target.value })}
                            className="w-full p-3 pl-10 border border-slate-300 dark:border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-zinc-200"
                            placeholder="Sponsor, Processägare, Kunder..."
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Goals & AI */}
                <div className="space-y-5">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Target className="w-5 h-5 text-slate-500 dark:text-slate-400" /> Mål & Omfattning
                        </h3>
                        <button
                        onClick={handleAICharter}
                        disabled={loading || !project.problemStatement}
                        className="flex items-center gap-2 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                        >
                        {loading ? <Loader2 className="animate-spin h-3 w-3" /> : <Wand2 className="h-3 w-3" />}
                        AI-Hjälp
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Målformulering (SMART)</label>
                        <textarea
                        value={project.goal}
                        onChange={(e) => updateProject({ goal: e.target.value })}
                        rows={6}
                        className="w-full p-3 border border-slate-300 dark:border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-zinc-200"
                        placeholder="Specific, Measurable, Achievable, Relevant, Time-bound..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Omfattning (Scope)</label>
                        <textarea
                        value={project.scope}
                        onChange={(e) => updateProject({ scope: e.target.value })}
                        rows={5}
                        className="w-full p-3 border border-slate-300 dark:border-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-zinc-200"
                        placeholder="Vad ingår i projektet? Vad ingår INTE?"
                        />
                    </div>
                </div>
            </div>
          </div>
      </ToolContainer>

      {/* 5W2H Is / Is Not Problem & Scope Generator - Full Width */}
      <ToolContainer toolId="t_problem" project={project} updateProject={updateProject} className="h-auto" />

      {/* SIPOC Section - Full Width */}
      <ToolContainer toolId="t_sipoc" project={project} updateProject={updateProject} className="h-auto">
          <div className="space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Define: SIPOC</h2>
                    <p className="text-slate-400 dark:text-slate-400 text-sm">Visualisera processen på hög nivå från leverantör till kund.</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg">
                    <MapIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
            </div>
            <VisualSIPOC project={project} updateProject={updateProject} />
          </div>
      </ToolContainer>

      {/* Other Selected Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ToolContainer toolId="t_voc" project={project} updateProject={updateProject} />
          <ToolContainer toolId="t_kano" project={project} updateProject={updateProject} />
          <ToolContainer toolId="t_stakeholder" project={project} updateProject={updateProject} />

          {/* Dynamically render any other tools selected in Roadmap for this phase */}
          {otherTools.map(tool => (
            <ToolContainer key={tool.id} toolId={tool.id} project={project} updateProject={updateProject} />
          ))}
        </div>
      </div>
    </PhaseLayout>
  );
};

export default DefinePhase;
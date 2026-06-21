import React, { useState } from 'react';
import { ProjectData, ParetoPoint, Phase } from '../types';
import { TOOLS_LIBRARY } from '../data/toolsData';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { generateInsight } from '../services/geminiService';
import { BrainCircuit, GitBranch, Lightbulb, TrendingUp } from 'lucide-react';
import ToolContainer from './ToolContainer';
import FMEATool from './FMEATool';
import VisualANOVA from './VisualANOVA';
import VisualPareto from './VisualPareto';
import VisualIshikawa from './VisualIshikawa';
import PhaseLayout from './PhaseLayout';
import Tollgate from './Tollgate';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const AnalyzePhase: React.FC<Props> = ({ project, updateProject }) => {
  const explicitlyRendered = ['t_pareto', 't_ishikawa', 't_fmea', 't_5why', 't_hypothesis', 't_regression', 't_anova'];
  const otherTools = TOOLS_LIBRARY.filter(t => t.phase === Phase.ANALYZE && !explicitlyRendered.includes(t.id));

  return (
    <PhaseLayout 
        phase={Phase.ANALYZE} 
        title="Analysera rotorsaker" 
        description="Identifiera och verifiera rotorsaker till problemet. Använd statistiska verktyg och logisk analys."
        tollgateContent={<Tollgate phase={Phase.ANALYZE} project={project} updateProject={updateProject} />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
        {/* Pareto Chart */}
        <ToolContainer toolId="t_pareto" project={project} updateProject={updateProject}>
            <div className="h-full flex flex-col space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Analyze: Paretoanalys</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Identifierar "De få viktiga" (Vital Few) vs "De många triviala" (Trivial Many).</p>
                    </div>
                </div>
                <VisualPareto project={project} updateProject={updateProject} />
            </div>
        </ToolContainer>

        {/* Ishikawa Diagram */}
        <ToolContainer toolId="t_ishikawa" project={project} updateProject={updateProject}>
            <div className="flex flex-col h-full space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Analyze: Ishikawa (Fiskben)</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Strukturera potentiella rotorsaker i kategorier för att hitta mönster.</p>
                    </div>
                </div>
                <VisualIshikawa project={project} updateProject={updateProject} />
            </div>
        </ToolContainer>
      </div>

      <div className="grid grid-cols-1 gap-6">
          <ToolContainer toolId="t_anova" project={project} updateProject={updateProject} className="lg:col-span-2">
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Analyze: ANOVA</h2>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">Analysera varians för att se om det finns signifikanta skillnader mellan olika grupper (t.ex. maskiner, skift eller material).</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                  </div>
              </div>
              <VisualANOVA project={project} updateProject={updateProject} />
            </div>
          </ToolContainer>

          <ToolContainer toolId="t_fmea" project={project} updateProject={updateProject} className="lg:col-span-2">
            <FMEATool project={project} updateProject={updateProject} />
          </ToolContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ToolContainer toolId="t_5why" project={project} updateProject={updateProject} />
          <ToolContainer toolId="t_hypothesis" project={project} updateProject={updateProject} />
          <ToolContainer toolId="t_regression" project={project} updateProject={updateProject} />
          
          {/* Dynamically render any other tools selected in Roadmap for this phase */}
          {otherTools.map(tool => (
            <ToolContainer key={tool.id} toolId={tool.id} project={project} updateProject={updateProject} />
          ))}
        </div>
      </div>
    </PhaseLayout>
  );
};

export default AnalyzePhase;
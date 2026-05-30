import React, { useMemo, useState } from 'react';
import { ProjectData, SPCPoint, Phase } from '../types';
import { TOOLS_LIBRARY } from '../data/toolsData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ToolContainer from './ToolContainer';
import PhaseLayout from './PhaseLayout';
import Tollgate from './Tollgate';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void; // Added updateProject prop
}

const ControlPhase: React.FC<Props> = ({ project, updateProject }) => {
  const [showVisual, setShowVisual] = useState(false);

  // Simple Individual-Moving Range (I-MR) logic simulation for demo
  const spcData = useMemo<SPCPoint[]>(() => {
    if (project.measurements.length < 2) return [];
    
    const mean = project.measurements.reduce((a, b) => a + b, 0) / project.measurements.length;
    
    // Calculate Moving Range
    let mrSum = 0;
    for (let i = 1; i < project.measurements.length; i++) {
      mrSum += Math.abs(project.measurements[i] - project.measurements[i - 1]);
    }
    const avgMR = mrSum / (project.measurements.length - 1);
    
    // Constants for I-MR chart (E2 = 2.66 for n=2 moving range)
    const ucl = mean + 2.66 * avgMR;
    const lcl = mean - 2.66 * avgMR;

    return project.measurements.map((val, idx) => ({
      sample: idx + 1,
      value: val,
      mean: mean,
      ucl: ucl,
      lcl: lcl
    }));
  }, [project.measurements]);

  const currentMean = spcData.length > 0 ? spcData[0].mean : 0;
  const currentUCL = spcData.length > 0 ? spcData[0].ucl : 0;
  const currentLCL = spcData.length > 0 ? spcData[0].lcl : 0;

  const explicitlyRendered = ['t_spc', 't_control_plan', 't_sop', 't_lessons'];
  const otherTools = TOOLS_LIBRARY.filter(t => t.phase === Phase.CONTROL && !explicitlyRendered.includes(t.id));

  return (
    <PhaseLayout 
        phase={Phase.CONTROL} 
        title="Säkra resultatet" 
        description="Implementera kontrollmekanismer för att säkerställa att förbättringarna består över tid. Standardisera processen."
        tollgateContent={<Tollgate phase={Phase.CONTROL} project={project} updateProject={updateProject} />}
    >
      <div className="space-y-6">
          
        <ToolContainer toolId="t_spc" project={project} updateProject={updateProject}>
        <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Control: SPC (Styrdiagram)</h2>
            <p className="text-slate-600 mb-4">Övervaka processen löpande över tid med I-MR diagram för kontinuerlig mätning.</p>

            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowVisual(!showVisual)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-semibold transition-all shadow-sm text-sm"
              >
                <span>{showVisual ? 'Dölj' : 'Visa'} Visualisering</span>
                <span>📈</span>
              </button>
            </div>

            {showVisual && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 transition-all duration-300">
                {spcData.length > 1 ? (
                  <div className="h-96 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={spcData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="sample" label={{ value: 'Provnummer', position: 'insideBottom', offset: -5 }} />
                          <YAxis domain={['auto', 'auto']} />
                          <Tooltip />
                          {/* Control Limits */}
                          <ReferenceLine y={currentUCL} label="UCL" stroke="red" strokeDasharray="5 5" />
                          <ReferenceLine y={currentMean} label="CL" stroke="green" />
                          <ReferenceLine y={currentLCL} label="LCL" stroke="red" strokeDasharray="5 5" />
                          
                          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                      </ResponsiveContainer>
                      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div className="bg-red-50 p-2 rounded text-red-700 font-mono text-sm">UCL: {currentUCL.toFixed(3)}</div>
                        <div className="bg-green-50 p-2 rounded text-green-700 font-mono text-sm">Mean: {currentMean.toFixed(3)}</div>
                        <div className="bg-red-50 p-2 rounded text-red-700 font-mono text-sm">LCL: {currentLCL.toFixed(3)}</div>
                      </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-slate-100 rounded border border-dashed border-slate-300">
                      <p className="text-slate-500">För lite data för att generera styrdiagram. Gå till "Measure" och lägg till mätvärden.</p>
                  </div>
                )}
              </div>
            )}
        </div>
      </ToolContainer>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ToolContainer toolId="t_control_plan" project={project} updateProject={updateProject} />
          <ToolContainer toolId="t_sop" project={project} updateProject={updateProject} />
          <ToolContainer toolId="t_lessons" project={project} updateProject={updateProject} />
          
          {/* Dynamically render any other tools selected in Roadmap for this phase */}
          {otherTools.map(tool => (
            <ToolContainer key={tool.id} toolId={tool.id} project={project} updateProject={updateProject} />
          ))}
        </div>
      </div>
    </PhaseLayout>
  );
};

export default ControlPhase;
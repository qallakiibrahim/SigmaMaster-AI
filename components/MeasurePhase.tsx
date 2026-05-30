import React, { useState, useMemo } from 'react';
import { ProjectData, CapabilityData, Phase } from '../types';
import { TOOLS_LIBRARY } from '../data/toolsData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calculator, Plus, Trash2, Map as MapIcon } from 'lucide-react';
import ToolContainer from './ToolContainer';
import VisualProcessMap from './VisualProcessMap';
import PhaseLayout from './PhaseLayout';
import Tollgate from './Tollgate';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const MeasurePhase: React.FC<Props> = ({ project, updateProject }) => {
  const [newValue, setNewValue] = useState<string>('');
  const [lsl, setLsl] = useState<number>(90);
  const [usl, setUsl] = useState<number>(110);

  const addMeasurement = () => {
    const val = parseFloat(newValue);
    if (!isNaN(val)) {
      updateProject({ measurements: [...project.measurements, val] });
      setNewValue('');
    }
  };

  const removeMeasurement = (index: number) => {
    const newMeasurements = [...project.measurements];
    newMeasurements.splice(index, 1);
    updateProject({ measurements: newMeasurements });
  };

  const stats = useMemo<CapabilityData | null>(() => {
    if (project.measurements.length < 2) return null;
    const n = project.measurements.length;
    const mean = project.measurements.reduce((a, b) => a + b, 0) / n;
    const variance = project.measurements.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    const cp = (usl - lsl) / (6 * stdDev);
    const cpk = Math.min((mean - lsl) / (3 * stdDev), (usl - mean) / (3 * stdDev));

    return { mean, stdDev, cp, cpk, lsl, usl };
  }, [project.measurements, lsl, usl]);

  // Histogram Binning Logic
  const histogramData = useMemo(() => {
    if (project.measurements.length === 0) return [];
    const min = Math.min(...project.measurements);
    const max = Math.max(...project.measurements);
    const binCount = Math.ceil(Math.sqrt(project.measurements.length)) + 2;
    const range = max - min || 1;
    const binSize = range / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => ({
      binStart: min + i * binSize,
      binEnd: min + (i + 1) * binSize,
      count: 0,
      name: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`
    }));

    project.measurements.forEach(val => {
      const binIndex = Math.min(
        Math.floor((val - min) / binSize),
        binCount - 1
      );
      if(binIndex >= 0) bins[binIndex].count++;
    });

    return bins;
  }, [project.measurements]);

  const hasDataPlan = (project.selectedTools || []).includes('t_data_plan');
  const hasCapability = (project.selectedTools || []).includes('t_capability');

  const explicitlyRendered = ['t_data_plan', 't_capability', 't_msa', 't_process_map', 't_vsm'];
  const otherTools = TOOLS_LIBRARY.filter(t => t.phase === Phase.MEASURE && !explicitlyRendered.includes(t.id));

  return (
    <PhaseLayout 
        phase={Phase.MEASURE} 
        title="Mäta nuläget" 
        description="Samla in data för att fastställa processens nuvarande prestanda. Verifiera mätsystemet och beräkna kapabilitet."
        tollgateContent={<Tollgate phase={Phase.MEASURE} project={project} updateProject={updateProject} />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Input Section */}
        {hasDataPlan && (
            <div className={`${hasCapability ? 'col-span-1' : 'col-span-3'}`}>
                <ToolContainer toolId="t_data_plan" project={project} updateProject={updateProject}>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-blue-600" /> Datainsamling
                        </h3>
                        <div className="flex gap-2 mb-4">
                        <input
                            type="number"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="flex-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Mätvärde"
                        />
                        <button
                            onClick={addMeasurement}
                            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                        </div>
                        
                        <div className="h-64 overflow-y-auto border border-slate-100 rounded">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="p-2">#</th>
                                <th className="p-2">Värde</th>
                                <th className="p-2">Åtgärd</th>
                            </tr>
                            </thead>
                            <tbody>
                            {project.measurements.map((m, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-2 text-slate-500">{i + 1}</td>
                                <td className="p-2 font-mono">{m}</td>
                                <td className="p-2">
                                    <button onClick={() => removeMeasurement(i)} className="text-red-400 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>

                        <div className="mt-6 space-y-3">
                        <h4 className="font-semibold text-slate-700">Specifikationsgränser</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                            <label className="text-xs text-slate-500">LSL (Nedre gräns)</label>
                            <input 
                                type="number" 
                                value={lsl} 
                                onChange={(e) => setLsl(parseFloat(e.target.value))}
                                className="w-full p-2 border border-slate-300 rounded"
                            />
                            </div>
                            <div>
                            <label className="text-xs text-slate-500">USL (Övre gräns)</label>
                            <input 
                                type="number" 
                                value={usl} 
                                onChange={(e) => setUsl(parseFloat(e.target.value))}
                                className="w-full p-2 border border-slate-300 rounded"
                            />
                            </div>
                        </div>
                        </div>
                    </div>
                </ToolContainer>
            </div>
        )}

        {/* Analysis Section */}
        {hasCapability && (
            <div className={`${hasDataPlan ? 'lg:col-span-2' : 'col-span-3'} space-y-6`}>
                <ToolContainer toolId="t_capability" project={project} updateProject={updateProject}>
                    <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Processkapabilitet & Histogram</h3>
                    {stats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <div className="text-xs text-slate-500 uppercase">Medelvärde</div>
                            <div className="text-xl font-bold text-slate-800">{stats.mean.toFixed(3)}</div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <div className="text-xs text-slate-500 uppercase">Std Avvikelse</div>
                            <div className="text-xl font-bold text-slate-800">{stats.stdDev.toFixed(3)}</div>
                        </div>
                        <div className={`p-3 rounded border ${stats.cp < 1.33 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="text-xs text-slate-500 uppercase">Cp</div>
                            <div className={`text-xl font-bold ${stats.cp < 1.33 ? 'text-amber-700' : 'text-green-700'}`}>{stats.cp.toFixed(2)}</div>
                        </div>
                        <div className={`p-3 rounded border ${stats.cpk < 1.33 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="text-xs text-slate-500 uppercase">Cpk</div>
                            <div className={`text-xl font-bold ${stats.cpk < 1.33 ? 'text-red-700' : 'text-green-700'}`}>{stats.cpk.toFixed(2)}</div>
                        </div>
                        </div>
                    ) : (
                        <div className="text-slate-400 text-center py-4">Lägg till minst 2 datapunkter för att beräkna statistik.</div>
                    )}

                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={histogramData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" name="Frekvens" />
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                    </div>
                </ToolContainer>
            </div>
        )}
        </div>
        
      {/* Process Map Section - Full Width */}
      <ToolContainer toolId="t_process_map" project={project} updateProject={updateProject} className="h-auto">
          <div className="space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Measure: Processkartläggning</h2>
                    <p className="text-slate-600">Kartlägg processen i detalj och identifiera värdeskapande vs icke-värdeskapande steg.</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                    <MapIcon className="w-6 h-6 text-blue-600" />
                </div>
            </div>
            <VisualProcessMap project={project} updateProject={updateProject} />
          </div>
      </ToolContainer>

        {/* Dynamic Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ToolContainer toolId="t_msa" project={project} updateProject={updateProject} />
            <ToolContainer toolId="t_vsm" project={project} updateProject={updateProject} />
            
            {/* Dynamically render any other tools selected in Roadmap for this phase */}
            {otherTools.map(tool => (
              <ToolContainer key={tool.id} toolId={tool.id} project={project} updateProject={updateProject} />
            ))}
        </div>
      </div>
    </PhaseLayout>
  );
};

export default MeasurePhase;
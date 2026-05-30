import React, { useState } from 'react';
import { ProjectData, IshikawaData } from '../types';
import { Plus, Trash2, BrainCircuit, Lightbulb } from 'lucide-react';
import { generateInsight } from '../services/geminiService';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const VisualIshikawa: React.FC<Props> = ({ project, updateProject }) => {
  const defaultCategories = [
    { name: 'Människa (Man)', causes: [] },
    { name: 'Maskin (Machine)', causes: [] },
    { name: 'Material', causes: [] },
    { name: 'Metod (Method)', causes: [] },
    { name: 'Mätning (Measurement)', causes: [] },
    { name: 'Miljö (Environment)', causes: [] }
  ];

  const initialData: IshikawaData = project.toolData?.['t_ishikawa']?.visualData || {
    problem: project.problemStatement || 'Problemformulering saknas',
    categories: defaultCategories
  };

  const [data, setData] = useState<IshikawaData>(initialData);
  const [loading, setLoading] = useState(false);

  const syncData = (newData: IshikawaData) => {
    setData(newData);
    const updatedToolData = {
      ...project.toolData,
      't_ishikawa': {
        ...project.toolData?.['t_ishikawa'],
        visualData: newData,
        content: newData.categories.map(c => `${c.name}: ${c.causes.join(', ')}`).join('\n')
      }
    };
    updateProject({ toolData: updatedToolData });
  };

  const addCause = (categoryIdx: number) => {
    const newData = { ...data };
    newData.categories[categoryIdx].causes.push('');
    syncData(newData);
  };

  const updateCause = (categoryIdx: number, causeIdx: number, value: string) => {
    const newData = { ...data };
    newData.categories[categoryIdx].causes[causeIdx] = value;
    syncData(newData);
  };

  const removeCause = (categoryIdx: number, causeIdx: number) => {
    const newData = { ...data };
    newData.categories[categoryIdx].causes = newData.categories[categoryIdx].causes.filter((_, i) => i !== causeIdx);
    syncData(newData);
  };

  const handleAISuggestions = async () => {
    setLoading(true);
    const prompt = `
      Baserat på problemet: "${project.problemStatement}", generera potentiella orsaker för ett Ishikawa-diagram (Fiskbensdiagram).
      Dela upp orsakerna i kategorierna: Människa, Maskin, Material, Metod, Mätning, Miljö.
      Returnera svaret som ett JSON-objekt med strukturen: { "categories": [{ "name": "Människa", "causes": ["orsak1", "orsak2"] }, ...] }
    `;
    
    try {
      const response = await generateInsight(prompt, "Returnera ENDAST JSON.");
      // Simple extraction if AI returns markdown
      const jsonStr = response.includes('```json') ? response.split('```json')[1].split('```')[0] : response;
      const aiData = JSON.parse(jsonStr);
      
      if (aiData.categories) {
        syncData({
          ...data,
          categories: aiData.categories
        });
      }
    } catch (e) {
      console.error("AI failed to generate Ishikawa data", e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-blue-600" /> Fiskbensdiagram (6M)
        </h3>
        <button
          onClick={handleAISuggestions}
          disabled={loading || !project.problemStatement}
          className="flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full hover:bg-purple-200 transition-all text-xs font-bold disabled:opacity-50"
        >
          {loading ? 'Genererar...' : <><Lightbulb className="w-3 h-3" /> Få AI-förslag</>}
        </button>
      </div>

      {/* Visual Fishbone */}
      <div className="relative min-h-[500px] bg-slate-50 rounded-3xl border border-slate-200 p-8 overflow-x-auto">
        <div className="min-w-[800px] h-full flex flex-col justify-center relative">
          
          {/* Central Spine */}
          <div className="absolute top-1/2 left-0 right-40 h-1 bg-slate-400 -translate-y-1/2 rounded-full"></div>
          
          {/* Head (Problem) */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-40 h-24 bg-slate-800 text-white rounded-r-full flex items-center justify-center p-4 text-center shadow-xl z-10">
            <div className="text-xs font-bold leading-tight line-clamp-4">{data.problem}</div>
          </div>

          {/* Top Ribs */}
          <div className="grid grid-cols-3 gap-8 mb-32 relative z-0">
            {[0, 1, 2].map(idx => (
              <div key={idx} className="flex flex-col items-center">
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm font-bold text-xs text-slate-700 mb-4 w-full text-center">
                  {data.categories[idx].name}
                </div>
                <div className="w-px h-20 bg-slate-300 relative">
                    <div className="absolute -left-20 top-0 w-40 space-y-2">
                        {data.categories[idx].causes.map((cause, cIdx) => (
                            <div key={cIdx} className="group flex items-center gap-1">
                                <input
                                    type="text"
                                    value={cause}
                                    onChange={(e) => updateCause(idx, cIdx, e.target.value)}
                                    className="flex-1 bg-white border border-slate-100 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-400 shadow-sm"
                                    placeholder="..."
                                />
                                <button onClick={() => removeCause(idx, cIdx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        <button onClick={() => addCause(idx)} className="w-full py-1 border border-dashed border-slate-300 rounded text-[9px] text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-all">
                            + Orsak
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Ribs */}
          <div className="grid grid-cols-3 gap-8 mt-4 relative z-0">
            {[3, 4, 5].map(idx => (
              <div key={idx} className="flex flex-col-reverse items-center">
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm font-bold text-xs text-slate-700 mt-4 w-full text-center">
                  {data.categories[idx].name}
                </div>
                <div className="w-px h-20 bg-slate-300 relative">
                    <div className="absolute -left-20 bottom-0 w-40 space-y-2">
                         <button onClick={() => addCause(idx)} className="w-full py-1 border border-dashed border-slate-300 rounded text-[9px] text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-all">
                            + Orsak
                        </button>
                        {data.categories[idx].causes.map((cause, cIdx) => (
                            <div key={cIdx} className="group flex items-center gap-1">
                                <input
                                    type="text"
                                    value={cause}
                                    onChange={(e) => updateCause(idx, cIdx, e.target.value)}
                                    className="flex-1 bg-white border border-slate-100 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-400 shadow-sm"
                                    placeholder="..."
                                />
                                <button onClick={() => removeCause(idx, cIdx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default VisualIshikawa;

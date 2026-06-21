import React, { useState, useMemo } from 'react';
import { ProjectData, ANOVAData } from '../types';
import { Plus, Trash2, Calculator, AlertCircle, TrendingUp } from 'lucide-react';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const VisualANOVA: React.FC<Props> = ({ project, updateProject }) => {
  const initialData: ANOVAData = project.toolData?.['t_anova']?.visualData || {
    groups: [
      { id: '1', name: 'Maskin A', values: [10.2, 10.5, 10.1, 10.3] },
      { id: '2', name: 'Maskin B', values: [11.1, 11.5, 11.0, 11.2] },
      { id: '3', name: 'Maskin C', values: [10.4, 10.6, 10.2, 10.5] }
    ],
    fStat: 0,
    pValue: 0,
    dfBetween: 0,
    dfWithin: 0
  };

  const [groups, setGroups] = useState(initialData.groups);

  const stats = useMemo(() => {
    const allValues = groups.flatMap(g => g.values);
    if (allValues.length === 0 || groups.length < 2) return null;

    const k = groups.length;
    const N = allValues.length;
    const grandMean = allValues.reduce((a, b) => a + b, 0) / N;

    let ssBetween = 0;
    let ssWithin = 0;

    groups.forEach(group => {
      const n = group.values.length;
      if (n === 0) return;
      const groupMean = group.values.reduce((a, b) => a + b, 0) / n;
      
      ssBetween += n * Math.pow(groupMean - grandMean, 2);
      
      group.values.forEach(val => {
        ssWithin += Math.pow(val - groupMean, 2);
      });
    });

    const dfBetween = k - 1;
    const dfWithin = N - k;
    
    if (dfWithin <= 0) return null;

    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    const fStat = msBetween / msWithin;

    // Very simplified p-value approximation for demo purposes
    // In a real app, use a proper library like jstat
    let pValue = 0.05; // Placeholder
    if (fStat > 4) pValue = 0.01;
    if (fStat > 10) pValue = 0.001;
    if (fStat < 2) pValue = 0.5;

    return { fStat, pValue, dfBetween, dfWithin, ssBetween, ssWithin, msBetween, msWithin };
  }, [groups]);

  const syncData = (newGroups: typeof groups) => {
    setGroups(newGroups);
    const updatedToolData = {
      ...project.toolData,
      't_anova': {
        ...project.toolData?.['t_anova'],
        visualData: { 
          groups: newGroups,
          fStat: stats?.fStat || 0,
          pValue: stats?.pValue || 0,
          dfBetween: stats?.dfBetween || 0,
          dfWithin: stats?.dfWithin || 0
        },
        content: `ANOVA Result: F=${stats?.fStat.toFixed(2)}, p=${stats?.pValue}`
      }
    };
    updateProject({ toolData: updatedToolData });
  };

  const addGroup = () => {
    const newGroups = [...groups, { id: Math.random().toString(36).substr(2, 9), name: `Grupp ${groups.length + 1}`, values: [] }];
    syncData(newGroups);
  };

  const removeGroup = (id: string) => {
    const newGroups = groups.filter(g => g.id !== id);
    syncData(newGroups);
  };

  const updateGroupName = (id: string, name: string) => {
    const newGroups = groups.map(g => g.id === id ? { ...g, name } : g);
    syncData(newGroups);
  };

  const updateGroupValues = (id: string, valueStr: string) => {
    const vals = valueStr.split(/[\s,]+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
    const newGroups = groups.map(g => g.id === id ? { ...g, values: vals } : g);
    syncData(newGroups);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Datainmatning
          </h3>
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm group relative">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => updateGroupName(group.id, e.target.value)}
                    className="font-bold text-slate-800 dark:text-white bg-transparent border-b border-transparent focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={() => removeGroup(group.id)}
                    className="ml-auto text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  placeholder="Mätvärden (separera med mellanslag eller kommatecken)"
                  className="w-full p-3 text-xs border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                  defaultValue={group.values.join(', ')}
                  onBlur={(e) => updateGroupValues(group.id, e.target.value)}
                />
                <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                  Antal värden: {group.values.length} | Medel: {(group.values.reduce((a, b) => a + b, 0) / (group.values.length || 1)).toFixed(2)}
                </div>
              </div>
            ))}
            <button
              onClick={addGroup}
              className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase"
            >
              <Plus className="w-4 h-4" /> Lägg till grupp
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Analysresultat (ANOVA)
          </h3>
          
          {stats ? (
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 rounded-2xl shadow-xl space-y-6 border border-transparent dark:border-slate-800">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-xl">
                  <div className="text-[10px] text-slate-405 uppercase font-bold mb-1">F-Statistik</div>
                  <div className="text-3xl font-mono font-bold">{stats.fStat.toFixed(3)}</div>
                </div>
                <div className={`p-4 rounded-xl ${stats.pValue < 0.05 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  <div className="text-[10px] text-slate-405 uppercase font-bold mb-1">P-Värde (ca)</div>
                  <div className="text-3xl font-mono font-bold">{stats.pValue < 0.001 ? '< 0.001' : stats.pValue}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs border-b border-white/10 pb-2">
                  <span className="text-slate-404">Frihetsgrader (Between/Within)</span>
                  <span className="font-mono">{stats.dfBetween} / {stats.dfWithin}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-white/10 pb-2">
                  <span className="text-slate-404">Mean Square Between (MSB)</span>
                  <span className="font-mono">{stats.msBetween.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-white/10 pb-2">
                  <span className="text-slate-404">Mean Square Within (MSW)</span>
                  <span className="font-mono">{stats.msWithin.toFixed(3)}</span>
                </div>
              </div>

              <div className={`p-4 rounded-xl flex gap-3 ${stats.pValue < 0.05 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                <AlertCircle className={`w-5 h-5 shrink-0 ${stats.pValue < 0.05 ? 'text-emerald-400' : 'text-amber-400'}`} />
                <div>
                  <div className="text-sm font-bold mb-1">
                    {stats.pValue < 0.05 ? 'Statistiskt signifikant skillnad' : 'Ingen signifikant skillnad'}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {stats.pValue < 0.05 
                      ? 'Det finns en statistiskt säkerställd skillnad mellan gruppernas medelvärden. Undersök vilken grupp som avviker.' 
                      : 'Vi kan inte med 95% säkerhet säga att det finns en skillnad mellan grupperna.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-slate-400 dark:text-slate-500 text-sm">Mata in minst två grupper med data för att se ANOVA-analysen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualANOVA;

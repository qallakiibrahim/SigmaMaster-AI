import React, { useState, useMemo } from 'react';
import { ProjectData, ParetoPoint } from '../types';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Trash2, Calculator } from 'lucide-react';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const VisualPareto: React.FC<Props> = ({ project, updateProject }) => {
  const initialData: { name: string; count: number }[] = project.toolData?.['t_pareto']?.visualData || [
    { name: 'Kategori A', count: 10 },
    { name: 'Kategori B', count: 5 }
  ];

  const [items, setItems] = useState(initialData);

  const paretoData = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.count - a.count);
    const total = sorted.reduce((acc, curr) => acc + curr.count, 0);
    
    let cumulative = 0;
    return sorted.map(item => {
      cumulative += item.count;
      return {
        ...item,
        cumulativePercentage: total > 0 ? Math.round((cumulative / total) * 100) : 0
      };
    });
  }, [items]);

  const syncData = (newItems: typeof items) => {
    setItems(newItems);
    const sorted = [...newItems].sort((a, b) => b.count - a.count);
    const total = sorted.reduce((acc, curr) => acc + curr.count, 0);
    let cumulative = 0;
    const computedData = sorted.map(item => {
      cumulative += item.count;
      return {
        ...item,
        cumulativePercentage: total > 0 ? Math.round((cumulative / total) * 100) : 0
      };
    });

    const updatedToolData = {
      ...project.toolData,
      't_pareto': {
        ...project.toolData?.['t_pareto'],
        visualData: newItems,
        computedData: computedData,
        content: computedData.map(d => `${d.name}: ${d.count} (${d.cumulativePercentage}%)`).join('\n')
      }
    };
    updateProject({ toolData: updatedToolData });
  };

  const addItem = () => {
    syncData([...items, { name: '', count: 0 }]);
  };

  const updateItem = (index: number, field: 'name' | 'count', value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    syncData(newItems);
  };

  const removeItem = (index: number) => {
    syncData(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Table */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Kategorier & Frekvens
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Kategori / Feltyp</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 w-24">Antal</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        placeholder="T.ex. Maskinstopp"
                        className="w-full bg-transparent outline-none focus:text-blue-600 dark:focus:text-blue-400 font-medium text-slate-850 dark:text-slate-200"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.count}
                        onChange={(e) => updateItem(idx, 'count', parseInt(e.target.value) || 0)}
                        className="w-full bg-transparent outline-none font-mono font-bold text-blue-600 dark:text-blue-400"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={addItem}
              className="w-full py-3 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase border-t border-slate-200 dark:border-slate-800"
            >
              <Plus className="w-4 h-4" /> Lägg till rad
            </button>
          </div>
        </div>

        {/* Pareto Chart */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Pareto-diagram (80/20)</h3>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" fontSize={10} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" domain={[0, 100]} unit="%" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Antal" />
                <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} name="Kumulativ %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualPareto;

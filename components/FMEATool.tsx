import React from 'react';
import { ProjectData, FMEARow } from '../types';
import { AlertTriangle, Plus, Trash2, Info } from 'lucide-react';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const FMEATool: React.FC<Props> = ({ project, updateProject }) => {
  const fmeaData = project.toolData?.['t_fmea'] || { rows: [] };
  const rows: FMEARow[] = fmeaData.rows || [];

  const updateRows = (newRows: FMEARow[]) => {
    updateProject({
      toolData: {
        ...project.toolData,
        't_fmea': { ...fmeaData, rows: newRows }
      }
    });
  };

  const addRow = () => {
    const newRow: FMEARow = {
      id: Math.random().toString(36).substr(2, 9),
      step: '',
      failureMode: '',
      effect: '',
      severity: 5,
      cause: '',
      occurrence: 5,
      controls: '',
      detection: 5,
      rpn: 125
    };
    updateRows([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    updateRows(rows.filter(row => row.id !== id));
  };

  const handleChange = (id: string, field: keyof FMEARow, value: string | number) => {
    const newRows = rows.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        // Recalculate RPN if S, O, or D changed
        if (field === 'severity' || field === 'occurrence' || field === 'detection') {
          updatedRow.rpn = Number(updatedRow.severity) * Number(updatedRow.occurrence) * Number(updatedRow.detection);
        }
        return updatedRow;
      }
      return row;
    });
    updateRows(newRows);
  };

  const getRPNColor = (rpn: number) => {
    if (rpn >= 200) return 'text-red-600 font-bold';
    if (rpn >= 100) return 'text-orange-500 font-semibold';
    return 'text-green-600';
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" /> FMEA (Failure Mode and Effects Analysis)
          </h3>
          <p className="text-sm text-slate-500">Identifiera risker och prioritera åtgärder baserat på RPN (Risk Priority Number).</p>
        </div>
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Lägg till rad
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-32">Process-steg</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Fel-typ</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Effekt</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-16" title="Severity (1-10)">S</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Orsak</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-16" title="Occurrence (1-10)">O</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Kontroll</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-16" title="Detection (1-10)">D</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-16">RPN</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                  Inga rader tillagda. Klicka på "Lägg till rad" för att börja.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm"
                      value={row.step}
                      onChange={(e) => handleChange(row.id, 'step', e.target.value)}
                      placeholder="Steg..."
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm"
                      value={row.failureMode}
                      onChange={(e) => handleChange(row.id, 'failureMode', e.target.value)}
                      placeholder="Vad kan gå fel?"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm"
                      value={row.effect}
                      onChange={(e) => handleChange(row.id, 'effect', e.target.value)}
                      placeholder="Konsekvens..."
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm"
                      value={row.severity}
                      onChange={(e) => handleChange(row.id, 'severity', parseInt(e.target.value))}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm"
                      value={row.cause}
                      onChange={(e) => handleChange(row.id, 'cause', e.target.value)}
                      placeholder="Varför?"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm"
                      value={row.occurrence}
                      onChange={(e) => handleChange(row.id, 'occurrence', parseInt(e.target.value))}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm"
                      value={row.controls}
                      onChange={(e) => handleChange(row.id, 'controls', e.target.value)}
                      placeholder="Nuvarande skydd"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm"
                      value={row.detection}
                      onChange={(e) => handleChange(row.id, 'detection', parseInt(e.target.value))}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                  </td>
                  <td className={`p-2 text-center text-sm ${getRPNColor(row.rpn)}`}>
                    {row.rpn}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg flex gap-3 items-start">
        <Info className="w-5 h-5 text-blue-500 mt-0.5" />
        <div className="text-xs text-blue-800 space-y-1">
          <p><strong>RPN (Risk Priority Number)</strong> beräknas som S × O × D.</p>
          <ul className="list-disc ml-4">
            <li><strong>S (Severity):</strong> Hur allvarlig är effekten? (1 = ingen, 10 = katastrofal)</li>
            <li><strong>O (Occurrence):</strong> Hur ofta inträffar orsaken? (1 = sällan, 10 = nästan alltid)</li>
            <li><strong>D (Detection):</strong> Hur bra är nuvarande kontroller på att upptäcka felet? (1 = utmärkt, 10 = ingen upptäckt)</li>
          </ul>
          <p className="mt-2 font-semibold">Generellt bör åtgärder prioriteras för rader med RPN &gt; 100 eller hög Severity.</p>
        </div>
      </div>
    </div>
  );
};

export default FMEATool;

import React from 'react';
import { ProjectData, FMEARow } from '../types';
import { AlertTriangle, Plus, Trash2, Info, ArrowUpDown } from 'lucide-react';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const FMEATool: React.FC<Props> = ({ project, updateProject }) => {
  const fmeaData = project.toolData?.['t_fmea'] || { rows: [] };
  const rows: FMEARow[] = fmeaData.rows || [];
  const [sortByRPN, setSortByRPN] = React.useState<boolean>(true);

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

  const getRPNBadgeClass = (rpn: number) => {
    if (rpn > 200) {
      return 'inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-red-100 border border-red-300 text-red-800 font-extrabold font-mono text-xs w-14 shadow-sm';
    }
    if (rpn >= 100) {
      return 'inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-amber-100 border border-amber-300 text-amber-800 font-bold font-mono text-xs w-14 shadow-sm';
    }
    return 'inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-green-100 border border-green-200 text-green-800 font-medium font-mono text-xs w-14';
  };

  const getRowBorderColor = (rpn: number) => {
    if (rpn > 200) return 'border-l-4 border-l-red-500';
    if (rpn >= 100) return 'border-l-4 border-l-amber-500';
    return 'border-l-4 border-l-green-400';
  };

  const sortedRows = React.useMemo(() => {
    if (!sortByRPN) return rows;
    return [...rows].sort((a, b) => (b.rpn || 0) - (a.rpn || 0));
  }, [rows, sortByRPN]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" /> FMEA (Failure Mode and Effects Analysis)
          </h3>
          <p className="text-sm text-slate-500">Identifiera risker och prioritera åtgärder baserat på RPN (Risk Priority Number).</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSortByRPN(!sortByRPN)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-md transition-colors text-sm font-medium shadow-sm ${
              sortByRPN 
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' 
                : 'bg-white text-slate-755 border-slate-205 hover:bg-slate-50'
            }`}
            title="Klicka för att växla automatisk sortering efter RPN"
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortByRPN ? 'Sorterar: Kritiska först' : 'Manuell ordning'}
          </button>
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Lägg till rad
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-32 pl-4">Process-steg</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Fel-typ</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Effekt</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-16" title="Severity (1-10)">S</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Orsak</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-16" title="Occurrence (1-10)">O</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Kontroll</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-16" title="Detection (1-10)">D</th>
              <th className="p-3 text-xs font-bold text-slate-650 uppercase tracking-wider w-20 text-center">RPN</th>
              <th className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                  Inga rader tillagda. Klicka på "Lägg till rad" för att börja.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className={`p-2 pl-3 ${getRowBorderColor(row.rpn)}`}>
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm font-medium text-slate-800"
                      value={row.step}
                      onChange={(e) => handleChange(row.id, 'step', e.target.value)}
                      placeholder="Steg..."
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm text-slate-800"
                      value={row.failureMode}
                      onChange={(e) => handleChange(row.id, 'failureMode', e.target.value)}
                      placeholder="Vad kan gå fel?"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm text-slate-800"
                      value={row.effect}
                      onChange={(e) => handleChange(row.id, 'effect', e.target.value)}
                      placeholder="Konsekvens..."
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm font-semibold"
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
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm text-slate-800"
                      value={row.cause}
                      onChange={(e) => handleChange(row.id, 'cause', e.target.value)}
                      placeholder="Varför?"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm font-semibold"
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
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm text-slate-800"
                      value={row.controls}
                      onChange={(e) => handleChange(row.id, 'controls', e.target.value)}
                      placeholder="Nuvarande skydd"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full p-1 border border-transparent focus:border-blue-300 rounded bg-transparent text-sm font-semibold"
                      value={row.detection}
                      onChange={(e) => handleChange(row.id, 'detection', parseInt(e.target.value))}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center text-sm">
                    <span className={getRPNBadgeClass(row.rpn)}>
                      {row.rpn}
                    </span>
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

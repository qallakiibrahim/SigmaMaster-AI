import React from 'react';
import { ProjectData, FMEARow } from '../types';
import { AlertTriangle, Plus, Trash2, Info, ArrowUpDown, Download } from 'lucide-react';

interface Props {
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
}

const FMEATool: React.FC<Props> = ({ project, updateProject }) => {
  const fmeaData = project.toolData?.['t_fmea'] || { rows: [] };
  const rows: FMEARow[] = fmeaData.rows || [];
  const [sortByRPN, setSortByRPN] = React.useState<boolean>(true);

  const handleExportCSV = () => {
    if (rows.length === 0) return;
    
    // Create CSV content headers
    const headers = ['Process-steg', 'Fel-typ', 'Effekt', 'S (Severity)', 'Orsak', 'O (Occurrence)', 'Kontroll', 'D (Detection)', 'RPN'];
    
    // Convert rows to CSV format
    const csvRows = [
      headers.join(';'), // Use semi-colon to support direct Excel opening in Swedish/European regions
      ...rows.map(row => [
        `"${(row.step || '').replace(/"/g, '""')}"`,
        `"${(row.failureMode || '').replace(/"/g, '""')}"`,
        `"${(row.effect || '').replace(/"/g, '""')}"`,
        row.severity,
        `"${(row.cause || '').replace(/"/g, '""')}"`,
        row.occurrence,
        `"${(row.controls || '').replace(/"/g, '""')}"`,
        row.detection,
        row.rpn
      ].join(';'))
    ];
    
    // Create blob and download link
    const csvContent = "\ufeff" + csvRows.join('\n'); // Add UTF-8 BOM for Swedish characters
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FMEA_${(project.name || 'projekt').replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      return 'inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 font-extrabold font-mono text-xs w-14 shadow-sm';
    }
    if (rpn >= 100) {
      return 'inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold font-mono text-xs w-14 shadow-sm';
    }
    return 'inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-950/20 border border-green-200 dark:border-green-800/60 text-green-800 dark:text-green-300 font-medium font-mono text-xs w-14';
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
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" /> FMEA (Failure Mode and Effects Analysis)
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Identifiera risker och prioritera åtgärder baserat på RPN (Risk Priority Number).</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSortByRPN(!sortByRPN)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-md transition-colors text-sm font-medium shadow-sm ${
              sortByRPN 
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/10' 
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
            title="Klicka för att växla automatisk sortering efter RPN"
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortByRPN ? 'Sorterar: Kritiska först' : 'Manuell ordning'}
          </button>
          
          {rows.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/10 border border-emerald-205 dark:border-emerald-800 rounded-md transition-colors text-sm font-bold shadow-sm"
              title="Exportera hela tabellen till en CSV-fil kompatibel med Excel"
            >
              <Download className="w-4 h-4" /> Exportera (Excel)
            </button>
          )}

          <button
            onClick={addRow}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Lägg till rad
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-350 font-bold uppercase tracking-wider text-[11px]">
              <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-32 pl-4">Process-steg</th>
              <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Fel-typ</th>
              <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Effekt</th>
              <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16" title="Severity (1-10)">S</th>
              <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Orsak</th>
              <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16" title="Occurrence (1-10)">O</th>
              <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kontroll</th>
              <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16" title="Detection (1-10)">D</th>
              <th className="p-3 text-xs font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wider w-20 text-center">RPN</th>
              <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-450 dark:text-slate-500 italic">
                  Inga rader tillagda. Klicka på "Lägg till rad" för att börja.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30 transition-colors">
                  <td className={`p-2 pl-3 ${getRowBorderColor(row.rpn)}`}>
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-300 rounded bg-transparent text-sm font-medium text-slate-800 dark:text-white outline-none"
                      value={row.step}
                      onChange={(e) => handleChange(row.id, 'step', e.target.value)}
                      placeholder="Steg..."
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-300 rounded bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none"
                      value={row.failureMode}
                      onChange={(e) => handleChange(row.id, 'failureMode', e.target.value)}
                      placeholder="Vad kan gå fel?"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-300 rounded bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none"
                      value={row.effect}
                      onChange={(e) => handleChange(row.id, 'effect', e.target.value)}
                      placeholder="Konsekvens..."
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full p-1 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-300 rounded bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 dark:bg-slate-900 outline-none"
                      value={row.severity}
                      onChange={(e) => handleChange(row.id, 'severity', parseInt(e.target.value))}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i+1} value={i+1} className="dark:bg-slate-900 dark:text-white">{i+1}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-300 rounded bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none"
                      value={row.cause}
                      onChange={(e) => handleChange(row.id, 'cause', e.target.value)}
                      placeholder="Varför?"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full p-1 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-300 rounded bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 dark:bg-slate-900 outline-none"
                      value={row.occurrence}
                      onChange={(e) => handleChange(row.id, 'occurrence', parseInt(e.target.value))}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i+1} value={i+1} className="dark:bg-slate-900 dark:text-white">{i+1}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-1 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-300 rounded bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none"
                      value={row.controls}
                      onChange={(e) => handleChange(row.id, 'controls', e.target.value)}
                      placeholder="Nuvarande skydd"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      className="w-full p-1 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-300 rounded bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 dark:bg-slate-900 outline-none"
                      value={row.detection}
                      onChange={(e) => handleChange(row.id, 'detection', parseInt(e.target.value))}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i+1} value={i+1} className="dark:bg-slate-900 dark:text-white">{i+1}</option>
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

      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg flex gap-3 items-start border border-transparent dark:border-blue-900/60">
        <Info className="w-5 h-5 text-blue-500 mt-0.5" />
        <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
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

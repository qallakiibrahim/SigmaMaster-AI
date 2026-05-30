import React from 'react';
import { ProjectData } from '../types';
import { Printer } from 'lucide-react';

interface Props {
  project: ProjectData;
}

const ProjectReport: React.FC<Props> = ({ project }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Print Controls (Hidden when printing) */}
      <div className="mb-8 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm print:hidden">
          <div>
              <h2 className="text-lg font-bold text-slate-800">Generera Rapport</h2>
              <p className="text-sm text-slate-500">Skapa en PDF eller skriv ut en sammanfattning av projektet.</p>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
          >
              <Printer className="w-4 h-4" /> Skriv ut / Spara PDF
          </button>
      </div>

      {/* Report Content - Styled for Print */}
      <div className="bg-white p-12 shadow-lg min-h-screen print:shadow-none print:p-0">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
              <div>
                  <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{project.name}</h1>
                  <p className="text-slate-500 mt-2">DMAIC Project Report</p>
              </div>
              <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">SigmaMaster AI</div>
                  <div className="text-xs text-slate-400">{new Date().toLocaleDateString()}</div>
              </div>
          </div>

          {/* Executive Summary */}
          <section className="mb-10">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Executive Summary</h3>
              <div className="grid grid-cols-2 gap-8">
                  <div>
                      <h4 className="font-bold text-slate-700 mb-1">Problem</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{project.problemStatement || 'Ej definierat'}</p>
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-700 mb-1">Affärsnytta</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{project.businessCase || 'Ej definierat'}</p>
                  </div>
              </div>
          </section>

          {/* Goal & Scope */}
          <section className="mb-10 bg-slate-50 p-6 rounded-lg print:bg-transparent print:p-0 print:border print:border-slate-200">
             <div className="grid grid-cols-2 gap-8">
                <div>
                     <h4 className="font-bold text-slate-700 mb-2">Projektmål (SMART)</h4>
                     <p className="text-slate-600 text-sm whitespace-pre-line">{project.goal || '-'}</p>
                </div>
                <div>
                     <h4 className="font-bold text-slate-700 mb-2">Omfattning</h4>
                     <p className="text-slate-600 text-sm whitespace-pre-line">{project.scope || '-'}</p>
                </div>
             </div>
          </section>

          {/* Data Summary */}
          <section className="mb-10 break-inside-avoid">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Mätdata & Analys</h3>
             <div className="flex gap-12 mb-6">
                 <div>
                     <div className="text-3xl font-bold text-slate-800">{project.measurements.length}</div>
                     <div className="text-xs text-slate-500 uppercase">Datapunkter</div>
                 </div>
                 <div>
                     <div className="text-3xl font-bold text-slate-800">
                        {project.measurements.length > 0 
                            ? (project.measurements.reduce((a,b)=>a+b,0)/project.measurements.length).toFixed(2) 
                            : '-'}
                     </div>
                     <div className="text-xs text-slate-500 uppercase">Medelvärde</div>
                 </div>
             </div>
             {/* If we had graphs here, we would render a static version, but for now we skip complex chart rendering in print view */}
          </section>

          {/* Improvements */}
          <section className="mb-10 break-inside-avoid">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Åtgärdsplan</h3>
              <table className="w-full text-sm text-left">
                  <thead>
                      <tr className="border-b border-slate-200">
                          <th className="py-2 font-bold text-slate-700">Åtgärd</th>
                          <th className="py-2 font-bold text-slate-700 w-32">Status</th>
                      </tr>
                  </thead>
                  <tbody>
                      {project.improvements.length > 0 ? project.improvements.map(imp => (
                          <tr key={imp.id} className="border-b border-slate-100">
                              <td className="py-2 text-slate-600">{imp.action}</td>
                              <td className="py-2">
                                  <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                      imp.status === 'Done' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}>
                                      {imp.status}
                                  </span>
                              </td>
                          </tr>
                      )) : (
                          <tr><td className="py-4 text-slate-400 italic">Inga åtgärder registrerade.</td></tr>
                      )}
                  </tbody>
              </table>
          </section>

          {/* Control Plan Notes */}
          <section className="break-inside-avoid">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Kontroll & Uppföljning</h3>
              <div className="prose prose-sm text-slate-600">
                  <p className="whitespace-pre-line">{project.toolData?.['t_control_plan']?.content || 'Ingen kontrollplan definierad.'}</p>
              </div>
          </section>
          
           {/* Footer */}
          <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between text-xs text-slate-400">
              <div>Godkänd av: __________________________</div>
              <div>Datum: __________________</div>
          </div>
      </div>
    </div>
  );
};

export default ProjectReport;
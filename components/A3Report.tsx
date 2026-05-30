import React from 'react';
import { ProjectData } from '../types';
import { Printer, ChevronLeft } from 'lucide-react';

interface Props {
  project: ProjectData;
  onBack: () => void;
}

const A3Report: React.FC<Props> = ({ project, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Controls */}
      <div className="mb-8 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm print:hidden">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
          >
              <ChevronLeft className="w-4 h-4" /> Tillbaka till Karta
          </button>
          <div className="flex gap-3">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 font-bold text-sm transition-all shadow-lg shadow-slate-200"
              >
                  <Printer className="w-4 h-4" /> Skriv ut A3
              </button>
          </div>
      </div>

      {/* A3 Content */}
      <div className="bg-white p-8 shadow-2xl border border-slate-200 min-h-[800px] print:shadow-none print:border-none print:p-0">
          
          {/* A3 Header */}
          <div className="grid grid-cols-4 border-2 border-slate-900 mb-6">
              <div className="col-span-2 p-4 border-r-2 border-slate-900">
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">A3 Project Report: {project.name}</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">SigmaMaster AI DMAIC Framework</p>
              </div>
              <div className="p-4 border-r-2 border-slate-900">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Ägare</div>
                  <div className="text-sm font-bold text-slate-800">Ibrahim Qallaki</div>
              </div>
              <div className="p-4">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Datum</div>
                  <div className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString()}</div>
              </div>
          </div>

          {/* A3 Grid */}
          <div className="grid grid-cols-2 gap-6">
              
              {/* Left Column */}
              <div className="space-y-6">
                  {/* 1. Background & Problem */}
                  <section className="border-2 border-slate-900 p-4">
                      <h3 className="text-xs font-black bg-slate-900 text-white px-2 py-1 inline-block mb-3 uppercase tracking-widest">1. Bakgrund & Problemformulering</h3>
                      <div className="space-y-3">
                          <div>
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Problembeskrivning</h4>
                              <p className="text-xs text-slate-700 leading-relaxed">{project.problemStatement || 'Ej definierat'}</p>
                          </div>
                          <div>
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Affärsnytta</h4>
                              <p className="text-xs text-slate-700 leading-relaxed">{project.businessCase || 'Ej definierat'}</p>
                          </div>
                      </div>
                  </section>

                  {/* 2. Current Condition */}
                  <section className="border-2 border-slate-900 p-4">
                      <h3 className="text-xs font-black bg-slate-900 text-white px-2 py-1 inline-block mb-3 uppercase tracking-widest">2. Nuvarande Tillstånd</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Medelvärde (Y)</div>
                              <div className="text-xl font-black text-slate-800">
                                  {project.measurements.length > 0 
                                      ? (project.measurements.reduce((a,b)=>a+b,0)/project.measurements.length).toFixed(2) 
                                      : '-'}
                              </div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Datapunkter</div>
                              <div className="text-xl font-black text-slate-800">{project.measurements.length}</div>
                          </div>
                      </div>
                      <div className="text-[10px] text-slate-500 italic">
                          Processkartläggning och SIPOC indikerar flaskhalsar i huvudflödet.
                      </div>
                  </section>

                  {/* 3. Goals / Target Condition */}
                  <section className="border-2 border-slate-900 p-4">
                      <h3 className="text-xs font-black bg-slate-900 text-white px-2 py-1 inline-block mb-3 uppercase tracking-widest">3. Mål & Målbild</h3>
                      <div className="space-y-2">
                          <div className="flex gap-2 items-start">
                              <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-bold mt-0.5 shrink-0">G</div>
                              <p className="text-xs text-slate-700 font-bold">{project.goal || 'Mål ej definierat'}</p>
                          </div>
                          <div className="flex gap-2 items-start">
                              <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[8px] font-bold mt-0.5 shrink-0">S</div>
                              <p className="text-xs text-slate-500 italic">{project.scope || 'Omfattning ej definierad'}</p>
                          </div>
                      </div>
                  </section>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                  {/* 4. Root Cause Analysis */}
                  <section className="border-2 border-slate-900 p-4">
                      <h3 className="text-xs font-black bg-slate-900 text-white px-2 py-1 inline-block mb-3 uppercase tracking-widest">4. Rotorsaksanalys</h3>
                      <div className="space-y-2">
                          {project.toolData?.['t_ishikawa']?.visualData?.categories?.map((cat: any, i: number) => (
                              cat.causes.length > 0 && (
                                  <div key={i} className="flex gap-2">
                                      <span className="text-[10px] font-bold text-slate-400 w-16 shrink-0">{cat.name}:</span>
                                      <span className="text-[10px] text-slate-600">{cat.causes.slice(0, 2).join(', ')}</span>
                                  </div>
                              )
                          ))}
                          {(!project.toolData?.['t_ishikawa']?.visualData) && (
                              <p className="text-[10px] text-slate-400 italic">Ingen Ishikawa-data tillgänglig.</p>
                          )}
                      </div>
                  </section>

                  {/* 5. Countermeasures */}
                  <section className="border-2 border-slate-900 p-4">
                      <h3 className="text-xs font-black bg-slate-900 text-white px-2 py-1 inline-block mb-3 uppercase tracking-widest">5. Motåtgärder & Förbättringar</h3>
                      <div className="space-y-2">
                          {project.improvements.slice(0, 4).map((imp, i) => (
                              <div key={imp.id} className="flex items-center justify-between border-b border-slate-100 pb-1">
                                  <span className="text-[10px] text-slate-700">{imp.action}</span>
                                  <span className={`text-[8px] font-bold px-1 rounded ${imp.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                      {imp.status}
                                  </span>
                              </div>
                          ))}
                          {project.improvements.length === 0 && (
                              <p className="text-[10px] text-slate-400 italic">Inga åtgärder definierade.</p>
                          )}
                      </div>
                  </section>

                  {/* 6. Implementation & Follow-up */}
                  <section className="border-2 border-slate-900 p-4">
                      <h3 className="text-xs font-black bg-slate-900 text-white px-2 py-1 inline-block mb-3 uppercase tracking-widest">6. Implementering & Uppföljning</h3>
                      <div className="space-y-3">
                          <div>
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Kontrollplan</h4>
                              <p className="text-[10px] text-slate-600 line-clamp-3">
                                  {project.toolData?.['t_control_plan']?.content || 'Ingen kontrollplan definierad.'}
                              </p>
                          </div>
                          <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                              <div className="space-y-2">
                                  <div className="w-32 h-px bg-slate-900"></div>
                                  <div className="text-[8px] font-bold text-slate-400 uppercase">Signatur Sponsor</div>
                              </div>
                              <div className="space-y-2 text-right">
                                  <div className="w-32 h-px bg-slate-900 ml-auto"></div>
                                  <div className="text-[8px] font-bold text-slate-400 uppercase">Signatur Projektledare</div>
                              </div>
                          </div>
                      </div>
                  </section>
              </div>
          </div>

          {/* A3 Footer */}
          <div className="mt-8 text-center">
              <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.2em]">Generated by SigmaMaster AI - Professional DMAIC Toolkit</p>
          </div>
      </div>
    </div>
  );
};

export default A3Report;

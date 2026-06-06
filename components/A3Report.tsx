import React from 'react';
import { ProjectData, Phase } from '../types';
import { 
  Printer, 
  ChevronLeft, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Wrench, 
  AlertTriangle, 
  FileText, 
  Layers, 
  ShieldCheck, 
  UserCheck, 
  CheckCircle2, 
  ArrowRight,
  ClipboardList
} from 'lucide-react';

interface Props {
  project: ProjectData;
  onBack: () => void;
}

const A3Report: React.FC<Props> = ({ project, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  // 1. Calculations & Parsing for DMAIC Phase 2 (Measure)
  const measurements = project.measurements || [];
  const n = measurements.length;
  const mean = n > 0 ? measurements.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 1 ? measurements.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);
  const minVal = n > 0 ? Math.min(...measurements) : 0;
  const maxVal = n > 0 ? Math.max(...measurements) : 0;

  // Pull specification limits from toolData if they exist, or fallback
  const lsl = project.toolData?.['t_capability']?.fields?.lsl ?? 90;
  const usl = project.toolData?.['t_capability']?.fields?.usl ?? 110;
  const cp = stdDev > 0 ? (usl - lsl) / (6 * stdDev) : 0;
  const cpk = stdDev > 0 ? Math.min((mean - lsl) / (3 * stdDev), (usl - mean) / (3 * stdDev)) : 0;

  // Calculate real Sigma Level (z-score) based on estimate
  let sigmaLevel = 'N/A';
  if (stdDev > 0) {
    const minZ = Math.min((mean - lsl) / stdDev, (usl - mean) / stdDev);
    sigmaLevel = (minZ + 1.5).toFixed(2); // Adding 1.5 sigma shift factor for industrial standard
  }

  // 2. Fetch SIPOC Data
  const sipoc = project.toolData?.['t_sipoc']?.visualData || {
    suppliers: [],
    inputs: [],
    process: [],
    outputs: [],
    customers: []
  };

  // 3. Fetch Process Map Steps
  const processSteps = project.toolData?.['t_process_map']?.visualData || [];

  // 4. Fetch 5 Whys Causal Chain
  const whysFields = project.toolData?.['t_5why']?.fields || {};
  const whyChain = [
    { label: 'Problem', text: whysFields.problem || '' },
    { label: 'Varför 1', text: whysFields.w1 || '' },
    { label: 'Varför 2', text: whysFields.w2 || '' },
    { label: 'Varför 3', text: whysFields.w3 || '' },
    { label: 'Varför 4', text: whysFields.w4 || '' },
    { label: 'Varför 5 (Rotorsak)', text: whysFields.w5 || '' },
  ].filter(level => level.text.trim() !== '');

  // 5. Fetch Ishikawa categories & causes
  const ishikawa = project.toolData?.['t_ishikawa']?.visualData?.categories || [];

  // 6. Fetch FMEA Top Risks (rows sorted by RPN descending)
  const fmeaRows = project.toolData?.['t_fmea']?.rows || project.toolData?.['t_fmea']?.items || [];
  const sortedFMEA = [...fmeaRows].sort((a: any, b: any) => (b.rpn || 0) - (a.rpn || 0)).slice(0, 5);

  // 7. Dynamic tool fallback checker
  const hasToolData = (toolId: string) => {
    const data = project.toolData?.[toolId];
    if (!data) return false;
    if (Array.isArray(data.items) && data.items.length > 0) return true;
    if (data.visualData) return true;
    if (data.fields && Object.keys(data.fields).length > 0) return true;
    if (data.notes || data.content) return true;
    return false;
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 px-4 sm:px-6">
      {/* Dynamic injection of landscape A3 CSS print settings */}
      <style>{`
        @media print {
          /* Hide all elements on the page by default */
          body * {
            visibility: hidden !important;
          }
          /* Hide non-print structures entirely from layout flow */
          aside, header, nav, .print-hidden, [class*="ProjectHeader"], [class*="HistorySidebar"], button, .mb-8 {
            display: none !important;
          }
          /* Override page layout sizes and margins */
          @page {
            size: A3 landscape;
            margin: 0.8cm 1cm;
          }
          /* Ensure document body is clean and resets any background offsets */
          html, body {
            height: auto !important;
            overflow: visible !important;
            background-color: #ffffff !important;
            color: #0d1b2a !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Collapse high-level flex/grid app wrappers that lock height & scrollbars */
          #root, main, .flex, .overflow-hidden, .overflow-auto, [class*="max-w-7xl"], [class*="mx-auto"] {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
            position: static !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          /* Re-reveal only the A3 page layout container and snap it to top-left of target sheet */
          .a3-page-wrapper {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
          }
          /* Enable visibility for all child components within the A3 card */
          .a3-page-wrapper * {
            visibility: visible !important;
          }
          .print-card-border {
            border: 2px solid #0f172a !important;
            box-shadow: none !important;
            border-radius: 4px !important;
            background-color: transparent !important;
          }
          .print-badge-bg {
            background-color: #0f172a !important;
            color: #ffffff !important;
          }
          .print-grid-layout {
            grid-template-cols: repeat(2, minmax(0, 1fr)) !important;
            gap: 1.5rem !important;
          }
          section {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Control panel header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl print-hidden gap-4">
          <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-400" /> Professional A3 DMAIC Report
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                En komplett Lean Six Sigma-sammanfattning optimerad för A3-utskrift eller sparning som PDF.
              </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={onBack}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-800 text-slate-300 px-5 py-2.5 rounded-xl hover:bg-slate-700 font-bold text-sm transition-all border border-slate-700 select-none cursor-pointer"
              >
                  <ChevronLeft className="w-4 h-4" /> Karta
              </button>
              <button 
                onClick={handlePrint}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-500 font-black text-sm transition-all shadow-lg shadow-blue-500/25 border border-blue-500 select-none cursor-pointer hover:scale-102"
              >
                  <Printer className="w-4 h-4" /> Skriv ut A3-Rapport
              </button>
          </div>
      </div>

      {/* Main A3 Board Canvas - Structured exactly like a classic master A3 paper blueprint */}
      <div className="a3-page-wrapper bg-white p-8 sm:p-10 shadow-2xl border border-slate-200 rounded-3xl min-h-[950px]">
          
          {/* Header section with Metadata and branding */}
          <div className="grid grid-cols-1 md:grid-cols-4 border-4 border-slate-900 mb-6 rounded-lg overflow-hidden shrink-0">
              <div className="md:col-span-2 p-5 bg-slate-900 text-white flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase bg-blue-950/50 px-2.5 py-1 rounded">DMAIC MASTER BLUEPRINT</span>
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-2 leading-none whitespace-normal break-words">
                      A3: {project.name || 'Ej namngivet projekt'}
                    </h1>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 font-mono">Genererad via SigmaMaster AI • Realtidssynk aktiv</p>
              </div>
              <div className="p-5 border-t md:border-t-0 md:border-r border-slate-900 bg-slate-50 flex flex-col justify-between">
                  <div className="text-[10px] text-slate-500 font-black tracking-wider uppercase">Fasgodkännande / Tollgates</div>
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {Object.values(Phase).map((ph, idx) => {
                      const status = project.tollgateStatus?.[ph] || 'Not Started';
                      const colorClass = status === 'Approved' 
                        ? 'bg-emerald-500 text-white' 
                        : status === 'In Progress' 
                        ? 'bg-amber-400 text-slate-950' 
                        : 'bg-slate-200 text-slate-400';
                      return (
                        <div key={idx} className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full ${colorClass} flex items-center justify-center text-[10px] font-black shadow-sm`}>
                            {ph[0]}
                          </div>
                          <span className="text-[8px] mt-1 text-slate-500 font-bold">{ph}</span>
                        </div>
                      );
                    })}
                  </div>
              </div>
              <div className="p-5 border-t md:border-t-0 bg-slate-50 flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Projektledare</div>
                      <div className="text-xs font-extrabold text-slate-800">Ibrahim Qallaki</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Metodik</div>
                      <div className="text-xs font-extrabold text-blue-700">Six Sigma Belt</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Utskriftsdatum</div>
                    <div className="text-xs font-bold text-slate-700 font-mono">{new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
              </div>
          </div>

          {/* Master Two-Column Grid matching exactly DMAIC phase steps flow */}
          <div className="print-grid-layout grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* LEFT COLUMN: Define, Measure, Target Condition */}
              <div className="space-y-6">
                  
                  {/* PHASE 1: DEFINE - PROJECT CHARTER & SIPOC */}
                  <section className="print-card-border border-2 border-slate-900 p-5 rounded-xl bg-slate-50/20 shadow-sm relative overflow-hidden">
                      <div className="absolute right-4 top-4 text-slate-100 print-hidden">
                        <Target className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xs font-black bg-slate-900 text-white px-3 py-1.5 inline-block mb-4 uppercase tracking-widest rounded print-badge-bg">
                        1. Definiera (Define) - Projektstadga & Processgränser
                      </h3>
                      
                      <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Problemformulering</h4>
                                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-2.5 rounded border border-slate-200 min-h-[50px]">
                                    {project.problemStatement || 'Ej angiven i projektet. Gå till Definiera-fasen för att formulera.'}
                                  </p>
                              </div>
                              <div>
                                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Affärsnytta (Business Case)</h4>
                                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-2.5 rounded border border-slate-200 min-h-[50px]">
                                    {project.businessCase || 'Ej angiven. Redogör för förluster, kassering eller ekonomisk påverkan.'}
                                  </p>
                              </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                              <div className="bg-white p-2 border border-slate-200 rounded">
                                  <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider">SMART Projektmål</div>
                                  <div className="text-xs font-bold text-slate-800 truncate mt-0.5">{project.goal || 'Ej specificerat'}</div>
                              </div>
                              <div className="bg-white p-2 border border-slate-200 rounded">
                                  <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Omfattning (Scope)</div>
                                  <div className="text-xs font-bold text-slate-800 truncate mt-0.5">{project.scope || 'Inkl / Exkl saknas'}</div>
                              </div>
                              <div className="bg-white p-2 border border-slate-200 rounded">
                                  <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Sponsor/Intressenter</div>
                                  <div className="text-xs font-bold text-slate-800 truncate mt-0.5">{project.stakeholders || 'Sponsor saknas'}</div>
                              </div>
                          </div>

                          {/* SIPOC Overview Subtable */}
                          <div className="mt-3 pt-3 border-t border-slate-200/60">
                              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2">Övergripande Flödesmatris (SIPOC)</h4>
                              <div className="grid grid-cols-5 gap-1.5 text-center text-[9px]">
                                  <div className="bg-indigo-50 border border-indigo-150 p-1.5 rounded">
                                      <div className="font-bold text-indigo-800">S (Leverantör)</div>
                                      <div className="text-slate-600 mt-1 line-clamp-2">{sipoc.suppliers.slice(0,2).join(', ') || '-'}</div>
                                  </div>
                                  <div className="bg-blue-50 border border-blue-150 p-1.5 rounded">
                                      <div className="font-bold text-blue-800">I (Insignal)</div>
                                      <div className="text-slate-600 mt-1 line-clamp-2">{sipoc.inputs.slice(0,2).join(', ') || '-'}</div>
                                  </div>
                                  <div className="bg-amber-50 border border-amber-150 p-1.5 rounded font-black">
                                      <div className="font-bold text-amber-800">P (Process)</div>
                                      <div className="text-slate-600 mt-1 line-clamp-2 font-normal">{sipoc.process.slice(0,2).join(', ') || '-'}</div>
                                  </div>
                                  <div className="bg-green-50 border border-green-150 p-1.5 rounded">
                                      <div className="font-bold text-green-800">O (Utdata)</div>
                                      <div className="text-slate-600 mt-1 line-clamp-2">{sipoc.outputs.slice(0,2).join(', ') || '-'}</div>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                                      <div className="font-bold text-slate-800">C (Kund)</div>
                                      <div className="text-slate-600 mt-1 line-clamp-2">{sipoc.customers.slice(0,2).join(', ') || '-'}</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </section>

                  {/* PHASE 2: MEASURE - PROCESS STATS, DIST & CAPABILITY */}
                  <section className="print-card-border border-2 border-slate-900 p-5 rounded-xl bg-slate-50/20 shadow-sm relative">
                      <div className="absolute right-4 top-4 text-slate-100 print-hidden">
                        <TrendingUp className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xs font-black bg-slate-900 text-white px-3 py-1.5 inline-block mb-4 uppercase tracking-widest rounded print-badge-bg">
                        2. Mäta (Measure) - Datainsamling & Variabilitet
                      </h3>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-white p-3 rounded border border-slate-200 text-center shadow-xs">
                              <span className="text-[9px] text-slate-400 uppercase font-black">Antal mätningar (N)</span>
                              <div className="text-xl font-black text-slate-900 mt-1">{n}</div>
                          </div>
                          <div className="bg-white p-3 rounded border border-slate-200 text-center shadow-xs">
                              <span className="text-[9px] text-slate-400 uppercase font-black">Aritmetiskt Medel (μ)</span>
                              <div className="text-xl font-black text-slate-900 mt-1">{n > 0 ? mean.toFixed(2) : '0.00'}</div>
                          </div>
                          <div className="bg-white p-3 rounded border border-slate-200 text-center shadow-xs">
                              <span className="text-[9px] text-slate-400 uppercase font-black">Std Avvikelse (σ)</span>
                              <div className="text-xl font-black text-slate-900 mt-1">{n > 1 ? stdDev.toFixed(3) : '0.000'}</div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          {/* Capability Box */}
                          <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-950 flex flex-col justify-between">
                              <div className="text-[10px] text-blue-400 uppercase font-black tracking-wider">Statistisk Kapabilitet</div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div>
                                      <div className="text-[8px] text-slate-400 uppercase font-bold">Kapabilitetsindex Cp</div>
                                      <div className="text-lg font-black text-white">{n > 1 ? cp.toFixed(2) : 'N/A'}</div>
                                  </div>
                                  <div>
                                      <div className="text-[8px] text-slate-400 uppercase font-bold">Processindex Cpk</div>
                                      <div className={`text-lg font-black ${n > 1 && cpk < 1.33 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        {n > 1 ? cpk.toFixed(2) : 'N/A'}
                                      </div>
                                  </div>
                              </div>
                              <div className="text-[8px] text-slate-400 border-t border-slate-800/80 pt-2 mt-2 flex justify-between">
                                  <span>Toleransgräns: {lsl} till {usl}</span>
                                  <span className="font-bold text-blue-300">Sigma: {sigmaLevel}σ</span>
                              </div>
                          </div>

                          {/* Process Map overview */}
                          <div className="bg-white p-3 border border-slate-200 rounded-lg flex flex-col justify-between">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Processkartläggning (Värdeflöde)</span>
                                <div className="space-y-1 mt-1 text-[10px]">
                                  {processSteps.length > 0 ? (
                                    processSteps.slice(0, 3).map((step: any, i: number) => (
                                      <div key={i} className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${step.valueAdd ? 'bg-emerald-500' : 'bg-rose-400'}`}></span>
                                        <span className="font-medium text-slate-700 truncate max-w-[150px]">{step.name}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-[9px] text-slate-400 italic">Inga process-steg tillgängliga.</div>
                                  )}
                                  {processSteps.length > 3 && (
                                    <div className="text-[8px] text-slate-400 mt-1">+ {processSteps.length - 3} ytterligare steg i kartan</div>
                                  )}
                                </div>
                              </div>
                              <span className="text-[8px] text-slate-500 mt-2 font-mono">Total processlängd registrerad.</span>
                          </div>
                      </div>
                  </section>

                  {/* PHASE 3: MEASURE COMPLEMENTS - DATA COLLECTION NOTES */}
                  <section className="print-card-border border border-slate-200 p-4 rounded-xl bg-white shadow-xs">
                      <div className="flex gap-4 items-start">
                          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                              <Layers className="w-5 h-5" />
                          </div>
                          <div>
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mätsystemsanalys (MSA) & Mätnoggrannhet</h4>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {project.toolData?.['t_msa']?.notes || 'Mätsystemet och variationen är under kontroll. Repeterbarhet (EV) och Reproducerbarhet (AV) är utvärderade enligt standardiserat mätförfarande.'}
                              </p>
                          </div>
                      </div>
                  </section>
              </div>

              {/* RIGHT COLUMN: Analyze, Improve, Control & Approval */}
              <div className="space-y-6">
                  
                  {/* PHASE 4: ANALYZE - FISHBONE, 5 WHYS & CAUSAL */}
                  <section className="print-card-border border-2 border-slate-900 p-5 rounded-xl bg-slate-50/20 shadow-sm relative">
                      <div className="absolute right-4 top-4 text-slate-100 print-hidden">
                        <Wrench className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xs font-black bg-slate-900 text-white px-3 py-1.5 inline-block mb-4 uppercase tracking-widest rounded print-badge-bg">
                        3. Analysera (Analyze) - Rotorsaker & Hypoteser
                      </h3>

                      <div className="space-y-4">
                          {/* 5 Whys Chain */}
                          <div className="bg-white p-3 border border-slate-200 rounded-lg">
                              <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-2">5 Varför Causal Chain (Rotorsakskedja)</div>
                              {whyChain.length > 0 ? (
                                <div className="space-y-1.5">
                                  {whyChain.map((level, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                      <div className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 shrink-0 w-28 text-center truncate">
                                        {level.label}
                                      </div>
                                      <ArrowRight className="w-2.5 h-2.5 text-slate-300 shrink-0" />
                                      <div className="text-[10px] text-slate-700 italic truncate font-medium">
                                        "{level.text}"
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic font-medium p-1">
                                  Ingen orsakskedja inmatad. Fyll i 5 Varför på Analysera-skärmen.
                                </div>
                              )}
                          </div>

                          {/* Ishikawa Categorized Brainstorming */}
                          <div>
                              <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-2">Fiskbens-analys (Ishikawa / 6M)</div>
                              <div className="grid grid-cols-2 gap-3 text-[10px]">
                                {ishikawa.length > 0 ? (
                                  ishikawa.map((cat: any, i: number) => (
                                    cat.causes.length > 0 && (
                                      <div key={i} className="bg-white p-2 border border-slate-150 rounded">
                                        <div className="font-extrabold text-slate-800 uppercase text-[9px] border-b border-slate-100 pb-0.5 mb-1 flex justify-between items-center bg-slate-50/50 px-1 rounded">
                                          <span>{cat.name}</span>
                                          <span className="text-[8px] text-slate-400">({cat.causes.length})</span>
                                        </div>
                                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                                           {cat.causes.slice(0, 2).map((cause: string, k: number) => (
                                              <li key={k} className="truncate">{cause}</li>
                                           ))}
                                        </ul>
                                      </div>
                                    )
                                  ))
                                ) : (
                                  <div className="col-span-2 text-slate-400 text-center py-4 bg-white rounded border border-dashed border-slate-200">
                                    Inga kategoriserade orsaker i Ishikawa. Klicka i Analysera &rarr; Ishikawa.
                                  </div>
                                )}
                              </div>
                          </div>
                      </div>
                  </section>

                  {/* PHASE 5: IMPROVE - ACTION PLAN & RISK RATING (FMEA) */}
                  <section className="print-card-border border-2 border-slate-900 p-5 rounded-xl bg-slate-50/20 shadow-sm relative">
                      <div className="absolute right-4 top-4 text-slate-100 print-hidden">
                        <AlertTriangle className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xs font-black bg-slate-900 text-white px-3 py-1.5 inline-block mb-3 uppercase tracking-widest rounded print-badge-bg">
                        4. Förbättra (Improve) - Åtgärdsprogram & FMEA
                      </h3>

                      <div className="space-y-4">
                          {/* FMEA Top Rated Risks */}
                          <div>
                              <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-2">FMEA Riskprioritering (Största processrisker)</div>
                              {sortedFMEA.length > 0 ? (
                                <div className="border border-slate-200 rounded overflow-hidden">
                                    <table className="w-full text-left text-[9px]">
                                        <thead className="bg-slate-900 text-white font-bold uppercase py-1">
                                            <tr>
                                                <th className="p-1 px-2">Processsteg / Feltyp</th>
                                                <th className="p-1 text-center w-8">S</th>
                                                <th className="p-1 text-center w-8">O</th>
                                                <th className="p-1 text-center w-8">D</th>
                                                <th className="p-1 text-center font-black text-rose-400 w-12">RPN</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {sortedFMEA.map((row: any, i: number) => (
                                                <tr key={i} className="border-b border-slate-100 font-medium">
                                                    <td className="p-1 px-2 text-slate-850 truncate max-w-[200px]" title={`${row.step}: ${row.failureMode}`}>
                                                      <span className="font-extrabold text-slate-500 mr-1">{row.step || 'Steg'}</span>
                                                      {row.failureMode}
                                                    </td>
                                                    <td className="p-1 text-center text-slate-600">{row.severity}</td>
                                                    <td className="p-1 text-center text-slate-600">{row.occurrence}</td>
                                                    <td className="p-1 text-center text-slate-600">{row.detection}</td>
                                                    <td className="p-1 text-center font-extrabold text-rose-700 bg-rose-50/40">{row.rpn}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic bg-white p-2 text-center rounded border border-dashed border-slate-200">
                                  Inga rader sparade i FMEA ännu. Gå till FMEA i Förbättra-steget.
                                </div>
                              )}
                          </div>

                          {/* Improvements List */}
                          <div>
                              <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-2">Genomförda & Planerade Åtgärder</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                                {project.improvements && project.improvements.length > 0 ? (
                                  project.improvements.slice(0, 4).map((imp) => (
                                    <div key={imp.id} className="bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-2 truncate">
                                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${imp.status === 'Done' ? 'text-emerald-500' : 'text-slate-300'}`} />
                                        <span className="text-slate-800 font-bold truncate">{imp.action}</span>
                                      </div>
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded select-none shrink-0 uppercase ${
                                        imp.status === 'Done' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {imp.status === 'Done' ? 'Klar' : 'Pågår'}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-2 text-slate-400 text-center py-3 bg-white rounded border border-dashed border-slate-200">
                                    Inga registrerade förbättringar sparade. Lägg till i Förbättra-skärmen.
                                  </div>
                                )}
                              </div>
                          </div>
                      </div>
                  </section>

                  {/* PHASE 6: CONTROL - STANDARDIZATION & AUDITING */}
                  <section className="print-card-border border border-slate-900 p-5 rounded-xl bg-slate-50/20 shadow-sm relative">
                      <div className="absolute right-4 top-4 text-slate-100 print-hidden">
                        <ShieldCheck className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xs font-black bg-slate-900 text-white px-3 py-1.5 inline-block mb-4 uppercase tracking-widest rounded print-badge-bg">
                        5. Styra (Control) - Kontrollplan & SOPs
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded-lg border border-slate-250">
                              <h4 className="text-[10px] font-black text-slate-550 uppercase tracking-wider mb-2">Standardiserat Arbetssätt (SOP)</h4>
                              <p className="text-[10px] text-slate-650 leading-relaxed italic line-clamp-3">
                                {project.toolData?.['t_sop']?.notes || project.toolData?.['t_sop']?.content || 'En ny uppdaterad standard (SOP - Standard Operating Procedure) har tagits fram och implementerats för att säkerställa repeterbara arbetssteg samt minimera personberoende variation.'}
                              </p>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg border border-slate-250">
                              <h4 className="text-[10px] font-black text-slate-550 uppercase tracking-wider mb-2">Aktiv Kontrollplan (Control Plan)</h4>
                              <p className="text-[10px] text-slate-650 leading-relaxed italic line-clamp-3">
                                {project.toolData?.['t_control_plan']?.notes || project.toolData?.['t_control_plan']?.content || 'Mätmetoder samt larmgränser har definierats. Kontroll i produktion sker kontinuerligt enligt uppsatta frekvenser med eskalering till skiftledare vid avvikelse.'}
                              </p>
                          </div>
                      </div>
                  </section>

                  {/* SPONSOR DELEGATION & BLACK BELT SIGN-OFFS - EXQUISITE BOTTOM SECTION */}
                  <section className="bg-slate-900 text-white p-4 rounded-xl border border-slate-950">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                          <div className="flex gap-3 items-center">
                              <div className="w-9 h-9 rounded-full bg-blue-900/50 flex items-center justify-center border border-blue-500/30">
                                <UserCheck className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <h4 className="text-[9px] font-black text-blue-300 uppercase tracking-wider">Auktorisation & Slutförande</h4>
                                <p className="text-[9px] text-slate-400">DMAIC-processen har slutförts, kapabiliteten mätts och godkänts av ledningen.</p>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-center">
                              <div className="space-y-1">
                                  <div className="h-6 border-b border-slate-700 mx-auto w-24"></div>
                                  <div className="text-[8px] font-extrabold text-slate-400 uppercase">Sponsor</div>
                              </div>
                              <div className="space-y-1">
                                  <div className="h-6 border-b border-slate-700 mx-auto w-24"></div>
                                  <div className="text-[8px] font-extrabold text-slate-400 uppercase">Master Black Belt</div>
                              </div>
                          </div>
                      </div>
                  </section>
              </div>
          </div>

          {/* Elegant tiny branding footline */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest shrink-0">
              <span>SigmaMaster AI Portal</span>
              <span>Sida 1 av 1 • Komplett DMAIC-Sammanfattning</span>
              <span>Licensierad till {project.ownerId ? 'PremiumAnvändare' : 'Demo'}</span>
          </div>
      </div>
    </div>
  );
};

export default A3Report;

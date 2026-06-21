import React from 'react';
import { ProjectData, Phase } from '../types';
import { Target, Activity, Search, Settings, ShieldCheck, CheckCircle2, ArrowRight, BarChart, TrendingUp, AlertTriangle, ListChecks } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend } from 'recharts';

interface Props {
  project: ProjectData;
  onViewChange: (view: any) => void;
}

const Dashboard: React.FC<Props> = ({ project, onViewChange }) => {
  
  // Simple completion logic helpers
  const getPhaseProgress = (phase: Phase): number => {
    const status = project.tollgateStatus?.[phase];
    if (status === 'Approved') return 100;

    switch (phase) {
        case Phase.DEFINE:
            let dCount = 0;
            if (project.name) dCount++;
            if (project.problemStatement) dCount++;
            if (project.businessCase) dCount++;
            if (project.goal) dCount++;
            if (project.stakeholders) dCount++;
            return (dCount / 5) * 90;
        case Phase.MEASURE:
            return project.measurements.length > 5 ? 80 : (project.measurements.length * 10);
        case Phase.ANALYZE:
            return project.toolData['t_ishikawa'] || project.toolData['t_5why'] || project.toolData['t_anova'] ? 50 : 0;
        case Phase.IMPROVE:
            return project.improvements.length > 0 ? 60 : 0;
        case Phase.CONTROL:
            return project.toolData['t_control_plan'] ? 60 : 0;
        default: return 0;
    }
  };

  const phases = [
    { id: Phase.DEFINE, icon: Target, title: 'Define', desc: 'Definiera problem & mål', color: '#3b82f6' },
    { id: Phase.MEASURE, icon: Activity, title: 'Measure', desc: 'Mät nuvarande prestanda', color: '#10b981' },
    { id: Phase.ANALYZE, icon: Search, title: 'Analyze', desc: 'Identifiera rotorsaker', color: '#8b5cf6' },
    { id: Phase.IMPROVE, icon: Settings, title: 'Improve', desc: 'Implementera lösningar', color: '#f59e0b' },
    { id: Phase.CONTROL, icon: ShieldCheck, title: 'Control', desc: 'Säkra framtida resultat', color: '#ef4444' },
  ];

  const overallProgress = Math.round(phases.reduce((acc, curr) => acc + getPhaseProgress(curr.id), 0) / 5);

  const pieData = phases.map(p => ({
    name: p.title,
    value: getPhaseProgress(p.id),
    color: p.color
  }));

  const improvementStats = {
    total: project.improvements.length,
    done: project.improvements.filter(i => i.status === 'Done').length,
    inProgress: project.improvements.filter(i => i.status === 'In Progress').length,
  };

  return (
    <div className="space-y-8 pb-10">
        {/* Welcome Hero */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest text-blue-300">
                            SigmaMaster Pro
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-xs font-medium text-emerald-400">Live Sync Aktiv</span>
                    </div>
                    <h1 className="text-4xl font-black mb-3 tracking-tight">
                        {project.name || 'Namnlöst Projekt'}
                    </h1>
                    <p className="text-slate-300 max-w-xl text-sm leading-relaxed mb-6">
                        {project.problemStatement?.substring(0, 150)}...
                    </p>
                    <button 
                        onClick={() => onViewChange('ProjectMap')}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                    >
                        Visa Projektkarta <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center gap-6 min-w-[280px]">
                    <div className="w-20 h-20">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={25}
                                    outerRadius={35}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Total Progress</div>
                        <div className="text-4xl font-black text-white">{overallProgress}%</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Phase Progress List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" /> DMAIC Status
                    </h3>
                    <div className="space-y-5">
                        {phases.map((phase) => {
                            const progress = getPhaseProgress(phase.id);
                            const status = project.tollgateStatus?.[phase.id] || 'Not Started';
                            const isCompleted = status === 'Approved';
                            
                            return (
                                <div key={phase.id} className="group cursor-pointer" onClick={() => onViewChange(phase.id)}>
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isCompleted ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                                <phase.icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800 dark:text-white">{phase.title}</div>
                                                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">{status}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-mono font-bold text-slate-600 dark:text-slate-350">{progress}%</div>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full transition-all duration-1000 ease-out rounded-full"
                                            style={{ width: `${progress}%`, backgroundColor: phase.color }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Metrics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <ListChecks className="w-4 h-4 text-emerald-600 dark:text-emerald-450" /> Förbättringsåtgärder
                        </h3>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="text-3xl font-black text-slate-800 dark:text-white">{improvementStats.total}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Totalt identifierade</div>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{improvementStats.done} Klara</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500">{improvementStats.inProgress} Pågående</div>
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                            <div 
                                className="bg-emerald-500 h-full" 
                                style={{ width: `${(improvementStats.done / (improvementStats.total || 1)) * 100}%` }}
                            ></div>
                            <div 
                                className="bg-amber-500 h-full" 
                                style={{ width: `${(improvementStats.inProgress / (improvementStats.total || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-450" /> Riskanalys (FMEA)
                        </h3>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="text-3xl font-black text-slate-800 dark:text-white">
                                    {project.toolData['t_fmea']?.rows?.length || 0}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Identifierade risker</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Högsta RPN</div>
                                <div className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">
                                    {Math.max(...(project.toolData['t_fmea']?.rows?.map((r: any) => r.rpn) || [0]))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Mätdata (Y)</h3>
                    <div className="h-40 w-full animate-fadeIn">
                        <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={project.measurements.slice(-10).map((m, i) => ({ name: i, val: m }))}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis dataKey="name" hide />
                                <YAxis hide domain={['auto', 'auto']} />
                                <ReTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                                <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </ReBarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Medelvärde</div>
                            <div className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">
                                {(project.measurements.reduce((a, b) => a + b, 0) / (project.measurements.length || 1)).toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Antal</div>
                            <div className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">{project.measurements.length}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" /> Nästa Steg
                    </h3>
                    <p className="text-blue-100 text-xs leading-relaxed mb-4">
                        Baserat på din progress rekommenderas du att slutföra 
                        <strong> {phases.find(p => getPhaseProgress(p.id) < 100)?.title}</strong>-fasen 
                        för att gå vidare till Tollgate.
                    </p>
                    <button 
                        onClick={() => onViewChange(phases.find(p => getPhaseProgress(p.id) < 100)?.id || Phase.DEFINE)}
                        className="w-full py-2 bg-white text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                    >
                        Fortsätt Arbeta <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;

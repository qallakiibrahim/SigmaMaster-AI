import React, { useState } from 'react';
import { Phase, ProjectData } from '../types';
import { FileText, CheckSquare, Calculator, Wrench, Users, BarChart } from 'lucide-react';

interface Props {
  phase: Phase;
  title: string;
  description: string;
  children: React.ReactNode;
  tollgateContent: React.ReactNode;
}

const PhaseLayout: React.FC<Props> = ({ phase, title, description, children, tollgateContent }) => {
  const [activeTab, setActiveTab] = useState('Verktyg');

  const tabs = [
    { id: 'Anteckningar', label: 'Anteckningar', icon: FileText },
    { id: 'Tollgate', label: 'Tollgate', icon: CheckSquare },
    { id: 'Beräkningar', label: 'Beräkningar', icon: Calculator },
    { id: 'Verktyg', label: 'Verktyg', icon: Wrench },
    { id: 'RACI', label: 'RACI', icon: Users },
    { id: 'Sigma', label: 'Sigma', icon: BarChart },
  ];

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
            <Wrench className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{phase}: {title}</h2>
            <p className="text-slate-500 text-sm">{description}</p>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="bg-slate-200/50 p-1 rounded-2xl flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6 animate-fadeIn">
        {activeTab === 'Verktyg' && children}
        {activeTab === 'Tollgate' && tollgateContent}
        {activeTab === 'Anteckningar' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[400px]">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Projektanteckningar - {phase}</h3>
                <textarea 
                    className="w-full h-64 p-4 border border-slate-100 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 transition-all text-sm"
                    placeholder="Skriv ner dina tankar, observationer och anteckningar för denna fas..."
                ></textarea>
            </div>
        )}
        {activeTab === 'Beräkningar' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
                <Calculator className="w-12 h-12 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Beräkningar</h3>
                <p className="text-slate-500 text-sm max-w-md">Här kan du utföra fas-specifika beräkningar. Denna modul är under utveckling.</p>
            </div>
        )}
        {activeTab === 'RACI' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
                <Users className="w-12 h-12 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">RACI Matris</h3>
                <p className="text-slate-500 text-sm max-w-md">Definiera vem som är Responsible, Accountable, Consulted och Informed för aktiviteterna i {phase}.</p>
            </div>
        )}
        {activeTab === 'Sigma' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
                <BarChart className="w-12 h-12 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Sigma Nivå</h3>
                <p className="text-slate-500 text-sm max-w-md">Beräkna processens Sigma-nivå baserat på insamlade data.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default PhaseLayout;

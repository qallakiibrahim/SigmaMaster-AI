import React, { useState, useEffect } from 'react';
import { ProjectData } from '../types';
import { TOOLS_LIBRARY } from '../data/toolsData';
import { generateInsight } from '../services/geminiService';
import { 
  Wrench, Plus, Trash2, Save, Check, Calculator, AlertTriangle, 
  HelpCircle, CheckCircle, FileText, Sparkles, Sliders, ChevronRight,
  Shuffle, ArrowRight, Percent, ClipboardList, TrendingUp, Loader2
} from 'lucide-react';
import {
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter, Line, Legend
} from 'recharts';

interface Props {
  toolId: string;
  project: ProjectData;
  updateProject: (data: Partial<ProjectData>) => void;
  children?: React.ReactNode;
  className?: string;
}

// Exact rational approximation for Inverse Normal CDF (NormSinv) to compute real Sigma level
const normSinv = (p: number): number => {
  if (p <= 0 || p >= 1) return 0;
  // Rational approximation for inverse normal standard cumulative distribution
  const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;
  const val = t - ((c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
  return p < 0.5 ? -val : val;
};

export const ToolContainer: React.FC<Props> = ({ toolId, project, updateProject, children, className }) => {
  const isSelected = (project.selectedTools || []).includes(toolId);
  if (!isSelected) return null;

  const toolInfo = TOOLS_LIBRARY.find(t => t.id === toolId);
  const title = toolInfo ? toolInfo.name : toolId;
  const description = toolInfo ? toolInfo.description : '';

  // Local draft states loaded/synchronized when project.id or toolId changes
  const [items, setItems] = useState<any[]>([]);
  const [fields, setFields] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState<string>('');
  
  const [draftInputs, setDraftInputs] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  useEffect(() => {
    const savedData = project.toolData?.[toolId] || {};
    setItems(savedData.items || []);
    setFields(savedData.fields || {});
    setNotes(savedData.notes || savedData.content || '');
    setDraftInputs({});
  }, [project.id, toolId]);

  const handleSave = (customItems?: any[], customFields?: any, customNotes?: string) => {
    const finalItems = customItems !== undefined ? customItems : items;
    const finalFields = customFields !== undefined ? customFields : fields;
    const finalNotes = customNotes !== undefined ? customNotes : notes;

    // Generate a beautiful, readable report-safe string for backward-compatibility in pdf/A3 reports
    let reportString = finalNotes;
    
    if (finalItems && finalItems.length > 0) {
      reportString += '\n\n📋 Registrerade data:\n' + finalItems.map((item, idx) => {
        return `Rad ${idx + 1}:\n` + Object.entries(item)
          .map(([k, v]) => `  • ${k}: ${v}`)
          .join('\n');
      }).join('\n\n');
    } else if (finalFields && Object.keys(finalFields).length > 0) {
      reportString += '\n\n📋 Detaljerade parametrar:\n' + Object.entries(finalFields)
        .map(([k, v]) => `  • ${k}: ${v}`)
        .join('\n');
    }

    const updatedToolData = {
      ...project.toolData,
      [toolId]: {
        ...project.toolData?.[toolId],
        items: finalItems,
        fields: finalFields,
        notes: finalNotes,
        content: reportString.trim()
      }
    };
    
    updateProject({ toolData: updatedToolData });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // ----------------------------------------------------
  // UNIFIED TABULAR SCHEMAS Definition for rapid token-saving forms
  // ----------------------------------------------------
  interface FieldDefinition {
    id: string;
    label: string;
    placeholder: string;
    type: 'text' | 'select';
    options?: string[];
    width?: string;
  }

  interface TabularSchema {
    badge: string;
    fields: FieldDefinition[];
    useInstruct: string;
    exampleText: string;
    calcRow?: (row: Record<string, string>) => Record<string, string>;
  }

  const tabularSchemas: Record<string, TabularSchema> = {
    t_voc: {
      badge: 'Kundanalys',
      fields: [
        { id: 'källa', label: 'Källa', placeholder: 'T.ex. Intervju, enkät, klagomål...', type: 'text' },
        { id: 'kundbehov', label: 'Kundbehov', placeholder: 'Vad vill kunden?', type: 'text' },
        { id: 'krav', label: 'Mätbart krav', placeholder: 'T.ex. Leveranstid ≤ 2 dagar', type: 'text' },
        { id: 'prioritet', label: 'Prioritet', placeholder: 'Medel', type: 'select', options: ['Medel', 'Hög', 'Låg'] },
      ],
      useInstruct: 'Genomför intervjuer, enkäter eller fokusgrupper för att identifiera vad kunden verkligen värdesätter.',
      exampleText: 'Källa: Klagomål • Kundbehov: Snabb support • Mätbart krav: Svarstid ≤ 2 timmar • Prioritet: Hög',
    },
    t_ctq: {
      badge: 'Kravanalys',
      fields: [
        { id: 'kundbehov', label: 'Kundbehov', placeholder: 'T.ex. Snabb leverans', type: 'text' },
        { id: 'drivare', label: 'Drivare (Drivers)', placeholder: 'T.ex. Orderplock, transport', type: 'text' },
        { id: 'ctq', label: 'CTQ (Critical to Quality)', placeholder: 'T.ex. Leveranstid', type: 'text' },
        { id: 'specifikation', label: 'Specifikation', placeholder: 'T.ex. ≤ 2 arbetsdagar', type: 'text' },
      ],
      useInstruct: 'Bryt ner VOC till specifika, mätbara kvalitetskrav.',
      exampleText: 'Kundbehov: Snabb leverans → Drivare: Transport → CTQ: Leveranstid → Specifikation: ≤ 2 arbetsdagar',
    },
    t_stakeholder: {
      badge: 'Projektplanering',
      fields: [
        { id: 'namn', label: 'Namn / Roll', placeholder: 'T.ex. Produktionschef', type: 'text' },
        { id: 'inflytande', label: 'Inflytande (1-10)', placeholder: '5', type: 'select', options: ['1','2','3','4','5','6','7','8','9','10'] },
        { id: 'intresse', label: 'Intresse (1-10)', placeholder: '5', type: 'select', options: ['1','2','3','4','5','6','7','8','9','10'] },
      ],
      calcRow: (row) => {
        const inf = parseInt(row.inflytande || '5');
        const int = parseInt(row.intresse || '5');
        let strat = 'Övervaka';
        if (inf >= 7 && int >= 7) strat = 'Hantera nära';
        else if (inf >= 7) strat = 'Håll nöjda';
        else if (int >= 7) strat = 'Håll informerade';
        return { ...row, strategi: strat };
      },
      useInstruct: 'Kartlägg alla intressenter, bedöm deras inflytande & intresse och ta fram en hanteringsstrategi.',
      exampleText: 'Produktionschef • Inflytande: 9 • Intresse: 8 • Strategi: Hantera nära',
    },
    t_kano: {
      badge: 'Kundanalys',
      fields: [
        { id: 'funktion', label: 'Funktion / Egenskap', placeholder: 'T.ex. SMS-notis', type: 'text' },
        { id: 'funktionell', label: 'Om funktionen finns', placeholder: 'Neutral', type: 'select', options: ['Gillar', 'Förväntat', 'Neutral', 'Kan tolerera', 'Ogillar'] },
        { id: 'dysfunktionell', label: 'Om funktionen saknas', placeholder: 'Neutral', type: 'select', options: ['Gillar', 'Förväntat', 'Neutral', 'Kan tolerera', 'Ogillar'] },
      ],
      calcRow: (row) => {
        let classification = 'Likgiltig (Indifferent)';
        const f = row.funktionell;
        const d = row.dysfunktionell;
        if (f === 'Gillar' && d === 'Ogillar') classification = 'Dimensionell (Performance)';
        else if (f === 'Förväntat' && d === 'Ogillar') classification = 'Måste-krav (Basic)';
        else if (f === 'Gillar' && (d === 'Neutral' || d === 'Kan tolerera')) classification = 'Attraktiv (Delighter)';
        else if (f === 'Ogillar' && d === 'Gillar') classification = 'Omvänd (Reverse)';
        return { ...row, klassificering: classification };
      },
      useInstruct: 'Klassificera kundkrav för att prioritera funktioner som verkligen ökar kundnöjdheten.',
      exampleText: 'Egenskap: SMS-notis • Funktionell: Gillar • Dysfunktionell: Neutral • Klassificering: Attraktiv',
    },
    t_data_plan: {
      badge: 'Datainsamling',
      fields: [
        { id: 'vad', label: 'Vad mäts?', placeholder: 'T.ex. Cykeltid (sekunder)', type: 'text' },
        { id: 'typ', label: 'Datatyp', placeholder: 'Kontinuerlig', type: 'select', options: ['Kontinuerlig', 'Attribut'] },
        { id: 'definition', label: 'Definition / Hur', placeholder: 'T.ex. Tid från startknapp till utmatning', type: 'text' },
        { id: 'källa', label: 'Datakälla', placeholder: 'T.ex. Maskinlogg PLC', type: 'text' },
        { id: 'frekvens', label: 'Frekvens', placeholder: 'T.ex. Dagligen / En gång per skift', type: 'text' },
        { id: 'ansvarig', label: 'Ansvarig', placeholder: 'T.ex. Skiftledare', type: 'text' },
      ],
      useInstruct: 'Säkerställ en strukturerad plan för att mäta rätt saker på ett repeterbart sätt.',
      exampleText: 'Vad: Cykeltid • Datatyp: Kontinuerlig • Hur: Tid från PLC • Frekvens: 50 st/dag • Ansvarig: Skiftledare',
    },
    t_pokayoke: {
      badge: 'Lean',
      fields: [
        { id: 'feltyp', label: 'Potentiellt fel', placeholder: 'T.ex. Komponent monteras bakochniv', type: 'text' },
        { id: 'orsak', label: 'Orsak', placeholder: 'T.ex. Symmetrisk design', type: 'text' },
        { id: 'pokayoke', label: 'Poka-Yoke lösning', placeholder: 'T.ex. Asymmetrisk styrstift', type: 'text' },
        { id: 'nivå', label: 'Förebygga / Upptäcka', placeholder: 'Förebyggande', type: 'select', options: ['Förebyggande (best)', 'Upptäckande (good)'] },
      ],
      useInstruct: 'Skapa smarta felsäkringar för att göra det omöjligt eller extremt svårt att göra fel.',
      exampleText: 'Fel: Kabel sätts i fel kontakt • Orsak: Lika kontakter • Lösning: Unika färgkodade snabbkopplingar',
    },
    t_control_plan: {
      badge: 'Dokumentation',
      fields: [
        { id: 'steg', label: 'Processteg', placeholder: 'T.ex. Slutmontering', type: 'text' },
        { id: 'parameter', label: 'Parameter', placeholder: 'T.ex. Moment åtdragning', type: 'text' },
        { id: 'spec', label: 'Specifikation/Tolerans', placeholder: 'T.ex. 12 Nm ± 0.5', type: 'text' },
        { id: 'metod', label: 'Mätmetod', placeholder: 'T.ex. Kalibrerad momentdragare', type: 'text' },
        { id: 'frekvens', label: 'Frekvens / Stickprov', placeholder: 'T.ex. 5 st per batch', type: 'text' },
        { id: 'reaktion', label: 'Reaktionsplan', placeholder: 'T.ex. Stoppa maskin, larma skiftledare', type: 'text' },
      ],
      useInstruct: 'Det slutgiltiga dokumentet som ser till att processen stannar i ett kontrollerat läge.',
      exampleText: 'Steg: Slutmontering • Parameter: Moment • Spec: 12Nm • Metod: Dragare • Frekvens: 5/batch • Reaktion: Stoppa',
    },
    t_sop: {
      badge: 'Dokumentation',
      fields: [
        { id: 'aktivitet', label: 'Aktivitet / Steg', placeholder: 'T.ex. Starta upp maskinen', type: 'text' },
        { id: 'instruktion', label: 'Instruktion', placeholder: 'T.ex. Sätt huvudströmbrytaren på ON och kontrollera lufttryck', type: 'text' },
        { id: 'observandum', label: 'Varning / OBS', placeholder: 'T.ex. Lufttryck måste vara över 6.0 Bar', type: 'text' },
      ],
      useInstruct: 'Standardisera arbetet genom att dokumentera bästa kända arbetssätt som en Standard Operating Procedure.',
      exampleText: 'Steg 1: Starta maskin • Inst: Sätt brytare på ON • Varning: Kontrollera lufttryck ≥ 6 Bar',
    },
    t_training_plan: {
      badge: 'Implementering',
      fields: [
        { id: 'ämne', label: 'Utbildningsämne', placeholder: 'T.ex. Standard Operating Procedure (SOP)', type: 'text' },
        { id: 'målgrupp', label: 'Målgrupp', placeholder: 'T.ex. Operatörer skift A&B', type: 'text' },
        { id: 'metod', label: 'Metod', placeholder: 'T.ex. Praktisk genomgång vid maskin + sign', type: 'text' },
        { id: 'datum', label: 'Planerat datum', placeholder: 'åååå-mm-dd', type: 'text' },
        { id: 'status', label: 'Status', placeholder: 'Ej startad', type: 'select', options: ['Ej påbörjad', 'Pågår', 'Slutförd'] }
      ],
      useInstruct: 'Planera och spåra utbildningsinsatser för att säkerställa att alla berörda kan följa de nya SOP:erna.',
      exampleText: 'SOP Genomgång • Målgrupp: Operatörer • Metod: Genomgång vid linjen • Datum: 2026-06-15 • Status: Pågår',
    },
    t_reaction_plan: {
      badge: 'Dokumentation',
      fields: [
        { id: 'trigger', label: 'Trigger (När?)', placeholder: 'T.ex. Styrdiagram visar punkt utanför UCL', type: 'text' },
        { id: 'åtgärd', label: 'Åtgärd (Vad görs?)', placeholder: 'T.ex. Stoppa produktion, kör kalibreringstest', type: 'text' },
        { id: 'ansvarig', label: 'Ansvarig', placeholder: 'T.ex. Maskinoperatör', type: 'text' },
        { id: 'eskalering', label: 'Eskalering (Om det ej löser sig)', placeholder: 'T.ex. Kontakta produktionschef', type: 'text' }
      ],
      useInstruct: 'Definiera exakt vem som gör vad när en processavvikelse inträffar för att förhindra kassation.',
      exampleText: 'Trigger: Punkt utanför gräns • Åtgärd: Stoppa & kalibrera • Ansvar: Operatör • Eskalering: Produktionschef',
    },
    t_implementation_plan: {
      badge: 'Implementering',
      fields: [
        { id: 'aktivitet', label: 'Aktivitet / Åtgärd', placeholder: 'T.ex. Installera vibrationsdämpande fötter på linje 3...', type: 'text' },
        { id: 'ansvarig', label: 'Ansvarig person', placeholder: 'T.ex. Underhållstekniker Erik', type: 'text' },
        { id: 'slutdatum', label: 'Måldatum (Deadline)', placeholder: 'T.ex. 2026-06-30', type: 'text' },
        { id: 'status', label: 'Status', placeholder: 'Ej startad', type: 'select', options: ['Ej påbörjad', 'Pågår', 'Slutförd'] }
      ],
      useInstruct: 'Skapa och följ upp en detaljerad plan för att genomföra förbättringarna i stor skala efter lyckad pilot.',
      exampleText: 'Åtgärd: Montera ny givare • Ansvar: Erik • Måldatum: 2026-06-30 • Status: Pågår',
    }
  };

  // ----------------------------------------------------
  // RENDER DYNAMIC LIST ENGINE IF MATCHED
  // ----------------------------------------------------
  const matchedSchema = tabularSchemas[toolId];
  if (matchedSchema && !children) {
    const handleAddRow = () => {
      // Create new row with defaults or calculated cells
      let newRow = { ...draftInputs };
      
      // Default unset selects to first option
      matchedSchema.fields.forEach(f => {
        if (f.type === 'select' && !newRow[f.id]) {
          newRow[f.id] = f.options ? f.options[0] : '';
        }
      });

      if (matchedSchema.calcRow) {
        newRow = matchedSchema.calcRow(newRow);
      }

      const updatedItems = [...items, newRow];
      setItems(updatedItems);
      setDraftInputs({});
      // Immediate save friendly state
      handleSave(updatedItems, fields, notes);
    };

    const handleRemoveRow = (idx: number) => {
      const updatedItems = [...items];
      updatedItems.splice(idx, 1);
      setItems(updatedItems);
      handleSave(updatedItems, fields, notes);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-500" /> {title}
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                {matchedSchema.badge}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>

        {/* Form Container to Add Rows */}
        <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100/60 mb-6">
          <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-4">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px]">📁</span>
            Interaktivt Verktyg
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedSchema.fields.map((f) => (
              <div key={f.id} className="space-y-1.5Fixed overflow-hidden">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={draftInputs[f.id] || (f.options ? f.options[0] : '')}
                    onChange={(e) => setDraftInputs(prev => ({ ...prev, [f.id]: e.target.value }))}
                  >
                    {f.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={f.placeholder}
                    value={draftInputs[f.id] || ''}
                    onChange={(e) => setDraftInputs(prev => ({ ...prev, [f.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAddRow}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Lägg till
            </button>
          </div>
        </div>

        {/* Table of active items */}
        {items.length > 0 ? (
          <div className="mb-6 overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">#</th>
                  {matchedSchema.fields.map(f => (
                    <th key={f.id} className="p-3">{f.label}</th>
                  ))}
                  {matchedSchema.calcRow && (
                    <th className="p-3 text-blue-600">Beräknad kolumn</th>
                  )}
                  <th className="p-3 text-center">Ta bort</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-slate-400 font-medium">{idx + 1}</td>
                    {matchedSchema.fields.map(f => (
                      <td key={f.id} className="p-3 text-slate-800 break-words max-w-[200px]">{row[f.id] || '-'}</td>
                    ))}
                    {matchedSchema.calcRow && (
                      <td className="p-3 text-blue-700 font-semibold bg-blue-50/20">
                        {row.strategi || row.klassificering || '-'}
                      </td>
                    )}
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleRemoveRow(idx)}
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors inline-block"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 mb-6 text-sm text-slate-500">
            Inga rader sparade. Fyll i fälten ovan och tryck på "Lägg till".
          </div>
        )}

        {/* Optional notes textarea */}
        <div className="mb-6 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 uppercase">Ytterligare anteckningar (valfritt)</label>
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
            placeholder="Skriv eventuella slutsatser eller noteringar för detta verktyg..."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              // Dynamic auto save
            }}
          />
        </div>

        {/* Save button and alerts */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-1.5">
            {saveSuccess ? (
              <span className="text-xs text-green-600 flex items-center gap-1 font-semibold animate-pulse">
                <CheckCircle className="w-4 h-4" /> Spara framgångsrik!
              </span>
            ) : (
              <span className="text-xs text-slate-400">Arbete sparas automatiskt i listan</span>
            )}
          </div>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>

        {/* Tool instructional footer */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-[12px] text-slate-500 space-y-2">
          <div>
            <span className="font-bold text-slate-700 block mb-0.5">💡 Användning</span>
            {matchedSchema.useInstruct}
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-100 italic">
            <span className="font-bold text-slate-600 non-italic block not-italic">Exempel:</span>
            {matchedSchema.exampleText}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE CALCULATOR: 5W2H & Is / Is Not Problem & Scope Generator (t_problem)
  // ----------------------------------------------------
  if (toolId === 't_problem' && !children) {
    const whatIs = fields.whatIs || '';
    const whatIsNot = fields.whatIsNot || '';
    const whereIs = fields.whereIs || '';
    const whereIsNot = fields.whereIsNot || '';
    const whenIs = fields.whenIs || '';
    const whenIsNot = fields.whenIsNot || '';
    const whoIs = fields.whoIs || '';
    const whoIsNot = fields.whoIsNot || '';
    const whyIs = fields.whyIs || '';
    const whyIsNot = fields.whyIsNot || '';
    const howIs = fields.howIs || '';
    const howIsNot = fields.howIsNot || '';
    const howMuchIs = fields.howMuchIs || '';
    const howMuchIsNot = fields.howMuchIsNot || '';

    const compileProblem = (f: Record<string, string>) => {
      const parts = [];
      if (f.whatIs) parts.push(`VAD ÄR PROBLEMET: ${f.whatIs}`);
      if (f.whereIs) parts.push(`VAR UPPSTÅR DET: ${f.whereIs}`);
      if (f.whenIs) parts.push(`NÄR UPPSTÅR DET: ${f.whenIs}`);
      if (f.whoIs) parts.push(`VEM OBSERVERAR/BERÖRS: ${f.whoIs}`);
      if (f.whyIs) parts.push(`VARFÖR ÄR DET ETT PROBLEM: ${f.whyIs}`);
      if (f.howIs) parts.push(`HUR UPPTÄCKTS DET: ${f.howIs}`);
      if (f.howMuchIs) parts.push(`OMFATTNING (HUR MYCKET): ${f.howMuchIs}`);
      
      return parts.length > 0 
        ? parts.join('\n') 
        : 'Fyll i fälten ovan för att generera en problembeskrivning.';
    };

    const compileScope = (f: Record<string, string>) => {
      const ins = [];
      if (f.whatIs) ins.push(`Produkt/Process: ${f.whatIs}`);
      if (f.whereIs) ins.push(`Område/Linjer: ${f.whereIs}`);
      if (f.whenIs) ins.push(`Tid/Skift: Sker under ${f.whenIs}`);
      if (f.whoIs) ins.push(`Målgrupp/Deltagare: ${f.whoIs}`);
      if (f.howIs) ins.push(`Felsymptom: ${f.howIs}`);
      if (f.howMuchIs) ins.push(`Volym/Kostnad: Upp till ${f.howMuchIs}`);

      const outs = [];
      if (f.whatIsNot) outs.push(`Uteslutet process/produkt: ${f.whatIsNot}`);
      if (f.whereIsNot) outs.push(`Uteslutna platser/linjer: ${f.whereIsNot}`);
      if (f.whenIsNot) outs.push(`Uteslutna tider/skift: Sker INTE ${f.whenIsNot}`);
      if (f.whoIsNot) outs.push(`Uteslutna personer/kunder: ${f.whoIsNot}`);
      if (f.howIsNot) outs.push(`Uteslutna symptom/orsaker: Sker INTE genom ${f.howIsNot}`);
      if (f.howMuchIsNot) outs.push(`Utesluten ekonomisk/volympåverkan: ${f.howMuchIsNot}`);

      let scopeStr = '';
      if (ins.length > 0) {
        scopeStr += '✔️ INGÅR I PROJEKTET (IN SCOPE):\n' + ins.map(i => `• ${i}`).join('\n');
      }
      if (outs.length > 0) {
        if (scopeStr) scopeStr += '\n\n';
        scopeStr += '❌ INGÅR INTE I PROJEKTET (OUT OF SCOPE):\n' + outs.map(o => `• ${o}`).join('\n');
      }
      return scopeStr || 'Fyll i fälten ovan för att generera projektets omfattning.';
    };

    const loadPepsiExample = () => {
      const pepsiFields = {
        whatIs: 'Packmaskin har 6,25% stillestånd på Pepsi-produkten (flaskor blockeras vid utmatning)',
        whatIsNot: 'Fyllningsmaskinen eller glasflasklinjen har inga onormala stopp',
        whereIs: 'Packningslinje 3, slutet av fabriken',
        whereIsNot: 'Packningslinje 1 och linje 2 fungerar helt felfritt',
        whenIs: 'Sedan januari 2026, främst under nattskiftet vid hög hastighet',
        whenIsNot: 'Före januari 2026, samt vid dagskiftets normala tempo',
        whoIs: 'Operatörer på nattskiftet och underhållstekniker på plats',
        whoIsNot: 'Dagskiftets operatörer, kundleverantörer eller externa montörer',
        whyIs: 'Stilleståndet orsakar förlorad produktion, missade leveransmål och dyra övertidstimmar',
        whyIsNot: 'Inga säkerhetsrisker eller felleveranser ut till butik',
        howIs: 'Skakningar och slitage i utmatningsbandet gör rörelsen ojämn',
        howIsNot: 'Inte elektriska fel eller buggar i styrsystemet (PLC)',
        howMuchIs: '150 förlorade produktionstimmar, motsvarande förlust på ca 450 000 kr',
        howMuchIsNot: 'Ingen påverkan på burklinjen eller budget för förebyggande underhåll'
      };

      const pbText = compileProblem(pepsiFields);
      const scText = compileScope(pepsiFields);

      const completeFields = {
        ...pepsiFields,
        generatedProblem: pbText,
        generatedScope: scText
      };

      setFields(completeFields);
      handleSave(items, completeFields, notes);
    };

    const updateField = (key: string, val: string) => {
      const updatedFields = { ...fields, [key]: val };
      
      // Auto-compile preview dynamically if the user is typing fields and hasn't manually overridden final boxes
      if (!fields.generatedProblemManuallyEdited) {
        updatedFields.generatedProblem = compileProblem(updatedFields);
      }
      if (!fields.generatedScopeManuallyEdited) {
        updatedFields.generatedScope = compileScope(updatedFields);
      }

      setFields(updatedFields);
    };

    const handleAIEngine = async () => {
      setAiLoading(true);
      const prompt = `
        Du är en erfaren sex sigma Black Belt expert. Skriv en professionell, mätbar och koncis problemformulering (Problem Statement) samt en tydlig projektomfattning (Scope) baserat på följande 5W2H med ÄR och INTE ÄR listor:

        VAD (What):
        - Det är (Is / In-Scope): ${fields.whatIs || '(ej ifyllt)'}
        - Det är INTE (IsNot / Out-of-Scope): ${fields.whatIsNot || '(ej ifyllt)'}

        VAR (Where):
        - Det är (Is / In-Scope): ${fields.whereIs || '(ej ifyllt)'}
        - Det är INTE (IsNot / Out-of-Scope): ${fields.whereIsNot || '(ej ifyllt)'}

        NÄR (When):
        - Det är (Is / In-Scope): ${fields.whenIs || '(ej ifyllt)'}
        - Det är INTE (IsNot / Out-of-Scope): ${fields.whenIsNot || '(ej ifyllt)'}

        VEM (Who):
        - Det är (Is / In-Scope): ${fields.whoIs || '(ej ifyllt)'}
        - Det är INTE (IsNot / Out-of-Scope): ${fields.whoIsNot || '(ej ifyllt)'}

        VARFÖR (Why):
        - Det är (Is / In-Scope): ${fields.whyIs || '(ej ifyllt)'}
        - Det är INTE (IsNot / Out-of-Scope): ${fields.whyIsNot || '(ej ifyllt)'}

        HUR (How):
        - Det är (Is / In-Scope): ${fields.howIs || '(ej ifyllt)'}
        - Det är INTE (IsNot / Out-of-Scope): ${fields.howIsNot || '(ej ifyllt)'}

        HUR MYCKET (How Much):
        - Det är (Is / In-Scope): ${fields.howMuchIs || '(ej ifyllt)'}
        - Det är INTE (IsNot / Out-of-Scope): ${fields.howMuchIsNot || '(ej ifyllt)'}

        Generera svaret på svenska. Skriv mycket strukturerat, affärsmässigt och exakt.
        Returnera texten uppdelad i exakt de här två rubrikerna:
        === PROBLEMBESKRIVNING ===
        *(här skriver du en professionell, sammanhållen problemformulering i löpande text baserad på ÄR-kolumnen)*

        === SCOPE / OMFATTNING ===
        *(här skapar du två rubriker: 'INGÅR I PROJEKTET (IN-SCOPE)' samt 'INGÅR INTE (OUT-OF-SCOPE)' fyllda med tydliga punktlistor baserade på skillnaderna i ÄR och INTE ÄR)*
      `;

      try {
        const resultText = await generateInsight(prompt, `Projektnamn: ${project.name}`);
        
        let pb = '';
        let sc = '';
        if (resultText.includes('=== PROBLEMBESKRIVNING ===') && resultText.includes('=== SCOPE / OMFATTNING ===')) {
          const parts = resultText.split('=== SCOPE / OMFATTNING ===');
          pb = parts[0].replace('=== PROBLEMBESKRIVNING ===', '').trim();
          sc = parts[1].trim();
        } else {
          // Fallback parsing
          const lines = resultText.split('\n');
          const pbIndex = lines.findIndex(l => l.toUpperCase().includes('PROBLEMBESKRIVNING'));
          const scIndex = lines.findIndex(l => l.toUpperCase().includes('SCOPE') || l.toUpperCase().includes('OMFATTNING'));
          if (pbIndex !== -1 && scIndex !== -1) {
            pb = lines.slice(pbIndex + 1, scIndex).join('\n').trim();
            sc = lines.slice(scIndex + 1).join('\n').trim();
          } else {
            pb = resultText;
            sc = compileScope(fields);
          }
        }

        const updatedFields = {
          ...fields,
          generatedProblem: pb,
          generatedScope: sc,
          generatedProblemManuallyEdited: true,
          generatedScopeManuallyEdited: true
        };
        setFields(updatedFields);
        handleSave(items, updatedFields, notes);
      } catch (err) {
        console.error('Gemini error:', err);
      } finally {
        setAiLoading(false);
      }
    };

    const handleApplyToCharter = () => {
      const pText = fields.generatedProblem || compileProblem(fields);
      const sText = fields.generatedScope || compileScope(fields);
      
      updateProject({
        problemStatement: pText,
        scope: sText
      });

      // Show beautiful success alert
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    };

    const handleResetToAuto = () => {
      const updatedFields = {
        ...fields,
        generatedProblem: compileProblem(fields),
        generatedScope: compileScope(fields),
        generatedProblemManuallyEdited: false,
        generatedScopeManuallyEdited: false
      };
      setFields(updatedFields);
      handleSave(items, updatedFields, notes);
    };

    const generatedProblem = fields.generatedProblem !== undefined ? fields.generatedProblem : compileProblem(fields);
    const generatedScope = fields.generatedScope !== undefined ? fields.generatedScope : compileScope(fields);

    const questions = [
      { id: 'what', label: '1. VAD (What)', isField: 'whatIs', isNotField: 'whatIsNot', placeholderIs: 'T.ex. Maskinstillestånd i packlinje...', placeholderIsNot: 'T.ex. Inga problem i andra maskiner...' },
      { id: 'where', label: '2. VAR (Where)', isField: 'whereIs', isNotField: 'whereIsNot', placeholderIs: 'T.ex. Linje 3, slutet av transportbandet...', placeholderIsNot: 'T.ex. Linje 1 och 2 fungerar normalt...' },
      { id: 'when', label: '3. NÄR (When)', isField: 'whenIs', isNotField: 'whenIsNot', placeholderIs: 'T.ex. Sedan januari, under nattskiftet...', placeholderIsNot: 'T.ex. Aldrig under dags- eller kvällsskift...' },
      { id: 'who', label: '4. VEM (Who)', isField: 'whoIs', isNotField: 'whoIsNot', placeholderIs: 'T.ex. Nattskiftets operatörer...', placeholderIsNot: 'T.ex. Underhållspersonalen under dagen...', },
      { id: 'why', label: '5. VARFÖR (Why)', isField: 'whyIs', isNotField: 'whyIsNot', placeholderIs: 'T.ex. Flaskorna blockerar och stoppar flödet...', placeholderIsNot: 'T.ex. Orsakar inte skador på operatörer...' },
      { id: 'how', label: '6. HUR (How)', isField: 'howIs', isNotField: 'howIsNot', placeholderIs: 'T.ex. Bandet hackar, flaskor faller över sand...', placeholderIsNot: 'T.ex. Inget fel med el eller signaler...' },
      { id: 'howMuch', label: '7. HUR MYCKET (How Much)', isField: 'howMuchIs', isNotField: 'howMuchIsNot', placeholderIs: 'T.ex. 6,25% stillestånd, förlust 450kkr...', placeholderIsNot: 'T.ex. Inga biverkningar på burklinjen...' },
    ];

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-purple-600" /> 5W2H & Is / Is Not Generator
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-wider mt-1 inline-block">
              Problem- & Omfattningstolkare (Scope Builder)
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          <button
            onClick={loadPepsiExample}
            className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all flex items-center gap-1.5 shadow-sm self-start"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ladda Pepsi-exempel (5W2H)
          </button>
        </div>

        {/* Matrix grid headers */}
        <div className="grid grid-cols-12 gap-4 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1 hidden md:grid">
          <div className="col-span-4">Fråga (5W2H)</div>
          <div className="col-span-4 text-teal-600 bg-teal-50 px-2 py-1 rounded">Is (ÄR / In-Scope)</div>
          <div className="col-span-4 text-red-600 bg-red-50 px-2 py-1 rounded">Is Not (INTE ÄR / Out-of-Scope)</div>
        </div>

        {/* Row matrix */}
        <div className="space-y-4 mb-6">
          {questions.map((q) => (
            <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 shadow-sm space-y-3 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-center">
              {/* Question label */}
              <div className="col-span-4">
                <span className="text-sm font-bold text-slate-800 block">{q.label}</span>
                <span className="text-xs text-slate-400">Skapa tydlighet runt gränserna</span>
              </div>

              {/* IS Input */}
              <div className="col-span-4 space-y-1">
                <span className="text-[10px] font-bold text-teal-650 tracking-wider block md:hidden uppercase text-teal-600">✔️ Vad problemet ÄR (Is):</span>
                <input
                  type="text"
                  className="w-full p-2.5 bg-white border border-teal-200 focus:ring-2 focus:ring-teal-500 rounded-lg text-xs font-medium outline-none transition-all"
                  placeholder={q.placeholderIs}
                  value={fields[q.isField] || ''}
                  onChange={(e) => updateField(q.isField, e.target.value)}
                />
              </div>

              {/* IS NOT Input */}
              <div className="col-span-4 space-y-1">
                <span className="text-[10px] font-bold text-red-650 tracking-wider block md:hidden uppercase text-red-650">❌ Vad det INTE är (Is Not):</span>
                <input
                  type="text"
                  className="w-full p-2.5 bg-white border border-red-200 focus:ring-2 focus:ring-red-500 rounded-lg text-xs font-medium outline-none transition-all"
                  placeholder={q.placeholderIsNot}
                  value={fields[q.isNotField] || ''}
                  onChange={(e) => updateField(q.isNotField, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Compiling result sections & editors */}
        <div className="mt-4 border-t border-slate-200 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h4 className="text-md font-bold text-slate-800">Genererad Sammanställning & Omfattning</h4>
              <p className="text-xs text-slate-500">De här formuleringarna är redo att appliceras på ditt Project Charter i realtid.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleResetToAuto}
                className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-300 transition-all shadow-sm"
              >
                Återställ till automatisk
              </button>
              <button
                onClick={handleAIEngine}
                disabled={aiLoading}
                className="text-xs font-bold px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-purple-200"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="animate-spin w-3.5 h-3.5" /> Genererar med AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> AI-Optimera med Gemini
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PROBLEM STATEMENT BOX */}
            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200 shadow-inner flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-orange-700 flex items-center gap-1">
                  📝 Problemformulering (Problem Statement)
                </span>
                <span className="text-[10px] text-orange-600/70 font-bold">Är-baserad syntes</span>
              </div>
              <textarea
                rows={7}
                className="w-full p-3 bg-white border border-orange-200 rounded-lg text-xs font-serif leading-relaxed text-slate-800 focus:ring-2 focus:ring-orange-500 outline-none resize-y"
                value={generatedProblem}
                onChange={(e) => {
                  const updated = {
                    ...fields,
                    generatedProblem: e.target.value,
                    generatedProblemManuallyEdited: true
                  };
                  setFields(updated);
                  handleSave(items, updated, notes);
                }}
              />
            </div>

            {/* SCOPE BOX */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-250 border-emerald-200 shadow-inner flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-800 flex items-center gap-1">
                  🎯 Projekt omfattning (In/Out-Scope)
                </span>
                <span className="text-[10px] text-emerald-700/70 font-bold">Är/Inte Är-gränser</span>
              </div>
              <textarea
                rows={7}
                className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-serif leading-relaxed text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                value={generatedScope}
                onChange={(e) => {
                  const updated = {
                    ...fields,
                    generatedScope: e.target.value,
                    generatedScopeManuallyEdited: true
                  };
                  setFields(updated);
                  handleSave(items, updated, notes);
                }}
              />
            </div>
          </div>

          {/* Sync Button */}
          <div className="mt-5 flex justify-end">
            <button
              onClick={handleApplyToCharter}
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4" /> Spara & Applicera direkt till Project Charter 🚀
            </button>
          </div>
        </div>

        {/* Optional commentary notes */}
        <div className="mt-6 space-y-1.5 border-t border-slate-100 pt-6">
          <label className="block text-xs font-bold text-slate-600 uppercase">Ytterligare kommentarer/anteckningar</label>
          <textarea
            className="w-full min-h-[85px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-slate-50"
            placeholder="Skriv dina kommentarer här..."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              // Save notes
              handleSave(items, fields, e.target.value);
            }}
          />
        </div>

        {/* Footer info box */}
        <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <CheckCircle className="w-4 h-4" /> Sparat och synkroniserat till Project Charter!
              </span>
            ) : (
              'Kom ihåg att spara dina ändringar'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm shadow-slate-200 transition-all"
          >
            <Save className="w-4 h-4" /> Spara framsteg offline
          </button>
        </div>

        {/* Manual guidelines block */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-[12px] text-slate-500 space-y-2">
          <div>
            <span className="font-bold text-slate-700 block mb-1">💡 Varför använda 5W2H med Is / Is Not?</span>
            Genom att ställa frågorna Vad, Var, När, Vem, Varför, Hur och Hur mycket får du en heltäckande förståelse av problemet. Att systematiskt ange vad som <b>ÄR</b> respektive <b>INTE ÄR</b> det drabbade objektet skyddar projektet från "scope creep" och sätter skivskarpa gränser från dag ett.
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Gage R&R / Measurement System Analysis (t_msa)
  // ----------------------------------------------------
  if (toolId === 't_msa' && !children) {
    const a1_1 = parseFloat(fields.a1_1 !== undefined ? fields.a1_1 : '10.1');
    const a1_2 = parseFloat(fields.a1_2 !== undefined ? fields.a1_2 : '10.2');
    const a2_1 = parseFloat(fields.a2_1 !== undefined ? fields.a2_1 : '12.4');
    const a2_2 = parseFloat(fields.a2_2 !== undefined ? fields.a2_2 : '12.3');
    const a3_1 = parseFloat(fields.a3_1 !== undefined ? fields.a3_1 : '15.0');
    const a3_2 = parseFloat(fields.a3_2 !== undefined ? fields.a3_2 : '15.1');

    const b1_1 = parseFloat(fields.b1_1 !== undefined ? fields.b1_1 : '10.3');
    const b1_2 = parseFloat(fields.b1_2 !== undefined ? fields.b1_2 : '10.2');
    const b2_1 = parseFloat(fields.b2_1 !== undefined ? fields.b2_1 : '12.5');
    const b2_2 = parseFloat(fields.b2_2 !== undefined ? fields.b2_2 : '12.6');
    const b3_1 = parseFloat(fields.b3_1 !== undefined ? fields.b3_1 : '14.8');
    const b3_2 = parseFloat(fields.b3_2 !== undefined ? fields.b3_2 : '15.0');

    // Operator and Part calculation averages
    const meanA1 = (a1_1 + a1_2) / 2;
    const meanA2 = (a2_1 + a2_2) / 2;
    const meanA3 = (a3_1 + a3_2) / 2;

    const meanB1 = (b1_1 + b1_2) / 2;
    const meanB2 = (b2_1 + b2_2) / 2;
    const meanB3 = (b3_1 + b3_2) / 2;

    const rA1 = Math.abs(a1_1 - a1_2);
    const rA2 = Math.abs(a2_1 - a2_2);
    const rA3 = Math.abs(a3_1 - a3_2);

    const rB1 = Math.abs(b1_1 - b1_2);
    const rB2 = Math.abs(b2_1 - b2_2);
    const rB3 = Math.abs(b3_1 - b3_2);

    const meanRangeA = (rA1 + rA2 + rA3) / 3;
    const meanRangeB = (rB1 + rB2 + rB3) / 3;
    const grandRange = (meanRangeA + meanRangeB) / 2;

    // EV Repeatability (Equipment standard constant multiplier K1)
    const ev = grandRange * 3.05;

    // Appraiser reproduction difference (AV)
    const grandMeanA = (meanA1 + meanA2 + meanA3) / 3;
    const grandMeanB = (meanB1 + meanB2 + meanB3) / 3;
    const xDiff = Math.abs(grandMeanA - grandMeanB);

    // K2 standard constant for 2 operators is 3.65
    const avVal = Math.pow(xDiff * 3.65, 2) - Math.pow(ev, 2) / 6;
    const av = avVal > 0 ? Math.sqrt(avVal) : 0;

    // Total Gage R&R standard deviation
    const grr = Math.sqrt(ev * ev + av * av);

    // Calc base parts performance
    const meanP1 = (meanA1 + meanB1) / 2;
    const meanP2 = (meanA2 + meanB2) / 2;
    const meanP3 = (meanA3 + meanB3) / 2;
    const partMean = (meanP1 + meanP2 + meanP3) / 3;

    // Part sample variance
    const partVar = (Math.pow(meanP1 - partMean, 2) + Math.pow(meanP2 - partMean, 2) + Math.pow(meanP3 - partMean, 2)) / 2;
    const partSD = Math.sqrt(partVar > 0 ? partVar : 0.001);
    const pv = partSD * 6.0; // Part-to-part total spread range

    // Process total variation
    const tv = Math.sqrt(grr * grr + pv * pv);
    const pctGRR = tv > 0 ? (grr / tv) * 100 : 0;

    const updateGageField = (key: string, val: string) => {
      const parsedVal = val === '' ? '0' : val;
      const updatedFields = { ...fields, [key]: parsedVal };
      setFields(updatedFields);
      handleSave(items, updatedFields, notes);
    };

    const loadPepsiGageExample = () => {
      const pepsiData = {
        a1_1: '10.05',
        a1_2: '10.10',
        a2_1: '12.00',
        a2_2: '11.95',
        a3_1: '14.95',
        a3_2: '15.00',
        b1_1: '10.10',
        b1_2: '10.05',
        b2_1: '11.95',
        b2_2: '12.00',
        b3_1: '14.90',
        b3_2: '14.95'
      };
      setFields(pepsiData);
      handleSave(items, pepsiData, notes);
    };

    // Verdict helper
    let verdictBg = 'bg-green-50 text-green-800 border-green-250 border-green-200';
    let verdictTitle = 'Mätsystemet är slående ACCEPTABELT! 🟢';
    let verdictDesc = `Gage R&R är ${pctGRR.toFixed(1)}% (under 10%). Det går utmärkt att lita på dessa mätningar för processtyrning och duglighetsanalyser.`;
    
    if (pctGRR >= 10 && pctGRR <= 30) {
      verdictBg = 'bg-amber-50 text-amber-805 border-amber-250 border-amber-200';
      verdictTitle = 'Mätsystemet har MARGINELL status! ⚠️';
      verdictDesc = `Gage R&R är ${pctGRR.toFixed(1)}% (mellan 10% och 30%). Kan godtas beroende på mätningens kritiska natur och tillhörande kostnad för förbättringar.`;
    } else if (pctGRR > 30) {
      verdictBg = 'bg-red-50 text-red-800 border-red-250 border-red-200';
      verdictTitle = 'Mätsystemet är INTE ACCEPTABELT! ❌';
      verdictDesc = `Gage R&R är ${pctGRR.toFixed(1)}% (överstiger 30%). Mätvariationen är helt dominant! Det är kritiskt att utreda felkällor (instruktioner, kalibrering eller mätnoggrannhet) innan vidare analys.`;
    }

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-sky-600" /> MSA Gage R&R-kalkylator
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-600 border border-sky-100 uppercase tracking-wider mt-1 inline-block">
              Mätsystemanalys (Repeterbarhet & Reproducerbarhet)
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          <button
            onClick={loadPepsiGageExample}
            className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all flex items-center gap-1.5 shadow-sm self-start"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ladda Pepsi-mätdata
          </button>
        </div>

        {/* Info text box */}
        <p className="text-xs text-slate-500 mb-4">
          Fyll i mätningar gjorda av 2 oberoende operatörer, där båda mäter 3 olika komponenter slumpmässigt i 2 turer vardera (Trial 1 & 2). Verktyget beräknar utrustningens repeterbarhet (EV) samt operatörernas reproducerbarhet (AV).
        </p>

        {/* Matrix inputs table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase transition-all">
                <th className="p-3">Operatör & Komponent</th>
                <th className="p-3 text-center">Komponent 1</th>
                <th className="p-3 text-center">Komponent 2</th>
                <th className="p-3 text-center">Komponent 3</th>
                <th className="p-3 bg-slate-100/60 text-center">Medel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 divide-slate-100">
              {/* Operator A row 1 */}
              <tr>
                <td className="p-3 font-semibold text-slate-700">Operatör A - Tur 1</td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.a1_1 !== undefined ? fields.a1_1 : '10.1'}
                    onChange={(e) => updateGageField('a1_1', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.a2_1 !== undefined ? fields.a2_1 : '12.4'}
                    onChange={(e) => updateGageField('a2_1', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.a3_1 !== undefined ? fields.a3_1 : '15.0'}
                    onChange={(e) => updateGageField('a3_1', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center bg-slate-50/50 font-mono text-slate-500 font-semibold" rowSpan={2}>
                  {grandMeanA.toFixed(3)}
                </td>
              </tr>
              {/* Operator A row 2 */}
              <tr>
                <td className="p-3 font-semibold text-slate-700">Operatör A - Tur 2</td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.a1_2 !== undefined ? fields.a1_2 : '10.2'}
                    onChange={(e) => updateGageField('a1_2', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.a2_2 !== undefined ? fields.a2_2 : '12.3'}
                    onChange={(e) => updateGageField('a2_2', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.a3_2 !== undefined ? fields.a3_2 : '15.1'}
                    onChange={(e) => updateGageField('a3_2', e.target.value)}
                  />
                </td>
              </tr>

              {/* Operator B row 1 */}
              <tr className="border-t-2 border-slate-200">
                <td className="p-3 font-semibold text-slate-700">Operatör B - Tur 1</td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.b1_1 !== undefined ? fields.b1_1 : '10.3'}
                    onChange={(e) => updateGageField('b1_1', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.b2_1 !== undefined ? fields.b2_1 : '12.5'}
                    onChange={(e) => updateGageField('b2_1', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.b3_1 !== undefined ? fields.b3_1 : '14.8'}
                    onChange={(e) => updateGageField('b3_1', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center bg-slate-50/50 font-mono text-slate-500 font-semibold" rowSpan={2}>
                  {grandMeanB.toFixed(3)}
                </td>
              </tr>
              {/* Operator B row 2 */}
              <tr>
                <td className="p-3 font-semibold text-slate-700">Operatör B - Tur 2</td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.b1_2 !== undefined ? fields.b1_2 : '10.2'}
                    onChange={(e) => updateGageField('b1_2', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.b2_2 !== undefined ? fields.b2_2 : '12.6'}
                    onChange={(e) => updateGageField('b2_2', e.target.value)}
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.01" className="w-24 p-1.5 border border-slate-200 rounded text-center font-semibold bg-white"
                    value={fields.b3_2 !== undefined ? fields.b3_2 : '15.0'}
                    onChange={(e) => updateGageField('b3_2', e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Verdict Box Banner */}
        <div className={`p-4 rounded-xl border mb-6 ${verdictBg}`}>
          <h4 className="font-bold text-sm mb-1">{verdictTitle}</h4>
          <p className="text-xs leading-relaxed">{verdictDesc}</p>
        </div>

        {/* Mathematical summary breakdown metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Repeatability (EV)</span>
            <span className="text-lg font-bold text-slate-800 font-mono block mt-0.5">{ev.toFixed(4)}</span>
            <span className="text-[10px] text-slate-400">Maskin/Utrustningens fel</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Reproducibility (AV)</span>
            <span className="text-lg font-bold text-slate-800 font-mono block mt-0.5">{av.toFixed(4)}</span>
            <span className="text-[10px] text-slate-400">Operatörens mätfel</span>
          </div>

          <div className="bg-slate-55 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Gage R&R (GRR)</span>
            <span className="text-lg font-bold text-slate-800 font-mono block mt-0.5">{grr.toFixed(4)}</span>
            <span className="text-[10px] text-slate-400">Kombinerat mätsystemfel</span>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-blue-600 block">% Gage R&R</span>
            <span className="text-lg font-bold text-blue-700 font-mono block mt-0.5">{pctGRR.toFixed(1)}%</span>
            <span className="text-[10px] text-blue-500">Andel av processvariation</span>
          </div>
        </div>

        {/* Optional notes */}
        <div className="mb-4 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 uppercase">Analyskommentarer / Slutsatser</label>
          <textarea
            className="w-full min-h-[75px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm bg-slate-50"
            placeholder="Skriv dina kommentarer om mätvariationen..."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              handleSave(items, fields, e.target.value);
            }}
          />
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-150 pt-4 mt-2">
          <span className="text-xs text-slate-450 text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <CheckCircle className="w-4 h-4" /> Sparat till mätdatabasen!
              </span>
            ) : (
              'Kalkylatorn sparar automatiskt ifyllda siffror'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara mätning
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Design of Experiments / Doe 2^2 Full Factorial (t_doe)
  // ----------------------------------------------------
  if (toolId === 't_doe' && !children) {
    const fAName = fields.factorAName || 'Smälttemperatur';
    const fALow = fields.factorALow || '140 °C (-1)';
    const fAHigh = fields.factorAHigh || '180 °C (+1)';
    const fBName = fields.factorBName || 'Huvudflödestryck';
    const fBLow = fields.factorBLow || '2.0 Bar (-1)';
    const fBHigh = fields.factorBHigh || '4.0 Bar (+1)';

    const y1 = parseFloat(fields.y1 !== undefined ? fields.y1 : '24.5');
    const y2 = parseFloat(fields.y2 !== undefined ? fields.y2 : '45.2');
    const y3 = parseFloat(fields.y3 !== undefined ? fields.y3 : '26.8');
    const y4 = parseFloat(fields.y4 !== undefined ? fields.y4 : '52.7');

    // Calculations of general effects
    const meanY = (y1 + y2 + y3 + y4) / 4;
    const effectA = ((y2 + y4) - (y1 + y3)) / 2; // Average change when A is High vs Low
    const effectB = ((y3 + y4) - (y1 + y2)) / 2; // Average change when B is High vs Low
    const effectAB = ((y4 + y1) - (y2 + y3)) / 2; // Interaction effect

    const updateDOEField = (key: string, val: any) => {
      const up = { ...fields, [key]: val };
      setFields(up);
      handleSave(items, up, notes);
    };

    const loadDOEExample = () => {
      const ex = {
        factorAName: 'Munstyckestemp',
        factorALow: '160 °C (Låg)',
        factorAHigh: '190 °C (Hög)',
        factorBName: 'Fylltryck',
        factorBLow: '2.5 Bar (Låg)',
        factorBHigh: '3.5 Bar (Hög)',
        y1: '12.4', // Låg A, Låg B
        y2: '28.6', // Hög A, Låg B  -> Stark effekt A!
        y3: '14.2', // Låg A, Hög B
        y4: '34.8', // Hög A, Hög B
      };
      setFields(ex);
      handleSave(items, ex, notes);
    };

    // Determine optimal recipe based on direction of effects (maximizing the objective)
    const optA = effectA > 0 ? 'HIGH (+1)' : 'LOW (-1)';
    const optALabel = effectA > 0 ? fAHigh : fALow;
    const optB = effectB > 0 ? 'HIGH (+1)' : 'LOW (-1)';
    const optBLabel = effectB > 0 ? fBHigh : fBLow;

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" /> 2² Full Faktoriellt DOE-verktyg
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider mt-1 inline-block">
              Försöksplanering (Design of Experiments)
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          <button
            onClick={loadDOEExample}
            className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all flex items-center gap-1.5 shadow-sm self-start"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ladda Flaskförseglingsexempel
          </button>
        </div>

        {/* Configurations input cells card */}
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b pb-1 dark:border-slate-100">Faktor A (T.ex. Temperatur)</h4>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-bold">Namn på Faktor A</label>
              <input type="text" className="w-full text-xs p-2 border border-slate-200 rounded mt-0.5" value={fAName} onChange={(e) => updateDOEField('factorAName', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Låg nivå (-1)</label>
                <input type="text" className="w-full text-xs p-2 border border-slate-200 rounded mt-0.5" value={fALow} onChange={(e) => updateDOEField('factorALow', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Hög nivå (+1)</label>
                <input type="text" className="w-full text-xs p-2 border border-slate-200 rounded mt-0.5" value={fAHigh} onChange={(e) => updateDOEField('factorAHigh', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b pb-1 dark:border-slate-100">Faktor B (T.ex. Tryck)</h4>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-bold">Namn på Faktor B</label>
              <input type="text" className="w-full text-xs p-2 border border-slate-200 rounded mt-0.5" value={fBName} onChange={(e) => updateDOEField('factorBName', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Låg nivå (-1)</label>
                <input type="text" className="w-full text-xs p-2 border border-slate-200 rounded mt-0.5" value={fBLow} onChange={(e) => updateDOEField('factorBLow', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Hög nivå (+1)</label>
                <input type="text" className="w-full text-xs p-2 border border-slate-200 rounded mt-0.5" value={fBHigh} onChange={(e) => updateDOEField('factorBHigh', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Run design matrix to gather Y data */}
        <h4 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Genomförda försök & Resultat:</h4>
        <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <th className="p-3">Körning</th>
                <th className="p-3">Faktor A: {fAName}</th>
                <th className="p-3">Faktor B: {fBName}</th>
                <th className="p-3 text-center">Mätt Utfall (Respons Y)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3 font-semibold text-slate-600">Run 1</td>
                <td className="p-3 text-slate-500">Låg (-1): {fALow}</td>
                <td className="p-3 text-slate-500">Låg (-1): {fBLow}</td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.1" className="w-24 p-1.5 border border-slate-200 rounded text-center bg-white font-mono font-bold"
                    value={fields.y1 !== undefined ? fields.y1 : '24.5'}
                    onChange={(e) => updateDOEField('y1', e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-600">Run 2</td>
                <td className="p-3 text-slate-500">Hög (+1): {fAHigh}</td>
                <td className="p-3 text-slate-500">Låg (-1): {fBLow}</td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.1" className="w-24 p-1.5 border border-slate-200 rounded text-center bg-white font-mono font-bold"
                    value={fields.y2 !== undefined ? fields.y2 : '45.2'}
                    onChange={(e) => updateDOEField('y2', e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-600">Run 3</td>
                <td className="p-3 text-slate-500">Låg (-1): {fALow}</td>
                <td className="p-3 text-slate-500">Hög (+1): {fBHigh}</td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.1" className="w-24 p-1.5 border border-slate-200 rounded text-center bg-white font-mono font-bold"
                    value={fields.y3 !== undefined ? fields.y3 : '26.8'}
                    onChange={(e) => updateDOEField('y3', e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-600">Run 4</td>
                <td className="p-3 text-slate-500">Hög (+1): {fAHigh}</td>
                <td className="p-3 text-slate-500">Hög (+1): {fBHigh}</td>
                <td className="p-3 text-center">
                  <input
                    type="number" step="0.1" className="w-24 p-1.5 border border-slate-200 rounded text-center bg-white font-mono font-bold"
                    value={fields.y4 !== undefined ? fields.y4 : '52.7'}
                    onChange={(e) => updateDOEField('y4', e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Calculated Statistical Factors & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Effects summary analysis */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h5 className="font-bold text-xs uppercase text-slate-600">Huvud- & Samspelsanalys</h5>
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between items-center py-1.5">
                <span className="font-semibold text-slate-700">Totalmedelvärde (Grand Mean):</span>
                <span className="font-mono font-bold text-slate-800">{meanY.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  Effekt av A ({fAName}):
                </span>
                <span className={`font-mono font-extrabold ${effectA >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                  {effectA >= 0 ? '+' : ''}{effectA.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  Effekt av B ({fBName}):
                </span>
                <span className={`font-mono font-extrabold ${effectB >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                  {effectB >= 0 ? '+' : ''}{effectB.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  Samspelseffekt (A x B):
                </span>
                <span className="font-mono font-bold text-blue-600">
                  {effectAB >= 0 ? '+' : ''}{effectAB.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Recommended optimization route */}
          <div className="p-5 bg-gradient-to-br from-indigo-50 to-emerald-50 border border-emerald-150 border-indigo-200 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block mb-1">🎯 Optimerat Recept / Slutsats</span>
              <h5 className="font-bold text-sm text-slate-800 mb-2">För att maximera utfall / respons Y:</h5>
              <p className="text-xs leading-relaxed text-slate-600-600 text-slate-600">
                Baserat på linjära beräkningar ska faktorerna ställas in enligt följande för att erhålla bästa möjliga processutfall:
              </p>
              <ul className="text-xs space-y-1.5 mt-3 font-semibold text-slate-800">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✔</span> {fAName}: <span className="text-emerald-700 font-extrabold">{optA}</span> ({optALabel})
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✔</span> {fBName}: <span className="text-emerald-700 font-extrabold">{optB}</span> ({optBLabel})
                </li>
              </ul>
            </div>
            <p className="text-[10px] text-slate-400 italic mt-4">Statistiska samspel och krökning kan kräva mer avancerade full-faktoriella tester eller RSM vid komplexa flöden.</p>
          </div>
        </div>

        {/* Optional text area */}
        <div className="mb-4 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 uppercase">Observerade Slutsatser / Nästa Steg</label>
          <textarea
            className="w-full min-h-[75px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50"
            placeholder="Skriv dina kommentarer om försöksresultaten..."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              handleSave(items, fields, e.target.value);
            }}
          />
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-150 pt-4 mt-2">
          <span className="text-xs text-slate-405 text-slate-400">
            {saveSuccess ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1 animate-pulse">
                <CheckCircle className="w-4 h-4" /> Sparat försöksplaneringen!
              </span>
            ) : (
              'Resultat och formler sparas till tillgångarna'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara DOE-plan
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Pilotstudie / Pilot study Performance Tracker (t_pilot)
  // ----------------------------------------------------
  if (toolId === 't_pilot' && !children) {
    const objective = fields.objective || 'Minska stillestånd för Pepsi linje 3 från 6.25% till under 2%';
    const scope = fields.scope || 'Packlinje 3 nattskift under veckorna 18-19';
    
    // Checkboxes checklist
    const chk1 = fields.chk1 === true;
    const chk2 = fields.chk2 === true;
    const chk3 = fields.chk3 === true;
    const chk4 = fields.chk4 === true;
    const chk5 = fields.chk5 === true;

    // Metrics
    const baseVal = parseFloat(fields.baseline || '6.25');
    const targetVal = parseFloat(fields.target || '2.0');
    const actualVal = parseFloat(fields.actual || '1.85');

    // Calculations
    const absoluteDelta = baseVal - actualVal;
    const pctImprovement = baseVal > 0 ? (absoluteDelta / baseVal) * 100 : 0;
    
    // Target achieved progress percentage
    const denominator = baseVal - targetVal;
    const targetProgress = denominator !== 0 ? (absoluteDelta / denominator) * 100 : 100;

    const updatePilotField = (key: string, val: any) => {
      const up = { ...fields, [key]: val };
      setFields(up);
      handleSave(items, up, notes);
    };

    const loadPilotPepsiExample = () => {
      const ex = {
        objective: 'Verifiera vibrationsdämpande fötter och mjukvara på Pepsi OEE',
        scope: 'Packningslinje 3 under nattskiftet och efterföljande fyllnadstester v.26-27',
        chk1: true,
        chk2: true,
        chk3: true,
        chk4: true,
        chk5: false,
        baseline: '6.25',
        target: '2.00',
        actual: '1.75'
      };
      setFields(ex);
      handleSave(items, ex, notes);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" /> Pilotstudie & Verifiering
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider mt-1 inline-block">
              Provnings- & Pilotide-mallar
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          <button
            onClick={loadPilotPepsiExample}
            className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm self-start"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ladda Pepsi-pilotexempel
          </button>
        </div>

        {/* Objectives input fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase">Mål & Syfte med Pilot</label>
            <textarea
              rows={2} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg mt-1 focus:ring-2 focus:ring-indigo-500"
              value={objective} onChange={(e) => updatePilotField('objective', e.target.value)}
              placeholder="Vad ska piloten bevisa?"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase">Avgränsning / Scope för Pilot</label>
            <textarea
              rows={2} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg mt-1 focus:ring-2 focus:ring-indigo-500"
              value={scope} onChange={(e) => updatePilotField('scope', e.target.value)}
              placeholder="Var och när sker piloten?"
            />
          </div>
        </div>

        {/* Milestones checklists */}
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">📋 Milstolpar i Pilotstudien</h4>
        <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3 mb-6 shadow-inner">
          <label className="flex items-start gap-3 cursor-pointer select-none text-xs">
            <input type="checkbox" className="w-4 h-4 rounded mt-0.5 text-indigo-600 border-slate-300 focus:ring-indigo-500" checked={chk1} onChange={(e) => updatePilotField('chk1', e.target.checked)} />
            <div>
              <span className="font-bold text-slate-700 block text-xs">1. Handhavandeutbildning (SOP)</span>
              <span className="text-[11px] text-slate-400">Har operatörer samt berörda parter utbildats i den nya processmetoden?</span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none border-t border-slate-150 pt-3 text-xs border-slate-100">
            <input type="checkbox" className="w-4 h-4 rounded mt-0.5 text-indigo-600 border-slate-300 focus:ring-indigo-500" checked={chk2} onChange={(e) => updatePilotField('chk2', e.target.checked)} />
            <div>
              <span className="font-bold text-slate-700 block text-xs">2. Säkrad back-up plan</span>
              <span className="text-[11px] text-slate-400">Har vi en plan B för att snabbt avbryta piloten om allvarliga drift- eller maskinfel uppstår?</span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none border-t border-slate-150 pt-3 text-xs border-slate-100">
            <input type="checkbox" className="w-4 h-4 rounded mt-0.5 text-indigo-600 border-slate-300 focus:ring-indigo-500" checked={chk3} onChange={(e) => updatePilotField('chk3', e.target.checked)} />
            <div>
              <span className="font-bold text-slate-700 block text-xs">3. Mätsystem kontrollera</span>
              <span className="text-[11px] text-slate-400">Är mätutrustningen validerad (Gage R&R) så att mätpunkter under piloten är tillförlitliga?</span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none border-t border-slate-150 pt-3 text-xs border-slate-100">
            <input type="checkbox" className="w-4 h-4 rounded mt-0.5 text-indigo-600 border-slate-300 focus:ring-indigo-500" checked={chk4} onChange={(e) => updatePilotField('chk4', e.target.checked)} />
            <div>
              <span className="font-bold text-slate-700 block text-xs">4. Avgränsad körning</span>
              <span className="text-[11px] text-slate-400">Har pilotstudien driftsatts enligt plan i en avskärmad produktionsmiljö?</span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none border-t border-slate-150 pt-3 text-xs border-slate-100">
            <input type="checkbox" className="w-4 h-4 rounded mt-0.5 text-indigo-600 border-slate-300 focus:ring-indigo-500" checked={chk5} onChange={(e) => updatePilotField('chk5', e.target.checked)} />
            <div>
              <span className="font-bold text-slate-700 block text-xs">5. Formellt godkännande</span>
              <span className="text-[11px] text-slate-400">Är mätresultaten analyserade och verifierade för full-skalig driftsättning (Control)?</span>
            </div>
          </label>
        </div>

        {/* Mathematical performance parameters inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h5 className="font-bold text-xs uppercase text-slate-600">Mättal (Performance KPI)</h5>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] text-slate-500">Nuläge (Post-analyse baseline)</label>
                <input
                  type="number" step="0.01" className="w-full p-2 border border-slate-250 border-slate-200 rounded text-xs font-mono font-bold bg-white"
                  value={fields.baseline || '6.25'} onChange={(e) => updatePilotField('baseline', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Önskat Mål (Target value)</label>
                <input
                  type="number" step="0.01" className="w-full p-2 border border-slate-250 border-slate-200 rounded text-xs font-mono font-bold bg-white"
                  value={fields.target || '2.0'} onChange={(e) => updatePilotField('target', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Uppmätt under Pilot (Actual)</label>
                <input
                  type="number" step="0.01" className="w-full p-2 border border-slate-250 border-slate-200 rounded text-xs font-mono font-bold bg-white"
                  value={fields.actual || '1.85'} onChange={(e) => updatePilotField('actual', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Graphical Progress Bar card */}
          <div className="p-5 bg-indigo-50/55 border border-indigo-150 border-indigo-100 rounded-xl flex flex-col justify-between md:col-span-2">
            <div>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block mb-2">📊 Framgångsanalys</span>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Minskning av felen (Defect Reduction %):</span>
                  <span className="font-bold text-teal-650 font-mono text-teal-600">{pctImprovement.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Måluppfyllelse (Pct of target achieved):</span>
                  <span className="font-bold text-indigo-700 font-mono">{targetProgress.toFixed(1)}%</span>
                </div>
              </div>

              {/* Real CSS progress bar */}
              <div className="h-4 bg-slate-200 w-full mt-4 rounded-full overflow-hidden relative shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, targetProgress))}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-bold font-mono text-[9px] text-slate-700">
                  {targetProgress.toFixed(0)}% av målet nått
                </span>
              </div>
            </div>

            {/* Verdict text */}
            <div className="text-xs text-slate-700 mt-3 border-t pt-2 border-indigo-200/50">
              {targetProgress >= 100 ? (
                <span className="font-extrabold text-teal-600 flex items-center gap-1">
                  🎉 PILOTEN ÄR HELT LYCKAD! Skillnaden är verifierad och redo för storskalig standardisering i Control-fasen!
                </span>
              ) : targetProgress >= 50 ? (
                <span className="font-bold text-indigo-600 flex items-center gap-1">
                  🔔 PILOTEN ÄR DELVIS LYCKAD. Vi har uppnått god progress men inte nått hela vägen till drömmålet. Finjustera metoden.
                </span>
              ) : (
                <span className="font-bold text-red-500 flex items-center gap-1">
                  ⚠ PILOTEN UPPNÅDDE INTE MÅLET. Vänligen utred felaktigheter i SOP eller bakomliggande rotorsaker i fiskbensdiagrammet.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Optional notes commentary */}
        <div className="mb-4 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 uppercase">Pilotstudie Logg & Kommentarer</label>
          <textarea
            className="w-full min-h-[75px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50"
            placeholder="Skriv dina egna logganteckningar om pilottestet..."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              handleSave(items, fields, e.target.value);
            }}
          />
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-150 pt-4 mt-2">
          <span className="text-xs text-slate-410 text-slate-400">
            {saveSuccess ? (
              <span className="text-indigo-600 font-semibold flex items-center gap-1 animate-pulse">
                <CheckCircle className="w-4 h-4" /> Sparat pilotstudien framgångsrikt!
              </span>
            ) : (
              'Checklistor och framsteg sparas till din lokala hårddisk'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara pilotdata
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE CALCULATOR: 5 Varför (t_5why)
  // ----------------------------------------------------
  if (toolId === 't_5why' && !children) {
    const problem = fields.problem || 'Packmaskin Pepsi stannar ofta under skift';
    const w1 = fields.w1 || '';
    const w2 = fields.w2 || '';
    const w3 = fields.w3 || '';
    const w4 = fields.w4 || '';
    const w5 = fields.w5 || '';

    const updateF = (key: string, val: string) => {
      const up = { ...fields, [key]: val };
      setFields(up);
    };

    const loadClassicExample = () => {
      const example = {
        problem: 'Säkringen på huvudmotorn gick och linjen stannade helt',
        w1: 'Motorns lager skar ihop på grund av överbelastning',
        w2: 'Smörjpumpen till lagret cirkulerade inte oljan som den skulle',
        w3: 'Smörjpumpens drivmekanism slutade snurra',
        w4: 'Pumpens drivaxel hade blivit kraftigt utsliten över tid',
        w5: 'Det saknades ett partikelfilter på oljeintaget vilket släppte in metallspån'
      };
      setFields(example);
      handleSave(items, example, notes);
    };

    const levels = [
      { num: 1, key: 'w1', placeholder: 'Varför gick säkringen? (Direkt orsak till symptom)', label: 'Symptomnivå 1', colorClass: 'bg-rose-50 border-rose-150 text-rose-850', labelColor: 'bg-rose-100 text-rose-800' },
      { num: 2, key: 'w2', placeholder: 'Varför inträffade rotorsak 1? (Sekundär orsak)', label: 'Symptomnivå 2', colorClass: 'bg-orange-50 border-orange-150 text-orange-850', labelColor: 'bg-orange-100 text-orange-800' },
      { num: 3, key: 'w3', placeholder: 'Varför inträffade rotorsak 2? (Mellankoppling)', label: 'Indirekt orsak', colorClass: 'bg-amber-50 border-amber-150 text-amber-850', labelColor: 'bg-amber-100 text-amber-805 text-amber-800' },
      { num: 4, key: 'w4', placeholder: 'Varför inträffade rotorsak 3? (Processbrist)', label: 'Processrelaterad', colorClass: 'bg-teal-50 border-teal-150 text-teal-850', labelColor: 'bg-teal-100 text-teal-800' },
      { num: 5, key: 'w5', placeholder: 'Varför inträffade rotorsak 4? (Systemfel/Rotorsak)', label: 'Systemomfattande (Rotorsak)', colorClass: 'bg-emerald-50 border-emerald-150 text-emerald-850 font-semibold', labelColor: 'bg-emerald-500 text-white font-bold' }
    ];

    const filledCount = [w1, w2, w3, w4, w5].filter(Boolean).length;
    const progressPercent = (filledCount / 5) * 100;

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex flex-wrap items-center justify-between mb-4 border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-teal-600" /> 5 Varför (5 Whys Causal Diagram)
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-teal-50 text-teal-600 border border-teal-100 mt-1 inline-block">
              Rotorsakshierarki (Root Cause Chain)
            </span>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
          
          <button
            onClick={loadClassicExample}
            className="text-xs px-3 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 hover:from-teal-100 hover:to-emerald-100 rounded-lg border border-teal-200 transition-all font-bold flex items-center gap-1.5 shadow-sm hover:scale-102"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Ladda klassiskt Lean-exempel
          </button>
        </div>

        {/* Visual progress bar bar */}
        <div className="mb-6 bg-slate-100 p-3 rounded-xl border border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="w-full sm:w-2/3 bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-bold text-slate-600 shrink-0 uppercase tracking-wider text-[10px]">
            Nedbrytning: {filledCount} av 5 Varför ({progressPercent.toFixed(0)}%)
          </span>
        </div>

        {/* Causal Chain Area */}
        <div className="space-y-4 mb-6">
          {/* PROBLEM CARD at top */}
          <div className="p-4 bg-slate-900 text-slate-100 rounded-xl shadow-md border border-slate-950 relative overflow-hidden">
            <div className="absolute top-2 right-2 flex gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span className="h-2 w-2 rounded-full bg-red-500" />
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observerat Symptom / Problemformulering</label>
                <input
                  type="text"
                  className="w-full mt-1 bg-transparent border-0 border-b-2 border-slate-700 focus:border-red-500 text-sm font-extrabold text-white leading-relaxed focus:outline-none focus:ring-0 px-0 pb-1"
                  value={problem}
                  onChange={(e) => updateF('problem', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Interactive Cascade Fields */}
          <div className="space-y-2">
            {levels.map((lvl, index) => {
              const currentVal = fields[lvl.key] || '';
              const prevKey = index > 0 ? levels[index - 1].key : 'problem';
              const isPrevFilled = index === 0 ? problem.trim().length > 0 : (fields[prevKey] || '').trim().length > 0;
              const isSelfFilled = currentVal.trim().length > 0;

              return (
                <div key={lvl.key} className="transition-all duration-300">
                  {/* Dynamic Connector Arrow */}
                  <div className="flex justify-center -my-1 relative z-10 select-none">
                    <svg className={`w-8 h-8 transition-colors duration-300 ${isSelfFilled ? 'text-teal-500' : 'text-slate-200'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>

                  {/* Node Panel */}
                  <div className={`p-3 border rounded-xl transition-all duration-350 ${
                    !isPrevFilled 
                      ? 'opacity-40 select-none border-slate-100 bg-slate-50/50' 
                      : isSelfFilled 
                        ? `${lvl.colorClass} border-teal-200 shadow-sm shadow-teal-500/5` 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      {/* Badge indicator */}
                      <div className="flex items-center justify-between shrink-0">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] uppercase font-mono font-bold tracking-widest ${lvl.labelColor}`}>
                          Varför {lvl.num}
                        </span>
                        <span className="sm:hidden text-[9px] text-slate-400 italic">
                          {lvl.label}
                        </span>
                      </div>

                      {/* Heading side label for desktop */}
                      <span className="hidden sm:inline text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        ({lvl.label})
                      </span>

                      {/* Main input */}
                      <div className="flex-1">
                        <input
                          type="text"
                          disabled={!isPrevFilled}
                          className="w-full p-2 bg-white/70 border border-slate-200/80 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-550 focus:ring-teal-500 focus:bg-white disabled:cursor-not-allowed"
                          placeholder={lvl.placeholder}
                          value={currentVal}
                          onChange={(e) => updateF(lvl.key, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic educational assessment box */}
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-250 border-emerald-200 mb-6 flex gap-3 text-xs leading-relaxed">
          <span className="text-xl">💡</span>
          <div>
            <h4 className="text-xs font-black text-emerald-850 text-emerald-850 uppercase tracking-widest">Utvärderad Rotorsak (Root Cause):</h4>
            <p className="text-sm text-emerald-950 font-extrabold mt-1">
              {w5 
                ? `✔️ ${w5}` 
                : w4 
                  ? `🔍 ${w4} (Mellannivå)` 
                  : w1 
                    ? `Symptom började benas ut. Fyll i mer detaljer nedåt i kedjan.` 
                    : 'Fortsätt att ställa frågan "Varför" och bryt ner mekaniska/processproblem för att nå den grundläggande systematiska rotorsaken.'}
            </p>
            {w5 && (
              <p className="text-[11px] text-emerald-800 mt-2">
                <b>Rekommendation:</b> Etablera en felsäkring (Poka-Yoke) eller korrigerande åtgärd speciellt utformad för att helt eliminera denna rotorsak.
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm bg-slate-50"
            placeholder="Analysera kopplingarna här, fyll i deltagande operatörer och ifall det krävs en ändrad underhållsplan (PM-kontroll) eller standardiserat arbetssätt (SOP)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat rotorsakerna!
              </span>
            ) : (
              'Analysen sparas automatiskt i ditt projekt'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-850 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE CALCULATOR: DPMO / Sigma-nivå (t_dpmo & t_sigma)
  // ----------------------------------------------------
  if ((toolId === 't_dpmo' || toolId === 't_sigma') && !children) {
    const defects = parseFloat(fields.defects || '15');
    const units = parseFloat(fields.units || '1000');
    const opportunities = parseFloat(fields.opportunities || '5');

    const calculatedDPMO = (defects / (units * opportunities)) * 1000000;
    
    // Exact standard 1.5 sigma shift calculation using our premium rational normSinv!
    const calculatedRate = calculatedDPMO / 1000000;
    const invN = normSinv(1 - calculatedRate);
    const calculatedSigma = 1.5 + invN;

    const updateCalc = (key: string, val: string) => {
      const up = { ...fields, [key]: val };
      setFields(up);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" /> {title}
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
              Kvalitetsmått
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-5 bg-indigo-50/40 rounded-xl border border-indigo-100/50 space-y-3">
            <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-1">
              <span>🎛️</span> Parametrar
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Antal defekter</label>
                <input
                  type="number"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                  value={fields.defects || '15'}
                  onChange={(e) => updateCalc('defects', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Totalt antal enheter (Units)</label>
                <input
                  type="number"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                  value={fields.units || '1000'}
                  onChange={(e) => updateCalc('units', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Möjligheter till fel per enhet</label>
                <input
                  type="number"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                  value={fields.opportunities || '5'}
                  onChange={(e) => updateCalc('opportunities', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between p-5 bg-slate-900 text-slate-100 rounded-xl shadow-inner border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-widest block">Statistiskt Resultat</span>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs text-slate-400">Beräknad DPMO</div>
                  <div className="text-3xl font-extrabold text-orange-400 font-mono tracking-tight">
                    {calculatedDPMO.toLocaleString('sv-SE', { maximumFractionDigits: 1 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Sigma-nivå (med +1.5σ shift)</div>
                  <div className="text-4xl font-extrabold text-emerald-400 font-mono tracking-tight flex items-baseline gap-2">
                    {calculatedSigma.toFixed(2)}
                    <span className="text-sm font-semibold text-emerald-300">σ</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3 mt-3">
              Mål: 6σ = 3.4 DPMO • Branschstandard: ≥ 4.0σ
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50"
            placeholder="Fyll i eventuella slutsatser..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat till mätetal!
              </span>
            ) : (
              'Kom ihåg att spara dina beräkningar.'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE CALCULATOR: Cp / Cpk Processduglighet (t_cp)
  // ----------------------------------------------------
  if (toolId === 't_cp' && !children) {
    const rawMode = fields.capMode || 'direct';

    // Parse raw data text if in data mode
    const rawDataText = fields.rawDataText || '10.15, 9.95, 10.20, 10.05, 9.85, 10.10, 10.30, 9.90, 9.75, 10.05, 9.98, 10.12, 10.02, 9.88, 10.22, 10.08, 9.92, 10.18, 9.82, 10.15';
    let rawAvg = 10.0;
    let rawStdDev = 0.15;
    let rawCount = 0;
    let rawMin = 0;
    let rawMax = 0;
    let rawRange = 0;

    const parsedValues = rawDataText
      .split(/[\s,;]+/)
      .map((v: string) => parseFloat(v))
      .filter((v: number) => !isNaN(v));

    if (parsedValues.length > 1) {
      rawCount = parsedValues.length;
      rawMin = Math.min(...parsedValues);
      rawMax = Math.max(...parsedValues);
      rawRange = rawMax - rawMin;
      rawAvg = parsedValues.reduce((a: number, b: number) => a + b, 0) / rawCount;
      const squaredDiffs = parsedValues.map((v: number) => Math.pow(v - rawAvg, 2));
      const variance = squaredDiffs.reduce((a: number, b: number) => a + b, 0) / (rawCount - 1);
      rawStdDev = Math.sqrt(variance);
    } else if (parsedValues.length === 1) {
      rawCount = 1;
      rawAvg = parsedValues[0];
      rawStdDev = 0.15;
      rawMin = rawAvg;
      rawMax = rawAvg;
    }

    // Set parameters based on active input mode
    const usl = parseFloat(fields.usl || '10.5');
    const lsl = parseFloat(fields.lsl || '9.5');
    const mean = rawMode === 'data' ? rawAvg : parseFloat(fields.mean || '10.0');
    // Sanitize stdDev so it is never 0 to avoid division by zero
    const stdDev = Math.max(0.001, rawMode === 'data' ? rawStdDev : parseFloat(fields.stdDev || '0.15'));

    const cp = (usl - lsl) / (6 * stdDev);
    const cpk = Math.min((usl - mean) / (3 * stdDev), (mean - lsl) / (3 * stdDev));

    // Standard Normal Cumulative Distribution Function (Abramowitz & Stegun)
    const stdNormalCDF = (z: number): number => {
      const p = 0.2316419;
      const b1 = 0.319381530;
      const b2 = -0.356563782;
      const b3 = 1.781477937;
      const b4 = -1.821255978;
      const b5 = 1.330274429;
      const t = 1 / (1 + p * Math.abs(z));
      const exp = Math.exp(-0.5 * z * z);
      const fact = 0.3989422804 * exp * t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
      const val = 1 - fact;
      return z >= 0 ? val : 1 - val;
    };

    // Calculate quality indices
    const zL = (lsl - mean) / stdDev;
    const zU = (usl - mean) / stdDev;
    const pBelowLSL = stdNormalCDF(zL);
    const pAboveUSL = 1 - stdNormalCDF(zU);
    const pOutside = pBelowLSL + pAboveUSL;
    const defectPPM = pOutside * 1000000;
    const yieldPct = (1 - pOutside) * 100;
    const zBench = Math.min(Math.abs(zL), Math.abs(zU));
    const processSigma = zBench + 1.5; // Short-term + 1.5 sigma shift

    const updateCapabilityField = (key: string, val: any) => {
      const updated = { ...fields, [key]: val };
      setFields(updated);
    };

    // Generate bell curve points for SVG routing
    // Plot range: Mean +/- 4.5 * StdDev
    const minPlotX = mean - 4.5 * stdDev;
    const maxPlotX = mean + 4.5 * stdDev;
    const boundaryMin = Math.min(minPlotX, lsl - 0.2 * stdDev);
    const boundaryMax = Math.max(maxPlotX, usl + 0.2 * stdDev);
    const plotRange = boundaryMax - boundaryMin;

    const svgW = 500;
    const svgH = 180;
    const paddingX = 40;
    const paddingY = 25;

    const getSvgX = (x: number) => paddingX + ((x - boundaryMin) / plotRange) * (svgW - 2 * paddingX);
    const maxY = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    const getSvgY = (y: number) => (svgH - paddingY) - (y / maxY) * (svgH - paddingY - 10);

    const normalPDF = (x: number) => {
      return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    };

    // Construct curve coordinates
    const pointsCount = 100;
    const curvePoints = [];
    for (let i = 0; i <= pointsCount; i++) {
      const xVal = boundaryMin + (i / pointsCount) * plotRange;
      const yVal = normalPDF(xVal);
      curvePoints.push({ x: xVal, y: yVal, sx: getSvgX(xVal), sy: getSvgY(yVal) });
    }

    // SVG Main Area path format
    const pathD = curvePoints.reduce((acc, p, idx) => {
      return acc + `${idx === 0 ? 'M' : 'L'} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)} `;
    }, '') + `L ${getSvgX(boundaryMax).toFixed(1)} ${(svgH - paddingY).toFixed(1)} L ${getSvgX(boundaryMin).toFixed(1)} ${(svgH - paddingY).toFixed(1)} Z`;

    const lslSx = getSvgX(lsl);
    const uslSx = getSvgX(usl);
    const meanSx = getSvgX(mean);

    // Filter points inside specifications to color-code conforming distribution
    const curveInside = curvePoints.filter(p => p.x >= lsl && p.x <= usl);
    let insidePathD = '';
    if (curveInside.length > 0) {
      insidePathD = `M ${getSvgX(lsl).toFixed(1)} ${(svgH - paddingY).toFixed(1)} `;
      curveInside.forEach(p => {
        insidePathD += `L ${p.sx.toFixed(1)} ${p.sy.toFixed(1)} `;
      });
      insidePathD += `L ${getSvgX(usl).toFixed(1)} ${(svgH - paddingY).toFixed(1)} Z`;
    }

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex flex-wrap items-center justify-between mb-4 border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" /> Processkapacitet / Duglighet ({title})
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 mt-1 inline-block">
              Statistisk Analys (Cp & Cpk)
            </span>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>

          {/* Tab Selection */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => updateCapabilityField('capMode', 'direct')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                rawMode === 'direct' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ange parametrar
            </button>
            <button
              onClick={() => updateCapabilityField('capMode', 'data')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                rawMode === 'data' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Beräkna från mätdata
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Controls column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-slate-50/70 border border-slate-200/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <span>⚙️</span> {rawMode === 'data' ? 'Process Specifikationer' : 'Inmatningsparametrar'}
                </h4>
                {rawMode === 'data' && (
                  <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-1.5 py-0.5 rounded-md">
                    Rådata Läge: {rawCount} st
                  </span>
                )}
              </div>

              {rawMode === 'data' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex justify-between">
                      <span>Mätdata (kommaseparerad)</span>
                      <span className="font-mono text-slate-400 text-[10px]">Ex: 10.1, 9.8, 10.3</span>
                    </label>
                    <textarea
                      className="w-full h-24 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono resize-none focus:ring-2 focus:ring-emerald-550 focus:ring-emerald-500 focus:outline-none"
                      value={rawDataText}
                      onChange={(e) => updateCapabilityField('rawDataText', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono">
                    <div>Medel (μ): <b className="text-emerald-400">{rawAvg.toFixed(4)}</b></div>
                    <div>StdAvv (σ): <b className="text-amber-400">{rawStdDev.toFixed(4)}</b></div>
                    <div>N-analys: <b>{rawCount} rader</b></div>
                    <div>Vidd (Range): <b>{rawRange.toFixed(3)}</b></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">LSL (Nedre gräns)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:ring-1 focus:ring-emerald-550"
                        value={fields.lsl || '9.5'}
                        onChange={(e) => updateCapabilityField('lsl', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">USL (Övre gräns)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:ring-1 focus:ring-emerald-550"
                        value={fields.usl || '10.5'}
                        onChange={(e) => updateCapabilityField('usl', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">LSL (Nedre gräns)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:ring-1 focus:ring-emerald-550"
                        value={fields.lsl || '9.5'}
                        onChange={(e) => updateCapabilityField('lsl', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">USL (Övre gräns)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:ring-1 focus:ring-emerald-550"
                        value={fields.usl || '10.5'}
                        onChange={(e) => updateCapabilityField('usl', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-200/50 my-2 pt-2"></div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mb-1">
                      <span>Medelvärde (μ)</span>
                      <span className="text-slate-800 font-mono text-xs">{mean.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={(lsl - 0.5 * (usl - lsl)).toString()}
                      max={(usl + 0.5 * (usl - lsl)).toString()}
                      step="0.01"
                      className="w-full h-1 bg-slate-200 accent-emerald-600 rounded-md cursor-pointer"
                      value={mean.toString()}
                      onChange={(e) => updateCapabilityField('mean', e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mb-1">
                      <span>Standardavvikelse (σ)</span>
                      <span className="text-slate-800 font-mono text-xs">{stdDev.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max={(0.5 * (usl - lsl)).toString()}
                      step="0.005"
                      className="w-full h-1 bg-slate-200 accent-emerald-600 rounded-md cursor-pointer"
                      value={stdDev.toString()}
                      onChange={(e) => updateCapabilityField('stdDev', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quality thresholds widget card */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-2.5 items-start">
              <span className="text-lg">📈</span>
              <div className="text-[11px] text-emerald-850 text-emerald-800 space-y-0.5">
                <p className="font-bold">Duglighetsstandarder (Cp & Cpk):</p>
                <div className="grid grid-cols-2 gap-x-2 font-medium">
                  <div>• &lt; 1.00: Brister (Underkänd)</div>
                  <div>• 1.00 - 1.33: Gränsfall</div>
                  <div>• 1.33 - 1.67: Bra standard</div>
                  <div>• &gt; 1.67: Världsklass (6σ)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart and results columns */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            
            {/* Visual Bell curve graph */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center">
              <h4 className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left mb-2">
                Processfördelning vs Specifikationsgränser
              </h4>
              <div className="w-full overflow-hidden select-none">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ maxHeight: '180px' }}>
                  {/* Grid Lines */}
                  <line x1={paddingX} y1={svgH - paddingY} x2={svgW - paddingX} y2={svgH - paddingY} stroke="#cbd5e1" strokeWidth="1" />
                  
                  {/* Area under curve - defect area (entire curve colored pale red) */}
                  <path d={pathD} fill="#fee2e2" stroke="#fca5a5" strokeWidth="1" opacity={0.65} />
                  
                  {/* Inside specs curve area - conforming area colored clean emerald green */}
                  {insidePathD && (
                    <path d={insidePathD} fill="#d1fae5" stroke="#34d399" strokeWidth="1.5" />
                  )}

                  {/* LSL Marker */}
                  {lslSx >= paddingX && lslSx <= svgW - paddingX && (
                    <g>
                      <line x1={lslSx} y1={10} x2={lslSx} y2={svgH - paddingY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                      <text x={lslSx - 5} y={20} fill="#dc2626" fontSize="9" fontWeight="bold" textAnchor="end">LSL ({lsl.toFixed(2)})</text>
                    </g>
                  )}

                  {/* USL Marker */}
                  {uslSx >= paddingX && uslSx <= svgW - paddingX && (
                    <g>
                      <line x1={uslSx} y1={10} x2={uslSx} y2={svgH - paddingY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                      <text x={uslSx + 5} y={20} fill="#dc2626" fontSize="9" fontWeight="bold" textAnchor="start">USL ({usl.toFixed(2)})</text>
                    </g>
                  )}

                  {/* Mean Marker */}
                  {meanSx >= paddingX && meanSx <= svgW - paddingX && (
                    <g>
                      <line x1={meanSx} y1={15} x2={meanSx} y2={svgH - paddingY} stroke="#059669" strokeWidth="1.5" />
                      <text x={meanSx} y={svgH - paddingY + 12} fill="#047857" fontSize="9" fontWeight="bold" textAnchor="middle">Medel (μ={mean.toFixed(2)})</text>
                    </g>
                  )}

                  {/* X-axis indicators */}
                  <text x={paddingX} y={svgH - 5} fill="#64748b" fontSize="8" fontWeight="medium" textAnchor="middle">{boundaryMin.toFixed(2)}</text>
                  <text x={svgW - paddingX} y={svgH - 5} fill="#64748b" fontSize="8" fontWeight="medium" textAnchor="middle">{boundaryMax.toFixed(2)}</text>
                </svg>
              </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-900 text-white rounded-xl shadow-sm border border-slate-850">
                <span className="text-[9px] text-slate-400 uppercase font-mono font-bold block">Cp (Kapacitet)</span>
                <span className="text-xl font-bold font-mono text-orange-400 block mt-1">{cp.toFixed(3)}</span>
                <span className="text-[9px] text-slate-400">Variationspotential</span>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl shadow-sm border border-slate-850">
                <span className="text-[9px] text-slate-400 uppercase font-mono font-bold block">Cpk (Duglighet)</span>
                <span className={`text-xl font-bold font-mono block mt-1 ${cpk >= 1.33 ? 'text-emerald-400' : 'text-rose-450 text-red-400'}`}>
                  {cpk.toFixed(3)}
                </span>
                <span className="text-[9px] text-slate-400">Verklig centrerad</span>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl shadow-sm border border-slate-850">
                <span className="text-[9px] text-slate-400 uppercase font-mono font-bold block">Defektandel (PPM)</span>
                <span className="text-xl font-bold font-mono text-red-300 block mt-1">
                  {defectPPM >= 100000 ? `${(defectPPM/1000).toFixed(0)}k` : defectPPM.toLocaleString('sv-SE', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[9px] text-slate-400">Feltäthet per miljon</span>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl shadow-sm border border-slate-850">
                <span className="text-[9px] text-slate-400 uppercase font-mono font-bold block">Process Sigma</span>
                <span className="text-xl font-bold font-mono text-teal-300 block mt-1">
                  {processSigma.toFixed(2)}σ
                </span>
                <span className="text-[9px] text-slate-400">Med +1.5σ skift</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs font-semibold leading-relaxed flex items-center gap-2 ${
              cpk >= 1.33 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <span>{cpk >= 1.33 ? '✅' : '⚠️'}</span>
              <span>
                {cpk >= 1.33 
                  ? `Processen är stabil och fullt kapabel! Den presterar en fin yield på ${yieldPct.toFixed(3)}%.` 
                  : `Processen har brister (Cpk = ${cpk.toFixed(2)} < 1.33). Centrera processen eller sänk spridningen för att nå Six Sigma.`}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-550 focus:ring-emerald-500 text-sm bg-slate-50"
            placeholder="Fyll i kommentarer om duglighetsanalysen och planerade korrigerande åtgärder..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat framgångsrikt till mätetal!
              </span>
            ) : (
              'Klicka för att spara duglighet till projekt'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all animate-fade"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE CALCULATOR: 5S Audit Checklist (t_5s)
  // ----------------------------------------------------
  if (toolId === 't_5s' && !children) {
    const s1_1 = parseFloat(fields.s1_1 || '3');
    const s1_2 = parseFloat(fields.s1_2 || '3');
    const s1_3 = parseFloat(fields.s1_3 || '3');

    const s2_1 = parseFloat(fields.s2_1 || '3');
    const s2_2 = parseFloat(fields.s2_2 || '3');
    const s2_3 = parseFloat(fields.s2_3 || '3');

    const s3_1 = parseFloat(fields.s3_1 || '3');
    const s3_2 = parseFloat(fields.s3_2 || '3');
    const s3_3 = parseFloat(fields.s3_3 || '3');

    const s4_1 = parseFloat(fields.s4_1 || '3');
    const s4_2 = parseFloat(fields.s4_2 || '3');
    const s4_3 = parseFloat(fields.s4_3 || '3');

    const s5_1 = parseFloat(fields.s5_1 || '3');
    const s5_2 = parseFloat(fields.s5_2 || '3');
    const s5_3 = parseFloat(fields.s5_3 || '3');

    const sortAvg = (s1_1 + s1_2 + s1_3) / 3;
    const structureAvg = (s2_1 + s2_2 + s2_3) / 3;
    const cleanAvg = (s3_1 + s3_2 + s3_3) / 3;
    const standardAvg = (s4_1 + s4_2 + s4_3) / 3;
    const disciplineAvg = (s5_1 + s5_2 + s5_3) / 3;

    const totalAvg = (sortAvg + structureAvg + cleanAvg + standardAvg + disciplineAvg) / 5;

    const updateSlider = (key: string, val: string) => {
      const up = { ...fields, [key]: val };
      setFields(up);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-orange-600" /> 5S Audit & Poängräknare
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-600 border border-orange-100">
              Lean
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>

        {/* 5S Score Output Ring */}
        <div className="p-4 bg-orange-50 rounded-xl mb-6 flex flex-col md:flex-row items-center gap-6 border border-orange-100">
          <div className="relative shrink-0 flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#ffedd5" strokeWidth="8" fill="transparent" />
              <circle cx="48" cy="48" r="40" stroke="#f97316" strokeWidth="8" fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * (totalAvg / 5))}
              />
            </svg>
            <span className="absolute text-xl font-black text-orange-950 font-mono">
              {(totalAvg).toFixed(1)}/5
            </span>
          </div>

          <div className="flex-1 text-center md:text-left space-y-1">
            <h4 className="text-sm font-bold text-orange-950 uppercase">
              {totalAvg >= 4.0 ? '🌟 Utmärkt Standard' : totalAvg >= 3.0 ? '⚠️ Godkänd Standard' : '❌ Otillräcklig Standard'}
            </h4>
            <p className="text-xs text-orange-850/80 leading-relaxed font-medium">
              Ett totalbetyg på <b>{(totalAvg).toFixed(2)}</b> betyder att ni har implementerat solida processer för ordning och städad miljö. Förbättra era standarder kontinuerligt.
            </p>
          </div>
        </div>

        {/* Sliders for the Auditing Categories */}
        <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2 border border-slate-100 p-3 rounded mb-6">
          {/* S1: Sortera */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">1. Sortera (Seiri)</h4>
              <span className="text-xs font-extrabold text-orange-600 font-mono">Snitt: {sortAvg.toFixed(1)}/5</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] text-slate-600">Onödiga föremål borttagna (1-5)</label>
                <input type="range" min="1" max="5" className="w-full h-1 bg-slate-200 accent-orange-600 rounded-lg" value={s1_1} onChange={(e) => updateSlider('s1_1', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-slate-600">Rödmärkning genomförd (1-5)</label>
                <input type="range" min="1" max="5" className="w-full h-1 bg-slate-200 accent-orange-600 rounded-lg" value={s1_2} onChange={(e) => updateSlider('s1_2', e.target.value)} />
              </div>
            </div>
          </div>

          {/* S2: Strukturera */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">2. Strukturera (Seiton)</h4>
              <span className="text-xs font-extrabold text-orange-600 font-mono">Snitt: {structureAvg.toFixed(1)}/5</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] text-slate-600">Allt har en bestämd plats (1-5)</label>
                <input type="range" min="1" max="5" className="w-full h-1 bg-slate-200 accent-orange-600 rounded-lg" value={s2_1} onChange={(e) => updateSlider('s2_1', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-slate-600">Märkning och skyltning (1-5)</label>
                <input type="range" min="1" max="5" className="w-full h-1 bg-slate-200 accent-orange-600 rounded-lg" value={s2_2} onChange={(e) => updateSlider('s2_2', e.target.value)} />
              </div>
            </div>
          </div>

          {/* S3: Städa */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">3. Städa (Seiso)</h4>
              <span className="text-xs font-extrabold text-orange-600 font-mono">Snitt: {cleanAvg.toFixed(1)}/5</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[11px] text-slate-600">Arbetsytan ren och väl underhållen (1-5)</label>
                <input type="range" min="1" max="5" className="w-full h-1 bg-slate-200 accent-orange-600 rounded-lg" value={s3_1} onChange={(e) => updateSlider('s3_1', e.target.value)} />
              </div>
            </div>
          </div>

          {/* S4: Standardisera */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">4. Standardisera (Seiketsu)</h4>
              <span className="text-xs font-extrabold text-orange-600 font-mono">Snitt: {standardAvg.toFixed(1)}/5</span>
            </div>
          </div>

          {/* S5: Självdisciplin */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">5. Självdisciplin (Shitsuke)</h4>
              <span className="text-xs font-extrabold text-orange-600 font-mono">Snitt: {disciplineAvg.toFixed(1)}/5</span>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm bg-slate-50"
            placeholder="Skriv dina egna 5S iakttagelser..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat till 5S-rapport!
              </span>
            ) : (
              'Kom ihåg att trycka på Spara'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Audit checklist (t_audit_plan)
  // ----------------------------------------------------
  if (toolId === 't_audit_plan' && !children) {
    const checklistItems = [
      { id: 'c1', text: 'Kontrollplan upprättad och godkänd' },
      { id: 'c2', text: 'SOP:er dokumenterade och distribuerade' },
      { id: 'c3', text: 'Utbildning genomförd för alla berörda' },
      { id: 'c4', text: 'Reaktionsplan på plats' },
      { id: 'c5', text: 'Mätsystem validerat (MSA)' },
      { id: 'c6', text: 'Processkapabilitet bekräftad (Cpk ≥ 1.33)' },
      { id: 'c7', text: 'Styrdiagram (SPC) implementerade' },
      { id: 'c8', text: 'Processägare formellt identifierad och informerad' },
      { id: 'c9', text: 'Dokumentation arkiverad säkert i databas' },
      { id: 'c10', text: 'Lessons Learned-möte genomfört och protokollfört' }
    ];

    const currentChecked = fields.checked || [];
    const checkedCount = currentChecked.length;
    const progressPercent = Math.round((checkedCount / checklistItems.length) * 100);

    const toggleCheckbox = (id: string) => {
      let updatedChecked = [...currentChecked];
      if (updatedChecked.includes(id)) {
        updatedChecked = updatedChecked.filter(item => item !== id);
      } else {
        updatedChecked.push(id);
      }
      const updatedFields = { ...fields, checked: updatedChecked };
      setFields(updatedFields);
      handleSave(items, updatedFields, notes);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-700" /> Revisionsplan & Grindgranskning
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Uppföljning
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>

        {/* Progress box */}
        <div className="p-4 bg-indigo-50 rounded-xl mb-6 border border-indigo-150">
          <div className="flex justify-between text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wide">
            <span>Projektets grindkapabilitet</span>
            <span className="font-mono">{checkedCount}/{checklistItems.length} Punkter Avklarade ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-indigo-100 h-2.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {checklistItems.map(item => {
            const isChecked = currentChecked.includes(item.id);
            return (
              <label 
                key={item.id} 
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  isChecked 
                    ? 'bg-indigo-50/20 border-indigo-200 text-slate-800' 
                    : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 bg-white rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={isChecked}
                  onChange={() => toggleCheckbox(item.id)}
                />
                <span className={`text-xs font-medium leading-relaxed ${isChecked ? 'font-bold' : ''}`}>{item.text}</span>
              </label>
            );
          })}
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50"
            placeholder="Kritiska iakttagelser under granskningen..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat till auditlogg!
              </span>
            ) : (
              'Checklistan sparar löpande.'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Hypothesis Testing (t_hypothesis)
  // ----------------------------------------------------
  if (toolId === 't_hypothesis' && !children) {
    const testType = fields.testType || '2sample';
    const alpha = parseFloat(fields.alpha || '0.05');

    // Group 1
    const n1 = parseInt(fields.n1 || '30');
    const mean1 = parseFloat(fields.mean1 || '102.5');
    const sd1 = parseFloat(fields.sd1 || '5.2');

    // Group 2 (2-sample) / Target (1-sample)
    const n2 = parseInt(fields.n2 || '30');
    const mean2 = parseFloat(fields.mean2 || '98.8');
    const sd2 = parseFloat(fields.sd2 || '6.1');
    const targetMean = parseFloat(fields.targetMean || '100.0');

    // Calculate T-test
    let diff = 0;
    let tStat = 0;
    let df = 0;
    let se = 0;

    if (testType === '2sample') {
      diff = mean1 - mean2;
      const pooledVar = ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2);
      const pooledSD = Math.sqrt(pooledVar || 1);
      se = pooledSD * Math.sqrt((1 / n1) + (1 / n2));
      tStat = se > 0 ? diff / se : 0;
      df = n1 + n2 - 2;
    } else {
      diff = mean1 - targetMean;
      se = n1 > 0 ? sd1 / Math.sqrt(n1) : 0;
      tStat = se > 0 ? diff / se : 0;
      df = n1 - 1;
    }

    // Standard Normal 2-tail p-value approximation
    const getPValue = (t: number) => {
      const x = Math.abs(t);
      const tConst = 1 / (1 + 0.2316419 * x);
      const d = 0.39894228 * Math.exp(-x * x / 2);
      const pRight = d * tConst * (0.31938153 + tConst * (-0.356563782 + tConst * (1.781477937 + tConst * (-1.821255978 + tConst * 1.330274429))));
      return Math.min(1.0, Math.max(0.0, pRight * 2));
    };

    const pValue = getPValue(tStat);
    const isSignificant = pValue < alpha;

    const setHypField = (key: string, value: any) => {
      const up = { ...fields, [key]: value };
      setFields(up);
    };

    const loadExampleHyp = () => {
      const example = {
        testType: '2sample',
        alpha: '0.05',
        n1: '45',
        mean1: '14.2',
        sd1: '2.1',
        n2: '45',
        mean2: '15.8',
        sd2: '2.4',
        targetMean: '15.0'
      };
      setFields(example);
      handleSave(items, example, notes);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" /> Hypotes- & Signifikanstest
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
              Rotorsaksverifiering
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          <button
            onClick={loadExampleHyp}
            className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ladda t-test exempel
          </button>
        </div>

        {/* Configuration Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Typ av Hypotestest</label>
                <select
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={testType}
                  onChange={(e) => setHypField('testType', e.target.value)}
                >
                  <option value="2sample">Tvåoberoende t-test (Grupp A vs Grupp B)</option>
                  <option value="1sample">Etturvalst-test (Grupp A vs Referensmål)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Signifikansnivå (Alfa-risk α)</label>
                <select
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={alpha}
                  onChange={(e) => setHypField('alpha', e.target.value)}
                >
                  <option value="0.01">1% (α = 0.01)</option>
                  <option value="0.05">5% (α = 0.05)</option>
                  <option value="0.10">10% (α = 0.10)</option>
                </select>
              </div>
            </div>

            {/* Inputs Group 1 */}
            <div className="p-4 bg-white border border-slate-100 rounded-lg space-y-3">
              <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest">Grupp A / Ny Process</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500">Antal obs (n)</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-slate-200 rounded text-xs font-semibold"
                    value={fields.n1 || '30'}
                    onChange={(e) => setHypField('n1', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Medelvärde (x̄₁)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border border-slate-200 rounded text-xs font-semibold"
                    value={fields.mean1 || '102.5'}
                    onChange={(e) => setHypField('mean1', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Std. avvikelse (s₁)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border border-slate-200 rounded text-xs font-semibold"
                    value={fields.sd1 || '5.2'}
                    onChange={(e) => setHypField('sd1', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Inputs Group 2 */}
            {testType === '2sample' ? (
              <div className="p-4 bg-white border border-slate-100 rounded-lg space-y-3">
                <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest">Grupp B / Gammal Process</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500">Antal obs (n₂)</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-slate-200 rounded text-xs font-semibold"
                      value={fields.n2 || '30'}
                      onChange={(e) => setHypField('n2', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Medelvärde (x̄₂)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full p-2 border border-slate-200 rounded text-xs font-semibold"
                      value={fields.mean2 || '98.8'}
                      onChange={(e) => setHypField('mean2', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Std. avvikelse (s₂)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full p-2 border border-slate-200 rounded text-xs font-semibold"
                      value={fields.sd2 || '6.1'}
                      onChange={(e) => setHypField('sd2', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white border border-slate-100 rounded-lg">
                <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest mb-2">Referens / Målvärde</h4>
                <div>
                  <label className="block text-[10px] text-slate-500">Förväntat målvärde (μ₀)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border border-slate-200 rounded text-xs font-bold font-mono"
                    value={fields.targetMean || '100.0'}
                    onChange={(e) => setHypField('targetMean', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Decision Summary Panel */}
          <div className={`p-6 rounded-xl flex flex-col justify-between text-slate-100 shadow-inner border lg:col-span-1 ${
            isSignificant ? 'bg-indigo-900 border-indigo-950' : 'bg-slate-900 border-slate-950'
          }`}>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-widest block font-bold">Analysbeslut</span>
              
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase">Beräknat t-värde:</div>
                  <div className="text-3xl font-black font-mono text-orange-400">{Math.abs(tStat).toFixed(3)}</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">Frihetsgrader (df): {df}</div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase">P-värde (2-tailed):</div>
                  <div className={`text-4xl font-extrabold font-mono tracking-tight ${isSignificant ? 'text-green-400' : 'text-amber-500'}`}>
                    {pValue.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    {isSignificant ? 'P-värde < α' : 'P-värde ≥ α'}
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-6 p-4 rounded-lg font-medium text-xs leading-relaxed text-left ${
              isSignificant ? 'bg-indigo-950 text-indigo-200 border border-indigo-800/40' : 'bg-slate-950 text-slate-300 border border-slate-800/40'
            }`}>
              <div className="font-extrabold text-[11px] uppercase space-y-1 mb-1">
                {isSignificant ? '✅ Nollhypotesen (H₀) kan förkastas!' : '❌ Kan ej förkasta H₀'}
              </div>
              <p className="text-slate-200 font-medium leading-relaxed">
                {isSignificant 
                  ? `Skillnaden är statistiskt säkerställd (signifikant) vid ${Math.round((1 - alpha)*100)}% konfidensgrad. Förbättringen är verklig!`
                  : 'Det finns inte tillräckligt med statistiska bevis för att visa en signifikant skillnad. Skillnaden kan bero på slumpmässig variation.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <label className="block text-xs font-bold text-slate-600 uppercase">Analys & Slutsatser</label>
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50"
            placeholder="Skriv dina egna slutsatser eller tolkningar av hypotestestet..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat till rotorsaker!
              </span>
            ) : (
              'Kom ihåg att trycka på Spara'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Regression Analysis (t_regression)
  // ----------------------------------------------------
  if (toolId === 't_regression' && !children) {
    const defaultPoints = [
      { x: 10, y: 12 },
      { x: 15, y: 16 },
      { x: 20, y: 18 },
      { x: 25, y: 24 },
      { x: 30, y: 25 },
      { x: 35, y: 31 },
      { x: 40, y: 32 }
    ];
    
    const activePoints = items.length > 0 ? items : defaultPoints;

    // Linear regression calculations
    const n = activePoints.length;
    let sumX = 0;
    let sumY = 0;
    activePoints.forEach(p => {
      sumX += p.x;
      sumY += p.y;
    });
    const meanX = sumX / n;
    const meanY = sumY / n;

    let ssXX = 0;
    let ssYY = 0;
    let ssXY = 0;
    activePoints.forEach(p => {
      ssXX += Math.pow(p.x - meanX, 2);
      ssYY += Math.pow(p.y - meanY, 2);
      ssXY += (p.x - meanX) * (p.y - meanY);
    });

    const slope = ssXX > 0 ? ssXY / ssXX : 0;
    const intercept = meanY - slope * meanX;
    
    const stdX = Math.sqrt(ssXX / (n - 1 || 1));
    const stdY = Math.sqrt(ssYY / (n - 1 || 1));
    const rCoeff = (stdX * stdY) > 0 ? ssXY / (Math.sqrt(ssXX) * Math.sqrt(ssYY)) : 0;
    const r2 = Math.pow(rCoeff, 2);

    // Create sorted points with trendline projection coordinates
    const sortedPoints = [...activePoints].sort((a, b) => a.x - b.x);
    const chartData = sortedPoints.map((p, idx) => ({
      index: idx,
      x: p.x,
      y: p.y,
      lineY: parseFloat((intercept + slope * p.x).toFixed(2))
    }));

    const handleAddPoint = () => {
      const rx = parseFloat(draftInputs.regX || '');
      const ry = parseFloat(draftInputs.regY || '');
      if (!isNaN(rx) && !isNaN(ry)) {
        const updated = [...(items.length > 0 ? items : defaultPoints), { x: rx, y: ry }];
        setItems(updated);
        setDraftInputs(prev => ({ ...prev, regX: '', regY: '' }));
        handleSave(updated, fields, notes);
      }
    };

    const handleClearPoints = () => {
      setItems([]);
      handleSave([], fields, notes);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Regressionsanalys
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
              Kausalitetsverifiering
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          <button
            onClick={handleClearPoints}
            className="text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-650 hover:bg-red-100 rounded-lg border border-red-200 transition-all flex items-center gap-1 shadow-sm"
          >
            Rensa & nollställ
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Controls & Mini Table */}
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/60">
              <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1 mb-3">
                <span>➕</span> Lägg till par (X, Y)
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold">X-variabel (Åtgärd)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-mono font-semibold"
                    placeholder="T.ex. Hastighet"
                    value={draftInputs.regX || ''}
                    onChange={(e) => setDraftInputs(p => ({ ...p, regX: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold">Y-variabel (Utfall)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-mono font-semibold"
                    placeholder="T.ex. Slitaget"
                    value={draftInputs.regY || ''}
                    onChange={(e) => setDraftInputs(p => ({ ...p, regY: e.target.value }))}
                  />
                </div>
              </div>
              <button
                onClick={handleAddPoint}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> Lägg till datapunkt
              </button>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-50 py-2 px-3 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                Inmatat Dataregister ({n} rader)
              </div>
              <div className="max-h-[160px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/20 text-slate-600 border-b border-slate-100 font-semibold">
                      <th className="p-2">#</th>
                      <th className="p-2">X-Datapunkt</th>
                      <th className="p-2">Y-Datapunkt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-mono">
                    {activePoints.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 animate-fade">
                        <td className="p-2 text-slate-400">{idx + 1}</td>
                        <td className="p-2 text-slate-700 font-medium">{pt.x}</td>
                        <td className="p-2 text-slate-700 font-medium">{pt.y}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Interactive Scatter Plot */}
          <div className="lg:col-span-2 flex flex-col justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex justify-between items-center">
              <span>📈 Spridningsdiagram & Regressionsmodell</span>
              <span className="text-emerald-700 font-extrabold font-mono text-[11px]">
                Ekvation: Y = {intercept.toFixed(2)} + {slope.toFixed(2)}X
              </span>
            </h4>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" type="number" fontSize={10} name="X" />
                  <YAxis dataKey="y" type="number" fontSize={10} name="Y" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  {/* Raw dots */}
                  <Scatter name="Datapunkter" dataKey="y" fill="#10b981" line={false} shape="circle" />
                  {/* Regression model trendline */}
                  <Line name="Modell (Trendlinje)" dataKey="lineY" stroke="#ef4444" strokeWidth={2.5} dot={false} strokeDasharray="4 4" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200">
              <div className="bg-white p-2.5 rounded-lg border border-slate-100 flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Förklaringsgrad (R²)</span>
                <span className="text-lg font-black font-mono text-emerald-600">{(r2 * 100).toFixed(1)}%</span>
                <span className="text-[9px] text-slate-400">Modellens prediktiva styrka</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-100 flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Korrelation (r)</span>
                <span className="text-lg font-black font-mono text-blue-600">{rCoeff.toFixed(3)}</span>
                <span className="text-[9px] text-slate-400">
                  {Math.abs(rCoeff) >= 0.7 ? 'Starkt lineärt samband' : Math.abs(rCoeff) >= 0.4 ? 'Måttligt samband' : 'Svagt eller inget samband'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <label className="block text-xs font-bold text-slate-600 uppercase">Ytterligare regressionsanalys</label>
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50"
            placeholder="Analysera spridningen, avvikande punkter (outliers) eller processändringar..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat regressionsmodell!
              </span>
            ) : (
              'Diagrammet och beräkningar sparas automatisk i projektet'
            )}
          </span>
          <button
            onClick={() => handleSave(activePoints, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Pugh Matrix (t_pugh)
  // ----------------------------------------------------
  if (toolId === 't_pugh' && !children) {
    const defaultCriteria = [
      { id: '1', text: 'Genomförbarhet (Implementation ease)', weight: 3 },
      { id: '2', text: 'Kostnadsbesparing (Cost reduction)', weight: 4 },
      { id: '3', text: 'Processcykeltid (Lead time)', weight: 5 },
      { id: '4', text: 'Driftsäkerhet & Underhåll', weight: 3 }
    ];
    const defaultConcepts = ['Koncept 1: Standardautomatisering', 'Koncept 2: Linjeombildning (Lean Flow)'];

    const activeCriteria = items.length > 0 ? items : defaultCriteria;
    const activeConcepts = fields.concepts || defaultConcepts;
    const scores = fields.scores || {};

    const handleAddCriterion = () => {
      const text = draftInputs.critText || '';
      const weight = parseInt(draftInputs.critWeight || '3');
      if (text) {
        const newCrit = { id: Date.now().toString(), text, weight };
        const updatedItems = [...(items.length > 0 ? items : defaultCriteria), newCrit];
        setItems(updatedItems);
        setDraftInputs(prev => ({ ...prev, critText: '', critWeight: '3' }));
        handleSave(updatedItems, fields, notes);
      }
    };

    const handleAddConcept = () => {
      const name = draftInputs.conceptName || '';
      if (name && !activeConcepts.includes(name)) {
        const updatedConcepts = [...activeConcepts, name];
        const updatedFields = { ...fields, concepts: updatedConcepts };
        setFields(updatedFields);
        setDraftInputs(prev => ({ ...prev, conceptName: '' }));
        handleSave(activeCriteria, updatedFields, notes);
      }
    };

    const handleRemoveConcept = (conceptName: string) => {
      const updatedConcepts = activeConcepts.filter(c => c !== conceptName);
      const updatedScores = { ...scores };
      Object.keys(updatedScores).forEach(key => {
        if (key.endsWith('_' + conceptName)) {
          delete updatedScores[key];
        }
      });
      const updatedFields = { ...fields, concepts: updatedConcepts, scores: updatedScores };
      setFields(updatedFields);
      handleSave(activeCriteria, updatedFields, notes);
    };

    const setScore = (critId: string, conceptName: string, score: number) => {
      const key = `${critId}_${conceptName}`;
      const updatedScores = { ...scores, [key]: score };
      const updatedFields = { ...fields, scores: updatedScores };
      setFields(updatedFields);
      handleSave(activeCriteria, updatedFields, notes);
    };

    const getScore = (critId: string, conceptName: string): number => {
      const val = scores[`${critId}_${conceptName}`];
      return val !== undefined ? val : 0;
    };

    // Calculations of concepts
    const totals = activeConcepts.map((concept: string) => {
      let positiveCount = 0;
      let negativeCount = 0;
      let equalCount = 0;
      let rawScore = 0;
      let weightedScore = 0;

      activeCriteria.forEach((crit: any) => {
        const s = getScore(crit.id, concept);
        if (s > 0) positiveCount++;
        else if (s < 0) negativeCount++;
        else equalCount++;

        rawScore += s;
        weightedScore += (s * crit.weight);
      });

      return {
        name: concept,
        pos: positiveCount,
        neg: negativeCount,
        eq: equalCount,
        raw: rawScore,
        weighted: weightedScore
      };
    });

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-600" /> Pugh Beslutsmatris (Lösningsval)
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-600 border border-orange-100">
              Lösningsutvärdering
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>

        {/* Input selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-orange-50/40 border border-orange-100/60 rounded-xl">
            <h4 className="text-xs font-bold text-orange-850 uppercase tracking-wider mb-3">Lägg till kriterium</h4>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 bg-white border border-slate-200 rounded text-xs"
                placeholder="T.ex. Ergonomi, Underhållskostnad..."
                value={draftInputs.critText || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, critText: e.target.value }))}
              />
              <select
                className="p-2 bg-white border border-slate-200 rounded text-xs"
                value={draftInputs.critWeight || '3'}
                onChange={(e) => setDraftInputs(p => ({ ...p, critWeight: e.target.value }))}
              >
                <option value="1">Vikt: 1</option>
                <option value="2">Vikt: 2</option>
                <option value="3">Vikt: 3</option>
                <option value="4">Vikt: 4</option>
                <option value="5">Vikt: 5</option>
              </select>
              <button
                onClick={handleAddCriterion}
                className="px-3 bg-orange-600 text-white rounded text-xs font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div className="p-4 bg-orange-50/40 border border-orange-100/60 rounded-xl">
            <h4 className="text-xs font-bold text-orange-850 uppercase tracking-wider mb-3">Lägg till lösningskoncept</h4>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 bg-white border border-slate-200 rounded text-xs"
                placeholder="T.ex. Koncept 3: Nytt robotredskap"
                value={draftInputs.conceptName || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, conceptName: e.target.value }))}
              />
              <button
                onClick={handleAddConcept}
                className="px-4 bg-orange-600 text-white rounded text-xs font-bold flex items-center gap-1 shrink-0"
              >
                Lägg till
              </button>
            </div>
          </div>
        </div>

        {/* Pugh Matrix Interactive Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3 w-4 z-10 sticky left-0 bg-slate-50 border-r border-slate-200">#</th>
                <th className="p-3 min-w-[180px] z-10 sticky left-6 bg-slate-50 border-r border-slate-200">Kvalitetskriterier</th>
                <th className="p-3 text-center w-16 border-r border-slate-200">Vikt</th>
                <th className="p-3 text-center w-24 bg-slate-100/60 border-r border-slate-200">Referens (Nu)</th>
                {activeConcepts.map((concept: string) => (
                  <th key={concept} className="p-3 text-center min-w-[124px] border-r border-slate-200 relative group">
                    <div className="flex flex-col items-center">
                      <span className="break-words max-w-[120px]">{concept}</span>
                      <button
                        onClick={() => handleRemoveConcept(concept)}
                        className="text-red-400 hover:text-red-650 font-bold text-[9px] mt-1 hover:underline"
                      >
                        Ta bort
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeCriteria.map((crit: any, idx: number) => (
                <tr key={crit.id} className="hover:bg-slate-50/50">
                  <td className="p-3 text-slate-400 font-mono font-medium sticky left-0 bg-white border-r border-slate-200">{idx + 1}</td>
                  <td className="p-3 font-semibold text-slate-800 sticky left-6 bg-white border-r border-slate-200">{crit.text}</td>
                  <td className="p-3 text-center font-bold text-orange-700 bg-orange-50/10 border-r border-slate-200">{crit.weight}</td>
                  <td className="p-3 text-center font-bold bg-slate-100/30 text-slate-400 border-r border-slate-200">0 (Bas)</td>
                  
                  {activeConcepts.map((concept: string) => {
                    const score = getScore(crit.id, concept);
                    return (
                      <td key={concept} className="p-3 text-center border-r border-slate-200">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => setScore(crit.id, concept, -1)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-black transition-all ${
                              score === -1 ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-300' : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600'
                            }`}
                          >
                            -
                          </button>
                          <button
                            onClick={() => setScore(crit.id, concept, 0)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-black transition-all ${
                              score === 0 ? 'bg-slate-400 text-white shadow-sm ring-2 ring-slate-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                            }`}
                          >
                            S
                          </button>
                          <button
                            onClick={() => setScore(crit.id, concept, 1)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-black transition-all ${
                              score === 1 ? 'bg-green-500 text-white shadow-sm ring-2 ring-green-300' : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Total Calculations */}
              <tr className="bg-slate-100/50 border-t-2 border-slate-300 font-bold text-[11px]">
                <td colSpan={2} className="p-3 text-right bg-slate-50 sticky left-0 border-r border-slate-200">Positiva (+) Antal:</td>
                <td className="bg-slate-50 border-r border-slate-200"></td>
                <td className="p-3 text-center text-slate-400 border-r border-slate-200">0</td>
                {totals.map((t: any) => (
                  <td key={t.name} className="p-3 text-center text-green-700 font-mono border-r border-slate-200 bg-green-50/20">{t.pos}</td>
                ))}
              </tr>
              <tr className="bg-slate-100/50 font-bold text-[11px]">
                <td colSpan={2} className="p-3 text-right bg-slate-50 sticky left-0 border-r border-slate-200">Negativa (-) Antal:</td>
                <td className="bg-slate-50 border-r border-slate-200"></td>
                <td className="p-3 text-center text-slate-400 border-r border-slate-200">0</td>
                {totals.map((t: any) => (
                  <td key={t.name} className="p-3 text-center text-red-700 font-mono border-r border-slate-200 bg-red-50/20">{t.neg}</td>
                ))}
              </tr>
              <tr className="bg-orange-50/30 font-extrabold text-[12px] border-b border-slate-300">
                <td colSpan={2} className="p-3 text-right bg-slate-50 sticky left-0 border-r border-slate-200 text-orange-950">Viktat Nettoresultat:</td>
                <td className="bg-slate-50 border-r border-slate-200"></td>
                <td className="p-3 text-center text-slate-400 border-r border-slate-200">0</td>
                {totals.map((t: any) => (
                  <td key={t.name} className={`p-4 text-center font-mono border-r border-slate-200 text-sm ${
                    t.weighted > 0 ? 'text-green-700 bg-green-50 font-black' : t.weighted < 0 ? 'text-red-700 bg-red-50' : 'text-slate-600 bg-slate-50'
                  }`}>{t.weighted}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Results assessment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">💡 Pugh Matrix Guideline:</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Välj det koncept som presterar bäst i det <b>viktade nettoresultatet</b>. Om två ligger nära, kombinera de positiva aspekterna hos de båda för att syntetisera ett unikt optimerat LSS-koncept!
            </p>
          </div>
          <div className="p-4 rounded-xl bg-orange-600 text-white flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest block text-orange-200">Bästa Lösningskandidat</span>
              <div className="text-lg font-black mt-2">
                {[...totals].sort((a,b) => b.weighted - a.weighted)[0]?.name || 'Ingen kandidat påbörjad'}
              </div>
            </div>
            <span className="text-[11px] text-orange-100 font-semibold italic mt-2">
              Modellen rekommenderar kandidaten med högst poäng!
            </span>
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm bg-slate-50"
            placeholder="Skriv dina kommentarer eller kombinera synpunkter..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat Pugh Matrix!
              </span>
            ) : (
              'Matrisen sparas löpande i ditt projekt'
            )}
          </span>
          <button
            onClick={() => handleSave(activeCriteria, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Value Stream Map Metrics (t_vsm)
  // ----------------------------------------------------
  if (toolId === 't_vsm' && !children) {
    const defaultSteps = [
      { id: '1', stepName: 'Orderregistrering', ct: 10, ctUnit: 'min', co: 2, coUnit: 'min', wait: 8, waitUnit: 'h' },
      { id: '2', stepName: 'Materialplock', ct: 35, ctUnit: 'min', co: 10, coUnit: 'min', wait: 24, waitUnit: 'h' },
      { id: '3', stepName: 'Primärmontering', ct: 45, ctUnit: 'min', co: 15, coUnit: 'min', wait: 48, waitUnit: 'h' },
      { id: '4', stepName: 'Kvalitetstest', ct: 15, ctUnit: 'min', co: 0, coUnit: 'min', wait: 4, waitUnit: 'h' }
    ];

    const activeSteps = items.length > 0 ? items : defaultSteps;

    const convertToSeconds = (val: number, unit: string): number => {
      if (unit === 's') return val;
      if (unit === 'min') return val * 60;
      if (unit === 'h') return val * 3600;
      if (unit === 'd') return val * 86400;
      return val;
    };

    let totalVASeconds = 0;
    let totalNVASeconds = 0;

    activeSteps.forEach(step => {
      totalVASeconds += convertToSeconds(step.ct || 0, step.ctUnit || 'min');
      totalNVASeconds += convertToSeconds(step.wait || 0, step.waitUnit || 'h');
    });

    const totalVAHours = totalVASeconds / 3600;
    const totalNVAHours = totalNVASeconds / 3600;
    const totalLeadTimeHours = totalVAHours + totalNVAHours;
    const pce = totalLeadTimeHours > 0 ? (totalVAHours / totalLeadTimeHours) * 100 : 0;

    const handleAddVSMStep = () => {
      const stepName = draftInputs.vsmName || '';
      const ct = parseFloat(draftInputs.vsmCT || '10');
      const ctUnit = draftInputs.vsmCTUnit || 'min';
      const wait = parseFloat(draftInputs.vsmWait || '4');
      const waitUnit = draftInputs.vsmWaitUnit || 'h';

      if (stepName) {
        const newStep = {
          id: Date.now().toString(),
          stepName,
          ct,
          ctUnit,
          co: 0,
          coUnit: 'min',
          wait,
          waitUnit
        };
        const updatedSteps = [...(items.length > 0 ? items : defaultSteps), newStep];
        setItems(updatedSteps);
        setDraftInputs(prev => ({ ...prev, vsmName: '', vsmCT: '10', vsmWait: '4' }));
        handleSave(updatedSteps, fields, notes);
      }
    };

    const handleRemoveVSMStep = (id: string) => {
      const updated = activeSteps.filter(s => s.id !== id);
      setItems(updated);
      handleSave(updated, fields, notes);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" /> VSM-Flödestidskalkylator
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-600 border border-blue-100">
              Value Stream Mapping
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
        </div>

        {/* Dashboard Cards KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <span className="text-[10px] text-blue-800 uppercase font-bold tracking-wider">Värdeskapande Tid (VA)</span>
            <div className="text-2xl font-black text-blue-950 font-mono mt-1">
              {totalVAHours >= 1 ? `${totalVAHours.toFixed(2)} h` : `${(totalVAHours*60).toFixed(0)} min`}
            </div>
            <p className="text-[10px] text-blue-700/80 mt-1 font-medium">Summan av bearbetningstid (C/T)</p>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <span className="text-[10px] text-amber-800 uppercase font-bold tracking-wider">Icke Värdeskapande (NVA)</span>
            <div className="text-2xl font-black text-amber-950 font-mono mt-1">
              {totalNVAHours >= 24 ? `${(totalNVAHours/24).toFixed(1)} d` : `${totalNVAHours.toFixed(1)} h`}
            </div>
            <p className="text-[10px] text-amber-700/80 mt-1 font-medium">Ledtidsförluster (Väntetid/Lager)</p>
          </div>
          <div className="p-4 bg-slate-900 text-white rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Flödeseffektivitet (PCE)</span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {pce.toFixed(2)}%
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Världsklass (Lean): ≥ 25%</p>
          </div>
        </div>

        {/* Steps Editor Form */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Snabblägg till processteg i flödet</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Mottagarsteg / Aktivitet</label>
              <input
                type="text"
                className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                placeholder="T.ex. Ytbehandling"
                value={draftInputs.vsmName || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, vsmName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Cykeltid (VA Bearbetning)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                  placeholder="20"
                  value={draftInputs.vsmCT || ''}
                  onChange={(e) => setDraftInputs(p => ({ ...p, vsmCT: e.target.value }))}
                />
                <select
                  className="p-2 bg-white border border-slate-200 rounded text-xs"
                  value={draftInputs.vsmCTUnit || 'min'}
                  onChange={(e) => setDraftInputs(p => ({ ...p, vsmCTUnit: e.target.value }))}
                >
                  <option value="s">s</option>
                  <option value="min">min</option>
                  <option value="h">h</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Väntetid till nästa steg</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                  placeholder="8"
                  value={draftInputs.vsmWait || ''}
                  onChange={(e) => setDraftInputs(p => ({ ...p, vsmWait: e.target.value }))}
                />
                <select
                  className="p-2 bg-white border border-slate-200 rounded text-xs"
                  value={draftInputs.vsmWaitUnit || 'h'}
                  onChange={(e) => setDraftInputs(p => ({ ...p, vsmWaitUnit: e.target.value }))}
                >
                  <option value="h">timmar</option>
                  <option value="d">dagar</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={handleAddVSMStep}
              className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-all shadow-sm flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Infoga processteg
            </button>
          </div>
        </div>

        {/* Ladder visual timeline map */}
        <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-xl border border-slate-700">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Value Stream Timeline (Ledtidstrappa)</h4>
          <div className="flex flex-wrap md:flex-nowrap gap-4 items-stretch overflow-x-auto min-h-[140px] pb-2 text-[10px]">
            {activeSteps.map((step: any, idx: number) => {
              const ctShow = `${step.ct} ${step.ctUnit}`;
              const waitShow = `${step.wait} ${step.waitUnit}`;
              return (
                <div key={step.id} className="flex-1 min-w-[150px] flex flex-col justify-between border-r border-slate-800 pr-2 relative last:border-0">
                  {/* Step block */}
                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg text-slate-100 flex flex-col justify-between relative shadow-sm">
                    <span className="font-bold uppercase text-[9px] text-blue-400 block truncate">Steg {idx+1}: {step.stepName}</span>
                    <div className="mt-2 flex items-center justify-between text-slate-300 font-mono">
                      <span>C/T (VA):</span>
                      <span className="font-extrabold text-emerald-400">{ctShow}</span>
                    </div>
                  </div>

                  {/* VSM Ladder segment */}
                  <div className="mt-4 font-mono select-none">
                    {/* Process line down */}
                    <div className="h-0.5 bg-blue-500 w-full relative">
                      <div className="absolute top-1 left-2 font-bold text-[9px] text-blue-400 uppercase">Process: {ctShow}</div>
                    </div>
                    {/* Wait segment up */}
                    <div className="h-5 border-l-2 border-r-2 border-dashed border-amber-500 bg-amber-500/10 flex items-center justify-center mt-3 text-amber-300 relative font-bold text-[9px] rounded">
                      <span> lager / kö: {waitShow}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveVSMStep(step.id)}
                    className="absolute top-1 right-2 text-[9px] text-red-400 hover:text-red-300 bg-slate-950/40 p-1 rounded hover:scale-105"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
            placeholder="Skriv dina egna iakttagelser om värdeskapande vs slöseri (Muda)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat VSM-nyckeltal!
              </span>
            ) : (
              'VSM ledtidstrappan sparas automatiskt'
            )}
          </span>
          <button
            onClick={() => handleSave(activeSteps, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Kano Model Classifier (t_kano)
  // ----------------------------------------------------
  if (toolId === 't_kano' && !children) {
    const defaultKano = [
      { id: 'k1', name: 'Snabbkopplad slangadapter', func: '1', dys: '3' },
      { id: 'k2', name: 'Tätande gummipackning', func: '2', dys: '5' },
      { id: 'k3', name: 'Aluminiumförstärkt hölje', func: '1', dys: '5' },
      { id: 'k4', name: 'Skräddarsydd bärväska', func: '3', dys: '3' }
    ];

    const activeKano = items.length > 0 ? items : defaultKano;

    const funcValueMap: Record<string, string> = { '1': '1', '2': '2', '3': '3', '4': '4', '5': '5' };
    const kanoBetygLabelMap: Record<string, string> = {
      '1': 'Gillar',
      '2': 'Måste ha',
      '3': 'Neutral',
      '4': 'Leva med',
      '5': 'Ogillar'
    };

    // Standard Kano evaluation matrix:
    // Functional score: 1=Like (Gillar), 2=Must-be (Förväntar), 3=Neutral (Neutral), 4=Live with (Kan leva med), 5=Dislike (Ogillar)
    // Dysfunctional score: 1=Like, 2=Must-be, 3=Neutral, 4=Live with, 5=Dislike
    // Return M (Must-be), A (Attractive), O (One-dimensional), I (Indifferent), R (Reverse), Q (Questionable)
    const classifyKanoRule = (f: string, d: string): { code: string; label: string; color: string } => {
      const func = parseInt(funcValueMap[f] || f);
      const dys = parseInt(funcValueMap[d] || d);

      if (func === 1) {
        if (dys === 1) return { code: 'Q', label: 'Tveksamt (Q)', color: 'bg-indigo-100 text-indigo-700' };
        if (dys === 2 || dys === 3 || dys === 4) return { code: 'A', label: 'Hänförelse (A)', color: 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' };
        if (dys === 5) return { code: 'O', label: 'Prestanda (O)', color: 'bg-blue-100 text-blue-800 font-bold border border-blue-300' };
      }
      if (func === 2 || func === 3 || func === 4) {
        if (dys === 1) return { code: 'R', label: 'Omvänt (R)', color: 'bg-red-100 text-red-700' };
        if (dys === 2 || dys === 3 || dys === 4) return { code: 'I', label: 'Ointressant (I)', color: 'bg-slate-100 text-slate-500' };
        if (dys === 5) return { code: 'M', label: 'Måste-krav (M)', color: 'bg-amber-100 text-amber-800 font-bold border border-amber-300' };
      }
      if (func === 5) {
        if (dys === 5) return { code: 'Q', label: 'Tveksamt (Q)', color: 'bg-indigo-100 text-indigo-700' };
        return { code: 'R', label: 'Omvänt (R)', color: 'bg-red-100 text-red-700' };
      }
      return { code: 'I', label: 'Ointressant (I)', color: 'bg-slate-100 text-slate-400' };
    };

    const handleAddKano = () => {
      const name = draftInputs.kanoName || '';
      const func = draftInputs.kanoFunc || '1';
      const dys = draftInputs.kanoDys || '3';
      if (name) {
        const updated = [...activeKano, { id: Date.now().toString(), name, func, dys }];
        setItems(updated);
        setDraftInputs(prev => ({ ...prev, kanoName: '' }));
        handleSave(updated, fields, notes);
      }
    };

    const handleRemoveKano = (id: string) => {
      const updated = activeKano.filter(x => x.id !== id);
      setItems(updated);
      handleSave(updated, fields, notes);
    };

    const loadKanoExample = () => {
      const ex = [
        { id: '1', name: 'Luftkonditionering i hytt', func: '2', dys: '5' },
        { id: '2', name: 'Inbyggt Bluetooth-ljudsystem', func: '1', dys: '3' },
        { id: '3', name: 'Bränsleförbrukning reducerad med 15%', func: '1', dys: '5' },
        { id: '4', name: 'Mugghållare (extra stor)', func: '3', dys: '3' },
        { id: '5', name: 'Sätesvärmare bak', func: '1', dys: '4' }
      ];
      setItems(ex);
      handleSave(ex, fields, notes);
    };

    const categorySummary = activeKano.reduce((acc, item) => {
      const res = classifyKanoRule(item.func, item.dys).code;
      acc[res] = (acc[res] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" /> Kano Kundtillfredsställelsemodell
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 mt-1 inline-block">
              Kundfokus (VOC-prioritering)
            </span>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
          <button
            onClick={loadKanoExample}
            className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ladda exempel
          </button>
        </div>

        {/* Kano classification cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl mb-6 border border-slate-150">
          <div className="p-2.5 bg-white rounded-lg border text-center shadow-sm">
            <span className="text-[10px] text-emerald-600 font-extrabold uppercase font-mono block">A: Hänförelse-krav</span>
            <span className="text-2xl font-black text-slate-800 block">{categorySummary['A'] || 0}</span>
            <span className="text-[9px] text-slate-400">Skapar stor förtjusning</span>
          </div>
          <div className="p-2.5 bg-white rounded-lg border text-center shadow-sm">
            <span className="text-[10px] text-blue-600 font-extrabold uppercase font-mono block">O: Prestanda-krav</span>
            <span className="text-2xl font-black text-slate-800 block">{categorySummary['O'] || 0}</span>
            <span className="text-[9px] text-slate-400">Ju mer desto nöjdare kund</span>
          </div>
          <div className="p-2.5 bg-white rounded-lg border text-center shadow-sm">
            <span className="text-[10px] text-amber-600 font-extrabold uppercase font-mono block">M: Måste-krav</span>
            <span className="text-2xl font-black text-slate-800 block">{categorySummary['M'] || 0}</span>
            <span className="text-[9px] text-slate-400">Tas för givet (kritisk risk)</span>
          </div>
          <div className="p-2.5 bg-white rounded-lg border text-center shadow-sm">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase font-mono block">I: Ointressanta</span>
            <span className="text-2xl font-black text-slate-800 block">{categorySummary['I'] || 0}</span>
            <span className="text-[9px] text-slate-400">Det kvittar för kunden</span>
          </div>
        </div>

        {/* Add item bar */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 font-medium text-xs space-y-3">
          <h4 className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Lägg till ny egenskap & märk betyg</h4>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="block text-[10px] text-slate-500 font-bold mb-1 col-span-5">Kundkrav / Egenskap</label>
              <input
                type="text"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                placeholder="T.ex. Slitstark ytlackering..."
                value={draftInputs.kanoName || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, kanoName: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Närvarande (Funktionell)</label>
              <select
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                value={draftInputs.kanoFunc || '1'}
                onChange={(e) => setDraftInputs(p => ({ ...p, kanoFunc: e.target.value }))}
              >
                <option value="1">1: Jag gillar det</option>
                <option value="2">2: Det måste vara så</option>
                <option value="3">3: Jag är neutral</option>
                <option value="4">4: Jag kan leva med det</option>
                <option value="5">5: Jag ogillar det</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Frånvarande (Dysfunktionell)</label>
              <select
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                value={draftInputs.kanoDys || '3'}
                onChange={(e) => setDraftInputs(p => ({ ...p, kanoDys: e.target.value }))}
              >
                <option value="1">1: Jag gillar det</option>
                <option value="2">2: Det måste vara så</option>
                <option value="3">3: Jag är neutral</option>
                <option value="4">4: Jag kan leva med det</option>
                <option value="5">5: Jag ogillar det</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <button
                onClick={handleAddKano}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shrink-0 flex items-center justify-center transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Requirements interactive table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <th className="p-3 w-8">#</th>
                <th className="p-3">Produkt-/Tjänsteegenskap</th>
                <th className="p-3 text-center">Närvarande</th>
                <th className="p-3 text-center">Frånvarande</th>
                <th className="p-3 text-center w-36">Klassificering</th>
                <th className="p-3 text-center w-12">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {activeKano.map((k, idx) => {
                const spec = classifyKanoRule(k.func, k.dys);
                const showFuncText = kanoBetygLabelMap[k.func] || k.func;
                const showDysText = kanoBetygLabelMap[k.dys] || k.dys;
                return (
                  <tr key={k.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-400 font-semibold font-mono">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-800">{k.name}</td>
                    <td className="p-3 text-center text-slate-600 font-medium">{showFuncText}</td>
                    <td className="p-3 text-center text-slate-600 font-medium">{showDysText}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide block text-center uppercase ${spec.color}`}>
                        {spec.label}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleRemoveKano(k.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50"
            placeholder="Skriv kommentarer eller slutsatser gällande er Kano-analys..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat Kano-analys till projektet!
              </span>
            ) : (
              'Klicka för att spara resultat'
            )}
          </span>
          <button
            onClick={() => handleSave(activeKano, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE CALCULATOR: DPMO & Process Sigma Level (t_dpmo & t_sigma)
  // ----------------------------------------------------
  if ((toolId === 't_dpmo' || toolId === 't_sigma') && !children) {
    const units = parseFloat(fields.units || '10000');
    const defects = parseFloat(fields.defects || '120');
    const opps = parseFloat(fields.opps || '5');

    // Calculations
    const totalOpps = Math.max(1, units * opps);
    const dpo = Math.max(0, defects / totalOpps);
    const dpmo = dpo * 1000000;
    const dpu = defects / Math.max(1, units);
    const yieldPct = Math.max(0.0, Math.min(100.0, (1 - dpo) * 100));

    // Calculate Sigma level (with 1.5 sigma shift standard)
    let calculatedSigma = 0;
    if (dpo >= 0.999999) {
      calculatedSigma = 0.5; // low limit
    } else if (dpo <= 0.0000001) {
      calculatedSigma = 6.0; // high limit
    } else {
      // Normal Inverse approximation
      const zScore = normSinv(1 - dpo);
      calculatedSigma = zScore + 1.5;
    }

    if (calculatedSigma < 0.5) calculatedSigma = 0.5;
    if (calculatedSigma > 6.0) calculatedSigma = 6.0;

    const setFieldLocal = (key: string, v: string) => {
      const updated = { ...fields, [key]: v };
      setFields(updated);
    };

    const loadPepsiDPMO = () => {
      const up = { units: '25000', defects: '45', opps: '6' };
      setFields(up);
      handleSave(items, up, notes);
    };

    // SVG Gauge calculation
    const gaugeAngle = -180 + ((calculatedSigma - 1) / (6 - 1)) * 180;
    const arrowRotationTransform = `rotate(${gaugeAngle} 100 100)`;

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" /> DPMO & Process Sigma-kalkylator
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 mt-1 inline-block">
              Statistiska Mätetal (Defekttaktsanalys)
            </span>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
          <button
            onClick={loadPepsiDPMO}
            className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all flex items-center gap-1.5 shadow-sm focus:outline-none"
          >
            <Sparkles className="w-3.5 h-3.5" /> Pepsi Flaskfyllning exempel
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Inputs Column */}
          <div className="lg:col-span-5 space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-150 pb-1.5">Mätdata Parametrar</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Totala enheter inspekterade (N)</label>
                <input
                  type="number"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold font-mono"
                  value={units}
                  onChange={(e) => setFieldLocal('units', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Antal defekter funna (D)</label>
                <input
                  type="number"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold font-mono text-red-650"
                  value={defects}
                  onChange={(e) => setFieldLocal('defects', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Felmöjligheter per enhet (O)</label>
                <input
                  type="number"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold font-mono text-slate-700"
                  value={opps}
                  onChange={(e) => setFieldLocal('opps', e.target.value)}
                />
              </div>
            </div>

            <div className="bg-slate-900 text-slate-300 p-3 rounded-lg text-[11px] font-mono leading-relaxed">
              <span className="font-bold text-amber-400 block mb-1">📐 Formel för DPMO:</span>
              DPMO = (Defekter / (Enheter × Möjligheter)) × 1 000 000 = <br/>
              <b>{(defects).toLocaleString('sv-SE')} / ({(units).toLocaleString('sv-SE')} × {opps}) × 10⁶</b>
            </div>
          </div>

          {/* Results dashboard */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Visual Gauge */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-between border border-slate-950">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Process Sigma-nivå</span>
              
              <div className="relative w-40 h-24 mt-2">
                <svg viewBox="0 0 200 100" className="w-full h-full">
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#dc2626" strokeWidth="20" strokeLinecap="round" />
                  <path d="M 40 96 A 70 70 0 0 1 160 96" fill="none" stroke="#f59e0b" strokeWidth="15" />
                  <path d="M 60 96 A 55 55 0 0 1 140 96" fill="none" stroke="#10b981" strokeWidth="15" />
                  <polygon points="100,10 95,95 105,95" fill="#f8fafc" transform={arrowRotationTransform} className="origin-[100px_95px] transition-transform duration-700" />
                  <circle cx="100" cy="95" r="8" fill="#e2e8f0" />
                </svg>
                <div className="absolute bottom-1 left-0 right-0 text-center">
                  <span className="text-3xl font-black font-mono text-emerald-400">{calculatedSigma.toFixed(2)}σ</span>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase">Inkl. 1.5σ skift</p>
                </div>
              </div>

              <div className="text-[10px] bg-slate-800 text-slate-200 p-2.5 rounded-lg text-center w-full mt-2 leading-relaxed">
                {calculatedSigma >= 5.0 
                  ? '🌟 Gränsar till perfektion! Exceptionell processkontroll.' 
                  : calculatedSigma >= 3.8 
                    ? '👍 Mycket robust kvalitet. Fortsätt bevaka spridningen.' 
                    : '⚠️ Behöver förbättras kraftigt! Sänk risken och utför kapabilitetskontroll.'}
              </div>
            </div>

            {/* Numeric Indicators */}
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">DPMO (Defects Per Million Opps)</span>
                <span className="text-2xl font-black font-mono text-emerald-600 block mt-0.5">
                  {dpmo >= 100000 ? `${(dpmo/1000).toFixed(0)}k` : dpmo.toLocaleString('sv-SE', { maximumFractionDigits: 0 })}
                </span>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, (1 - (dpmo/1000000)) * 100)}%` }} />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Process Yield (Utbyte %)</span>
                <span className="text-2xl font-black font-mono text-blue-600 block mt-0.5">
                  {yieldPct.toFixed(4)}%
                </span>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-blue-500 h-full" style={{ width: `${yieldPct}%` }} />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Defekter Per Enhet (DPU)</span>
                <span className="text-2xl font-black font-mono text-orange-600 block mt-0.5">
                  {dpu.toFixed(4)}
                </span>
                <span className="text-[9px] text-slate-400 block">Genomsnittligt antal fel per producerad flaska/enhet.</span>
              </div>
            </div>

          </div>
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-555 focus:ring-emerald-500 text-sm bg-slate-50"
            placeholder="Skriv kommentarer om DPMO och Process Sigma mätetalen..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat framgångsrikt till mätetal!
              </span>
            ) : (
              'Kom ihåg att trycka på Spara'
            )}
          </span>
          <button
            onClick={() => handleSave(items, { units, defects, opps }, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Voice of Customer & CTQ Translation Matrix (t_voc & t_ctq)
  // ----------------------------------------------------
  if ((toolId === 't_voc' || toolId === 't_ctq') && !children) {
    const defaultVoc = [
      { id: 'v1', voc: 'Korken ska vara enkel att öppna men flaskan får absolut inte läcka.', driver: 'Gängningsprecision & tätningsgrepp', ctq: 'Öppningsmoment mellan 1.5 och 2.8 Nm', status: 'Pass' },
      { id: 'v2', voc: 'Läsken ska upplevas extremt bubblig och fräsch vid konsumtion.', driver: 'Kolsyretryck vid buteljering', ctq: 'Kolsyrenivå: 4.0 ± 0.2 volymer CO2', status: 'Review' },
      { id: 'v3', voc: 'Snabba leveransbesked vid grossistbeställningar.', driver: 'Affärssystemets orderhantering', ctq: 'Orderbekräftelse skickad inom ≤ 15 minuter', status: 'In Progress' }
    ];

    const activeVoc = items.length > 0 ? items : defaultVoc;

    const handleAddVoc = () => {
      const voc = draftInputs.vocText || '';
      const driver = draftInputs.vocDriver || '';
      const ctq = draftInputs.vocCtq || '';
      const status = draftInputs.vocStatus || 'In Progress';
      
      if (voc) {
        const updated = [...activeVoc, { id: Date.now().toString(), voc, driver, ctq, status }];
        setItems(updated);
        setDraftInputs(prev => ({ ...prev, vocText: '', vocDriver: '', vocCtq: '', vocStatus: 'In Progress' }));
        handleSave(updated, fields, notes);
      }
    };

    const handleRemoveVoc = (id: string) => {
      const updated = activeVoc.filter(x => x.id !== id);
      setItems(updated);
      handleSave(updated, fields, notes);
    };

    const loadVocExample = () => {
      setItems(defaultVoc);
      handleSave(defaultVoc, fields, notes);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" /> VOC & CTQ Translation Tree
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 mt-1 inline-block">
              Från Kundbehov till Mätbara Kvalitetskrav
            </span>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
          <button
            onClick={loadVocExample}
            className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ladda standardexempel
          </button>
        </div>

        {/* VOC Form */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 font-medium text-xs space-y-3">
          <h4 className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Översätt kundens röst (VOC) till CTQ</h4>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Voice of Customer (Kundbehov)</label>
              <textarea
                rows={1}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs resize-none"
                placeholder="T.ex: Flaskan ska inte läcka i liggande läge..."
                value={draftInputs.vocText || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, vocText: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Kvalitets-Driver (Processfokus)</label>
              <input
                type="text"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                placeholder="T.ex: Kapsylens tätningsgrepp"
                value={draftInputs.vocDriver || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, vocDriver: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">CTQ (Mätbart specifikt krav)</label>
              <input
                type="text"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                placeholder="T.ex: Kolsyrehållfasthet ≥ 98% efter 60 dagar"
                value={draftInputs.vocCtq || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, vocCtq: e.target.value }))}
              />
            </div>
            <div className="md:col-span-1.5">
              <label className="block text-[10px] text-slate-500 font-bold mb-1 col-span-2">Status</label>
              <select
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                value={draftInputs.vocStatus || 'In Progress'}
                onChange={(e) => setDraftInputs(p => ({ ...p, vocStatus: e.target.value }))}
              >
                <option value="Pass">Pass (Godkänd)</option>
                <option value="In Progress">Processing (Pågår)</option>
                <option value="Review">Review (Analys)</option>
              </select>
            </div>
            <div className="md:col-span-0.5">
              <button
                onClick={handleAddVoc}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Requirements Tree table mapping */}
        <div className="space-y-4 mb-6">
          {activeVoc.map((item) => {
            const statusClass = 
              item.status === 'Pass' ? 'bg-green-50 text-green-700 border border-green-200' :
              item.status === 'Review' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-blue-50 text-blue-700 border border-blue-200';
            return (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch p-4 bg-white border border-slate-205 rounded-xl border border-slate-200 relative hover:shadow-md transition-all">
                {/* VOC segment */}
                <div className="md:col-span-4 bg-slate-50/50 p-3 rounded-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block">VOC - Kundens Röst</span>
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-1">"{item.voc}"</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-bold">Steg 1 (Identifiera behov)</span>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex md:col-span-0.5 items-center justify-center text-slate-300">
                  <ChevronRight className="w-5 h-5" />
                </div>

                {/* Driver segment */}
                <div className="md:col-span-3 bg-indigo-50/10 p-3 rounded-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest font-mono block font-extrabold">Kvalitets-Driver</span>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed mt-1 font-semibold">{item.driver || 'Ej definierad'}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-bold">Steg 2 (Hitta fokusområde)</span>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex md:col-span-0.5 items-center justify-center text-slate-300">
                  <ChevronRight className="w-5 h-5" />
                </div>

                {/* CTQ Specific requirement */}
                <div className="md:col-span-4 bg-emerald-50/10 p-3 rounded-lg border border-dashed border-emerald-300/30 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-1">
                    <div>
                      <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest font-mono block font-extrabold">CTQ (Mätbart Krav)</span>
                      <p className="text-xs text-emerald-950 leading-relaxed mt-1 font-black font-mono">{item.ctq || 'Ej specificerad'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${statusClass}`}>
                      {item.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-bold">Steg 3 (Specificera tolerans)</span>
                </div>

                {/* Delete button absolutely positioned on card */}
                <button
                  onClick={() => handleRemoveVoc(item.id)}
                  className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1 font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50"
            placeholder="Skriv dina övergripande tankar om er CTQ toleransdefinition och mätmetoder..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat framgångsrikt till CTQ-databas!
              </span>
            ) : (
              'Kom ihåg att trycka på Spara'
            )}
          </span>
          <button
            onClick={() => handleSave(activeVoc, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Poka-Yoke Error Proofing (t_pokayoke)
  // ----------------------------------------------------
  if (toolId === 't_pokayoke' && !children) {
    const defaultPoka = [
      { id: 'p1', process: 'Påskruvning av kapsyl på PET-flaska', error: 'Snedgängad eller lös kapsyl passerar osedd', type: 'Control', solution: 'Vridmomentsensor integrerad i skruvhuvud stannar bandet direkt vid avvikelse.', sevBefore: 7, occBefore: 6, detBefore: 8, sevAfter: 7, occAfter: 1, detAfter: 1 }
    ];

    const activePoka = items.length > 0 ? items : defaultPoka;

    const calculateRPN = (sev: number, occ: number, det: number) => sev * occ * det;

    const handleAddPoka = () => {
      const process = draftInputs.pokaProc || '';
      const error = draftInputs.pokaErr || '';
      const type = draftInputs.pokaType || 'Control';
      const solution = draftInputs.pokaSol || '';
      
      const sevBefore = parseInt(draftInputs.pokaSevB || '5');
      const occBefore = parseInt(draftInputs.pokaOccB || '5');
      const detBefore = parseInt(draftInputs.pokaDetB || '5');

      const sevAfter = parseInt(draftInputs.pokaSevA || '5');
      const occAfter = parseInt(draftInputs.pokaOccA || '1');
      const detAfter = parseInt(draftInputs.pokaDetA || '1');
      
      if (process && solution) {
        const updated = [...activePoka, { 
          id: Date.now().toString(), 
          process, error, type, solution,
          sevBefore, occBefore, detBefore,
          sevAfter, occAfter, detAfter
        }];
        setItems(updated);
        setDraftInputs(prev => ({ 
          ...prev, 
          pokaProc: '', pokaErr: '', pokaSol: '',
          pokaSevB: '5', pokaOccB: '5', pokaDetB: '5',
          pokaSevA: '5', pokaOccA: '1', pokaDetA: '1' 
        }));
        handleSave(updated, fields, notes);
      }
    };

    const handleRemovePoka = (id: string) => {
      const updated = activePoka.filter(x => x.id !== id);
      setItems(updated);
      handleSave(updated, fields, notes);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-700" /> Poka-Yoke / Felsäkringsanalys
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mt-1 inline-block">
              Förbättra processer (Utforma bort fel)
            </span>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
        </div>

        {/* Input Form for Poka-Yoke */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 font-medium text-xs space-y-3">
          <h4 className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Ny Felsäkringsåtgärd & Riskreduktion</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Processsteg & Felkälla</label>
              <input
                type="text"
                className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                placeholder="T.ex: Inmatning av pall"
                value={draftInputs.pokaProc || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, pokaProc: e.target.value }))}
              />
              <input
                type="text"
                className="w-full p-2 bg-white border border-slate-200 rounded text-xs mt-1.5"
                placeholder="T.ex: Pallen placeras sned"
                value={draftInputs.pokaErr || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, pokaErr: e.target.value }))}
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-[10px] text-slate-500 font-bold mb-1 col-span-1">Poka-Yoke Typ</label>
              <select
                className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                value={draftInputs.pokaType || 'Control'}
                onChange={(e) => setDraftInputs(p => ({ ...p, pokaType: e.target.value }))}
              >
                <option value="Control">Shutoff (Stoppar)</option>
                <option value="Warning">Warning (Varnar)</option>
                <option value="Contact">Contact (Mekanisk)</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Teknisk Felsäkringslösning</label>
              <textarea
                rows={2}
                className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs resize-none"
                placeholder="T.ex: Styrklackar svetsas på bandet som mekaniskt tvingar pallen i rätt spår..."
                value={draftInputs.pokaSol || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, pokaSol: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 border-t border-slate-200">
            {/* Before parameters */}
            <div className="bg-red-50/50 p-2.5 rounded-lg border border-red-100 flex flex-col gap-1.5 md:col-span-3">
              <span className="text-[10px] font-bold text-red-800 uppercase">Risk FÖRE felsäkring</span>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[9px] text-slate-500 block">Allvar (S)</label>
                  <input type="number" min="1" max="10" className="w-full p-1 bg-white border border-slate-200 rounded text-[11px] font-bold" value={draftInputs.pokaSevB || '5'} onChange={(e) => setDraftInputs(p => ({ ...p, pokaSevB: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Sannol (O)</label>
                  <input type="number" min="1" max="10" className="w-full p-1 bg-white border border-slate-200 rounded text-[11px] font-bold" value={draftInputs.pokaOccB || '5'} onChange={(e) => setDraftInputs(p => ({ ...p, pokaOccB: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Detekt (D)</label>
                  <input type="number" min="1" max="10" className="w-full p-1 bg-white border border-slate-200 rounded text-[11px] font-bold" value={draftInputs.pokaDetB || '5'} onChange={(e) => setDraftInputs(p => ({ ...p, pokaDetB: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* After parameters */}
            <div className="bg-green-50/50 p-2.5 rounded-lg border border-green-200 flex flex-col gap-1.5 md:col-span-3 pb-2 relative">
              <span className="text-[10px] font-bold text-green-800 uppercase">Risk EFTER felsäkring</span>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[9px] text-slate-500 block">Allvar (S)</label>
                  <input type="number" min="1" max="10" className="w-full p-1 bg-white border border-slate-200 rounded text-[11px] font-bold" value={draftInputs.pokaSevA || '5'} onChange={(e) => setDraftInputs(p => ({ ...p, pokaSevA: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Sannol (O)</label>
                  <input type="number" min="1" max="10" className="w-full p-1 bg-white border border-slate-200 rounded text-[11px] font-bold" value={draftInputs.pokaOccA || '1'} onChange={(e) => setDraftInputs(p => ({ ...p, pokaOccA: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block">Detekt (D)</label>
                  <input type="number" min="1" max="10" className="w-full p-1 bg-white border border-slate-200 rounded text-[11px] font-bold" value={draftInputs.pokaDetA || '1'} onChange={(e) => setDraftInputs(p => ({ ...p, pokaDetA: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleAddPoka}
              className="py-1.5 px-4 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg shrink-0 flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Lägg till Poka-Yoke registrering
            </button>
          </div>
        </div>

        {/* List of active Poka-Yoke entries */}
        <div className="space-y-4 mb-6">
          {activePoka.map((p) => {
            const rpnBefore = calculateRPN(p.sevBefore, p.occBefore, p.detBefore);
            const rpnAfter = calculateRPN(p.sevAfter, p.occAfter, p.detAfter);
            const riskReduction = Math.round(((rpnBefore - rpnAfter) / rpnBefore) * 100);

            return (
              <div key={p.id} className="p-4 bg-white border border-slate-200 rounded-xl relative hover:shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  {/* Process details */}
                  <div className="md:col-span-8 space-y-2">
                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">
                      {p.type || 'Felsäkring'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800">Processsteg: {p.process}</h4>
                    <p className="text-xs text-slate-500 italic"><b>Potentiellt Fel:</b> {p.error}</p>
                    <div className="p-3 bg-indigo-50/10 border border-indigo-100 rounded-lg text-xs font-semibold leading-relaxed text-slate-705">
                      <span className="text-[10px] text-indigo-700 font-bold block mb-0.5">💡 Teknisk lösning:</span>
                      {p.solution}
                    </div>
                  </div>

                  {/* Risk analysis charts prior versus after */}
                  <div className="md:col-span-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100/70 pt-3 md:pt-0 md:pl-4">
                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
                      <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                        <span className="text-[9px] text-red-700 block uppercase">RPN FÖRE</span>
                        <div className="text-lg font-black font-mono text-red-650">{rpnBefore}</div>
                        <span className="text-[8px] text-slate-400 font-mono">S:{p.sevBefore} × O:{p.occBefore} × D:{p.detBefore}</span>
                      </div>
                      <div className="bg-green-50 p-2 rounded-lg border border-green-150">
                        <span className="text-[9px] text-green-700 block uppercase">RPN EFTER</span>
                        <div className="text-lg font-black font-mono text-green-750">{rpnAfter}</div>
                        <span className="text-[8px] text-slate-400 font-mono font-medium">S:{p.sevAfter} × O:{p.occAfter} × D:{p.detAfter}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white text-center p-2 rounded-lg mt-3">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block">Riskreducering</span>
                      <span className="text-base font-black text-emerald-400 font-mono">{riskReduction}%</span>
                    </div>
                  </div>

                </div>

                <button
                  onClick={() => handleRemovePoka(p.id)}
                  className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-700 text-sm bg-slate-50"
            placeholder="Skriv dina egna slutsatser eller reaktionsplaner gällande felsäkringen..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat framgångsrikt!
              </span>
            ) : (
              'Kom ihåg att trycka på Spara'
            )}
          </span>
          <button
            onClick={() => handleSave(activePoka, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SPECIALIZED INTERACTIVE TOOL: Stakeholder Analysis (t_stakeholder)
  // ----------------------------------------------------
  if (toolId === 't_stakeholder' && !children) {
    const defaultStakeholders = [
      { id: 'st1', label: 'Produktionschef', influence: 'Hög', interest: 'Hög', support: 'Förespråkare', strategy: 'Visa konkreta Cpk-resultat och resursbesparing.' },
      { id: 'st2', label: 'Operatörer på lina 3', influence: 'Låg', interest: 'Hög', support: 'Neutral', strategy: 'Involvera tidigt i 5S-revisioner och lyssna på ergonomiaspekter.' },
      { id: 'st3', label: 'Inköpsdirektör', influence: 'Hög', interest: 'Låg', support: 'Neutral', strategy: 'Håll informerad angående val av underleverantörer.' }
    ];

    const activeStakeholders = items.length > 0 ? items : defaultStakeholders;

    // Classification based on interest & influence
    const classifyStakeholder = (inf: string, intr: string) => {
      if (inf === 'Hög') {
        return intr === 'Hög' ? 'Key Player - Hantera nära' : 'Keep Satisfied - Håll tillfredsställd';
      }
      return intr === 'Hög' ? 'Keep Informed - Håll informerad' : 'Minimal Effort - Övervaka sporadiskt';
    };

    const handleAddStakeholder = () => {
      const label = draftInputs.stLabel || '';
      const influence = draftInputs.stInfluence || 'Hög';
      const interest = draftInputs.stInterest || 'Hög';
      const support = draftInputs.stSupport || 'Neutral';
      const strategy = draftInputs.stStrategy || '';
      
      if (label) {
        const updated = [...activeStakeholders, { id: Date.now().toString(), label, influence, interest, support, strategy }];
        setItems(updated);
        setDraftInputs(prev => ({ ...prev, stLabel: '', stStrategy: '' }));
        handleSave(updated, fields, notes);
      }
    };

    const handleRemoveStakeholder = (id: string) => {
      const updated = activeStakeholders.filter(x => x.id !== id);
      setItems(updated);
      handleSave(updated, fields, notes);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-700" /> Intressentanalys & Makt/Intresse-matris
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-150 mt-1 inline-block">
              Projektomgivning (Define-fas)
            </span>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
        </div>

        {/* Form add stakeholder */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 font-medium text-xs space-y-3">
          <h4 className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Lägg till intressent och hanteringsstrategi</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Intressent / Roll</label>
              <input
                type="text"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                placeholder="T.ex: Produktionsledare"
                value={draftInputs.stLabel || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, stLabel: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Beslutsmakt (Inflytande)</label>
              <select className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none" value={draftInputs.stInfluence || 'Hög'} onChange={(e) => setDraftInputs(p => ({ ...p, stInfluence: e.target.value }))}>
                <option value="Hög">Hög makt</option>
                <option value="Låg">Låg makt</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Engagemangsgrad (Intresse)</label>
              <select className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none" value={draftInputs.stInterest || 'Hög'} onChange={(e) => setDraftInputs(p => ({ ...p, stInterest: e.target.value }))}>
                <option value="Hög">Höggradigt intresserad</option>
                <option value="Låg">Låggradigt intresserad</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Nuvarande Inställning</label>
              <select className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none" value={draftInputs.stSupport || 'Neutral'} onChange={(e) => setDraftInputs(p => ({ ...p, stSupport: e.target.value }))}>
                <option value="Sponsor">Sponsor / Aktiv ledare</option>
                <option value="Förespråkare">Förespråkare (Positiv)</option>
                <option value="Neutral">Neutral</option>
                <option value="Motståndare">Motståndare (Negativ)</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] text-slate-500 font-bold mb-1 col-span-3">Hanteringsstrategi (Åtgärd)</label>
              <input
                type="text"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                placeholder="T.ex: Skicka månadsbrev etc."
                value={draftInputs.stStrategy || ''}
                onChange={(e) => setDraftInputs(p => ({ ...p, stStrategy: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={handleAddStakeholder}
              className="py-1.5 px-4 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg shrink-0 flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Lägg till intressent
            </button>
          </div>
        </div>

        {/* Interactive List of Registered Stakeholders */}
        <div className="space-y-3 mb-6">
          {activeStakeholders.map((s) => {
            const cls = classifyStakeholder(s.influence, s.interest);
            const supportColor = 
              s.support === 'Sponsor' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold' :
              s.support === 'Förespråkare' ? 'bg-green-50 text-green-700 border border-green-200' :
              s.support === 'Motståndare' ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold' :
              'bg-slate-100 text-slate-600 border border-slate-200';
            
            const positionClass = 
              cls.startsWith('Key Player') ? 'bg-indigo-900 text-white font-bold border border-indigo-950' :
              cls.startsWith('Keep Satisfied') ? 'bg-sky-50 text-sky-800 border border-sky-200' :
              cls.startsWith('Keep Informed') ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              'bg-slate-50 text-slate-500 border border-slate-200';

            return (
              <div key={s.id} className="p-4 bg-white border border-slate-200 rounded-xl relative hover:shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4">
                  <h4 className="text-xs font-black text-slate-800">{s.label}</h4>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200">
                      Makt: {s.influence}
                    </span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200">
                      Intresse: {s.interest}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-5 space-y-1">
                  <span className="text-[8px] font-black uppercase text-slate-400 font-mono block">Intressentstrategi:</span>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{s.strategy || 'Hantera löpande enligt standardförfarande.'}</p>
                </div>

                <div className="md:col-span-3 flex flex-row md:flex-col gap-1.5 items-end justify-between md:justify-center border-t md:border-t-0 border-dashed border-slate-100 pt-3 md:pt-0">
                  <span className={`px-2 py-1 rounded-full text-[9px] uppercase text-center block w-full max-w-[150px] font-bold ${supportColor}`}>
                    {s.support}
                  </span>
                  <span className={`px-2 py-1 rounded text-[9px] font-extrabold uppercase text-center block w-full max-w-[150px] ${positionClass}`}>
                    {cls}
                  </span>
                </div>

                <button onClick={() => handleRemoveStakeholder(s.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500">
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <div className="mb-6 space-y-1.5">
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-700 text-sm bg-slate-50 shadow-inner rounded-xl"
            placeholder="Skriv dina egna slutsatser eller hanteringsplaner gällande intressentanalysen..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat framgångsrikt!
              </span>
            ) : (
              'Kom ihåg att trycka på Spara'
            )}
          </span>
          <button
            onClick={() => handleSave(activeStakeholders, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // GENERAL FALLBACK: Standard Text Area Editor (For nested custom content types)
  // ----------------------------------------------------
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
      {children ? (
        children
      ) : (
        <>
          <div className="flex items-start justify-between mb-4 border-b border-slate-50 pb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-slate-400" /> {title}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            </div>
          </div>
          <div className="flex-1">
            <textarea
              className="w-full min-h-[180px] p-3 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-slate-50 resize-y"
              placeholder={`Skriv dina anteckningar, slutsatser eller resultat för ${title} här...`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={() => handleSave(items, fields, notes)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-sm transition-all"
            >
              <Save className="w-4 h-4" /> Spara
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ToolContainer;

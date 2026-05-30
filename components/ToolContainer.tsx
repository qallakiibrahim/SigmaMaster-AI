import React, { useState, useEffect } from 'react';
import { ProjectData } from '../types';
import { TOOLS_LIBRARY } from '../data/toolsData';
import { 
  Wrench, Plus, Trash2, Save, Check, Calculator, AlertTriangle, 
  HelpCircle, CheckCircle, FileText, Sparkles, Sliders, ChevronRight,
  Shuffle, ArrowRight, Percent, ClipboardList, TrendingUp
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
  // SPECIALIZED INTERACTIVE CALCULATOR: Problemformulering (t_problem)
  // ----------------------------------------------------
  if (toolId === 't_problem' && !children) {
    const what = fields.what || '';
    const where = fields.where || '';
    const when = fields.when || '';
    const size = fields.size || '';
    const impact = fields.impact || '';

    const autoFormulated = what || where || when || size || impact
      ? `${what ? what + '. ' : ''}${where ? 'Det uppstår i ' + where + '. ' : ''}${when ? 'Problemet har observerats ' + when + '. ' : ''}${size ? 'Omfattningen är ' + size + '. ' : ''}${impact ? 'Påverkan: ' + impact + '.' : ''}`
      : 'Inget problem formulerat än.';

    const loadPepsiExample = () => {
      const pepsiFields = {
        what: 'Packmaskin har 6,25% stillestånd på OEE för Pepsi-produkten',
        where: 'Packningslinje 3, Pepsi 0,5L',
        when: 'Sedan januari 2026, dagligen',
        size: '6,25% stillestånd = ca 150 förlorade produktionstimmar/42 veckor',
        impact: 'Förlorad produktion, ökade kostnader, missat leveransmål'
      };
      setFields(pepsiFields);
      handleSave(items, pepsiFields, notes);
    };

    const updateField = (key: string, val: string) => {
      const updatedFields = { ...fields, [key]: val };
      setFields(updatedFields);
    };

    return (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col h-auto ${className || ''}`}>
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-purple-600" /> Problemformulering
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-600 border border-purple-100">
              Projektdefinition
            </span>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          <button
            onClick={loadPepsiExample}
            className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ladda Pepsi-data
          </button>
        </div>

        <div className="p-5 bg-purple-50/40 rounded-xl border border-purple-100/50 space-y-4 mb-6">
          <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2">
            <span>⚙️</span> Interaktivt Verktyg
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">VAD är problemet?</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="T.ex. Packmaskin har stannat" 
                value={what}
                onChange={(e) => updateField('what', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">VAR uppstår det?</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="T.ex. Packningslinje 3" 
                  value={where}
                  onChange={(e) => updateField('where', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">NÄR uppstår det?</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="T.ex. Sedan januari 2026, dagligen" 
                  value={when}
                  onChange={(e) => updateField('when', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Hur STORT är det?</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="T.ex. Ca 6.25% stillestånd" 
                  value={size}
                  onChange={(e) => updateField('size', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Vilken PÅVERKAN har det?</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="T.ex. Förlorade produktionstimmar" 
                  value={impact}
                  onChange={(e) => updateField('impact', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Real-time sentences compiling display */}
        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl mb-6 relative shadow-inner">
          <span className="absolute top-2 right-3 text-[10px] uppercase font-mono text-slate-500 font-bold">Autogenererad output</span>
          <h4 className="text-xs font-bold text-orange-400 mb-2 flex items-center gap-1">
            <span>📝</span> Problemformulering:
          </h4>
          <p className="text-sm font-medium leading-relaxed font-serif whitespace-pre-wrap select-all">
            {autoFormulated}
          </p>
        </div>

        {/* Optional notes */}
        <div className="mb-6 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600">Ytterligare kommentarer/anteckningar</label>
          <textarea
            className="w-full min-h-[90px] p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm bg-slate-50"
            placeholder="Skriv dina kommentarer här..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" /> Sparat till projektet!
              </span>
            ) : (
              'Kom ihåg att spara dina ändringar'
            )}
          </span>
          <button
            onClick={() => handleSave(items, fields, notes)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
          >
            <Save className="w-4 h-4" /> Spara till projekt
          </button>
        </div>

        {/* Manual guidelines block */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-[12px] text-slate-500 space-y-2">
          <div>
            <span className="font-bold text-slate-700 block mb-0.5">💡 Användning</span>
            Beskriv vad, var, när och omfattning - men INTE varför eller hur. Detta isolerar problemet innan ni söker rotorsaker.
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-100 italic">
            <span className="font-bold text-slate-600 not-italic block">Exempel:</span>
            Vad: 15% defekter • Var: Monteringsavdelning • När: Sedan Q2 • Omfattning: 500 enheter/månad
          </div>
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

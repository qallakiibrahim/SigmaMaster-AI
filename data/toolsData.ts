import { Phase, SixSigmaTool } from '../types';

export const TOOLS_LIBRARY: SixSigmaTool[] = [
  // Define
  { id: 't_charter', name: 'Project Charter', description: 'Formellt dokument som definierar projektets syfte, omfattning och mål.', phase: Phase.DEFINE, recommended: true },
  { id: 't_sipoc', name: 'SIPOC Diagram', description: 'Suppliers, Inputs, Process, Outputs, Customers - Högnivåöversikt av processen.', phase: Phase.DEFINE, recommended: true },
  { id: 't_voc', name: 'Voice of Customer (VOC)', description: 'Metod för å samla in och förstå kundernas behov och förväntningar.', phase: Phase.DEFINE, recommended: true },
  { id: 't_ctq', name: 'CTQ Tree (Critical to Quality)', description: 'Översätter kundbehov till mätbara krav.', phase: Phase.DEFINE, recommended: false },
  { id: 't_stakeholder', name: 'Intressentanalys', description: 'Identifierar och prioriterar projektets intressenter.', phase: Phase.DEFINE, recommended: true },
  { id: 't_problem', name: 'Problemformulering', description: 'Tydlig och specifik beskrivning av problemet.', phase: Phase.DEFINE, recommended: true },
  { id: 't_kano', name: 'Kano-modell', description: 'Kategoriserar kundkrav i Basic, Performance och Delighters.', phase: Phase.DEFINE, recommended: false },

  // Measure
  { id: 't_process_map', name: 'Processkartläggning', description: 'Detaljerad visuell representation av processflödet.', phase: Phase.MEASURE, recommended: true },
  { id: 't_data_plan', name: 'Datainsamlingsplan', description: 'Strukturerad plan för att samla in process data.', phase: Phase.MEASURE, recommended: true },
  { id: 't_msa', name: 'MSA (Measurement System Analysis)', description: 'Validerar att mätsystemet är tillförlitligt.', phase: Phase.MEASURE, recommended: false },
  { id: 't_gage_rr', name: 'Gage R&R', description: 'Analyserar repeterbarhet och reproducerbarhet i mätsystemet.', phase: Phase.MEASURE, recommended: false },
  { id: 't_cp', name: 'Processduglighet (Cp)', description: 'Mäter processens potential utan hänsyn till centrering.', phase: Phase.MEASURE, recommended: false },
  { id: 't_capability', name: 'Processduglighet (Cpk)', description: 'Mäter processens faktiska duglighet inklusive centrering.', phase: Phase.MEASURE, recommended: true },
  { id: 't_dpmo', name: 'DPMO (Defects Per Million Opportunities)', description: 'Antal defekter per miljon möjligheter.', phase: Phase.MEASURE, recommended: false },
  { id: 't_sigma', name: 'Sigma-nivå', description: 'Standardiserat kvalitetsmått.', phase: Phase.MEASURE, recommended: false },
  { id: 't_spc_basic', name: 'Styrdiagram (Grundläggande)', description: 'Visuellt verktyg för att övervaka processstabilitet.', phase: Phase.MEASURE, recommended: false },
  { id: 't_pareto', name: 'Paretoanalys', description: '80/20-regeln - identifiera de viktigaste orsakerna.', phase: Phase.MEASURE, recommended: true },
  { id: 't_vsm', name: 'Value Stream Map (VSM)', description: 'Identifiera värde och slöseri i flödet.', phase: Phase.MEASURE, recommended: false },

  // Analyze
  { id: 't_ishikawa', name: 'Fiskbensdiagram (Ishikawa)', description: 'Strukturerad brainstorming för att identifiera potentiella orsakskategorier.', phase: Phase.ANALYZE, recommended: true },
  { id: 't_5why', name: '5 Varför', description: 'Iterativ frågeteknik för att nå rotorsaken.', phase: Phase.ANALYZE, recommended: true },
  { id: 't_hypothesis', name: 'Hypotestestning', description: 'Statistisk metod för att dra slutsatser från data.', phase: Phase.ANALYZE, recommended: false },
  { id: 't_1sample_t', name: '1-sample t-test', description: 'Testar om medelvärdet skiljer sig från ett målvärde.', phase: Phase.ANALYZE, recommended: false },
  { id: 't_2sample_t', name: '2-sample t-test', description: 'Jämför medelvärden mellan två grupper.', phase: Phase.ANALYZE, recommended: false },
  { id: 't_anova', name: 'ANOVA (Analysis of Variance)', description: 'Jämför medelvärden mellan tre eller fler grupper.', phase: Phase.ANALYZE, recommended: false },
  { id: 't_chi2', name: 'Chi-två-test', description: 'Testar samband mellan kategoriska variabler.', phase: Phase.ANALYZE, recommended: false },
  { id: 't_correlation', name: 'Korrelationsanalys', description: 'Mäter styrkan av linjärt samband mellan variabler.', phase: Phase.ANALYZE, recommended: false },
  { id: 't_regression', name: 'Regressionsanalys', description: 'Modellerar sambandet mellan X och Y.', phase: Phase.ANALYZE, recommended: false },
  { id: 't_multivari', name: 'Multi-Vari-analys', description: 'Identifierar variationskällor i processen.', phase: Phase.ANALYZE, recommended: false },
  { id: 't_normality', name: 'Normalitetstest', description: 'Kontrollerar om data är normalfördelad.', phase: Phase.ANALYZE, recommended: false },
  { id: 't_fmea', name: 'FMEA (Failure Mode & Effects Analysis)', description: 'Systematisk identifiering av potentiella felorsaker och deras effekter.', phase: Phase.ANALYZE, recommended: true },

  // Improve
  { id: 't_doe', name: 'DOE (Design of Experiments)', description: 'Systematiskt tillvägagångssätt för att testa flera faktorer samtidigt.', phase: Phase.IMPROVE, recommended: false },
  { id: 't_full_factorial', name: 'Full faktoriell design', description: 'Testar alla kombinationer av faktornivåer.', phase: Phase.IMPROVE, recommended: false },
  { id: 't_fractional_factorial', name: 'Fraktionell faktoriell design', description: 'Testar en delmängd av alla kombinationer.', phase: Phase.IMPROVE, recommended: false },
  { id: 't_rsm', name: 'Response Surface Methodology', description: 'Optimerar processinställningar för bästa resultat.', phase: Phase.IMPROVE, recommended: false },
  { id: 't_pilot', name: 'Pilotstudie', description: 'Småskaligt test av föreslagen lösning.', phase: Phase.IMPROVE, recommended: true },
  { id: 't_pugh', name: 'Pugh-matris', description: 'Strukturerad jämförelse av lösningsalternativ.', phase: Phase.IMPROVE, recommended: false },
  { id: 't_solution_selection', name: 'Lösningsval', description: 'Kriteriebaserad utvärdering av potentiella lösningar.', phase: Phase.IMPROVE, recommended: false },
  { id: 't_implementation_plan', name: 'Implementeringsplan', description: 'Detaljerad plan för att genomföra förbättringen.', phase: Phase.IMPROVE, recommended: true },
  { id: 't_5s', name: '5S', description: 'Sortera, Strukturera, Städa, Standardisera, Självdisciplin.', phase: Phase.IMPROVE, recommended: false },
  { id: 't_kaizen', name: 'Kaizen Event', description: 'Fokuserad förbättringsworkshop (3-5 dagar).', phase: Phase.IMPROVE, recommended: false },
  { id: 't_pokayoke', name: 'Poka-Yoke (Felsäkring)', description: 'Designa bort möjligheten till fel.', phase: Phase.IMPROVE, recommended: true },
  { id: 't_brainstorm', name: 'Brainstorming / Lösningsförslag', description: 'Generera och spåra lösningsförslag.', phase: Phase.IMPROVE, recommended: true },

  // Control
  { id: 't_control_plan', name: 'Kontrollplan', description: 'Dokument som specificerar hur processen ska övervakas.', phase: Phase.CONTROL, recommended: true },
  { id: 't_spc', name: 'SPC (Styrdiagram)', description: 'Övervaka processen över tid.', phase: Phase.CONTROL, recommended: true },
  { id: 't_imr', name: 'I-MR Chart', description: 'Individual-Moving Range chart för kontinuerlig data.', phase: Phase.CONTROL, recommended: false },
  { id: 't_xr', name: 'X̄-R Chart', description: 'Övervakar medelvärde och variation för undergrupper.', phase: Phase.CONTROL, recommended: false },
  { id: 't_xs', name: 'X̄-S Chart', description: 'Övervakar medelvärde och standardavvikelse.', phase: Phase.CONTROL, recommended: false },
  { id: 't_pchart', name: 'p-Chart', description: 'Övervakar andelen defekta.', phase: Phase.CONTROL, recommended: false },
  { id: 't_npchart', name: 'np-Chart', description: 'Övervakar antal defekta.', phase: Phase.CONTROL, recommended: false },
  { id: 't_cchart', name: 'c-Chart', description: 'Övervakar antal defekter per enhet.', phase: Phase.CONTROL, recommended: false },
  { id: 't_uchart', name: 'u-Chart', description: 'Övervakar defekter per enhet.', phase: Phase.CONTROL, recommended: false },
  { id: 't_cusum', name: 'CUSUM Chart', description: 'Kumulativ summa - känslig för små skift.', phase: Phase.CONTROL, recommended: false },
  { id: 't_ewma', name: 'EWMA Chart', description: 'Exponentially Weighted Moving Average.', phase: Phase.CONTROL, recommended: false },
  { id: 't_sop', name: 'SOP (Standard Operating Procedure)', description: 'Standardiserade arbetsinstruktioner.', phase: Phase.CONTROL, recommended: true },
  { id: 't_training_plan', name: 'Utbildningsplan', description: 'Plan för att utbilda personal i nya rutiner.', phase: Phase.CONTROL, recommended: false },
  { id: 't_reaction_plan', name: 'Reaktionsplan', description: 'Definierar åtgärder vid processavvikelser.', phase: Phase.CONTROL, recommended: false },
  { id: 't_audit_plan', name: 'Revisionsplan', description: 'Schema för regelbundna processgranskningar.', phase: Phase.CONTROL, recommended: false },
  { id: 't_lessons', name: 'Lessons Learned', description: 'Dokumentera lärdomar för framtiden.', phase: Phase.CONTROL, recommended: false }
];

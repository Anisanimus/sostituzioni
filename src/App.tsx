/**
 * ============================================================================
 * GESTIONE SOSTITUZIONI SCOLASTICHE - RELEASE CANDIDATE 2 (RC2)
 * Tag Git: RC2
 * Data: 27/08/2026
 * Note: Include drawer laterale, banner panoramica lavori chiaro da oggi in poi,
 *       tabellone chiuso di default con ordinamento per stato e filtri risorse smart.
 * ============================================================================
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { GiornoSettimana } from './types';
import { GestioneAssenze } from './components/GestioneAssenze';
import { TabelloneSostituzioni } from './components/TabelloneSostituzioni';
import { PortaleDocente } from './components/PortaleDocente';
import { RegistroStoricoAssenze } from './components/RegistroStoricoAssenze';
import { AnagraficaOrario, ImpostazioniPriorita } from './components/AnagraficaOrario';
import { PanoramicaLavori } from './components/PanoramicaLavori';
import { Coachmark } from './components/Coachmark';
import { 
  School, Calendar, Users, History, Lock, Smartphone, 
  ChevronLeft, ChevronRight, UserMinus, Bus, Activity, LayoutDashboard, HelpCircle, Settings,
  Menu, X, Sliders
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { docenti, orariDocenti, assenze, uscite, sostituzioni } = useApp();
  const [ruoloAttivo, setRuoloAttivo] = useState<'VICEPRESIDENZA' | 'PORTALE_DOCENTE'>('VICEPRESIDENZA');
  const [tabVice, setTabVice] = useState<'GESTIONE_GIORNALIERA' | 'STORICO' | 'DOCENTI' | 'IMPOSTAZIONI'>('GESTIONE_GIORNALIERA');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const getGiornoFromDate = (dateStr: string): GiornoSettimana => {
    const d = new Date(dateStr);
    const day = d.getDay();
    if (day === 1) return 'Lunedì';
    if (day === 2) return 'Martedì';
    if (day === 3) return 'Mercoledì';
    if (day === 4) return 'Giovedì';
    if (day === 5) return 'Venerdì';
    return 'Lunedì';
  };

  const selectedGiorno = getGiornoFromDate(selectedDate);

  const cambiaGiorno = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const vaiAOggi = () => setSelectedDate(todayStr);

  // Analisi Giornaliera (solo eventi attivi non annullati)
  const assenzeOggi = assenze.filter(a => a.data === selectedDate && !a.annullata);
  const usciteOggi = uscite.filter(u => u.data === selectedDate && !u.annullata);
  const sostituzioniOggi = sostituzioni.filter(s => s.data === selectedDate);

  const oreScoperte: { ora: number; classe: string }[] = [];
  assenzeOggi.forEach(assenza => {
    const doc = docenti.find(d => d.id === assenza.docenteId);
    if (!doc || doc.isEducatore) return;
    const orarioDoc = orariDocenti.find(o => o.docenteId === doc.id);
    if (!orarioDoc) return;

    assenza.oreInteressate.forEach(ora => {
      const cella = orarioDoc.ore.find(c => c.giorno === selectedGiorno && c.ora === ora);
      const val = cella ? cella.valore.trim() : '';

      if (val && val !== 'D' && val !== 'P') {
        const classeInUscita = usciteOggi.some(u => {
          const classiList = u.classi || [(u as any).classe];
          return classiList.includes(val) && u.ore.includes(ora);
        });

        if (!classeInUscita) {
          const giaPresente = oreScoperte.some(os => os.ora === ora && os.classe === val);
          if (!giaPresente) {
            oreScoperte.push({ ora, classe: val });
          }
        }
      }
    });
  });

  const totOreDaCoprire = oreScoperte.length;
  const totOreCoperte = oreScoperte.filter(os => 
    sostituzioniOggi.some(s => s.ora === os.ora && s.classe === os.classe)
  ).length;
  const percentualeAvanzamento = totOreDaCoprire === 0 ? 100 : Math.round((totOreCoperte / totOreDaCoprire) * 100);

  return (
    <div className="min-h-screen bg-slate-300/80 text-slate-800 font-sans flex flex-col antialiased">
      {/* HEADER COMPATTO CON BURGER MENU IN ALTO A SINISTRA */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* PULSANTE BURGER IN ALTO A SINISTRA (SOLO IN MODALITA VICEPRESIDENZA) */}
            {ruoloAttivo === 'VICEPRESIDENZA' && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition border border-slate-700 flex items-center justify-center mr-1"
                title="Apri Menu Principale"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="p-1.5 bg-indigo-600 rounded-lg shadow-sm">
              <School className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight flex items-center gap-2">
                <span>Gestione Sostituzioni</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-mono">v2.0</span>
              </h1>
            </div>
          </div>

          {/* Azioni Header: Guida discreta + Switch Ruolo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTourOpen(true)}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition text-xs font-semibold flex items-center gap-1"
              title="Guida Rapida all'Uso"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">Guida</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setRuoloAttivo('VICEPRESIDENZA')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  ruoloAttivo === 'VICEPRESIDENZA'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vicepresidenza</span>
              </button>
              <button
                onClick={() => setRuoloAttivo('PORTALE_DOCENTE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  ruoloAttivo === 'PORTALE_DOCENTE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Portale Docenti</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SIDEBAR DRAWER LATERALE A SCOMPARSA (BURGER MENU)         */}
      {/* ========================================================= */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* BACKDROP SFOCATO SCURO */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* PANNELLO LATERALE SLIDE-IN */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col justify-between animate-in slide-in-from-left duration-200 border-r border-slate-200">
            {/* HEADER SIDEBAR */}
            <div>
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 rounded-xl">
                    <School className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">Menu Principale</h2>
                    <p className="text-[11px] text-slate-400">Pannello Vicepresidenza</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Chiudi Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* LISTA VOCI DI NAVIGAZIONE */}
              <div className="p-3 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTabVice('GESTIONE_GIORNALIERA');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left ${
                    tabVice === 'GESTIONE_GIORNALIERA'
                      ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tabVice === 'GESTIONE_GIORNALIERA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-black text-sm">Sostituzioni</span>
                      <span className="text-[11px] text-slate-500 font-normal">Tabellone giornaliero e coperture</span>
                    </div>
                  </div>
                  {tabVice === 'GESTIONE_GIORNALIERA' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTabVice('STORICO');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left ${
                    tabVice === 'STORICO'
                      ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tabVice === 'STORICO' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-black text-sm">Registro Storico</span>
                      <span className="text-[11px] text-slate-500 font-normal">Storico assenze, uscite e debiti</span>
                    </div>
                  </div>
                  {tabVice === 'STORICO' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTabVice('DOCENTI');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left ${
                    tabVice === 'DOCENTI'
                      ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tabVice === 'DOCENTI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-black text-sm">Anagrafica & Orario</span>
                      <span className="text-[11px] text-slate-500 font-normal">Gestione docenti e quadro orario</span>
                    </div>
                  </div>
                  {tabVice === 'DOCENTI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTabVice('IMPOSTAZIONI');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left ${
                    tabVice === 'IMPOSTAZIONI'
                      ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tabVice === 'IMPOSTAZIONI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-black text-sm">Impostazioni</span>
                      <span className="text-[11px] text-slate-500 font-normal">Priorità algoritmi e recupero debiti</span>
                    </div>
                  </div>
                  {tabVice === 'IMPOSTAZIONI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                </button>
              </div>
            </div>

            {/* FOOTER SIDEBAR */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px] font-bold text-slate-600">Sistema Sostituzioni v2.0-RC2</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Operativo
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CONTENUTO PRINCIPALE */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 w-full flex-1 space-y-4">
        {ruoloAttivo === 'PORTALE_DOCENTE' ? (
          <PortaleDocente />
        ) : (
          <>

            {/* VISTA PRINCIPALE A 2 COLONNE CON TABELLONE IN PRIMO PIANO */}
            {tabVice === 'GESTIONE_GIORNALIERA' && (
              <div className="space-y-3 sm:space-y-4">
                {/* BLOCCO UNIFICATO: AVANZAMENTO LAVORI + GESTIONE ASSENZE + EVENTI E RISORSE */}
                <div className="shadow-2xs rounded-2xl overflow-hidden">
                  <PanoramicaLavori 
                    selectedDate={selectedDate} 
                    onSelectDate={(newDate) => setSelectedDate(newDate)} 
                  />
                  <GestioneAssenze 
                    selectedDate={selectedDate} 
                    selectedGiorno={selectedGiorno} 
                    onChangeDate={(newDate) => setSelectedDate(newDate)}
                  />
                </div>

                {/* AREA PRINCIPALE: TABELLONE IN PRIMO PIANO (A SINISTRA SU DESKTOP) */}
                <TabelloneSostituzioni 
                  selectedDate={selectedDate} 
                  selectedGiorno={selectedGiorno} 
                  onChangeDate={(newDate) => setSelectedDate(newDate)}
                />
              </div>
            )}

            {tabVice === 'STORICO' && (
              <RegistroStoricoAssenze />
            )}

            {tabVice === 'DOCENTI' && (
              <AnagraficaOrario />
            )}

            {tabVice === 'IMPOSTAZIONI' && (
              <ImpostazioniPriorita />
            )}
          </>
        )}
      </main>

      <Coachmark isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

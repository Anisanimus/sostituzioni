import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { GiornoSettimana } from './types';
import { GestioneAssenze } from './components/GestioneAssenze';
import { TabelloneSostituzioni } from './components/TabelloneSostituzioni';
import { PortaleDocente } from './components/PortaleDocente';
import { RegistroStoricoAssenze } from './components/RegistroStoricoAssenze';
import { AnagraficaOrario, ImpostazioniPriorita } from './components/AnagraficaOrario';
import { Coachmark } from './components/Coachmark';
import { 
  School, Calendar, Users, History, Lock, Smartphone, 
  ChevronLeft, ChevronRight, UserMinus, Bus, Activity, LayoutDashboard, HelpCircle, Settings
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { docenti, orariDocenti, assenze, uscite, sostituzioni } = useApp();
  const [ruoloAttivo, setRuoloAttivo] = useState<'VICEPRESIDENZA' | 'PORTALE_DOCENTE'>('VICEPRESIDENZA');
  const [tabVice, setTabVice] = useState<'GESTIONE_GIORNALIERA' | 'STORICO' | 'DOCENTI' | 'IMPOSTAZIONI'>('GESTIONE_GIORNALIERA');
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
      {/* HEADER COMPATTO */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
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

      {/* CONTENUTO PRINCIPALE */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 w-full flex-1 space-y-4">
        {ruoloAttivo === 'PORTALE_DOCENTE' ? (
          <PortaleDocente />
        ) : (
          <>
            {/* MENU PRINCIPALE DI NAVIGAZIONE */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setTabVice('GESTIONE_GIORNALIERA')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    tabVice === 'GESTIONE_GIORNALIERA'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Sostituzioni</span>
                </button>
                <button
                  onClick={() => setTabVice('STORICO')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    tabVice === 'STORICO'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Registro Storico</span>
                </button>
                <button
                  onClick={() => setTabVice('DOCENTI')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    tabVice === 'DOCENTI'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Anagrafica & Orario</span>
                </button>

                <button
                  onClick={() => setTabVice('IMPOSTAZIONI')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    tabVice === 'IMPOSTAZIONI'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Impostazioni Priorità Sostituzioni Smart"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Impostazioni</span>
                </button>
              </div>
            </div>

            {/* VISTA PRINCIPALE A 2 COLONNE CON TABELLONE IN PRIMO PIANO */}
            {tabVice === 'GESTIONE_GIORNALIERA' && (
              <div className="space-y-4">
                {/* TESTATA UNIFICATA PER DATA E INSERIMENTO RAPIDO */}
                <GestioneAssenze 
                  selectedDate={selectedDate} 
                  selectedGiorno={selectedGiorno} 
                  onChangeDate={(newDate) => setSelectedDate(newDate)}
                />

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

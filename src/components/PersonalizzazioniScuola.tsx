import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, Clock, Eye, Calendar, CheckCircle, RotateCcw, 
  Save, School, Sliders, ShieldAlert, Sparkles, LayoutGrid, List
} from 'lucide-react';
import { DEFAULT_IMPOSTAZIONI_SCUOLA } from '../context/AppContext';

export const PersonalizzazioniScuola: React.FC = () => {
  const { impostazioniScuola, updateImpostazioniScuola, setImpostazioniScuola } = useApp();
  
  const [nomeScuola, setNomeScuola] = useState(impostazioniScuola.nomeScuola || 'I.C. Leonardo da Vinci');
  const [tettoPermessi, setTettoPermessi] = useState(impostazioniScuola.tettoMaxPermessiBreviAnno || 12);
  const [tettoAssemblee, setTettoAssemblee] = useState(impostazioniScuola.tettoMaxAssembleeSindacaliAnno || 10);
  const [vistaTabellone, setVistaTabellone] = useState<'GRUPPI_ORA' | 'PER_DOCENTE'>(impostazioniScuola.vistaTabellonePredefinita || 'GRUPPI_ORA');
  const [nascondiWeekend, setNascondiWeekend] = useState(impostazioniScuola.nascondiWeekendCalendario ?? true);

  const [salvato, setSalvato] = useState(false);

  const handleSalva = (e: React.FormEvent) => {
    e.preventDefault();
    updateImpostazioniScuola({
      nomeScuola: nomeScuola.trim() || 'Istituto Scolastico',
      tettoMaxPermessiBreviAnno: Number(tettoPermessi) || 12,
      tettoMaxAssembleeSindacaliAnno: Number(tettoAssemblee) || 10,
      vistaTabellonePredefinita: vistaTabellone,
      nascondiWeekendCalendario: nascondiWeekend
    });

    setSalvato(true);
    setTimeout(() => setSalvato(false), 2500);
  };

  const handleRipristinaPredefiniti = () => {
    if (window.confirm('Vuoi ripristinare le personalizzazioni predefinite?')) {
      setImpostazioniScuola(DEFAULT_IMPOSTAZIONI_SCUOLA);
      setNomeScuola(DEFAULT_IMPOSTAZIONI_SCUOLA.nomeScuola);
      setTettoPermessi(DEFAULT_IMPOSTAZIONI_SCUOLA.tettoMaxPermessiBreviAnno);
      setTettoAssemblee(DEFAULT_IMPOSTAZIONI_SCUOLA.tettoMaxAssembleeSindacaliAnno);
      setVistaTabellone(DEFAULT_IMPOSTAZIONI_SCUOLA.vistaTabellonePredefinita);
      setNascondiWeekend(DEFAULT_IMPOSTAZIONI_SCUOLA.nascondiWeekendCalendario);
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* NOTIFICA SALVATAGGIO */}
      {salvato && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-md text-xs sm:text-sm font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>Personalizzazioni salvate e applicate con successo in tutta l'applicazione!</span>
          </div>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <span>Personalizzazioni Istituto & Visualizzazione</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configura il nome del tuo istituto scolastico, i massimali orari per il personale e le preferenze grafiche.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRipristinaPredefiniti}
          className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Ripristina Default</span>
        </button>
      </div>

      <form onSubmit={handleSalva} className="space-y-4">
        {/* SEZIONE 1: NOME DELLA SCUOLA (BARRA IN ALTO) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">Intestazione & Nome Istituto</h3>
              <p className="text-xs text-slate-500">Compare in alto nella barra principale scura e nei report ufficiali.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Denominazione Scuola / Istituto Comprensivo / IIS
            </label>
            <input
              type="text"
              value={nomeScuola}
              onChange={(e) => setNomeScuola(e.target.value)}
              placeholder="es. I.C. Leonardo da Vinci - Roma"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Anteprima barra superiore: <strong className="text-slate-700">{nomeScuola || 'Gestione Sostituzioni'}</strong>
            </span>
          </div>
        </div>

        {/* SEZIONE 2: TETTI MASSIMI PERMESSI E ASSEMBLEE SINDACALI */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">Tetti Massimi & Limiti Monte Ore Annuale</h3>
              <p className="text-xs text-slate-500">Valori di riferimento per allarmi, badge e verifiche nella pagina Report.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                ⏱️ Tetto Ore Permessi Brevi / Anno
              </label>
              <p className="text-[11px] text-slate-500">
                Monte ore contrattuale annuo max fruibile (solitamente pari all'orario settimanale, es. 12h o 18h).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={tettoPermessi}
                  onChange={(e) => setTettoPermessi(Number(e.target.value))}
                  className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-black text-slate-900 outline-none focus:border-indigo-500 text-center"
                />
                <span className="text-xs font-bold text-slate-600">ore / anno scolastico</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                📢 Tetto Assemblee Sindacali / Anno
              </label>
              <p className="text-[11px] text-slate-500">
                Limite massimo nazionale previsto dal CCNL Scuola (predefinito 10 ore pro-capite).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={tettoAssemblee}
                  onChange={(e) => setTettoAssemblee(Number(e.target.value))}
                  className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-black text-slate-900 outline-none focus:border-indigo-500 text-center"
                />
                <span className="text-xs font-bold text-slate-600">ore / anno scolastico</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 3: PREFERENZE VISUALIZZAZIONE & CALENDARIO */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">Preferenze di Visualizzazione & Calendario</h3>
              <p className="text-xs text-slate-500">Configura la modalità con cui si apre il tabellone e la visualizzazione del calendario.</p>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Modalità Vista Tabellone */}
            <div>
              <label className="block text-xs font-black text-slate-800 mb-2">
                Modalità di Visualizzazione Preferita del Tabellone Sostituzioni
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVistaTabellone('GRUPPI_ORA')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                    vistaTabellone === 'GRUPPI_ORA'
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${vistaTabellone === 'GRUPPI_ORA' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-900">Vista a Blocchi Orari (1ª Ora, 2ª Ora...)</span>
                    <span className="text-[11px] text-slate-500">Raggruppa le sostituzioni ora per ora in ordine cronologico.</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVistaTabellone('PER_DOCENTE')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                    vistaTabellone === 'PER_DOCENTE'
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${vistaTabellone === 'PER_DOCENTE' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <List className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-900">Vista per Docente Assente</span>
                    <span className="text-[11px] text-slate-500">Raggruppa le ore scoperte per ciascun docente assente.</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Nascondi Sabato e Domenica */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 text-slate-700 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-900">
                      Nascondi Sabato e Domenica dal Calendario (Settimana Corta)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Mostra esclusivamente i giorni scolastici da Lunedì a Venerdì nella panoramica lavori e nei selettori.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={nascondiWeekend}
                  onChange={(e) => setNascondiWeekend(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* PULSANTE DI SALVATAGGIO */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-6 py-3 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salva Personalizzazioni</span>
          </button>
        </div>
      </form>
    </div>
  );
};

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
import { ReportStatistiche } from './components/ReportStatistiche';
import { PersonalizzazioniScuola } from './components/PersonalizzazioniScuola';
import { QuadroSostituzioniScuola } from './components/QuadroSostituzioniScuola';
import { PanoramicaLavori } from './components/PanoramicaLavori';
import { VistaCalendariGoogle } from './components/VistaCalendariGoogle';
import { Coachmark } from './components/Coachmark';
import { getPrimoGiornoScolasticoValido, spostaGiornoScolastico } from './utils/docentiHelper';
import { 
  School, Calendar, Users, History, Lock, Smartphone, 
  ChevronLeft, ChevronRight, UserMinus, Bus, Activity, LayoutDashboard, HelpCircle, Settings,
  Menu, X, Sliders, BarChart3, Sparkles, Building2, LayoutGrid, ShieldCheck, KeyRound, TrendingUp,
  Monitor, Pin, PinOff, PanelLeftClose, PanelLeftOpen, PanelLeft, Scale, ArrowDownUp, RotateCw,
  BookOpen, GraduationCap, Palette
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { UpdateNotificationModal } from './components/UpdateNotificationModal';
import { CURRENT_APP_VERSION } from './version';
import { LogOut } from 'lucide-react';

const MainApp: React.FC = () => {
  const { docenti, orariDocenti, assenze, uscite, sostituzioni, impostazioniScuola, richiesteAccessoDocenti } = useApp();
  const { utenteInfo, logout, isLoadingAuth } = useAuth();

  const [ruoloAttivo, setRuoloAttivo] = useState<'VICEPRESIDENZA' | 'PORTALE_DOCENTE' | 'QUADRO_SCUOLA'>(() => {
    if (utenteInfo?.ruolo === 'VICEPRESIDENZA') return 'VICEPRESIDENZA';
    if (utenteInfo?.ruolo === 'PERSONALE_ATA') return 'QUADRO_SCUOLA';
    return 'PORTALE_DOCENTE';
  });
  const [tabVice, setTabVice] = useState<'GESTIONE_GIORNALIERA' | 'QUADRO_SCUOLA' | 'STORICO' | 'REPORT' | 'DOCENTI' | 'PERSONALIZZAZIONI' | 'IMPEGNI' | 'RISORSE'>('GESTIONE_GIORNALIERA');
  const [tabDocente, setTabDocente] = useState<'MIE_SOSTITUZIONI' | 'BILANCIO_ORE' | 'QUADRO_SCUOLA' | 'ORARIO' | 'CONSIGLI_CLASSE' | 'IMPEGNI' | 'RISORSE' | 'PERSONALIZZAZIONI'>('MIE_SOSTITUZIONI');
  const [tabAta, setTabAta] = useState<'QUADRO_SCUOLA' | 'ORARIO' | 'CONSIGLI_CLASSE' | 'IMPEGNI' | 'RISORSE'>('QUADRO_SCUOLA');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinnedDesktop, setIsSidebarPinnedDesktop] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sostituzioni_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [mostraRisorseLaterale, setMostraRisorseLaterale] = useState(false);

  const togglePinDesktop = () => {
    setIsSidebarPinnedDesktop(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sostituzioni_sidebar_pinned', String(next));
      } catch {}
      return next;
    });
  };

  // Sincronizza ruolo utente autenticato all'accesso
  React.useEffect(() => {
    if (utenteInfo) {
      if (utenteInfo.ruolo === 'VICEPRESIDENZA') {
        setRuoloAttivo('VICEPRESIDENZA');
      } else if (utenteInfo.ruolo === 'PERSONALE_ATA') {
        setRuoloAttivo('QUADRO_SCUOLA');
      } else {
        setRuoloAttivo('PORTALE_DOCENTE');
      }
    }
  }, [utenteInfo]);

  // Helper per renderizzare l'icona o il logo personalizzato della scuola
  const renderLogoScuola = (classeIcona = "w-4 h-4 text-white", classeContenitore = "p-1.5 bg-indigo-600 rounded-lg shadow-sm") => {
    const tipo = impostazioniScuola?.logoTipo || 'DEFAULT';
    const url = impostazioniScuola?.logoUrl;

    if (tipo === 'CUSTOM_IMAGE' && url) {
      return (
        <div className={`${classeContenitore} overflow-hidden flex items-center justify-center bg-white border border-slate-700/50 p-0.5`}>
          <img src={url} alt="Logo Scuola" className="w-full h-full object-contain rounded-md" />
        </div>
      );
    }

    let IconComp = School;
    if (tipo === 'BOOK') IconComp = BookOpen;
    else if (tipo === 'GRADUATION') IconComp = GraduationCap;
    else if (tipo === 'BUILDING') IconComp = Building2;
    else if (tipo === 'PALETTE') IconComp = Palette;
    else if (tipo === 'SHIELD') IconComp = ShieldCheck;

    return (
      <div className={classeContenitore}>
        <IconComp className={classeIcona} />
      </div>
    );
  };

  // Aggiorna dinamicamente favicon e titolo del browser quando cambia il logo o il nome scuola
  React.useEffect(() => {
    if (impostazioniScuola?.nomeScuola) {
      document.title = impostazioniScuola.nomeScuola;
    }
    if (impostazioniScuola?.logoTipo === 'CUSTOM_IMAGE' && impostazioniScuola.logoUrl) {
      const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (favicon) {
        favicon.href = impostazioniScuola.logoUrl;
      }
      const appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (appleIcon) {
        appleIcon.href = impostazioniScuola.logoUrl;
      }
    }
  }, [impostazioniScuola?.nomeScuola, impostazioniScuola?.logoUrl, impostazioniScuola?.logoTipo]);

  const todayStr = new Date().toISOString().split('T')[0];
  const nascondiWeekend = impostazioniScuola?.nascondiWeekendCalendario ?? true;
  const giorniFestivi = impostazioniScuola?.giorniFestivi || [];

  // Inizializza la data al primo giorno di lezione valido (se oggi è Sabato/Domenica o Festivo e weekend nascosti, salta a Lunedì/prossimo utile)
  const [selectedDate, setSelectedDate] = useState<string>(() => 
    getPrimoGiornoScolasticoValido(todayStr, nascondiWeekend, giorniFestivi)
  );

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

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-300">Caricamento sessione...</p>
        </div>
      </div>
    );
  }

  if (!utenteInfo) {
    return <LoginScreen />;
  }

  // Cambia giorno con le frecce saltando automaticamente weekend e giorni festivi se impostato
  const cambiaGiorno = (delta: number) => {
    const nuovaData = spostaGiornoScolastico(selectedDate, delta, nascondiWeekend, giorniFestivi);
    setSelectedDate(nuovaData);
  };

  const vaiAOggi = () => {
    setSelectedDate(getPrimoGiornoScolasticoValido(todayStr, nascondiWeekend, giorniFestivi));
  };

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
      {/* CONTROLLO E NOTIFICA LIVE AGGIORNAMENTI VERSIONE */}
      <UpdateNotificationModal />

      {/* HEADER COMPATTO CON BURGER MENU E SUPPORTO IPHONE NOTCH / DYNAMIC ISLAND */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40 safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* PULSANTE BURGER / SIDEBAR IN ALTO A SINISTRA */}
            <button
              type="button"
              onClick={() => {
                // Su schermi ampi, il click sul burger commuta la modalità fissa/aperta
                if (window.innerWidth >= 1024) {
                  togglePinDesktop();
                } else {
                  setIsSidebarOpen(true);
                }
              }}
              className={`p-1.5 rounded-xl transition border flex items-center justify-center mr-1 cursor-pointer ${
                isSidebarPinnedDesktop
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
              title={isSidebarPinnedDesktop ? "Menu Fisso attivo (Clicca per comprimere)" : "Apri Menu Principale"}
            >
              {isSidebarPinnedDesktop ? <PanelLeftClose className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {renderLogoScuola("w-4 h-4 text-white", "w-7 h-7 bg-indigo-600 rounded-lg shadow-sm hidden sm:flex items-center justify-center")}
            <div>
              <h1 className="text-xs sm:text-base font-black tracking-tight leading-tight">
                <span className="truncate max-w-[110px] xs:max-w-[140px] sm:max-w-none block">{impostazioniScuola?.nomeScuola || 'Gestione Sostituzioni'}</span>
              </h1>
            </div>
          </div>

          {/* Azioni Header: Switch Ruolo + Logout (perfettamente responsive per iPhone) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsTourOpen(true)}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition text-xs font-semibold hidden md:flex items-center gap-1"
              title="Guida Rapida all'Uso"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>Guida</span>
            </button>

            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-700">
              {utenteInfo.ruolo === 'VICEPRESIDENZA' && (
                <button
                  onClick={() => setRuoloAttivo('VICEPRESIDENZA')}
                  className={`p-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    ruoloAttivo === 'VICEPRESIDENZA'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Area Vicepresidenza (Riservata)"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Vicepresidenza</span>
                </button>
              )}

              <button
                onClick={() => setRuoloAttivo('PORTALE_DOCENTE')}
                className={`p-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  ruoloAttivo === 'PORTALE_DOCENTE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Portale Docenti"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Docenti</span>
              </button>

              <button
                onClick={() => setRuoloAttivo('QUADRO_SCUOLA')}
                className={`p-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  ruoloAttivo === 'QUADRO_SCUOLA'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Quadro Sostituzioni protetto da PIN per Personale ATA e Segreteria"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ATA</span>
              </button>
            </div>

            {/* PROFILO UTENTE AUTENTICATO & LOGOUT */}
            <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-700">
              <div className="hidden lg:flex flex-col text-right leading-tight">
                <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{utenteInfo.displayName}</span>
                <span className="text-[10px] text-slate-400">{utenteInfo.ruolo}</span>
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                title="Disconnetti (Esci)"
              >
                <LogOut className="w-4 h-4 text-rose-400 group-hover:text-white" />
                <span className="hidden md:inline text-xs font-semibold">Esci</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* CORPO PRINCIPALE DELL'APP: SIDEBAR FISSA SU PC + CONTENUTO */}
      {/* ========================================================= */}
      <div className="flex-1 flex w-full">
        {/* SIDEBAR FISSA DESKTOP (SOLO PC E QUANDO PINNATA DALL'UTENTE) */}
        {isSidebarPinnedDesktop && (
          <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-white border-r border-slate-200 shadow-sm sticky top-[49px] h-[calc(100vh-49px)] z-30 overflow-hidden">
            {/* HEADER SIDEBAR FISSA PC */}
            <div className="shrink-0 bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                {renderLogoScuola("w-4 h-4 text-white", "w-7 h-7 bg-indigo-600 rounded-lg shadow-2xs flex items-center justify-center")}
                <div>
                  <h2 className="text-xs font-black text-white">Menu Navigazione</h2>
                  <p className="text-[10px] text-slate-400">
                    {ruoloAttivo === 'VICEPRESIDENZA' ? 'Pannello Vicepresidenza' : ruoloAttivo === 'PORTALE_DOCENTE' ? 'Portale Docenti' : 'Personale ATA & Segreteria'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={togglePinDesktop}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Nascondi Barra Laterale (Passa a Menu a Scomparsa)"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* LISTA VOCI (NAVIGAZIONE SENZA APRI/CHIUDI) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
              {/* ======================================================= */}
              {/* MENU SPECIFICO PORTALE DOCENTI                          */}
              {/* ======================================================= */}
              {ruoloAttivo === 'PORTALE_DOCENTE' && (
                <>
                  <button
                    type="button"
                    onClick={() => setTabDocente('MIE_SOSTITUZIONI')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabDocente === 'MIE_SOSTITUZIONI'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabDocente === 'MIE_SOSTITUZIONI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Sostituzioni</span>
                        <span className="text-[10px] text-slate-500 font-normal">Le mie supplenze</span>
                      </div>
                    </div>
                    {tabDocente === 'MIE_SOSTITUZIONI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabDocente('QUADRO_SCUOLA')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabDocente === 'QUADRO_SCUOLA'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabDocente === 'QUADRO_SCUOLA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Quadro Generale Sostituzioni</span>
                        <span className="text-[10px] text-slate-500 font-normal">Tutte le assenze</span>
                      </div>
                    </div>
                    {tabDocente === 'QUADRO_SCUOLA' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabDocente('ORARIO')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabDocente === 'ORARIO'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabDocente === 'ORARIO' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Orario</span>
                        <span className="text-[10px] text-slate-500 font-normal">Mio orario e classi</span>
                      </div>
                    </div>
                    {tabDocente === 'ORARIO' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabDocente('CONSIGLI_CLASSE')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabDocente === 'CONSIGLI_CLASSE'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabDocente === 'CONSIGLI_CLASSE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Consigli di Classe</span>
                        <span className="text-[10px] text-slate-500 font-normal">Docenti per classe</span>
                      </div>
                    </div>
                    {tabDocente === 'CONSIGLI_CLASSE' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  {Boolean(
                    (impostazioniScuola?.calendariGoogle?.impegni && impostazioniScuola.calendariGoogle.impegni.length > 0) ||
                    impostazioniScuola?.calendariGoogle?.impegniPlenariId ||
                    impostazioniScuola?.calendariGoogle?.impegniSecondariaId
                  ) && (
                    <button
                      type="button"
                      onClick={() => setTabDocente('IMPEGNI')}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabDocente === 'IMPEGNI'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${tabDocente === 'IMPEGNI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-xs">Impegni Scolastici</span>
                          <span className="text-[10px] text-slate-500 font-normal">Calendari e scadenze</span>
                        </div>
                      </div>
                      {tabDocente === 'IMPEGNI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>
                  )}

                  {Boolean(
                    (impostazioniScuola?.calendariGoogle?.risorse && impostazioniScuola.calendariGoogle.risorse.length > 0) ||
                    impostazioniScuola?.calendariGoogle?.risorseInformaticaId ||
                    impostazioniScuola?.calendariGoogle?.risorseTeatroId
                  ) && (
                    <button
                      type="button"
                      onClick={() => setTabDocente('RISORSE')}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabDocente === 'RISORSE'
                          ? 'bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${tabDocente === 'RISORSE' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Monitor className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-xs">Risorse & Spazi</span>
                          <span className="text-[10px] text-slate-500 font-normal">Aule e laboratori prenotati</span>
                        </div>
                      </div>
                      {tabDocente === 'RISORSE' && <span className="w-2 h-2 rounded-full bg-teal-600" />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setTabDocente('BILANCIO_ORE')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabDocente === 'BILANCIO_ORE'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabDocente === 'BILANCIO_ORE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Bilancio Ore & Movimenti</span>
                        <span className="text-[10px] text-slate-500 font-normal">Debiti, crediti e storico</span>
                      </div>
                    </div>
                    {tabDocente === 'BILANCIO_ORE' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabDocente('PERSONALIZZAZIONI')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabDocente === 'PERSONALIZZAZIONI'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabDocente === 'PERSONALIZZAZIONI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Personalizzazioni</span>
                        <span className="text-[10px] text-slate-500 font-normal">Notifiche e preferenze</span>
                      </div>
                    </div>
                    {tabDocente === 'PERSONALIZZAZIONI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>
                </>
              )}

              {/* ======================================================= */}
              {/* MENU PERSONALE ATA                                      */}
              {/* ======================================================= */}
              {ruoloAttivo === 'QUADRO_SCUOLA' && (
                <>
                  <button
                    type="button"
                    onClick={() => setTabAta('QUADRO_SCUOLA')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabAta === 'QUADRO_SCUOLA'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabAta === 'QUADRO_SCUOLA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Quadro Generale Sostituzioni</span>
                        <span className="text-[10px] text-slate-500 font-normal">Prospetto generale</span>
                      </div>
                    </div>
                    {tabAta === 'QUADRO_SCUOLA' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabAta('ORARIO')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabAta === 'ORARIO'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabAta === 'ORARIO' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Orario</span>
                        <span className="text-[10px] text-slate-500 font-normal">Orario docenti e classi</span>
                      </div>
                    </div>
                    {tabAta === 'ORARIO' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabAta('CONSIGLI_CLASSE')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabAta === 'CONSIGLI_CLASSE'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabAta === 'CONSIGLI_CLASSE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Consigli di Classe</span>
                        <span className="text-[10px] text-slate-500 font-normal">Docenti e materie</span>
                      </div>
                    </div>
                    {tabAta === 'CONSIGLI_CLASSE' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  {Boolean(
                    (impostazioniScuola?.calendariGoogle?.impegni && impostazioniScuola.calendariGoogle.impegni.length > 0) ||
                    impostazioniScuola?.calendariGoogle?.impegniPlenariId ||
                    impostazioniScuola?.calendariGoogle?.impegniSecondariaId
                  ) && (
                    <button
                      type="button"
                      onClick={() => setTabAta('IMPEGNI')}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabAta === 'IMPEGNI'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${tabAta === 'IMPEGNI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-xs">Impegni Scolastici</span>
                          <span className="text-[10px] text-slate-500 font-normal">Calendari e scadenze</span>
                        </div>
                      </div>
                      {tabAta === 'IMPEGNI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>
                  )}

                  {Boolean(
                    (impostazioniScuola?.calendariGoogle?.risorse && impostazioniScuola.calendariGoogle.risorse.length > 0) ||
                    impostazioniScuola?.calendariGoogle?.risorseInformaticaId ||
                    impostazioniScuola?.calendariGoogle?.risorseTeatroId
                  ) && (
                    <button
                      type="button"
                      onClick={() => setTabAta('RISORSE')}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabAta === 'RISORSE'
                          ? 'bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${tabAta === 'RISORSE' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Monitor className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-xs">Risorse & Spazi</span>
                          <span className="text-[10px] text-slate-500 font-normal">Aule e laboratori prenotati</span>
                        </div>
                      </div>
                      {tabAta === 'RISORSE' && <span className="w-2 h-2 rounded-full bg-teal-600" />}
                    </button>
                  )}
                </>
              )}

              {/* ======================================================= */}
              {/* MENU VICEPRESIDENZA                                     */}
              {/* ======================================================= */}
              {ruoloAttivo === 'VICEPRESIDENZA' && (
                <>
                  <button
                    type="button"
                    onClick={() => setTabVice('GESTIONE_GIORNALIERA')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabVice === 'GESTIONE_GIORNALIERA'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabVice === 'GESTIONE_GIORNALIERA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Sostituzioni</span>
                        <span className="text-[10px] text-slate-500 font-normal">Tabellone giornaliero</span>
                      </div>
                    </div>
                    {tabVice === 'GESTIONE_GIORNALIERA' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabVice('QUADRO_SCUOLA')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabVice === 'QUADRO_SCUOLA'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabVice === 'QUADRO_SCUOLA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Quadro Generale</span>
                        <span className="text-[10px] text-slate-500 font-normal">Prospetto ATA / Docenti</span>
                      </div>
                    </div>
                    {tabVice === 'QUADRO_SCUOLA' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabVice('STORICO')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabVice === 'STORICO'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabVice === 'STORICO' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Registro Storico</span>
                        <span className="text-[10px] text-slate-500 font-normal">Storico assenze & uscite</span>
                      </div>
                    </div>
                    {tabVice === 'STORICO' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabVice('REPORT')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabVice === 'REPORT'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabVice === 'REPORT' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Bilanci & Report</span>
                        <span className="text-[10px] text-slate-500 font-normal">Debito/credito e statistiche</span>
                      </div>
                    </div>
                    {tabVice === 'REPORT' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabVice('DOCENTI')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabVice === 'DOCENTI'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabVice === 'DOCENTI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="block font-black text-xs">Anagrafica & Orario</span>
                          {richiesteAccessoDocenti.filter(r => r.stato === 'IN_ATTESA').length > 0 && (
                            <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                              {richiesteAccessoDocenti.filter(r => r.stato === 'IN_ATTESA').length}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">Docenti e orari</span>
                      </div>
                    </div>
                    {tabVice === 'DOCENTI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>

                  {Boolean(
                    (impostazioniScuola?.calendariGoogle?.impegni && impostazioniScuola.calendariGoogle.impegni.length > 0) ||
                    impostazioniScuola?.calendariGoogle?.impegniPlenariId ||
                    impostazioniScuola?.calendariGoogle?.impegniSecondariaId
                  ) && (
                    <button
                      type="button"
                      onClick={() => setTabVice('IMPEGNI')}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabVice === 'IMPEGNI'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${tabVice === 'IMPEGNI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-xs">Impegni Scolastici</span>
                          <span className="text-[10px] text-slate-500 font-normal">Calendari e scadenze</span>
                        </div>
                      </div>
                      {tabVice === 'IMPEGNI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>
                  )}

                  {Boolean(
                    (impostazioniScuola?.calendariGoogle?.risorse && impostazioniScuola.calendariGoogle.risorse.length > 0) ||
                    impostazioniScuola?.calendariGoogle?.risorseInformaticaId ||
                    impostazioniScuola?.calendariGoogle?.risorseTeatroId
                  ) && (
                    <button
                      type="button"
                      onClick={() => setTabVice('RISORSE')}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabVice === 'RISORSE'
                          ? 'bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${tabVice === 'RISORSE' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Monitor className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-xs">Risorse & Spazi</span>
                          <span className="text-[10px] text-slate-500 font-normal">Aule speciali</span>
                        </div>
                      </div>
                      {tabVice === 'RISORSE' && <span className="w-2 h-2 rounded-full bg-teal-600" />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setTabVice('PERSONALIZZAZIONI')}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                      tabVice === 'PERSONALIZZAZIONI'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${tabVice === 'PERSONALIZZAZIONI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-black text-xs">Personalizzazioni</span>
                        <span className="text-[10px] text-slate-500 font-normal">Regole scuola e vista</span>
                      </div>
                    </div>
                    {tabVice === 'PERSONALIZZAZIONI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                  </button>
                </>
              )}
            </div>

            {/* FOOTER SIDEBAR FISSA */}
            <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <div className="leading-tight">
                <span className="font-black text-[11px] text-slate-800 block">Sostituzioni Smart</span>
                <span className="font-mono text-[9px] text-indigo-700 font-black">v{CURRENT_APP_VERSION.version}</span>
              </div>
              <span className="font-bold text-emerald-600 text-[10px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
          </aside>
        )}

        {/* ========================================================= */}
        {/* SIDEBAR DRAWER LATERALE A SCOMPARSA (MOBILE O PC UNPINNED) */}
        {/* ========================================================= */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
            {/* BACKDROP SFOCATO SCURO */}
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* PANNELLO LATERALE SLIDE-IN */}
            <div className="relative w-80 max-w-[85vw] bg-white h-full max-h-[100dvh] shadow-2xl z-10 flex flex-col justify-between animate-in slide-in-from-left duration-200 border-r border-slate-200 overflow-hidden">
              {/* HEADER SIDEBAR (FISSO IN ALTO, CON SPAZIO EXTRA PER IPHONE STATUS BAR / NOTCH) */}
              <div className="shrink-0 bg-slate-900 text-white p-4 safe-drawer-top flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  {renderLogoScuola("w-5 h-5 text-white", "w-9 h-9 bg-indigo-600 rounded-xl shadow-2xs flex items-center justify-center")}
                  <div>
                    <h2 className="text-sm font-black text-white">Menu Principale</h2>
                    <p className="text-[11px] text-slate-400">
                      {ruoloAttivo === 'VICEPRESIDENZA' ? 'Pannello Vicepresidenza' : ruoloAttivo === 'PORTALE_DOCENTE' ? 'Portale Docenti' : 'Personale ATA & Segreteria'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* PULSANTE FISSA BARRA PER PC */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      togglePinDesktop();
                    }}
                    className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Fissa barra laterale aperta su PC"
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Chiudi Menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* LISTA VOCI DI NAVIGAZIONE (SCROLLABILE SU TUTTI GLI SCHERMI) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
                {/* ======================================================= */}
                {/* MENU SPECIFICO PORTALE DOCENTI                          */}
                {/* ======================================================= */}
                {ruoloAttivo === 'PORTALE_DOCENTE' && (
                  <>
                    {/* 1. Sostituzioni */}
                    <button
                      type="button"
                      onClick={() => {
                        setTabDocente('MIE_SOSTITUZIONI');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabDocente === 'MIE_SOSTITUZIONI'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabDocente === 'MIE_SOSTITUZIONI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Sostituzioni</span>
                          <span className="text-[11px] text-slate-500 font-normal">Le mie supplenze assegnate</span>
                        </div>
                      </div>
                      {tabDocente === 'MIE_SOSTITUZIONI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    {/* 2. Quadro Generale Sostituzioni */}
                    <button
                      type="button"
                      onClick={() => {
                        setTabDocente('QUADRO_SCUOLA');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabDocente === 'QUADRO_SCUOLA'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabDocente === 'QUADRO_SCUOLA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Quadro Generale Sostituzioni</span>
                          <span className="text-[11px] text-slate-500 font-normal">Prospetto generale delle assenze</span>
                        </div>
                      </div>
                      {tabDocente === 'QUADRO_SCUOLA' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    {/* 3. Orario */}
                    <button
                      type="button"
                      onClick={() => {
                        setTabDocente('ORARIO');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabDocente === 'ORARIO'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabDocente === 'ORARIO' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Orario</span>
                          <span className="text-[11px] text-slate-500 font-normal">Mio orario, colleghi e per classe</span>
                        </div>
                      </div>
                      {tabDocente === 'ORARIO' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    {/* 4. Consigli di Classe */}
                    <button
                      type="button"
                      onClick={() => {
                        setTabDocente('CONSIGLI_CLASSE');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabDocente === 'CONSIGLI_CLASSE'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabDocente === 'CONSIGLI_CLASSE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Consigli di Classe</span>
                          <span className="text-[11px] text-slate-500 font-normal">Docenti e materie per classe</span>
                        </div>
                      </div>
                      {tabDocente === 'CONSIGLI_CLASSE' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    {/* 5. Impegni Scolastici */}
                    {Boolean(
                      (impostazioniScuola?.calendariGoogle?.impegni && impostazioniScuola.calendariGoogle.impegni.length > 0) ||
                      impostazioniScuola?.calendariGoogle?.impegniPlenariId ||
                      impostazioniScuola?.calendariGoogle?.impegniSecondariaId
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          setTabDocente('IMPEGNI');
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                          tabDocente === 'IMPEGNI'
                            ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tabDocente === 'IMPEGNI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-sm">Impegni Scolastici</span>
                            <span className="text-[11px] text-slate-500 font-normal">Calendari e scadenze</span>
                          </div>
                        </div>
                        {tabDocente === 'IMPEGNI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </button>
                    )}

                    {/* 6. Risorse & Spazi */}
                    {Boolean(
                      (impostazioniScuola?.calendariGoogle?.risorse && impostazioniScuola.calendariGoogle.risorse.length > 0) ||
                      impostazioniScuola?.calendariGoogle?.risorseInformaticaId ||
                      impostazioniScuola?.calendariGoogle?.risorseTeatroId
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          setTabDocente('RISORSE');
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                          tabDocente === 'RISORSE'
                            ? 'bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs font-black'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tabDocente === 'RISORSE' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Monitor className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-sm">Risorse & Spazi</span>
                            <span className="text-[11px] text-slate-500 font-normal">Aule e laboratori prenotati</span>
                          </div>
                        </div>
                        {tabDocente === 'RISORSE' && <span className="w-2 h-2 rounded-full bg-teal-600" />}
                      </button>
                    )}

                    {/* 7. Bilancio Ore & Movimenti */}
                    <button
                      type="button"
                      onClick={() => {
                        setTabDocente('BILANCIO_ORE');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabDocente === 'BILANCIO_ORE'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabDocente === 'BILANCIO_ORE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Scale className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Bilancio Ore & Movimenti</span>
                          <span className="text-[11px] text-slate-500 font-normal">Debiti, crediti e storico personale</span>
                        </div>
                      </div>
                      {tabDocente === 'BILANCIO_ORE' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    {/* 8. Personalizzazioni */}
                    <button
                      type="button"
                      onClick={() => {
                        setTabDocente('PERSONALIZZAZIONI');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabDocente === 'PERSONALIZZAZIONI'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabDocente === 'PERSONALIZZAZIONI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Personalizzazioni</span>
                          <span className="text-[11px] text-slate-500 font-normal">Notifiche push e preferenze</span>
                        </div>
                      </div>
                      {tabDocente === 'PERSONALIZZAZIONI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>
                  </>
                )}

                {/* ======================================================= */}
                {/* MENU SPECIFICO PERSONALE ATA                            */}
                {/* ======================================================= */}
                {ruoloAttivo === 'QUADRO_SCUOLA' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setTabAta('QUADRO_SCUOLA');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabAta === 'QUADRO_SCUOLA'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabAta === 'QUADRO_SCUOLA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Quadro Generale Sostituzioni</span>
                          <span className="text-[11px] text-slate-500 font-normal">Prospetto generale delle assenze</span>
                        </div>
                      </div>
                      {tabAta === 'QUADRO_SCUOLA' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTabAta('ORARIO');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabAta === 'ORARIO'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabAta === 'ORARIO' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Orario</span>
                          <span className="text-[11px] text-slate-500 font-normal">Orario docenti e per classe</span>
                        </div>
                      </div>
                      {tabAta === 'ORARIO' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTabAta('CONSIGLI_CLASSE');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabAta === 'CONSIGLI_CLASSE'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabAta === 'CONSIGLI_CLASSE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Consigli di Classe</span>
                          <span className="text-[11px] text-slate-500 font-normal">Docenti e materie per classe</span>
                        </div>
                      </div>
                      {tabAta === 'CONSIGLI_CLASSE' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    {Boolean(
                      (impostazioniScuola?.calendariGoogle?.impegni && impostazioniScuola.calendariGoogle.impegni.length > 0) ||
                      impostazioniScuola?.calendariGoogle?.impegniPlenariId ||
                      impostazioniScuola?.calendariGoogle?.impegniSecondariaId
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          setTabAta('IMPEGNI');
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                          tabAta === 'IMPEGNI'
                            ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tabAta === 'IMPEGNI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-sm">Impegni Scolastici</span>
                            <span className="text-[11px] text-slate-500 font-normal">Calendari e scadenze</span>
                          </div>
                        </div>
                        {tabAta === 'IMPEGNI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </button>
                    )}

                    {Boolean(
                      (impostazioniScuola?.calendariGoogle?.risorse && impostazioniScuola.calendariGoogle.risorse.length > 0) ||
                      impostazioniScuola?.calendariGoogle?.risorseInformaticaId ||
                      impostazioniScuola?.calendariGoogle?.risorseTeatroId
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          setTabAta('RISORSE');
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                          tabAta === 'RISORSE'
                            ? 'bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs font-black'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tabAta === 'RISORSE' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Monitor className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-sm">Risorse & Spazi</span>
                            <span className="text-[11px] text-slate-500 font-normal">Aule e laboratori prenotati</span>
                          </div>
                        </div>
                        {tabAta === 'RISORSE' && <span className="w-2 h-2 rounded-full bg-teal-600" />}
                      </button>
                    )}
                  </>
                )}

                {/* ======================================================= */}
                {/* MENU SPECIFICO VICEPRESIDENZA                           */}
                {/* ======================================================= */}
                {ruoloAttivo === 'VICEPRESIDENZA' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setTabVice('GESTIONE_GIORNALIERA');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabVice === 'GESTIONE_GIORNALIERA'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabVice === 'GESTIONE_GIORNALIERA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <TrendingUp className="w-4 h-4" />
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
                        setTabVice('QUADRO_SCUOLA');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabVice === 'QUADRO_SCUOLA'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabVice === 'QUADRO_SCUOLA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Quadro Generale Sostituzioni</span>
                          <span className="text-[11px] text-slate-500 font-normal">Prospetto pulito per ATA / Docenti</span>
                        </div>
                      </div>
                      {tabVice === 'QUADRO_SCUOLA' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTabVice('STORICO');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
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
                          <span className="text-[11px] text-slate-500 font-normal">Sostituzioni, firme, uscite e nomine</span>
                        </div>
                      </div>
                      {tabVice === 'STORICO' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTabVice('REPORT');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabVice === 'REPORT'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabVice === 'REPORT' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Bilanci & Report</span>
                          <span className="text-[11px] text-slate-500 font-normal">Debito/credito, equità e statistiche</span>
                        </div>
                      </div>
                      {tabVice === 'REPORT' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTabVice('DOCENTI');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
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
                          <div className="flex items-center gap-1.5">
                            <span className="block font-black text-sm">Anagrafica & Orario</span>
                            {richiesteAccessoDocenti.filter(r => r.stato === 'IN_ATTESA').length > 0 && (
                              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                {richiesteAccessoDocenti.filter(r => r.stato === 'IN_ATTESA').length}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-normal">Gestione docenti, account ed orari</span>
                        </div>
                      </div>
                      {tabVice === 'DOCENTI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>

                    {Boolean(
                      (impostazioniScuola?.calendariGoogle?.impegni && impostazioniScuola.calendariGoogle.impegni.length > 0) ||
                      impostazioniScuola?.calendariGoogle?.impegniPlenariId ||
                      impostazioniScuola?.calendariGoogle?.impegniSecondariaId
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          setTabVice('IMPEGNI');
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                          tabVice === 'IMPEGNI'
                            ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tabVice === 'IMPEGNI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-sm">Impegni Scolastici</span>
                            <span className="text-[11px] text-slate-500 font-normal">Calendari e scadenze collegiali</span>
                          </div>
                        </div>
                        {tabVice === 'IMPEGNI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </button>
                    )}

                    {Boolean(
                      (impostazioniScuola?.calendariGoogle?.risorse && impostazioniScuola.calendariGoogle.risorse.length > 0) ||
                      impostazioniScuola?.calendariGoogle?.risorseInformaticaId ||
                      impostazioniScuola?.calendariGoogle?.risorseTeatroId
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          setTabVice('RISORSE');
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                          tabVice === 'RISORSE'
                            ? 'bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs font-black'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tabVice === 'RISORSE' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Monitor className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-black text-sm">Risorse & Spazi</span>
                            <span className="text-[11px] text-slate-500 font-normal">Aule speciali, laboratori e spazi</span>
                          </div>
                        </div>
                        {tabVice === 'RISORSE' && <span className="w-2 h-2 rounded-full bg-teal-600" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setTabVice('PERSONALIZZAZIONI');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 text-left cursor-pointer ${
                        tabVice === 'PERSONALIZZAZIONI'
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tabVice === 'PERSONALIZZAZIONI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-black text-sm">Personalizzazioni</span>
                          <span className="text-[11px] text-slate-500 font-normal">Nome scuola, regole Sostitutore Smart e vista</span>
                        </div>
                      </div>
                      {tabVice === 'PERSONALIZZAZIONI' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </button>
                  </>
                )}
              </div>

              {/* FOOTER SIDEBAR FISSO IN FONDO */}
              <div className="shrink-0 p-3.5 safe-bottom border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                <div className="leading-tight">
                  <span className="font-black text-xs text-slate-800 block">Sostituzioni Smart</span>
                  <span className="font-mono text-[10px] text-indigo-700 font-bold">v{CURRENT_APP_VERSION.version}</span>
                </div>
                <span className="font-bold text-emerald-600 text-xs flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Operativo
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CONTENUTO PRINCIPALE (OCCUPA IL RESTO DELLO SPAZIO SU PC) */}
        <main className="flex-1 min-w-0 max-w-7xl mx-auto px-3 sm:px-6 py-4 w-full space-y-4">
          {ruoloAttivo === 'PORTALE_DOCENTE' || (ruoloAttivo === 'VICEPRESIDENZA' && utenteInfo.ruolo !== 'VICEPRESIDENZA') ? (
            <PortaleDocente currentTab={tabDocente} onTabChange={setTabDocente} />
          ) : ruoloAttivo === 'QUADRO_SCUOLA' ? (
            <div className="space-y-4">
              {tabAta === 'QUADRO_SCUOLA' ? (
                <QuadroSostituzioniScuola initialDate={selectedDate} isEmbedInVicepresidenza={true} />
              ) : tabAta === 'IMPEGNI' || tabAta === 'RISORSE' ? (
                <VistaCalendariGoogle modalita={tabAta} />
              ) : (
                <PortaleDocente currentTab={tabAta as any} onTabChange={(t) => setTabAta(t as any)} isAtaView={true} />
              )}
            </div>
          ) : (
            <>
              {/* AVVISO GLOBALE RICHIESTE DOCENTI IN SOSPESO PER LA VICEPRESIDENZA */}
              {richiesteAccessoDocenti.filter(r => r.stato === 'IN_ATTESA').length > 0 && tabVice !== 'DOCENTI' && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-amber-950">
                        Ci sono {richiesteAccessoDocenti.filter(r => r.stato === 'IN_ATTESA').length} richieste di associazione account docente in sospeso!
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        Un docente ha eseguito l'accesso e attende la tua conferma per entrare nel Portale Docenti.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTabVice('DOCENTI')}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer shrink-0"
                  >
                    Gestisci Richieste →
                  </button>
                </div>
              )}

              {/* VISTA PRINCIPALE A 2 COLONNE CON TABELLONE IN PRIMO PIANO */}
              {tabVice === 'GESTIONE_GIORNALIERA' && (
                <div className="space-y-3 sm:space-y-4">
                  {/* BLOCCO UNIFICATO: AVANZAMENTO LAVORI + GESTIONE ASSENZE + EVENTI E RISORSE */}
                  <div className="shadow-2xs rounded-2xl">
                    <PanoramicaLavori 
                      selectedDate={selectedDate} 
                      onSelectDate={(newDate) => setSelectedDate(newDate)} 
                    />
                    <GestioneAssenze 
                      selectedDate={selectedDate} 
                      selectedGiorno={selectedGiorno} 
                      onChangeDate={(newDate) => setSelectedDate(newDate)}
                      mostraRisorseLaterale={mostraRisorseLaterale}
                      onToggleRisorseLaterale={() => setMostraRisorseLaterale(prev => !prev)}
                    />
                  </div>

                  {/* AREA PRINCIPALE: TABELLONE A TUTTA LARGHEZZA (O CON LATERALE SE APERTO) */}
                  <TabelloneSostituzioni 
                    selectedDate={selectedDate} 
                    selectedGiorno={selectedGiorno} 
                    onChangeDate={(newDate) => setSelectedDate(newDate)}
                    mostraRisorseLaterale={mostraRisorseLaterale}
                  />
                </div>
              )}

              {tabVice === 'QUADRO_SCUOLA' && (
                <QuadroSostituzioniScuola initialDate={selectedDate} isEmbedInVicepresidenza={true} />
              )}

              {tabVice === 'STORICO' && (
                <RegistroStoricoAssenze />
              )}

              {tabVice === 'REPORT' && (
                <ReportStatistiche />
              )}

              {tabVice === 'DOCENTI' && (
                <AnagraficaOrario />
              )}

              {tabVice === 'IMPEGNI' && (
                <VistaCalendariGoogle modalita="IMPEGNI" />
              )}

              {tabVice === 'RISORSE' && (
                <VistaCalendariGoogle modalita="RISORSE" />
              )}

              {tabVice === 'PERSONALIZZAZIONI' && (
                <PersonalizzazioniScuola />
              )}
            </>
          )}
        </main>
      </div>

      <Coachmark isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} ruolo={ruoloAttivo} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </AuthProvider>
  );
}

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, Bell, User, Key, Calendar, AlertTriangle, X, 
  LayoutDashboard, Clock, ShieldCheck, RefreshCw, Table, Search, 
  BookOpen, GraduationCap, Accessibility, Users, School, FileDown, 
  Printer, CheckSquare, Square, Check, Filter, ExternalLink, CalendarPlus,
  Scale, ArrowDownUp, TrendingDown, TrendingUp, Megaphone, ChevronDown, ChevronUp,
  Sliders
} from 'lucide-react';
import { 
  getDocentiCollegatiIds, getDocentiUnici, trovaCorrispondenzaDocente, 
  formatDataItaliana, getOrarioUnificatoDocente, getBaseNomeDocente, 
  getDocentiCompresentiInClasseNellOra, getClassiUniche, getDocentiConsiglioClasse,
  generaLinkGoogleCalendar, scaricaFileIcsCalendar, getMateriaDocenteNellOra,
  getOreCreditoDocente
} from '../utils/docentiHelper';
import { QuadroSostituzioniScuola } from './QuadroSostituzioniScuola';
import { VistaCalendariGoogle } from './VistaCalendariGoogle';
import { GiornoSettimana } from '../types';

const GIORNI_SETTIMANA: GiornoSettimana[] = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

export type TabDocenteType = 'MIE_SOSTITUZIONI' | 'BILANCIO_ORE' | 'QUADRO_SCUOLA' | 'ORARIO' | 'CONSIGLI_CLASSE' | 'IMPEGNI' | 'RISORSE' | 'PERSONALIZZAZIONI';

interface PortaleDocenteProps {
  currentTab?: TabDocenteType;
  onTabChange?: (tab: TabDocenteType) => void;
  isAtaView?: boolean;
}

export const PortaleDocente: React.FC<PortaleDocenteProps> = ({ currentTab, onTabChange, isAtaView = false }) => {
  const { 
    docenti, orariDocenti, sostituzioni, movimentiDebito, notifiche, firmaSostituzione, segnaNotificheLette, rimuoviNotifica,
    richiesteAccessoDocenti, associaEmailDocente, creaRichiestaAccessoDocente, impostazioniScuola, annunciBacheca
  } = useApp();
  const { utenteInfo, logout } = useAuth();

  const [notificaAttiva, setNotificaAttiva] = useState<boolean>(false);
  const [internalTab, setInternalTab] = useState<TabDocenteType>('MIE_SOSTITUZIONI');
  const [richiestaInviata, setRichiestaInviata] = useState<boolean>(false);
  const [mostraGuidaIos, setMostraGuidaIos] = useState<boolean>(false);
  const [accordionAnnunciAperto, setAccordionAnnunciAperto] = useState<boolean>(false);

  // Tab effettivo sincronizzato tra props e stato interno
  const tabDocente = currentTab || internalTab;
  const setTabDocente = (tab: TabDocenteType) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Stato per la visualizzazione dell'Orario: modalità Docente o Classe
  const [tipoVistaOrario, setTipoVistaOrario] = useState<'DOCENTE' | 'CLASSE'>('DOCENTE');
  const [docenteOrarioSelezionatoId, setDocenteOrarioSelezionatoId] = useState<string>('');
  const [classeOrarioSelezionata, setClasseOrarioSelezionata] = useState<string>('');

  // MODALE STAMPA / PDF PER L'ORARIO
  const [mostraModalePdfOrario, setMostraModalePdfOrario] = useState<boolean>(false);
  const [opzionePdfDocente, setOpzionePdfDocente] = useState<'MIO' | 'TUTTI' | 'SELEZIONE'>('MIO');
  const [docentiSelezionatiPdf, setDocentiSelezionatiPdf] = useState<string[]>([]);
  const [opzionePdfClasse, setOpzionePdfClasse] = useState<'ATTUALE' | 'TUTTE' | 'SELEZIONE'>('ATTUALE');
  const [classiSelezionatePdf, setClassiSelezionatePdf] = useState<string[]>([]);

  // Stato per Consigli di Classe
  const [classeConsiglioSelezionata, setClasseConsiglioSelezionata] = useState<string>('');

  // Stato per la finestra di scelta del Calendario (Google Calendar vs Apple/Outlook)
  const [sostituzionePerCalendario, setSostituzionePerCalendario] = useState<any | null>(null);

  // Calcola corrispondenza del docente autenticato
  const userEmail = utenteInfo?.email || '';
  const userDisplayName = utenteInfo?.displayName || '';

  // 1. Cerca se c'è un docente già esplicitamente associato a questa email
  const docenteAssociato = docenti.find(d => d.email && d.email.toLowerCase().trim() === userEmail.toLowerCase().trim());

  // 2. Se non ancora associato, esegui il matching intelligente
  const matchRisultato = React.useMemo(() => {
    if (!userEmail) return null;
    return trovaCorrispondenzaDocente(userEmail, userDisplayName, docenti);
  }, [userEmail, userDisplayName, docenti]);

  // Se c'è un match esatto al 100% (non ancora salvato su cloud), salvalo subito in automatico (Self-Onboarding Istantaneo)
  useEffect(() => {
    if (!docenteAssociato && matchRisultato?.tipo === 'ESATTO' && matchRisultato.docente) {
      console.log('⚡ Auto-onboarding docente riuscito:', matchRisultato.docente.nome, userEmail);
      associaEmailDocente(matchRisultato.docente.id, userEmail);
    }
  }, [docenteAssociato, matchRisultato, userEmail]);

  // Controlla se c'è una richiesta in attesa per questa email
  const richiestaEsistente = richiesteAccessoDocenti.find(
    r => r.email.toLowerCase().trim() === userEmail.toLowerCase().trim() && r.stato === 'IN_ATTESA'
  );

  const selectedDocenteId = docenteAssociato?.id || (matchRisultato?.tipo === 'ESATTO' ? matchRisultato.docente?.id || '' : '');
  const docente = docenti.find(d => d.id === selectedDocenteId);
  const collegatiIds = selectedDocenteId ? getDocentiCollegatiIds(selectedDocenteId, docenti) : [];

  // Lista delle classi uniche
  const classiDisponibili = React.useMemo(() => {
    return getClassiUniche(docenti, orariDocenti);
  }, [docenti, orariDocenti]);

  // Inizializza il docente visualizzato nell'orario con se stesso
  useEffect(() => {
    if (selectedDocenteId && !docenteOrarioSelezionatoId) {
      setDocenteOrarioSelezionatoId(selectedDocenteId);
    }
  }, [selectedDocenteId, docenteOrarioSelezionatoId]);

  // Inizializza classi predefinite
  useEffect(() => {
    if (classiDisponibili.length > 0) {
      if (!classeOrarioSelezionata) setClasseOrarioSelezionata(classiDisponibili[0]);
      if (!classeConsiglioSelezionata) setClasseConsiglioSelezionata(classiDisponibili[0]);
    }
  }, [classiDisponibili, classeOrarioSelezionata, classeConsiglioSelezionata]);

  // Salva l'id del docente per le push notification
  useEffect(() => {
    if (selectedDocenteId) {
      localStorage.setItem('portale_docente_loggato_id', selectedDocenteId);
    }
  }, [selectedDocenteId]);

  // Invia richiesta alla Vicepresidenza se la corrispondenza è parziale o assente
  const [isInvioInCorso, setIsInvioInCorso] = useState(false);

  const handleInviaRichiestaVicepresidenza = async () => {
    if (!userEmail || isInvioInCorso) return;
    setIsInvioInCorso(true);
    try {
      await creaRichiestaAccessoDocente({
        email: userEmail,
        displayName: userDisplayName,
        docenteSuggeritoId: matchRisultato?.docente?.id || '',
        docenteSuggeritoNome: matchRisultato?.docente?.nome || ''
      });
      setRichiestaInviata(true);
    } catch (e) {
      console.error(e);
      alert('Errore invio richiesta. Riprova tra poco.');
    } finally {
      setIsInvioInCorso(false);
    }
  };

  // Inizializza stato permessi notifiche se già concessi
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificaAttiva(true);
    }
  }, []);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); 
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (err) {
      console.log('Audio feedback not permitted:', err);
    }
  };

  const inviaNotificaSistema = async (titolo: string, opzioni: NotificationOptions) => {
    playNotificationSound();

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(titolo, {
            ...opzioni,
            icon: '/favicon.svg',
            badge: '/favicon.svg'
          } as any);
          return;
        }
      } catch (e) {
        console.log('Fallback to standard notification:', e);
      }
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(titolo, {
          ...opzioni,
          icon: '/favicon.svg',
          badge: '/favicon.svg'
        });
      } catch (err) {
        console.warn('Errore notifica desktop standard:', err);
      }
    }
  };

  const handleRichiediNotifiche = async () => {
    playNotificationSound();

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIos && !(window.navigator as any).standalone) {
      setMostraGuidaIos(true);
    }

    if (!('Notification' in window)) {
      alert('Il tuo browser non supporta le notifiche di sistema.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificaAttiva(true);
        inviaNotificaSistema('🔔 Notifiche Attivate con Successo!', {
          body: `Riceverai un avviso sonoro e visivo ogni volta che ti viene assegnata o revocata una supplenza.`
        });
      } else {
        alert('Hai rifiutato i permessi per le notifiche. Puoi abilitarli dalle impostazioni del browser.');
      }
    } catch (error) {
      console.error('Errore richiesta permessi notifica:', error);
    }
  };

  const handleInviaNotificaTest = () => {
    inviaNotificaSistema('🔔 Prova Notifica Sonora e Visiva', {
      body: `Test di ricezione completato! Il tuo dispositivo è pronto a ricevere le supplenze.`
    });
  };

  const mieSostituzioni = React.useMemo(() => {
    return sostituzioni
      .filter(s => collegatiIds.includes(s.docenteSostitutoId) && s.pubblicata)
      .sort((a, b) => {
        const cmpData = (a.data || '').localeCompare(b.data || '');
        if (cmpData !== 0) return cmpData;
        return (a.ora || 0) - (b.ora || 0);
      });
  }, [sostituzioni, collegatiIds]);

  const mieNotificheNonLette = React.useMemo(() => {
    return notifiche
      .filter(n => collegatiIds.includes(n.docenteId) && !n.letta)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [notifiche, collegatiIds]);

  const getDocenteNome = (id: string) => docenti.find(d => d.id === id)?.nome || id;

  const formatDataOraFirma = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const dataFmt = formatDataItaliana(isoString.split('T')[0]);
      const oraFmt = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${dataFmt} alle ${oraFmt}`;
    } catch {
      return isoString;
    }
  };

  const docentiUnici = getDocentiUnici(docenti);

  const docenteAttualeOrario = docenti.find(d => d.id === docenteOrarioSelezionatoId) || docente || docenti[0];
  const isMioOrario = docenteAttualeOrario && selectedDocenteId && getBaseNomeDocente(docenteAttualeOrario.nome) === getBaseNomeDocente(docente?.nome || '');

  // =========================================================================
  // SCHERMATA DI ATTESA / MATCHING IN CORSO (SOLO SE NON È VISTA ATA)
  // =========================================================================
  if (!docente && !isAtaView) {
    return (
      <div className="max-w-md mx-auto py-10 px-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center space-y-5">
          
          <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
              Account in Verifica
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-2">Associazione Docente Richiesta</h3>
            <p className="text-xs text-slate-600 mt-1">
              Account autenticato: <strong className="text-slate-900 font-mono">{userEmail}</strong>
            </p>
          </div>

          {matchRisultato?.tipo === 'SUGGERITO' && matchRisultato.docente && (
            <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-950">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Corrispondenza Suggerita</span>
              </div>
              <p className="text-xs text-slate-700">
                L'algoritmo ha rilevato che il tuo account potrebbe corrispondere a <strong>{matchRisultato.docente.nome}</strong>.
              </p>
              <span className="text-[11px] text-indigo-700 italic block">
                Motivo: {matchRisultato.motivo} (Affidabilità: {matchRisultato.confidenza}%)
              </span>
            </div>
          )}

          {richiestaEsistente || richiestaInviata ? (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-left flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">Richiesta inviata alla Vicepresidenza</h4>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  La Vicepresidenza ha ricevuto la notifica per abilitare il tuo accesso. Ricarica la pagina non appena approvato.
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInviaRichiestaVicepresidenza}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Invia Richiesta di Associazione alla Vicepresidenza</span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verifica Approvazione</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="text-xs text-slate-400 hover:text-slate-700 underline cursor-pointer"
            >
              Disconnetti account
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* BANNER NOTIFICHE: NUOVE SUPPLENZE E ANNULLAMENTI/AVVISI (NON VISIBILE IN VISTA ATA) */}
      {!isAtaView && mieNotificheNonLette.length > 0 && (
        <div className="space-y-2.5">
          {mieNotificheNonLette.map(n => {
            const isNuova = n.tipo === 'NUOVA_SOSTITUZIONE';
            return (
              <div 
                key={n.id} 
                className={`border-2 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
                  isNuova 
                    ? 'bg-gradient-to-r from-indigo-50/95 to-emerald-50/90 border-indigo-300' 
                    : 'bg-rose-50 border-rose-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                    isNuova 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-rose-600 text-white'
                  }`}>
                    {isNuova ? <Bell className="w-4 h-4 animate-bounce" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className={`font-black text-sm flex items-center gap-2 ${
                      isNuova ? 'text-indigo-950' : 'text-rose-950'
                    }`}>
                      <span>{n.titolo}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isNuova ? 'bg-indigo-200/80 text-indigo-900 font-bold' : 'bg-rose-200 text-rose-800'
                      }`}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </h4>
                    <p className={`text-xs mt-0.5 font-medium ${
                      isNuova ? 'text-slate-800' : 'text-rose-900'
                    }`}>
                      {n.messaggio}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    rimuoviNotifica(n.id);
                    segnaNotificheLette(selectedDocenteId);
                  }}
                  className={`text-xs font-black px-3.5 py-2 rounded-xl transition shrink-0 cursor-pointer shadow-2xs hover:scale-105 active:scale-95 border ${
                    isNuova
                      ? 'text-white bg-indigo-600 hover:bg-indigo-700 border-indigo-700'
                      : 'text-rose-700 hover:text-rose-950 bg-rose-100/90 hover:bg-rose-200 border-rose-300'
                  }`}
                >
                  Ho Capito ✓
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* HEADER PROFILO DOCENTE COMPATTO (NON VISIBILE IN VISTA ATA) */}
      {!isAtaView && (
        <div className="no-print bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-2xs border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-2xs shrink-0">
              {docente?.nome ? docente.nome.split(' ').map(n => n[0]).slice(0, 2).join('') : 'DOC'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">{docente?.nome}</h2>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 hidden sm:inline">
                  {docente?.materia}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium sm:hidden">
                {docente?.materia}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              Esci
            </button>
          </div>
        </div>
      )}

      {/* GUIDA ATTIVAZIONE NOTIFICHE IPHONE / IPAD */}
      {!isAtaView && mostraGuidaIos && (
        <div className="no-print bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-xl border border-indigo-700 animate-in fade-in space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/30 text-indigo-300 rounded-xl text-lg">
                📲
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Come attivare le Notifiche Push su iPhone / iPad</h4>
                <p className="text-xs text-indigo-200">Requisito di sicurezza Apple (iOS 16.4 o successivo)</p>
              </div>
            </div>
            <button 
              onClick={() => setMostraGuidaIos(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-xs text-indigo-100 space-y-2 bg-white/5 p-3.5 rounded-xl border border-white/10">
            <p className="font-semibold text-white">Per ricevere gli avvisi sonori e visivi di supplenza sul tuo iPhone:</p>
            <ol className="list-decimal list-inside space-y-1 text-indigo-200">
              <li>Tocca l'icona <strong>Condividi</strong> in basso su Safari (quadrato con freccia in alto <span className="font-bold">⬆</span>).</li>
              <li>Scorri il menu e seleziona <strong>"Aggiungi alla schermata Home"</strong>.</li>
              <li>Apri l'app dalla Home del tuo iPhone e tocca <strong>"Attiva Notifiche Push"</strong>.</li>
            </ol>
          </div>
        </div>
      )}

      {/* PULSANTI DI NAVIGAZIONE SCHEDE IN LINEA (NON VISIBILE IN VISTA ATA PERCHE HA IL SUO NAV INTEGRATO) */}
      {!isAtaView && (
        <div className="no-print flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setTabDocente('MIE_SOSTITUZIONI')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              tabDocente === 'MIE_SOSTITUZIONI'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Sostituzioni</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${tabDocente === 'MIE_SOSTITUZIONI' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {mieSostituzioni.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabDocente('BILANCIO_ORE')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              tabDocente === 'BILANCIO_ORE'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Scale className="w-4 h-4 text-amber-500" />
            <span>Bilancio Ore</span>
          </button>

          <button
            type="button"
            onClick={() => setTabDocente('QUADRO_SCUOLA')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              tabDocente === 'QUADRO_SCUOLA'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Quadro Generale</span>
          </button>

          <button
            type="button"
            onClick={() => setTabDocente('ORARIO')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              tabDocente === 'ORARIO'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Orario</span>
          </button>

          <button
            type="button"
            onClick={() => setTabDocente('CONSIGLI_CLASSE')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              tabDocente === 'CONSIGLI_CLASSE'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Consigli di Classe</span>
          </button>

          {/* Mostra la scheda Impegni solo se è stato configurato almeno un calendario impegni */}
          {Boolean(
            (impostazioniScuola?.calendariGoogle?.impegni && impostazioniScuola.calendariGoogle.impegni.length > 0) ||
            impostazioniScuola?.calendariGoogle?.impegniPlenariId ||
            impostazioniScuola?.calendariGoogle?.impegniSecondariaId
          ) && (
            <button
              type="button"
              onClick={() => setTabDocente('IMPEGNI')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                tabDocente === 'IMPEGNI'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Impegni Scolastici</span>
            </button>
          )}

          {/* Mostra la scheda Risorse solo se è stata configurata almeno una stanza/risorsa */}
          {Boolean(
            (impostazioniScuola?.calendariGoogle?.risorse && impostazioniScuola.calendariGoogle.risorse.length > 0) ||
            impostazioniScuola?.calendariGoogle?.risorseInformaticaId ||
            impostazioniScuola?.calendariGoogle?.risorseTeatroId
          ) && (
            <button
              type="button"
              onClick={() => setTabDocente('RISORSE')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                tabDocente === 'RISORSE'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-sm">🏢</span>
              <span>Risorse & Spazi</span>
            </button>
          )}

          {/* Scheda Personalizzazioni Docente */}
          <button
            type="button"
            onClick={() => setTabDocente('PERSONALIZZAZIONI')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              tabDocente === 'PERSONALIZZAZIONI'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>Personalizzazioni</span>
          </button>
        </div>
      )}

      {/* CONTENUTO SCHEDA IMPEGNI SCOLASTICI */}
      {tabDocente === 'IMPEGNI' && (
        <VistaCalendariGoogle modalita="IMPEGNI" />
      )}

      {/* CONTENUTO SCHEDA RISORSE E SPAZI */}
      {tabDocente === 'RISORSE' && (
        <VistaCalendariGoogle modalita="RISORSE" />
      )}

      {/* CONTENUTO SCHEDA PERSONALIZZAZIONI DOCENTE */}
      {tabDocente === 'PERSONALIZZAZIONI' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 animate-in fade-in">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Impostazioni Personali</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 mt-0.5">
              <Sliders className="w-6 h-6 text-indigo-600" />
              <span>Personalizzazioni & Notifiche</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Configura la ricezione delle notifiche push istantanee sul tuo dispositivo (iPhone, Android, PC/Mac).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BOX NOTIFICHE PUSH */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-2xs ${
                  notificaAttiva ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">Notifiche Push di Supplenza</h4>
                  <p className="text-xs text-slate-500">
                    Stato: {notificaAttiva ? <strong className="text-emerald-700">Attive ✓</strong> : <strong className="text-amber-700">Non attive</strong>}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Ricevi immediatamente un suono e un avviso sul telefono o computer ogni volta che la Vicepresidenza ti assegna una supplenza, pubblica un avviso o registra un'uscita.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRichiediNotifiche}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition cursor-pointer shadow-2xs ${
                    notificaAttiva
                      ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                      : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>{notificaAttiva ? 'Notifiche Push Attive ✓' : 'Attiva Notifiche Push'}</span>
                </button>

                {notificaAttiva && (
                  <button
                    type="button"
                    onClick={handleInviaNotificaTest}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Invia notifica sonora di prova"
                  >
                    <span>🔔 Prova Notifica</span>
                  </button>
                )}
              </div>
            </div>

            {/* BOX GUIDA IPHONE / IPAD */}
            <div className="bg-indigo-900 text-white p-5 rounded-2xl border border-indigo-800 space-y-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📲</span>
                <h4 className="font-black text-sm text-white">Istruzioni per iPhone & iPad</h4>
              </div>
              <p className="text-xs text-indigo-200">
                Su iOS 16.4+ le notifiche push Web richiedono l'installazione dell'app nella Home:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-indigo-100 bg-white/10 p-3.5 rounded-xl border border-white/10 font-medium">
                <li>Apri il sito in <strong>Safari</strong>.</li>
                <li>Tocca <strong>Condividi</strong> (icona ⬆ in basso).</li>
                <li>Tocca <strong>"Aggiungi alla schermata Home"</strong>.</li>
                <li>Apri l'app dalla Home e premi <strong>Attiva Notifiche</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* CONTENUTO SCHEDA 1: LE MIE SOSTITUZIONI */}
      {tabDocente === 'MIE_SOSTITUZIONI' && (
        <div className="space-y-4">
          {/* ACCORDION ANNUNCI & COMUNICAZIONI VICEPRESIDENZA */}
          {(() => {
            const todayIso = new Date().toISOString().split('T')[0];
            const annunciAttivi = annunciBacheca.filter(a => {
              const fineIso = (a.dataFine || a.data).split('T')[0];
              return fineIso >= todayIso;
            });

            if (annunciAttivi.length === 0) return null;

            return (
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in">
                <div 
                  onClick={() => setAccordionAnnunciAperto(prev => !prev)}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between cursor-pointer hover:bg-violet-100/40 transition select-none"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-2xs">
                      <Megaphone className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-xs sm:text-sm text-violet-950">
                        Bacheca Annunci & Comunicazioni
                      </h4>
                      <span className="bg-violet-200 text-violet-900 font-bold text-[9px] sm:text-[10px] px-2 py-0.2 rounded-full">
                        {annunciAttivi.length} {annunciAttivi.length === 1 ? 'Avviso' : 'Avvisi'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-violet-700">
                    <span className="text-[11px] font-bold hidden sm:inline">
                      {accordionAnnunciAperto ? 'Comprimi' : 'Leggi'}
                    </span>
                    {accordionAnnunciAperto ? (
                      <ChevronUp className="w-4 h-4 text-violet-700" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-violet-700" />
                    )}
                  </div>
                </div>

                {accordionAnnunciAperto && (
                  <div className="p-4 pt-1 border-t border-violet-200/60 divide-y divide-violet-200/50 space-y-3">
                    {annunciAttivi.map(a => (
                      <div key={a.id} className="pt-3 first:pt-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="bg-violet-700 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-md shadow-2xs">
                            {formatDataItaliana(a.data)} {a.dataFine && a.dataFine !== a.data ? `➔ ${formatDataItaliana(a.dataFine)}` : ''}
                          </span>
                          <span className="text-[10px] font-bold text-violet-800 bg-violet-200/70 px-2 py-0.5 rounded">
                            {a.autore || 'Vicepresidenza'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed bg-white/80 p-3 rounded-xl border border-violet-200">
                          {a.testo}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span>Le tue Sostituzioni Assegnate</span>
                </h3>
                <p className="text-xs text-slate-500">Firma per presa visione delle ore di supplenza a te affidate</p>
              </div>
              <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
                {mieSostituzioni.length} Assegnazioni
              </span>
            </div>

          {mieSostituzioni.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">Nessuna sostituzione assegnata</p>
              <p className="text-xs">Al momento non hai supplenze pubblicate per questa settimana.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {mieSostituzioni.map((s) => {
                const materiaAssente = getMateriaDocenteNellOra(s.docenteAssenteId, s.giorno, s.ora, docenti, orariDocenti);

                return (
                <div key={s.id} className="p-4 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-0.5 rounded shadow-2xs">
                        {s.giorno} {formatDataItaliana(s.data)}
                      </span>
                      <span className="bg-slate-800 text-white font-bold text-xs px-2.5 py-0.5 rounded shadow-2xs">
                        {s.ora}ª Ora
                      </span>
                      <span className="font-black text-slate-900 text-base">
                        Classe {s.classe}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 font-medium">
                      Sostituzione del docente: <strong className="text-slate-950 font-black">{getDocenteNome(s.docenteAssenteId)}</strong>
                      {materiaAssente && (
                        <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[11px]">
                          📚 {materiaAssente}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-indigo-700 font-medium">
                      Tipologia: {s.categoria.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* PULSANTE SINGOLO INTELLIGENTE CALENDARIO (COMPATTO SU MOBILE) */}
                    <button
                      type="button"
                      onClick={() => setSostituzionePerCalendario(s)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs group hover:scale-105 active:scale-95"
                      title="Aggiungi al tuo calendario (Google, Apple o Outlook)"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition" />
                      <span className="sm:hidden">Aggiungi</span>
                      <span className="hidden sm:inline">Aggiungi a Calendario</span>
                    </button>

                    {s.firmata ? (
                      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Firmato il {formatDataOraFirma(s.dataFirma)}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => firmaSostituzione(s.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow flex items-center gap-2 cursor-pointer"
                      >
                        <span>Firma per Presa Visione</span>
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}

      {/* CONTENUTO SCHEDA: BILANCIO ORE (CREDITI, DEBITI & MOVIMENTI DETTAGLIATI) */}
      {tabDocente === 'BILANCIO_ORE' && (() => {
        const oreCredito = docente ? getOreCreditoDocente(docente.id, docenti, sostituzioni, movimentiDebito) : 0;
        const oreDebito = docente?.oreDebitoPermesso || 0;
        const saldoNetto = oreCredito - oreDebito;

        const mieiMovimenti = movimentiDebito
          .filter(m => collegatiIds.includes(m.docenteId))
          .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

        const mieSupplenzeCredito = sostituzioni
          .filter(s => collegatiIds.includes(s.docenteSostitutoId) && (s.isStraordinario || s.categoria === 'STRAORDINARIO_D'))
          .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

        const mieSupplenzeRecupero = sostituzioni
          .filter(s => collegatiIds.includes(s.docenteSostitutoId) && s.consumaDebito)
          .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

        return (
          <div className="space-y-4 animate-fadeIn">
            {/* INTESTAZIONE E KPI RIEPILOGATIVI */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-lg sm:text-xl flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Scale className="w-5 h-5" />
                    </div>
                    <span>Il Tuo Bilancio Ore & Movimenti</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Trasparenza contabile completa su ore a credito, permessi brevi fruiti, compensazioni e recuperi effettuati.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200">
                    Docente: <strong className="text-slate-950">{docente ? getBaseNomeDocente(docente.nome) : 'Docente'}</strong>
                  </span>
                </div>
              </div>

              {/* CARD KPI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* 1. ORE A CREDITO */}
                <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[11px] font-black text-emerald-900 block uppercase tracking-wider">
                      Ore a Credito Disponibili
                    </span>
                    <strong className="text-2xl sm:text-3xl font-black text-emerald-950 block mt-0.5">
                      +{oreCredito} <span className="text-sm font-bold text-emerald-800">Ore</span>
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                      Maturate con supplenze / ore aggiuntive
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-200/80 text-emerald-900 flex items-center justify-center font-bold text-lg shrink-0">
                    <TrendingUp className="w-6 h-6 text-emerald-800" />
                  </div>
                </div>

                {/* 2. ORE A DEBITO */}
                <div className="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[11px] font-black text-rose-900 block uppercase tracking-wider">
                      Ore a Debito da Recuperare
                    </span>
                    <strong className="text-2xl sm:text-3xl font-black text-rose-950 block mt-0.5">
                      {oreDebito > 0 ? `-${oreDebito}` : '0'} <span className="text-sm font-bold text-rose-800">Ore</span>
                    </strong>
                    <span className="text-[10px] text-rose-700 font-medium block mt-1">
                      Da permessi brevi non ancora recuperati
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-rose-200/80 text-rose-900 flex items-center justify-center font-bold text-lg shrink-0">
                    <TrendingDown className="w-6 h-6 text-rose-800" />
                  </div>
                </div>

                {/* 3. SALDO NETTO */}
                <div className={`border rounded-2xl p-4 flex items-center justify-between shadow-2xs ${
                  saldoNetto > 0 
                    ? 'bg-teal-50/70 border-teal-200/90 text-teal-950'
                    : saldoNetto < 0 
                    ? 'bg-amber-50/70 border-amber-200/90 text-amber-950' 
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider">
                      Saldo Netto Complessivo
                    </span>
                    <strong className="text-2xl sm:text-3xl font-black block mt-0.5">
                      {saldoNetto > 0 ? `+${saldoNetto}` : saldoNetto} <span className="text-sm font-bold">Ore</span>
                    </strong>
                    <span className="text-[10px] font-medium block mt-1">
                      {saldoNetto > 0 
                        ? 'Sei in attivo con la scuola' 
                        : saldoNetto < 0 
                        ? 'Debito netto da coprire con supplenze' 
                        : 'Bilancio in perfetto pareggio (0)'}
                    </span>
                  </div>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                    saldoNetto > 0 
                      ? 'bg-teal-200/80 text-teal-900' 
                      : saldoNetto < 0 
                      ? 'bg-amber-200/80 text-amber-900' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    <ArrowDownUp className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* SEZIONE STORICO MOVIMENTI E DETTAGLIO CONTABILE */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-black text-slate-900 text-sm sm:text-base">
                    Cronologia Completa dei Movimenti Contabili
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {mieiMovimenti.length} Registrazioni
                </span>
              </div>

              {mieiMovimenti.length === 0 && mieSupplenzeCredito.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-xs">Nessun movimento registrato a tuo carico</p>
                  <p className="text-[11px]">Tutti i tuoi permessi orari e crediti di supplenza verranno tracciati puntualmente qui.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {/* Elenco movimenti formattati con badge dedicati */}
                  {mieiMovimenti.map((m) => {
                    const isCompensazione = m.descrizione?.includes('[COMPENSAZIONE_STRAORDINARIO]');
                    const isRecupero = m.tipo === 'DEBITO_RECUPERATO';
                    const isDebitoGen = m.tipo === 'DEBITO_GENERATO';

                    return (
                      <div key={m.id} className="py-3 px-1 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-50 transition rounded-xl">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-slate-800 text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow-2xs">
                              {m.giorno} {formatDataItaliana(m.data)}
                            </span>

                            {isCompensazione ? (
                              <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                <span>⚖️</span>
                                <span>Compensato da Credito</span>
                              </span>
                            ) : isRecupero ? (
                              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                <span>✓</span>
                                <span>Debito Recuperato (+1h)</span>
                              </span>
                            ) : isDebitoGen ? (
                              <span className="bg-rose-100 text-rose-900 border border-rose-300 font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                <span>⏳</span>
                                <span>Permesso Breve (Debito Generato)</span>
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-800 font-bold text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
                                {m.tipo.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>

                          <p className="text-slate-700 text-xs font-medium leading-relaxed">
                            {m.descrizione.replace('[COMPENSAZIONE_STRAORDINARIO] ', '')}
                          </p>

                          {m.createdAt && (
                            <span className="text-[10px] text-slate-400 block">
                              Registrato il {new Date(m.createdAt).toLocaleDateString('it-IT')} alle {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        {/* Variazione ore delta badge */}
                        <div className="shrink-0 text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs ${
                            m.deltaOre > 0
                              ? 'bg-emerald-600 text-white'
                              : isCompensazione 
                              ? 'bg-indigo-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}>
                            {m.deltaOre > 0 ? `+${m.deltaOre}h` : `${m.deltaOre}h`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* CONTENUTO SCHEDA 2: QUADRO GENERALE SCUOLA */}
      {tabDocente === 'QUADRO_SCUOLA' && (
        <QuadroSostituzioniScuola isEmbedInVicepresidenza={true} />
      )}

      {/* CONTENUTO SCHEDA 3: CONSULTAZIONE ORARIO PERSONALE, DEI COLLEGHI E PER CLASSE */}
      {tabDocente === 'ORARIO' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-4 sm:p-6">
          {/* INTESTAZIONE SCHEDA ORARIO (SOLO A SCHERMO, NASCOSTA NELLA STAMPA PDF) */}
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Table className="w-5 h-5 text-indigo-600" />
                <span>
                  {tipoVistaOrario === 'DOCENTE'
                    ? isMioOrario ? 'Il Tuo Orario Settimanale' : `Orario di ${docenteAttualeOrario?.nome}`
                    : `Orario Settimanale Classe ${classeOrarioSelezionata}`}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {tipoVistaOrario === 'DOCENTE'
                  ? 'Visualizza orario docente con figure compresenti in aula (Sostegno / Educatori).'
                  : 'Consulta la tabella oraria completa della classe con tutti i docenti assegnati ora per ora.'}
              </p>
            </div>

            {/* SWITCHER TIPO VISTA: DOCENTE VS CLASSE */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTipoVistaOrario('DOCENTE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    tipoVistaOrario === 'DOCENTE'
                      ? 'bg-white text-indigo-950 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vista Docente
                </button>
                <button
                  type="button"
                  onClick={() => setTipoVistaOrario('CLASSE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    tipoVistaOrario === 'CLASSE'
                      ? 'bg-white text-indigo-950 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vista per Classe
                </button>
              </div>

              {/* SELETTORE VISTA DOCENTE */}
              {tipoVistaOrario === 'DOCENTE' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!isMioOrario && (
                    <button
                      type="button"
                      onClick={() => setDocenteOrarioSelezionatoId(selectedDocenteId)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <span>👤 Mio Orario</span>
                    </button>
                  )}

                  <select
                    value={docenteOrarioSelezionatoId}
                    onChange={(e) => setDocenteOrarioSelezionatoId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={selectedDocenteId}>-- Mio Orario ({docente?.nome}) --</option>
                    <optgroup label="Tutti i Colleghi">
                      {docentiUnici.filter(d => d.id !== selectedDocenteId).map(d => (
                        <option key={d.id} value={d.id}>
                          {d.nome} ({d.materie.join(', ')})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {/* SELETTORE VISTA PER CLASSE */}
              {tipoVistaOrario === 'CLASSE' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Classe:</span>
                  <select
                    value={classeOrarioSelezionata}
                    onChange={(e) => setClasseOrarioSelezionata(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-indigo-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {classiDisponibili.map(c => (
                      <option key={c} value={c}>Classe {c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* PULSANTE SCARICA / STAMPA PDF ALL'INTERNO DEL TAB ORARIO */}
              <button
                type="button"
                onClick={() => {
                  if (tipoVistaOrario === 'DOCENTE') {
                    setOpzionePdfDocente('MIO');
                    setDocentiSelezionatiPdf(selectedDocenteId ? [selectedDocenteId] : []);
                  } else {
                    setOpzionePdfClasse('ATTUALE');
                    setClassiSelezionatePdf(classeOrarioSelezionata ? [classeOrarioSelezionata] : []);
                  }
                  setMostraModalePdfOrario(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto sm:ml-0"
                title="Scarica o stampa orario in PDF"
              >
                <FileDown className="w-4 h-4" />
                <span>Scarica / Stampa PDF</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MODALE DI SCELTA STAMPA/PDF PER L'ORARIO                   */}
          {/* ========================================================= */}
          {mostraModalePdfOrario && (
            <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs">
                      <FileDown className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {tipoVistaOrario === 'DOCENTE' ? 'Scarica / Stampa Orario Docenti' : 'Scarica / Stampa Orario Classi'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ogni orario verrà formattato su una singola pagina orizzontale
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostraModalePdfOrario(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* OPZIONI PER VISTA DOCENTE */}
                {tipoVistaOrario === 'DOCENTE' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setOpzionePdfDocente('MIO');
                          if (selectedDocenteId) setDocentiSelezionatiPdf([selectedDocenteId]);
                        }}
                        className={`py-2 px-2 rounded-xl transition cursor-pointer text-center ${
                          opzionePdfDocente === 'MIO'
                            ? 'bg-white text-indigo-950 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Il Mio Orario
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOpzionePdfDocente('TUTTI');
                          setDocentiSelezionatiPdf(docentiUnici.map(d => d.id));
                        }}
                        className={`py-2 px-2 rounded-xl transition cursor-pointer text-center ${
                          opzionePdfDocente === 'TUTTI'
                            ? 'bg-white text-indigo-950 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tutti ({docentiUnici.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOpzionePdfDocente('SELEZIONE');
                          if (docentiSelezionatiPdf.length === 0 && selectedDocenteId) {
                            setDocentiSelezionatiPdf([selectedDocenteId]);
                          }
                        }}
                        className={`py-2 px-2 rounded-xl transition cursor-pointer text-center ${
                          opzionePdfDocente === 'SELEZIONE'
                            ? 'bg-white text-indigo-950 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Seleziona...
                      </button>
                    </div>

                    {/* SELEZIONE CHECKBOX DOCENTI */}
                    {opzionePdfDocente === 'SELEZIONE' && (
                      <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200">
                          <span className="font-bold text-slate-700">
                            Selezionati: {docentiSelezionatiPdf.length} di {docentiUnici.length}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDocentiSelezionatiPdf(docentiUnici.map(d => d.id))}
                              className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              Tutti
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => setDocentiSelezionatiPdf([])}
                              className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                            >
                              Nessuno
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {docentiUnici.map(d => {
                            const isSel = docentiSelezionatiPdf.includes(d.id);
                            return (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setDocentiSelezionatiPdf(prev => 
                                    prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]
                                  );
                                }}
                                className={`p-2 rounded-xl text-left text-xs font-bold border transition flex items-center justify-between cursor-pointer ${
                                  isSel 
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <span className="truncate">{d.nome}</span>
                                {isSel ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* OPZIONI PER VISTA CLASSE */
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setOpzionePdfClasse('ATTUALE');
                          if (classeOrarioSelezionata) setClassiSelezionatePdf([classeOrarioSelezionata]);
                        }}
                        className={`py-2 px-2 rounded-xl transition cursor-pointer text-center ${
                          opzionePdfClasse === 'ATTUALE'
                            ? 'bg-white text-indigo-950 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Classe {classeOrarioSelezionata}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOpzionePdfClasse('TUTTE');
                          setClassiSelezionatePdf(classiDisponibili);
                        }}
                        className={`py-2 px-2 rounded-xl transition cursor-pointer text-center ${
                          opzionePdfClasse === 'TUTTE'
                            ? 'bg-white text-indigo-950 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tutte ({classiDisponibili.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOpzionePdfClasse('SELEZIONE');
                          if (classiSelezionatePdf.length === 0 && classeOrarioSelezionata) {
                            setClassiSelezionatePdf([classeOrarioSelezionata]);
                          }
                        }}
                        className={`py-2 px-2 rounded-xl transition cursor-pointer text-center ${
                          opzionePdfClasse === 'SELEZIONE'
                            ? 'bg-white text-indigo-950 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Seleziona...
                      </button>
                    </div>

                    {/* SELEZIONE CHECKBOX CLASSI */}
                    {opzionePdfClasse === 'SELEZIONE' && (
                      <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200">
                          <span className="font-bold text-slate-700">
                            Selezionate: {classiSelezionatePdf.length} di {classiDisponibili.length}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setClassiSelezionatePdf(classiDisponibili)}
                              className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              Tutte
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => setClassiSelezionatePdf([])}
                              className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                            >
                              Nessuna
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {classiDisponibili.map(c => {
                            const isSel = classiSelezionatePdf.includes(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  setClassiSelezionatePdf(prev => 
                                    prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                                  );
                                }}
                                className={`p-2 rounded-xl text-xs font-black border transition flex items-center justify-between cursor-pointer ${
                                  isSel 
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <span>{c}</span>
                                {isSel ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PULSANTI DI AZIONE */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMostraModalePdfOrario(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Annulla
                  </button>

                  <button
                    type="button"
                    disabled={
                      (tipoVistaOrario === 'DOCENTE' && opzionePdfDocente === 'SELEZIONE' && docentiSelezionatiPdf.length === 0) ||
                      (tipoVistaOrario === 'CLASSE' && opzionePdfClasse === 'SELEZIONE' && classiSelezionatePdf.length === 0)
                    }
                    onClick={() => {
                      setMostraModalePdfOrario(false);
                      setTimeout(() => {
                        window.print();
                      }, 150);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Genera e Salva in PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VISTA A SCHERMO (INTERATTIVA)                             */}
          {/* ========================================================= */}
          <div className="no-print">
            {/* VISTA 1: TABELLA ORARIO DOCENTE */}
            {tipoVistaOrario === 'DOCENTE' && (() => {
              const orarioDoc = getOrarioUnificatoDocente(docenteAttualeOrario?.id || '', docenti, orariDocenti);
              const isDocenteSostegno = docenteAttualeOrario?.isSostegno || docenteAttualeOrario?.materia?.toUpperCase().includes('SOSTEGNO');

              let maxOraDocente = 6;
              [7, 8, 9].forEach(o => {
                const hasOra = orarioDoc.some(c => c.ora === o && c.valore && c.valore.trim() !== '');
                if (hasOra) maxOraDocente = Math.max(maxOraDocente, o);
              });

              const oreDaMostrare = Array.from({ length: maxOraDocente }, (_, i) => i + 1);

              return (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase">
                        <th className="py-2.5 px-2 w-16 border-r border-slate-200">Ora</th>
                        {GIORNI_SETTIMANA.map(g => (
                          <th key={g} className="py-2.5 px-2 border-r border-slate-200 last:border-r-0">
                            {g}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {oreDaMostrare.map(oraNum => (
                        <tr key={oraNum} className="hover:bg-slate-50/60 transition">
                          <td className="py-2 px-2 font-black text-slate-700 bg-slate-50/80 border-r border-slate-200">
                            {oraNum}ª
                          </td>
                          {GIORNI_SETTIMANA.map(giorno => {
                            const cella = orarioDoc.find(c => c.giorno === giorno && c.ora === oraNum);
                            const val = cella?.valore?.trim() || '';

                            if (!val) {
                              return (
                                <td key={giorno} className="py-2 px-2 border-r border-slate-200 last:border-r-0 text-slate-300">
                                  -
                                </td>
                              );
                            }

                            if (val.toUpperCase() === 'D') {
                              return (
                                <td key={giorno} className="py-2 px-2 border-r border-slate-200 last:border-r-0 bg-amber-50/80">
                                  <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 font-black px-2 py-0.5 rounded text-xs shadow-2xs">
                                    D (Disposizione)
                                  </span>
                                </td>
                              );
                            }

                            if (val.toUpperCase() === 'P' || val.toUpperCase().startsWith('POT')) {
                              return (
                                <td key={giorno} className="py-2 px-2 border-r border-slate-200 last:border-r-0 bg-purple-50/80">
                                  <span className="inline-block bg-purple-100 text-purple-900 border border-purple-300 font-black px-2 py-0.5 rounded text-xs shadow-2xs">
                                    P (Potenziamento)
                                  </span>
                                </td>
                              );
                            }

                            const compresenze = getDocentiCompresentiInClasseNellOra(
                              val, giorno, oraNum, docenti, orariDocenti, docenteAttualeOrario?.nome
                            );

                            return (
                              <td key={giorno} className="py-2 px-2 border-r border-slate-200 last:border-r-0 align-top">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="inline-block bg-indigo-50 text-indigo-900 border border-indigo-200 font-black px-2 py-0.5 rounded text-xs shadow-2xs">
                                      {val}
                                    </span>
                                    {cella?.isCasoGrave && (
                                      <span className="bg-rose-600 text-white font-black text-[9px] px-1 py-0.2 rounded" title="Caso Grave">
                                        ♿
                                      </span>
                                    )}
                                  </div>

                                  {isDocenteSostegno && compresenze.curricolari.length > 0 && (
                                    <div className="text-[10px] bg-slate-50 border border-slate-200 rounded p-1 text-slate-700 text-left font-medium">
                                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Curricolare:</span>
                                      {compresenze.curricolari.map(c => (
                                        <div key={c.id} className="truncate">
                                          🧑‍🏫 {getBaseNomeDocente(c.nome)} <span className="text-slate-400">({c.materia})</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {!isDocenteSostegno && compresenze.sostegni.length > 0 && (
                                    <div className="text-[10px] bg-purple-50 border border-purple-200 rounded p-1 text-purple-900 text-left font-medium">
                                      <span className="text-[9px] font-bold text-purple-700 block uppercase">Sostegno in aula:</span>
                                      {compresenze.sostegni.map(s => (
                                        <div key={s.id} className="truncate">
                                          ♿ {getBaseNomeDocente(s.nome)}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {compresenze.educatori.length > 0 && (
                                    <div className="text-[10px] bg-teal-50 border border-teal-200 rounded p-1 text-teal-900 text-left font-medium">
                                      <span className="text-[9px] font-bold text-teal-700 block uppercase">Educatore:</span>
                                      {compresenze.educatori.map(ed => (
                                        <div key={ed.id} className="truncate">
                                          🎓 {getBaseNomeDocente(ed.nome)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* VISTA 2: TABELLA ORARIO PER CLASSE */}
            {tipoVistaOrario === 'CLASSE' && (() => {
              let maxOraClasse = 6;
              [7, 8, 9].forEach(o => {
                const hasOra = GIORNI_SETTIMANA.some(giorno => {
                  const comp = getDocentiCompresentiInClasseNellOra(
                    classeOrarioSelezionata, giorno, o, docenti, orariDocenti
                  );
                  return comp.curricolari.length > 0 || comp.sostegni.length > 0 || comp.educatori.length > 0;
                });
                if (hasOra) maxOraClasse = Math.max(maxOraClasse, o);
              });

              const oreDaMostrareClasse = Array.from({ length: maxOraClasse }, (_, i) => i + 1);

              return (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase">
                        <th className="py-2.5 px-2 w-16 border-r border-slate-200">Ora</th>
                        {GIORNI_SETTIMANA.map(g => (
                          <th key={g} className="py-2.5 px-2 border-r border-slate-200 last:border-r-0">
                            {g}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {oreDaMostrareClasse.map(oraNum => (
                        <tr key={oraNum} className="hover:bg-slate-50/60 transition">
                          <td className="py-2 px-2 font-black text-slate-700 bg-slate-50/80 border-r border-slate-200">
                            {oraNum}ª
                          </td>
                          {GIORNI_SETTIMANA.map(giorno => {
                            const compresenze = getDocentiCompresentiInClasseNellOra(
                              classeOrarioSelezionata, giorno, oraNum, docenti, orariDocenti
                            );

                            const hasQualcosa = compresenze.curricolari.length > 0 || compresenze.sostegni.length > 0 || compresenze.educatori.length > 0;

                            if (!hasQualcosa) {
                              return (
                                <td key={giorno} className="py-2 px-2 border-r border-slate-200 last:border-r-0 text-slate-300">
                                  -
                                </td>
                              );
                            }

                            return (
                              <td key={giorno} className="py-2 px-2 border-r border-slate-200 last:border-r-0 align-top">
                                <div className="space-y-1.5 text-left">
                                  {/* MATERIA IN EVIDENZA PRIMA, POI DOCENTE CURRICOLARE */}
                                  {compresenze.curricolari.map(c => (
                                    <div key={c.id} className="p-1.5 bg-indigo-50/90 border border-indigo-200 rounded-lg leading-tight shadow-2xs">
                                      <div className="text-[10px] text-indigo-700 font-black uppercase tracking-wide truncate">
                                        📖 {c.materia}
                                      </div>
                                      <div className="font-bold text-slate-900 text-[11px] truncate mt-0.5">
                                        🧑‍🏫 {getBaseNomeDocente(c.nome)}
                                      </div>
                                    </div>
                                  ))}

                                  {/* DOCENTI DI SOSTEGNO */}
                                  {compresenze.sostegni.map(s => (
                                    <div key={s.id} className="p-1 bg-purple-50 border border-purple-200 rounded text-[10px] leading-tight text-purple-900">
                                      <div className="font-bold flex items-center gap-1 truncate">
                                        <span>♿</span>
                                        <span className="truncate">{getBaseNomeDocente(s.nome)}</span>
                                      </div>
                                      <span className="text-[9px] text-purple-600 font-medium">Sostegno</span>
                                    </div>
                                  ))}

                                  {/* EDUCATORI */}
                                  {compresenze.educatori.map(ed => (
                                    <div key={ed.id} className="p-1 bg-teal-50 border border-teal-200 rounded text-[10px] leading-tight text-teal-900">
                                      <div className="font-bold flex items-center gap-1 truncate">
                                        <span>🎓</span>
                                        <span className="truncate">{getBaseNomeDocente(ed.nome)}</span>
                                      </div>
                                      <span className="text-[9px] text-teal-600 font-medium">Educatore</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* ========================================================= */}
          {/* LAYOUT DI STAMPA PDF (PAGINA ORIZZONTALE PER OGNI ELEMENTO)*/}
          {/* ========================================================= */}
          <div className="hidden print:block w-full">
            {tipoVistaOrario === 'DOCENTE' && (() => {
              // Determina quali docenti stampare in base alla scelta nella modale
              let docentiDaStampareIds: string[] = [];
              if (opzionePdfDocente === 'MIO') {
                docentiDaStampareIds = selectedDocenteId ? [selectedDocenteId] : (docenteAttualeOrario ? [docenteAttualeOrario.id] : []);
              } else if (opzionePdfDocente === 'TUTTI') {
                docentiDaStampareIds = docentiUnici.map(d => d.id);
              } else {
                docentiDaStampareIds = docentiSelezionatiPdf;
              }

              const docentiDaStampare = docentiUnici.filter(d => docentiDaStampareIds.includes(d.id));

              return (
                <div>
                  {docentiDaStampare.map(doc => {
                    const orarioDoc = getOrarioUnificatoDocente(doc.id, docenti, orariDocenti);
                    const isDocenteSostegno = doc.isSostegno || doc.materie.some(m => m.toUpperCase().includes('SOSTEGNO'));

                    let maxOra = 6;
                    [7, 8, 9].forEach(o => {
                      const hasOra = orarioDoc.some(c => c.ora === o && c.valore && c.valore.trim() !== '');
                      if (hasOra) maxOra = Math.max(maxOra, o);
                    });
                    const ore = Array.from({ length: maxOra }, (_, i) => i + 1);

                    return (
                      <div key={doc.id} className="print-landscape-page p-2">
                        {/* INTESTAZIONE ISTITUZIONALE PULITA */}
                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-3">
                          <div>
                            <span className="text-[10pt] font-black uppercase text-slate-800 tracking-wide">
                              {impostazioniScuola?.nomeScuola || 'Istituto Scolastico'}
                            </span>
                            <h2 className="text-[16pt] font-black text-slate-950 leading-tight">
                              Orario Settimanale: {doc.nome}
                            </h2>
                          </div>
                          <div className="text-right">
                            <span className="text-[10pt] font-bold text-slate-700 block">
                              Materia: {doc.materie.join(', ')}
                            </span>
                            <span className="text-[8pt] text-slate-500 font-mono">
                              Anno Scolastico {new Date().getFullYear()}/{new Date().getFullYear() + 1}
                            </span>
                          </div>
                        </div>

                        {/* TABELLA ORARIO ORIZZONTALE AD ALTA LEGGIBILITA' */}
                        <table className="w-full border-collapse border border-slate-400 text-center text-[10pt]">
                          <thead>
                            <tr className="bg-slate-200 text-slate-900 font-black border-b border-slate-400 text-[10pt] uppercase">
                              <th className="py-2 px-2 w-16 border-r border-slate-400">Ora</th>
                              {GIORNI_SETTIMANA.map(g => (
                                <th key={g} className="py-2 px-2 border-r border-slate-400 last:border-r-0">
                                  {g}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ore.map(oraNum => (
                              <tr key={oraNum} className="border-b border-slate-300">
                                <td className="py-2.5 px-2 font-black bg-slate-100 border-r border-slate-400 text-[11pt]">
                                  {oraNum}ª
                                </td>
                                {GIORNI_SETTIMANA.map(giorno => {
                                  const cella = orarioDoc.find(c => c.giorno === giorno && c.ora === oraNum);
                                  const val = cella?.valore?.trim() || '';

                                  if (!val) {
                                    return <td key={giorno} className="py-2 px-2 border-r border-slate-300 last:border-r-0 text-slate-300">-</td>;
                                  }

                                  if (val.toUpperCase() === 'D') {
                                    return (
                                      <td key={giorno} className="py-2 px-2 border-r border-slate-300 last:border-r-0 bg-amber-50">
                                        <span className="font-black text-amber-950">D (Disposizione)</span>
                                      </td>
                                    );
                                  }

                                  if (val.toUpperCase() === 'P' || val.toUpperCase().startsWith('POT')) {
                                    return (
                                      <td key={giorno} className="py-2 px-2 border-r border-slate-300 last:border-r-0 bg-purple-50">
                                        <span className="font-black text-purple-950">P (Potenziamento)</span>
                                      </td>
                                    );
                                  }

                                  const compresenze = getDocentiCompresentiInClasseNellOra(
                                    val, giorno, oraNum, docenti, orariDocenti, doc.nome
                                  );

                                  return (
                                    <td key={giorno} className="py-2 px-2 border-r border-slate-300 last:border-r-0 align-top">
                                      <div className="font-black text-[12pt] text-indigo-950 mb-0.5">
                                        {val}
                                      </div>
                                      {isDocenteSostegno && compresenze.curricolari.length > 0 && (
                                        <div className="text-[8pt] text-slate-700 text-left border-t border-slate-200 pt-0.5 mt-0.5">
                                          <span className="font-bold">Curr: </span>
                                          {compresenze.curricolari.map(c => getBaseNomeDocente(c.nome)).join(', ')}
                                        </div>
                                      )}
                                      {!isDocenteSostegno && compresenze.sostegni.length > 0 && (
                                        <div className="text-[8pt] text-purple-900 text-left border-t border-slate-200 pt-0.5 mt-0.5">
                                          <span className="font-bold">♿ Sost: </span>
                                          {compresenze.sostegni.map(s => getBaseNomeDocente(s.nome)).join(', ')}
                                        </div>
                                      )}
                                      {compresenze.educatori.length > 0 && (
                                        <div className="text-[8pt] text-teal-900 text-left border-t border-slate-200 pt-0.5 mt-0.5">
                                          <span className="font-bold">🎓 Educ: </span>
                                          {compresenze.educatori.map(e => getBaseNomeDocente(e.nome)).join(', ')}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {tipoVistaOrario === 'CLASSE' && (() => {
              // Determina quali classi stampare in base alla scelta nella modale
              let classiDaStampare: string[] = [];
              if (opzionePdfClasse === 'ATTUALE') {
                classiDaStampare = [classeOrarioSelezionata];
              } else if (opzionePdfClasse === 'TUTTE') {
                classiDaStampare = classiDisponibili;
              } else {
                classiDaStampare = classiSelezionatePdf;
              }

              return (
                <div>
                  {classiDaStampare.map(cl => {
                    let maxOra = 6;
                    [7, 8, 9].forEach(o => {
                      const hasOra = GIORNI_SETTIMANA.some(giorno => {
                        const comp = getDocentiCompresentiInClasseNellOra(cl, giorno, o, docenti, orariDocenti);
                        return comp.curricolari.length > 0 || comp.sostegni.length > 0 || comp.educatori.length > 0;
                      });
                      if (hasOra) maxOra = Math.max(maxOra, o);
                    });
                    const ore = Array.from({ length: maxOra }, (_, i) => i + 1);

                    return (
                      <div key={cl} className="print-portrait-page">
                        {/* INTESTAZIONE ISTITUZIONALE PULITA */}
                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1 mb-2">
                          <div>
                            <span className="text-[9pt] font-black uppercase text-slate-800 tracking-wide">
                              {impostazioniScuola?.nomeScuola || 'Istituto Scolastico'}
                            </span>
                            <h2 className="text-[14pt] font-black text-slate-950 leading-tight">
                              Orario Settimanale Classe {cl}
                            </h2>
                          </div>
                          <div className="text-right">
                            <span className="text-[9pt] font-bold text-slate-700 block">
                              Quadro Orario Didattico
                            </span>
                            <span className="text-[7.5pt] text-slate-500 font-mono">
                              Anno Scolastico {new Date().getFullYear()}/{new Date().getFullYear() + 1}
                            </span>
                          </div>
                        </div>

                        {/* TABELLA ORARIO VERTICALE CLASSE AD ALTA DENSITA' PER PAGINA SINGOLA */}
                        <table className="w-full border-collapse border border-slate-400 text-center text-[9pt]">
                          <thead>
                            <tr className="bg-slate-200 text-slate-900 font-black border-b border-slate-400 text-[9pt] uppercase">
                              <th className="py-1.5 px-1.5 w-12 border-r border-slate-400">Ora</th>
                              {GIORNI_SETTIMANA.map(g => (
                                <th key={g} className="py-1.5 px-1.5 border-r border-slate-400 last:border-r-0">
                                  {g}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ore.map(oraNum => (
                              <tr key={oraNum} className="border-b border-slate-300">
                                <td className="py-1.5 px-1 font-black bg-slate-100 border-r border-slate-400 text-[10pt]">
                                  {oraNum}ª
                                </td>
                                {GIORNI_SETTIMANA.map(giorno => {
                                  const comp = getDocentiCompresentiInClasseNellOra(cl, giorno, oraNum, docenti, orariDocenti);
                                  const hasQualcosa = comp.curricolari.length > 0 || comp.sostegni.length > 0 || comp.educatori.length > 0;

                                  if (!hasQualcosa) {
                                    return <td key={giorno} className="py-1 px-1 border-r border-slate-300 last:border-r-0 text-slate-300 text-[8pt]">-</td>;
                                  }

                                  return (
                                    <td key={giorno} className="py-1 px-1.5 border-r border-slate-300 last:border-r-0 align-top text-left">
                                      <div className="space-y-0.5">
                                        {/* MATERIA IN EVIDENZA PRIMA, POI CURRICOLARE */}
                                        {comp.curricolari.map(c => (
                                          <div key={c.id} className="leading-tight pb-0.5 mb-0.5 border-b border-slate-100 last:border-b-0">
                                            <div className="text-[8.5pt] text-indigo-950 font-black uppercase tracking-tight">
                                              {c.materia}
                                            </div>
                                            <div className="font-semibold text-slate-800 text-[8pt]">
                                              {getBaseNomeDocente(c.nome)}
                                            </div>
                                          </div>
                                        ))}

                                        {/* SOSTEGNI */}
                                        {comp.sostegni.map(s => (
                                          <div key={s.id} className="text-[7.5pt] font-bold text-purple-900 bg-purple-50 px-1 py-0.2 rounded border border-purple-200 leading-tight">
                                            ♿ {getBaseNomeDocente(s.nome)} <span className="font-normal text-purple-700">(Sost.)</span>
                                          </div>
                                        ))}

                                        {/* EDUCATORI */}
                                        {comp.educatori.map(e => (
                                          <div key={e.id} className="text-[7.5pt] font-bold text-teal-900 bg-teal-50 px-1 py-0.2 rounded border border-teal-200 leading-tight">
                                            🎓 {getBaseNomeDocente(e.nome)} <span className="font-normal text-teal-700">(Educ.)</span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* CONTENUTO SCHEDA 4: CONSIGLI DI CLASSE */}
      {tabDocente === 'CONSIGLI_CLASSE' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Consiglio di Classe: {classeConsiglioSelezionata || 'Seleziona Classe'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Elenco completo di tutti i docenti curricolari, di sostegno ed educatori assegnati a questa classe.
              </p>
            </div>

            {/* SELETTORE DELLA CLASSE */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Seleziona Classe:</span>
              <select
                value={classeConsiglioSelezionata}
                onChange={(e) => setClasseConsiglioSelezionata(e.target.value)}
                className="bg-indigo-50 border border-indigo-300 rounded-xl px-3 py-1.5 text-xs font-black text-indigo-950 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
              >
                {classiDisponibili.map(c => (
                  <option key={c} value={c}>Classe {c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* LISTA DEI DOCENTI DEL CONSIGLIO DI CLASSE */}
          {(() => {
            const membri = getDocentiConsiglioClasse(classeConsiglioSelezionata, docenti, orariDocenti);

            if (membri.length === 0) {
              return (
                <div className="p-12 text-center text-slate-400">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Nessun docente trovato per la classe {classeConsiglioSelezionata}</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {membri.map((m, idx) => (
                  <div 
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-2xs transition ${
                      m.isEducatore 
                        ? 'bg-teal-50/50 border-teal-200 hover:border-teal-300'
                        : m.isSostegno
                          ? 'bg-purple-50/50 border-purple-200 hover:border-purple-300'
                          : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        m.isEducatore
                          ? 'bg-teal-600 text-white'
                          : m.isSostegno
                            ? 'bg-purple-600 text-white'
                            : 'bg-indigo-600 text-white'
                      }`}>
                        {m.isEducatore ? '🎓' : m.isSostegno ? '♿' : '🧑‍🏫'}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                          {getBaseNomeDocente(m.docente.nome)}
                        </h4>
                        <p className="text-[11px] text-slate-600 font-medium">
                          {m.materie.join(' • ')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block bg-slate-100 text-slate-700 font-black text-[11px] px-2 py-0.5 rounded-md border border-slate-200">
                        {m.oreSettimanali} {m.oreSettimanali === 1 ? 'ora/sett' : 'ore/sett'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* MODALE DI SCELTA CALENDARIO (GOOGLE CALENDAR vs APPLE / OUTLOOK) */}
      {sostituzionePerCalendario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Aggiungi a Calendario</h3>
                  <p className="text-xs text-slate-500">Scegli dove salvare il promemoria</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSostituzionePerCalendario(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* RIEPILOGO RAPIDO SUPPLENZA */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{sostituzionePerCalendario.giorno} {formatDataItaliana(sostituzionePerCalendario.data)}</span>
                <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-[10px]">{sostituzionePerCalendario.ora}ª Ora</span>
              </div>
              <p className="text-slate-600">
                Classe: <strong>{sostituzionePerCalendario.classe}</strong> • Per: <strong>{getDocenteNome(sostituzionePerCalendario.docenteAssenteId)}</strong>
              </p>
            </div>

            {/* OPZIONI DI AGGIUNTA */}
            <div className="space-y-2.5 pt-1">
              {/* OPZIONE 1: GOOGLE CALENDAR */}
              <a
                href={generaLinkGoogleCalendar(
                  sostituzionePerCalendario.data,
                  sostituzionePerCalendario.ora,
                  sostituzionePerCalendario.classe,
                  getDocenteNome(sostituzionePerCalendario.docenteAssenteId),
                  impostazioniScuola?.nomeScuola
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSostituzionePerCalendario(null)}
                className="w-full p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 rounded-2xl flex items-center justify-between transition cursor-pointer text-left group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    G
                  </div>
                  <div>
                    <span className="block font-black text-xs text-blue-950">Google Calendar</span>
                    <span className="text-[10px] text-blue-700">Account Google Workspace o Gmail</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
              </a>

              {/* OPZIONE 2: CALENDARIO TELEFONO / APPLE / OUTLOOK */}
              <button
                type="button"
                onClick={() => {
                  scaricaFileIcsCalendar(
                    sostituzionePerCalendario.data,
                    sostituzionePerCalendario.ora,
                    sostituzionePerCalendario.classe,
                    getDocenteNome(sostituzionePerCalendario.docenteAssenteId),
                    impostazioniScuola?.nomeScuola
                  );
                  setSostituzionePerCalendario(null);
                }}
                className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-2xl flex items-center justify-between transition cursor-pointer text-left group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                    🍎
                  </div>
                  <div>
                    <span className="block font-black text-xs text-slate-900">Calendario iPhone / Mac / PC</span>
                    <span className="text-[10px] text-slate-500">Apple Calendar, Outlook o Agenda</span>
                  </div>
                </div>
                <Calendar className="w-4 h-4 text-slate-600 group-hover:scale-110 transition shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Bell, User, Key, Calendar, AlertTriangle, X, LayoutDashboard, Clock, ShieldCheck, RefreshCw, Table, Search, BookOpen, GraduationCap, Accessibility, Users, School } from 'lucide-react';
import { 
  getDocentiCollegatiIds, getDocentiUnici, trovaCorrispondenzaDocente, 
  formatDataItaliana, getOrarioUnificatoDocente, getBaseNomeDocente, 
  getDocentiCompresentiInClasseNellOra, getClassiUniche, getDocentiConsiglioClasse 
} from '../utils/docentiHelper';
import { QuadroSostituzioniScuola } from './QuadroSostituzioniScuola';
import { GiornoSettimana } from '../types';

const GIORNI_SETTIMANA: GiornoSettimana[] = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

export type TabDocenteType = 'MIE_SOSTITUZIONI' | 'QUADRO_SCUOLA' | 'ORARIO' | 'CONSIGLI_CLASSE';

interface PortaleDocenteProps {
  currentTab?: TabDocenteType;
  onTabChange?: (tab: TabDocenteType) => void;
}

export const PortaleDocente: React.FC<PortaleDocenteProps> = ({ currentTab, onTabChange }) => {
  const { 
    docenti, orariDocenti, sostituzioni, notifiche, firmaSostituzione, segnaNotificheLette, 
    richiesteAccessoDocenti, associaEmailDocente, creaRichiestaAccessoDocente 
  } = useApp();
  const { utenteInfo, logout } = useAuth();

  const [notificaAttiva, setNotificaAttiva] = useState<boolean>(false);
  const [internalTab, setInternalTab] = useState<TabDocenteType>('MIE_SOSTITUZIONI');
  const [richiestaInviata, setRichiestaInviata] = useState<boolean>(false);
  const [mostraGuidaIos, setMostraGuidaIos] = useState<boolean>(false);

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

  // Stato per Consigli di Classe
  const [classeConsiglioSelezionata, setClasseConsiglioSelezionata] = useState<string>('');

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

  const mieSostituzioni = sostituzioni.filter(
    s => collegatiIds.includes(s.docenteSostitutoId) && s.pubblicata
  );

  const mieNotificheNonLette = notifiche.filter(
    n => collegatiIds.includes(n.docenteId) && !n.letta
  );

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

  const docenteAttualeOrario = docenti.find(d => d.id === docenteOrarioSelezionatoId) || docente;
  const isMioOrario = docenteAttualeOrario && selectedDocenteId && getBaseNomeDocente(docenteAttualeOrario.nome) === getBaseNomeDocente(docente?.nome || '');

  // =========================================================================
  // SCHERMATA DI ATTESA / MATCHING IN CORSO
  // =========================================================================
  if (!docente) {
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
      {/* BANNER NOTIFICHE ANNULLAMENTI/AVVISI */}
      {mieNotificheNonLette.length > 0 && (
        <div className="space-y-2">
          {mieNotificheNonLette.map(n => (
            <div key={n.id} className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-950 text-sm flex items-center gap-2">
                    <span>{n.titolo}</span>
                    <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </h4>
                  <p className="text-xs text-rose-900 mt-0.5">{n.messaggio}</p>
                </div>
              </div>

              <button
                onClick={() => segnaNotificheLette(selectedDocenteId)}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-100/80 hover:bg-rose-200 px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer"
              >
                Ho Capito ✓
              </button>
            </div>
          ))}
        </div>
      )}

      {/* HEADER PROFILO DOCENTE */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase">Docente Collegato</span>
          <h2 className="text-2xl font-black text-slate-900">{docente?.nome}</h2>
          <p className="text-xs text-slate-500">
            Materia: <strong>{docente?.materia}</strong> • Debito Permessi: <strong>{docente?.oreDebitoPermesso} ore</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRichiediNotifiche}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
              notificaAttiva
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
            }`}
          >
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>{notificaAttiva ? 'Notifiche Push Attive ✓' : 'Attiva Notifiche Push'}</span>
          </button>

          {notificaAttiva && (
            <button
              onClick={handleInviaNotificaTest}
              className="px-2.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition cursor-pointer flex items-center gap-1"
              title="Invia notifica sonora di test"
            >
              <span>🔔 Prova Notifica</span>
            </button>
          )}

          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-800 underline p-2 cursor-pointer"
          >
            Esci
          </button>
        </div>
      </div>

      {/* GUIDA ATTIVAZIONE NOTIFICHE IPHONE / IPAD */}
      {mostraGuidaIos && (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-xl border border-indigo-700 animate-in fade-in space-y-3">
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

      {/* PULSANTI DI NAVIGAZIONE SCHEDE IN LINEA */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
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
      </div>

      {/* CONTENUTO SCHEDA 1: LE MIE SOSTITUZIONI */}
      {tabDocente === 'MIE_SOSTITUZIONI' && (
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
              {mieSostituzioni.map(s => (
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
                    <div className="text-xs text-slate-600">
                      Sostituzione del docente: <strong>{getDocenteNome(s.docenteAssenteId)}</strong>
                    </div>
                    <div className="text-[11px] text-indigo-700 font-medium">
                      Tipologia: {s.categoria.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <div>
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENUTO SCHEDA 2: QUADRO GENERALE SCUOLA */}
      {tabDocente === 'QUADRO_SCUOLA' && (
        <QuadroSostituzioniScuola isEmbedInVicepresidenza={true} />
      )}

      {/* CONTENUTO SCHEDA 3: CONSULTAZIONE ORARIO PERSONALE, DEI COLLEGHI E PER CLASSE */}
      {tabDocente === 'ORARIO' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
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
            </div>
          </div>

          {/* VISTA 1: TABELLA ORARIO DOCENTE */}
          {tipoVistaOrario === 'DOCENTE' && (() => {
            const orarioDoc = getOrarioUnificatoDocente(docenteAttualeOrario?.id || '', docenti, orariDocenti);
            const isDocenteSostegno = docenteAttualeOrario?.isSostegno || docenteAttualeOrario?.materia?.toUpperCase().includes('SOSTEGNO');

            // Calcola dinamicamente quante ore mostrare: se non ci sono ore dopo la 6ª in tutta la settimana, tronca a 6; altrimenti mostra fino alla max ora occupata (fino a 9)
            let maxOraDocente = 6;
            [7, 8, 9].forEach(o => {
              const hasOra = orarioDoc.some(c => c.ora === o && c.valore && c.valore.trim() !== '');
              if (hasOra) {
                maxOraDocente = Math.max(maxOraDocente, o);
              }
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
                            val, 
                            giorno, 
                            oraNum, 
                            docenti, 
                            orariDocenti, 
                            docenteAttualeOrario?.nome
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
            // Calcola dinamicamente quante ore mostrare per la classe: se dopo la 6ª ora in tutta la settimana non c'è nessuna lezione, ometti
            let maxOraClasse = 6;
            [7, 8, 9].forEach(o => {
              const hasOra = GIORNI_SETTIMANA.some(giorno => {
                const comp = getDocentiCompresentiInClasseNellOra(
                  classeOrarioSelezionata,
                  giorno,
                  o,
                  docenti,
                  orariDocenti
                );
                return comp.curricolari.length > 0 || comp.sostegni.length > 0 || comp.educatori.length > 0;
              });
              if (hasOra) {
                maxOraClasse = Math.max(maxOraClasse, o);
              }
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
                            classeOrarioSelezionata, 
                            giorno, 
                            oraNum, 
                            docenti, 
                            orariDocenti
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
                                {/* DOCENTI CURRICOLARI */}
                                {compresenze.curricolari.map(c => (
                                  <div key={c.id} className="p-1 bg-indigo-50/80 border border-indigo-200 rounded text-[11px] leading-tight">
                                    <div className="font-black text-indigo-950 truncate">
                                      {getBaseNomeDocente(c.nome)}
                                    </div>
                                    <div className="text-[9px] text-indigo-600 font-bold uppercase truncate">
                                      {c.materia}
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
    </div>
  );
};

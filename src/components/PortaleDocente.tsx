import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Bell, User, Key, Calendar, AlertTriangle, X, LayoutDashboard } from 'lucide-react';
import { getDocentiCollegatiIds, getDocentiUnici } from '../utils/docentiHelper';
import { QuadroSostituzioniScuola } from './QuadroSostituzioniScuola';

export const PortaleDocente: React.FC = () => {
  const { docenti, sostituzioni, notifiche, firmaSostituzione, segnaNotificheLette } = useApp();
  const [selectedDocenteId, setSelectedDocenteId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [notificaAttiva, setNotificaAttiva] = useState<boolean>(false);
  const [tabDocente, setTabDocente] = useState<'MIE_SOSTITUZIONI' | 'QUADRO_SCUOLA'>('MIE_SOSTITUZIONI');

  const docente = docenti.find(d => d.id === selectedDocenteId);
  const collegatiIds = selectedDocenteId ? getDocentiCollegatiIds(selectedDocenteId, docenti) : [];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docente) return;
    if (docente.pinAccesso && pin !== docente.pinAccesso) {
      alert('PIN errato! (Il PIN predefinito è 1234)');
      return;
    }
    localStorage.setItem('portale_docente_loggato_id', selectedDocenteId);
    setIsLogged(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('portale_docente_loggato_id');
    setIsLogged(false);
  };

  const [mostraGuidaIos, setMostraGuidaIos] = useState<boolean>(false);

  // Inizializza stato permessi se già concessi in precedenza
  React.useEffect(() => {
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
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
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
      } catch (err) {
        console.warn('Fallback standard Notification:', err);
      }
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titolo, opzioni);
    }
  };

  const handleRichiediNotifiche = async () => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    if (!('Notification' in window)) {
      if (isIos && !isStandalone) {
        setMostraGuidaIos(true);
      } else {
        alert('Il browser attuale non supporta le notifiche Web Push. Su iPhone/iPad apri con Safari e tocca "Condividi" -> "Aggiungi a schermata Home".');
      }
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificaAttiva(true);
        await inviaNotificaSistema('🔔 Notifiche Attivate con Successo!', {
          body: `Gentile ${docente?.nome || 'Docente'}, riceverai una notifica ogni volta che ti viene assegnata una supplenza.`
        });
      } else if (permission === 'denied') {
        alert('Le notifiche sono bloccate nelle impostazioni del browser per questo sito. Clicca sull\'icona del lucchetto vicino all\'URL per consentirle.');
      }
    } catch (e) {
      if (isIos && !isStandalone) {
        setMostraGuidaIos(true);
      }
    }
  };

  const handleInviaNotificaTest = async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      await inviaNotificaSistema('🔔 Sostituzioni Smart - Test Notifica', {
        body: 'Hai una nuova supplenza assegnata per la 3ª ora in classe 2B! (Test riuscito)'
      });
    } else {
      await handleRichiediNotifiche();
    }
  };

  const mieSostituzioni = sostituzioni.filter(
    s => collegatiIds.includes(s.docenteSostitutoId) && s.pubblicata
  );

  const mieNotificheNonLette = notifiche.filter(
    n => collegatiIds.includes(n.docenteId) && !n.letta
  );

  const getDocenteNome = (id: string) => docenti.find(d => d.id === id)?.nome || id;

  if (!isLogged) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mt-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Area Personale Docente</h3>
          <p className="text-xs text-slate-500 mt-1">Accedi per consultare e firmare le tue sostituzioni settimanali</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seleziona il tuo Nome</label>
            <select
              value={selectedDocenteId}
              onChange={(e) => setSelectedDocenteId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-white font-semibold shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            >
              <option value="">-- Scegli Docente --</option>
              {getDocentiUnici(docenti).map(d => (
                <option key={d.id} value={d.id}>
                  {d.nome} ({d.materie.join(', ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">PIN Personale</label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Inserisci PIN (1234)"
                required
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm pl-9"
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition text-sm shadow-md"
          >
            Accedi all'Area Riservata
          </button>
        </form>
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
                className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-100/80 hover:bg-rose-200 px-2.5 py-1 rounded-lg transition shrink-0"
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
            onClick={handleLogout}
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
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-xs text-slate-200 space-y-2 bg-white/10 p-3.5 rounded-xl border border-white/10">
            <p className="font-semibold text-white">Segui questi 2 semplici passaggi per ricevere le notifiche sullo schermo:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
              <li>Apri il sito su <strong>Safari</strong> (o Chrome su iPhone)</li>
              <li>Tocca in basso il pulsante <strong>Condividi</strong> (l'icona del quadrato con la freccia 📤)</li>
              <li>Scorri in basso e tocca <strong>"Aggiungi alla schermata Home"</strong> 📲</li>
              <li>Apri l'app dalla Home del telefono e tocca <strong>"Attiva Notifiche Push"</strong></li>
            </ol>
          </div>
        </div>
      )}

      {/* SELETTORE SCHEDE DOCENTE: MIE SOSTITUZIONI VS QUADRO SCUOLA */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
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
          <span>Le mie Sostituzioni Assegnate</span>
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
          <span>Quadro Generale Sostituzioni Scuola</span>
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
                      <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-0.5 rounded">
                        {s.giorno} {s.data}
                      </span>
                      <span className="bg-slate-800 text-white font-bold text-xs px-2.5 py-0.5 rounded">
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
                      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Firmato il {s.dataFirma}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => firmaSostituzione(s.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow flex items-center gap-2"
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

      {/* CONTENUTO SCHEDA 2: QUADRO GENERALE SCUOLA (ACCESSO DIRETTO GIÀ AUTENTICATO DAL DOCENTE) */}
      {tabDocente === 'QUADRO_SCUOLA' && (
        <QuadroSostituzioniScuola isEmbedInVicepresidenza={true} />
      )}
    </div>
  );
};

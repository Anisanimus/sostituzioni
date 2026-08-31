import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, Clock, Eye, Calendar, CheckCircle, RotateCcw, 
  Save, School, Sliders, ShieldAlert, Sparkles, LayoutGrid, List,
  Download, Upload, Plus, Trash2, ShieldCheck, Database,
  Mail, Send, ExternalLink, Info
} from 'lucide-react';
import { DEFAULT_IMPOSTAZIONI_SCUOLA, DEFAULT_IMPOSTAZIONI_PRIORITA } from '../context/AppContext';
import { formatDataItaliana } from '../utils/docentiHelper';

export const PersonalizzazioniScuola: React.FC = () => {
  const { 
    docenti, orariDocenti, assenze, uscite, sostituzioni, movimentiDebito, impostazioniPriorita,
    impostazioniScuola, updateImpostazioniScuola, setImpostazioniScuola, updateImpostazioniPriorita, ripristinaBackupCompleto,
    inviaMailPromemoriaGruppoManuale
  } = useApp();
  
  const [nomeScuola, setNomeScuola] = useState(impostazioniScuola.nomeScuola || 'I.C. Anna Frank');
  const [pinPersonaleAta, setPinPersonaleAta] = useState(impostazioniScuola.pinPersonaleAta || '1234');
  const [tettoPermessi, setTettoPermessi] = useState(impostazioniScuola.tettoMaxPermessiBreviAnno || 12);
  const [tettoAssemblee, setTettoAssemblee] = useState(impostazioniScuola.tettoMaxAssembleeSindacaliAnno || 10);
  const [vistaTabellone, setVistaTabellone] = useState<'GRUPPI_ORA' | 'PER_DOCENTE'>(impostazioniScuola.vistaTabellonePredefinita || 'GRUPPI_ORA');
  const [nascondiWeekend, setNascondiWeekend] = useState(impostazioniScuola.nascondiWeekendCalendario ?? true);
  const [mostraInfoRegolaMail, setMostraInfoRegolaMail] = useState<boolean>(false);

  // Gestione Notifiche Email Gruppo Docenti
  const cfgEmail = impostazioniScuola.notificheEmailGruppo;
  const [mailGruppoAbilitato, setMailGruppoAbilitato] = useState(cfgEmail?.abilitato ?? false);
  const [mailGruppoIndirizzo, setMailGruppoIndirizzo] = useState(cfgEmail?.emailGruppo || '');
  const [mailGruppoOrario, setMailGruppoOrario] = useState(cfgEmail?.orarioInvio || '07:45');
  const [mailGruppoOggetto, setMailGruppoOggetto] = useState(cfgEmail?.oggetto || '🔔 Avviso Supplenze del Giorno - Presa Visione Richiesta');
  const [mailGruppoCorpo, setMailGruppoCorpo] = useState(cfgEmail?.corpoMessaggio || `Gentili docenti,\n\nvi informiamo che sono presenti sostituzioni e variazioni orarie per la giornata odierna.\n\nVi invitiamo a collegarvi al Portale Docenti per prendere visione e firmare le vostre supplenze:\nhttps://sostituzioni-smart.web.app\n\nCordiali saluti,\nLa Vicepresidenza`);

  // Sincronizzazione automatica se le impostazioni cambiano
  React.useEffect(() => {
    if (impostazioniScuola) {
      setNomeScuola(impostazioniScuola.nomeScuola || 'I.C. Anna Frank');
      setPinPersonaleAta(impostazioniScuola.pinPersonaleAta || '1234');
      setTettoPermessi(impostazioniScuola.tettoMaxPermessiBreviAnno || 12);
      setTettoAssemblee(impostazioniScuola.tettoMaxAssembleeSindacaliAnno || 10);
      setVistaTabellone(impostazioniScuola.vistaTabellonePredefinita || 'GRUPPI_ORA');
      setNascondiWeekend(impostazioniScuola.nascondiWeekendCalendario ?? true);
      setGiorniFestivi(impostazioniScuola.giorniFestivi || []);
      setDominiGoogleStr((impostazioniScuola.dominiAutorizzatiGoogle || ['gmail.com', 'scuola.edu.it']).join(', '));
      setEmailViceStr((impostazioniScuola.emailVicepresidenzaGoogle || ['vicepresidenza@scuola.edu.it']).join(', '));
      
      const emailCfg = impostazioniScuola.notificheEmailGruppo;
      if (emailCfg) {
        setMailGruppoAbilitato(emailCfg.abilitato ?? false);
        setMailGruppoIndirizzo(emailCfg.emailGruppo || '');
        setMailGruppoOrario(emailCfg.orarioInvio || '07:45');
        setMailGruppoOggetto(emailCfg.oggetto || '🔔 Avviso Supplenze del Giorno - Presa Visione Richiesta');
        setMailGruppoCorpo(emailCfg.corpoMessaggio || `Gentili docenti,\n\nvi informiamo che sono presenti sostituzioni e variazioni orarie per la giornata odierna.\n\nVi invitiamo a collegarvi al Portale Docenti per prendere visione e firmare le vostre supplenze:\nhttps://sostituzioni-smart.web.app\n\nCordiali saluti,\nLa Vicepresidenza`);
      }
    }
  }, [impostazioniScuola]);

  // Gestione Priorità Algoritmo Sostitutore Smart
  const [prioritaAssenze, setPrioritaAssenze] = useState(impostazioniPriorita.prioritaAssenze);
  const [prioritaGite, setPrioritaGite] = useState(impostazioniPriorita.prioritaGite);
  
  // Gestione Giorni Festivi / Ponti / Chiusure
  const [giorniFestivi, setGiorniFestivi] = useState<string[]>(impostazioniScuola.giorniFestivi || []);
  const [nuovaDataFestiva, setNuovaDataFestiva] = useState('');

  // Gestione Domini Google & Email Vicepresidenza
  const [dominiGoogleStr, setDominiGoogleStr] = useState((impostazioniScuola.dominiAutorizzatiGoogle || ['gmail.com', 'scuola.edu.it']).join(', '));
  const [emailViceStr, setEmailViceStr] = useState((impostazioniScuola.emailVicepresidenzaGoogle || ['vicepresidenza@scuola.edu.it']).join(', '));

  // Diagnostica Cloud Test
  const [testCloudStato, setTestCloudStato] = useState<'IDLE' | 'IN_CORSO' | 'SUCCESSO' | 'ERRORE'>('IDLE');
  const [testCloudMessaggio, setTestCloudMessaggio] = useState('');

  const [salvato, setSalvato] = useState(false);
  const fileBackupRef = React.useRef<HTMLInputElement>(null);

  const spostaElemento = (lista: any[], index: number, direzione: 'SU' | 'GIU') => {
    const nuovaLista = [...lista];
    const targetIndex = direzione === 'SU' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nuovaLista.length) return lista;
    const temp = nuovaLista[index];
    nuovaLista[index] = nuovaLista[targetIndex];
    nuovaLista[targetIndex] = temp;
    return nuovaLista;
  };

  const [tipoInserimentoFestivita, setTipoInserimentoFestivita] = useState<'SINGOLO' | 'PERIODO'>('SINGOLO');
  const [nuovaDataFestivaFine, setNuovaDataFestivaFine] = useState('');

  const handleAggiungiFestivita = () => {
    if (!nuovaDataFestiva) return;

    const dateAggiunte: string[] = [];

    if (tipoInserimentoFestivita === 'PERIODO' && nuovaDataFestivaFine) {
      let curr = new Date(nuovaDataFestiva);
      const end = new Date(nuovaDataFestivaFine);

      if (curr > end) {
        alert("La data di inizio non può essere successiva alla data di fine.");
        return;
      }

      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        dateAggiunte.push(dStr);
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      dateAggiunte.push(nuovaDataFestiva);
    }

    const nuoveFestivita = Array.from(new Set([...giorniFestivi, ...dateAggiunte])).sort();
    setGiorniFestivi(nuoveFestivita);
    setNuovaDataFestiva('');
    setNuovaDataFestivaFine('');
  };

  const handleRimuoviFestivita = (dataDaRimuovere: string) => {
    setGiorniFestivi(prev => prev.filter(d => d !== dataDaRimuovere));
  };

  const handleSalva = (e: React.FormEvent) => {
    e.preventDefault();

    const dominiParsed = dominiGoogleStr
      .split(',')
      .map(d => d.trim().toLowerCase())
      .map(d => d.startsWith('@') ? d.slice(1) : d)
      .filter(Boolean);

    const emailViceParsed = emailViceStr
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    updateImpostazioniScuola({
      nomeScuola: nomeScuola.trim() || 'Istituto Scolastico',
      pinPersonaleAta: pinPersonaleAta.trim() || '1234',
      tettoMaxPermessiBreviAnno: Number(tettoPermessi) || 12,
      tettoMaxAssembleeSindacaliAnno: Number(tettoAssemblee) || 10,
      vistaTabellonePredefinita: vistaTabellone,
      nascondiWeekendCalendario: nascondiWeekend,
      giorniFestivi,
      dominiAutorizzatiGoogle: dominiParsed.length > 0 ? dominiParsed : ['gmail.com', 'scuola.edu.it'],
      emailVicepresidenzaGoogle: emailViceParsed.length > 0 ? emailViceParsed : ['vicepresidenza@scuola.edu.it'],
      notificheEmailGruppo: {
        abilitato: mailGruppoAbilitato,
        emailGruppo: mailGruppoIndirizzo.trim().toLowerCase(),
        orarioInvio: mailGruppoOrario.trim(),
        oggetto: mailGruppoOggetto.trim(),
        corpoMessaggio: mailGruppoCorpo.trim(),
        ultimoInvioData: impostazioniScuola.notificheEmailGruppo?.ultimoInvioData
      }
    });

    // Salva le priorità dell'algoritmo Sostitutore Smart
    updateImpostazioniPriorita({
      prioritaAssenze,
      prioritaGite
    });

    setSalvato(true);
    setTimeout(() => setSalvato(false), 2500);
  };

  const handleRipristinaPredefiniti = () => {
    if (window.confirm('Vuoi ripristinare le personalizzazioni predefinite?')) {
      setImpostazioniScuola(DEFAULT_IMPOSTAZIONI_SCUOLA);
      setNomeScuola(DEFAULT_IMPOSTAZIONI_SCUOLA.nomeScuola);
      setPinPersonaleAta(DEFAULT_IMPOSTAZIONI_SCUOLA.pinPersonaleAta || '1234');
      setTettoPermessi(DEFAULT_IMPOSTAZIONI_SCUOLA.tettoMaxPermessiBreviAnno);
      setTettoAssemblee(DEFAULT_IMPOSTAZIONI_SCUOLA.tettoMaxAssembleeSindacaliAnno);
      setVistaTabellone(DEFAULT_IMPOSTAZIONI_SCUOLA.vistaTabellonePredefinita);
      setNascondiWeekend(DEFAULT_IMPOSTAZIONI_SCUOLA.nascondiWeekendCalendario);
      setGiorniFestivi([]);
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    }
  };

  // BACKUP EXPORT & RESTORE
  const handleDownloadBackup = () => {
    const backupData = {
      app: 'GestioneSostituzioniScolastiche',
      versione: '2.0',
      dataBackup: new Date().toISOString(),
      docenti,
      orariDocenti,
      assenze,
      uscite,
      sostituzioni,
      movimentiDebito,
      impostazioniScuola: {
        nomeScuola,
        tettoMaxPermessiBreviAnno: Number(tettoPermessi),
        tettoMaxAssembleeSindacaliAnno: Number(tettoAssemblee),
        vistaTabellonePredefinita: vistaTabellone,
        nascondiWeekendCalendario: nascondiWeekend,
        giorniFestivi
      },
      impostazioniPriorita
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Sostituzioni_${nomeScuola.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.docenti && json.orariDocenti) {
          if (window.confirm(`Sei sicuro di voler ripristinare il backup del ${new Date(json.dataBackup || '').toLocaleDateString()}? I dati attuali verranno sostituiti con quelli del backup.`)) {
            ripristinaBackupCompleto(json);
            setNomeScuola(json.impostazioniScuola?.nomeScuola || 'I.C. Anna Frank');
            setTettoPermessi(json.impostazioniScuola?.tettoMaxPermessiBreviAnno || 12);
            setTettoAssemblee(json.impostazioniScuola?.tettoMaxAssembleeSindacaliAnno || 10);
            setVistaTabellone(json.impostazioniScuola?.vistaTabellonePredefinita || 'GRUPPI_ORA');
            setNascondiWeekend(json.impostazioniScuola?.nascondiWeekendCalendario ?? true);
            setGiorniFestivi(json.impostazioniScuola?.giorniFestivi || []);
            setSalvato(true);
            setTimeout(() => setSalvato(false), 3000);
          }
        } else {
          alert('Il file non è un file di backup valido.');
        }
      } catch (err) {
        console.error(err);
        alert('Errore durante la lettura del file di backup.');
      }
    };
    reader.readAsText(file);
    if (fileBackupRef.current) fileBackupRef.current.value = '';
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
            Configura il nome del tuo istituto scolastico, i massimali orari per il personale, festività e backup.
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
        {/* SEZIONE 1: NOME DELLA SCUOLA & SICUREZZA ACCESSI */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">Intestazione & Sicurezza Accesso</h3>
              <p className="text-xs text-slate-500">Denominazione istituto e PIN per l'accesso protetto del personale.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Denominazione Scuola / Istituto Comprensivo / IIS
              </label>
              <input
                type="text"
                value={nomeScuola}
                onChange={(e) => setNomeScuola(e.target.value)}
                placeholder="es. I.C. Anna Frank - Torino"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Anteprima barra superiore: <strong className="text-slate-700">{nomeScuola || 'Gestione Sostituzioni'}</strong>
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                🔒 PIN Personale ATA / Segreteria
              </label>
              <p className="text-[10px] text-slate-500 mb-2">
                Codice numerico richiesto ai collaboratori scolastici per visualizzare il quadro giornaliero.
              </p>
              <input
                type="text"
                value={pinPersonaleAta}
                onChange={(e) => setPinPersonaleAta(e.target.value)}
                placeholder="1234"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-black text-indigo-700 text-center tracking-widest outline-none focus:border-indigo-500"
                maxLength={6}
                required
              />
            </div>
          </div>

          {/* GESTIONE ACCESSI GOOGLE WORKSPACE & VICEPRESIDENZA */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5">
              <label className="block text-xs font-black text-indigo-950">
                🌐 Domini Google Workspace Autorizzati (Docenti & Personale)
              </label>
              <p className="text-[11px] text-slate-600">
                Inserisci i domini consentiti separati da virgola (es. <code className="bg-white px-1 py-0.5 rounded border text-indigo-700 font-mono">icannafrank.edu.it, gmail.com</code>). Gli account esterni saranno bloccati.
              </p>
              <input
                type="text"
                value={dominiGoogleStr}
                onChange={(e) => setDominiGoogleStr(e.target.value)}
                placeholder="icannafrank.edu.it, scuola.edu.it"
                className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1.5">
              <label className="block text-xs font-black text-purple-950">
                👑 Email Amministratori & Vicepresidenza
              </label>
              <p className="text-[11px] text-slate-600">
                Email che hanno pieno accesso gestionale al Tabellone e alle Assenze (separate da virgola).
              </p>
              <input
                type="text"
                value={emailViceStr}
                onChange={(e) => setEmailViceStr(e.target.value)}
                placeholder="vicepresidenza@scuola.edu.it, preside@scuola.edu.it"
                className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* DIAGNOSTICA & TEST DIRETTO CLOUD FIRESTORE */}
          <div className="pt-3 border-t border-slate-100">
            <div className="p-3.5 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Diagnostica Cloud Firebase & Database</h4>
                  <p className="text-[10px] text-slate-400">Verifica la connessione in tempo reale e il ping del database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setTestCloudStato('IN_CORSO');
                  setTestCloudMessaggio('Invio pacchetto di test a Cloud Firestore...');
                  try {
                    const { db } = await import('../firebase');
                    const { doc, setDoc, getDoc } = await import('firebase/firestore');
                    const testRef = doc(db, 'diagnostica_connessione', 'ping_test');
                    const now = new Date().toISOString();
                    
                    await setDoc(testRef, {
                      ultimoPing: now,
                      nomeScuola: nomeScuola,
                      esito: 'OK'
                    });

                    const snap = await getDoc(testRef);
                    if (snap.exists()) {
                      setTestCloudStato('SUCCESSO');
                      setTestCloudMessaggio(`✅ Connessione Cloud Perfetta! Scrittura e lettura Firestore eseguite con successo alle ${new Date().toLocaleTimeString('it-IT')}.`);
                    } else {
                      setTestCloudStato('ERRORE');
                      setTestCloudMessaggio('Documento non trovato dopo la scrittura.');
                    }
                  } catch (err: any) {
                    console.error('Errore test Firestore completo:', err);
                    setTestCloudStato('ERRORE');
                    setTestCloudMessaggio(`❌ [${err.code || 'ERRORE'}]: ${err.message || 'Verifica console per dettagli'}`);
                  }
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Testa Connessione Cloud Database</span>
              </button>
            </div>

            {testCloudStato !== 'IDLE' && (
              <div className={`mt-2 p-2.5 rounded-lg text-xs font-bold animate-in fade-in ${
                testCloudStato === 'SUCCESSO' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : testCloudStato === 'ERRORE' 
                  ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200 animate-pulse'
              }`}>
                {testCloudMessaggio}
              </div>
            )}
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

        {/* SEZIONE 4: SOSTITUTORE SMART & PRIORITÀ ALGORITMO */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">Sostitutore Smart & Priorità Assegnazione</h3>
                <p className="text-xs text-slate-500">Imposta la sequenza di priorità con cui il sistema propone e assegna automaticamente i docenti.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPrioritaAssenze(DEFAULT_IMPOSTAZIONI_PRIORITA.prioritaAssenze);
                setPrioritaGite(DEFAULT_IMPOSTAZIONI_PRIORITA.prioritaGite);
              }}
              className="text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Priorità Predefinite</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* PRIORITÀ ASSENZE ORDINARIE */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                1. Priorità Assenze Ordinarie
              </span>
              <p className="text-[11px] text-slate-500">
                L'algoritmo verificherà i candidati dall'alto verso il basso (1ª scelta, 2ª scelta, ecc.).
              </p>

              <div className="space-y-1.5">
                {prioritaAssenze.map((cat, idx) => {
                  const labelMap: Record<string, string> = {
                    'COMPRESENTE_CLASSE': '👥 Docente Compresente in Classe',
                    'RECUPERO_STESSA_CLASSE': '🔄 Recupero Docente Stessa Classe (Debito)',
                    'POTENZIAMENTO': '⚡ Docente in Potenziamento',
                    'SOSTEGNO': '♿ Docente di Sostegno (Senza Caso Grave)',
                    'RECUPERO_GENERICO': '🔄 Recupero Generico (Debito / A Disposizione)',
                    'STRAORDINARIO_D': '💰 Ora a Disposizione / Straordinario'
                  };

                  return (
                    <div
                      key={cat}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 font-black text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {labelMap[cat] || cat}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => setPrioritaAssenze(prev => spostaElemento(prev, idx, 'SU'))}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                          title="Sposta su"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === prioritaAssenze.length - 1}
                          onClick={() => setPrioritaAssenze(prev => spostaElemento(prev, idx, 'GIU'))}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                          title="Sposta giù"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PRIORITÀ GITE / USCITE DIDATTICHE */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                2. Priorità Uscite & Gite Didattiche
              </span>
              <p className="text-[11px] text-slate-500">
                Priorità quando una o più classi sono in uscita e liberano i docenti titolari.
              </p>

              <div className="space-y-1.5">
                {prioritaGite.map((cat, idx) => {
                  const labelMap: Record<string, string> = {
                    'COMPRESENTE_CLASSE': '👥 Compresente in Classe',
                    'LIBERATO_STESSA_CLASSE': '🚌 Liberato da Gita (Stessa Classe)',
                    'LIBERATO_STESSA_MATERIA': '🚌 Liberato da Gita (Stessa Materia)',
                    'LIBERATO_ALTRA_CLASSE': '🚌 Liberato da Gita (Altra Classe)',
                    'RECUPERO_STESSA_CLASSE': '🔄 Recupero Debito Stessa Classe',
                    'POTENZIAMENTO': '⚡ Docente in Potenziamento',
                    'SOSTEGNO': '♿ Sostegno (Senza Caso Grave)',
                    'STRAORDINARIO_D': '💰 Ora a Disposizione / Straordinario'
                  };

                  return (
                    <div
                      key={cat}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between shadow-2xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-700 font-black text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {labelMap[cat] || cat}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => setPrioritaGite(prev => spostaElemento(prev, idx, 'SU'))}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                          title="Sposta su"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === prioritaGite.length - 1}
                          onClick={() => setPrioritaGite(prev => spostaElemento(prev, idx, 'GIU'))}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                          title="Sposta giù"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 5: GIORNI FESTIVI, PONTI E CHIUSURE SCUOLA */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">Giorni Festivi, Ponti & Chiusura Scuola</h3>
              <p className="text-xs text-slate-500">I giorni festivi registrati vengono saltati dal calendario e non conteggiati come giorni di lezione.</p>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* SELETTORE SINGOLO GIORNO / PERIODO */}
            <div className="flex items-center gap-4 text-xs font-bold text-slate-700 pb-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tipoInserimentoFestivita"
                  checked={tipoInserimentoFestivita === 'SINGOLO'}
                  onChange={() => setTipoInserimentoFestivita('SINGOLO')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>Giorno Singolo</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tipoInserimentoFestivita"
                  checked={tipoInserimentoFestivita === 'PERIODO'}
                  onChange={() => setTipoInserimentoFestivita('PERIODO')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>Intero Periodo / Vacanze (Dal ... Al ...)</span>
              </label>
            </div>

            {/* FORM DI INSERIMENTO */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  {tipoInserimentoFestivita === 'PERIODO' && (
                    <span className="text-[10px] font-bold text-slate-500 mb-0.5">Dal:</span>
                  )}
                  <input
                    type="date"
                    value={nuovaDataFestiva}
                    onChange={(e) => {
                      setNuovaDataFestiva(e.target.value);
                      if (tipoInserimentoFestivita === 'SINGOLO' || !nuovaDataFestivaFine) {
                        setNuovaDataFestivaFine(e.target.value);
                      }
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
                  />
                </div>

                {tipoInserimentoFestivita === 'PERIODO' && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 mb-0.5">Al:</span>
                    <input
                      type="date"
                      value={nuovaDataFestivaFine}
                      min={nuovaDataFestiva}
                      onChange={(e) => setNuovaDataFestivaFine(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleAggiungiFestivita}
                disabled={!nuovaDataFestiva || (tipoInserimentoFestivita === 'PERIODO' && !nuovaDataFestivaFine)}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-end mt-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{tipoInserimentoFestivita === 'PERIODO' ? 'Aggiungi Periodo di Chiusura' : 'Aggiungi Festività'}</span>
              </button>
            </div>

            {/* LISTA FESTIVITÀ REGISTRATE */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Chiusure Registrate ({giorniFestivi.length} giorni)
                </span>
                {giorniFestivi.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Vuoi cancellare tutti i giorni festivi registrati?")) {
                        setGiorniFestivi([]);
                      }
                    }}
                    className="text-[10px] text-rose-600 hover:underline font-bold"
                  >
                    Rimuovi tutti
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {giorniFestivi.map(dataFest => (
                  <span
                    key={dataFest}
                    className="bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs px-2.5 py-1 rounded-xl flex items-center gap-2 shadow-2xs"
                  >
                    <span>🎉 {formatDataItaliana(dataFest)}</span>
                    <button
                      type="button"
                      onClick={() => handleRimuoviFestivita(dataFest)}
                      className="text-rose-400 hover:text-rose-700 transition"
                      title="Rimuovi data"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {giorniFestivi.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Nessun giorno festivo o ponte scolastico registrato.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 6: NOTIFICHE EMAIL AUTOMATICHE A GRUPPO DOCENTI */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Email Promemoria Giornaliero a Gruppo Google</h3>
                  {/* ICONA 'i' CERCHIATA CON POPUP INFORMATIVO */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMostraInfoRegolaMail(!mostraInfoRegolaMail)}
                      onMouseEnter={() => setMostraInfoRegolaMail(true)}
                      onMouseLeave={() => setMostraInfoRegolaMail(false)}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition cursor-pointer"
                      title="Informazioni sulla regola di invio automatico"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {mostraInfoRegolaMail && (
                      <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-xl z-20 animate-in fade-in zoom-in-95 duration-150 border border-slate-700 leading-relaxed space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-400">
                          <span>💡 Regola di invio automatico</span>
                        </div>
                        <p className="text-slate-200 text-[11px]">
                          La mail viene generata all'orario indicato <strong>solo ed esclusivamente se ci sono assenze o sostituzioni attive</strong> per la giornata. Se non c'è nessun docente assente, l'invio viene automaticamente saltato per non disturbare i docenti.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Invia automaticamente una mail al gruppo docenti solo nei giorni in cui sono presenti supplenze.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => inviaMailPromemoriaGruppoManuale(mailGruppoIndirizzo, mailGruppoOggetto, mailGruppoCorpo)}
                className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Apri il client di posta con il testo configurato per fare una prova"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Prova Invio Subito</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {/* TOGGLE ABILITAZIONE */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <span className="block text-xs font-black text-slate-900">
                  Abilita Invio Automatico Promemoria Giornaliero
                </span>
                <span className="text-[11px] text-slate-500">
                  Invia una notifica email all'orario stabilito con il promemoria e il link per firmare sul portale.
                </span>
              </div>
              <input
                type="checkbox"
                checked={mailGruppoAbilitato}
                onChange={(e) => setMailGruppoAbilitato(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* INDIRIZZO EMAIL GRUPPO GOOGLE */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  📧 Indirizzo Email Gruppo Docenti / Mailing List
                </label>
                <input
                  type="email"
                  value={mailGruppoIndirizzo}
                  onChange={(e) => setMailGruppoIndirizzo(e.target.value)}
                  placeholder="es. docenti-tutti@icannafrank.edu.it"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
                />
                <span className="text-[10px] text-slate-500 block">
                  Indirizzo del gruppo Google Workspace o lista di distribuzione di tutto il corpo docente.
                </span>
              </div>

              {/* ORARIO DI INVIO */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  ⏰ Orario di Invio Automatico Mattutino
                </label>
                <input
                  type="time"
                  value={mailGruppoOrario}
                  onChange={(e) => setMailGruppoOrario(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
                />
                <span className="text-[10px] text-slate-500 block">
                  Orario consigliato prima dell'inizio delle lezioni (es. 07:30 o 07:45).
                </span>
              </div>
            </div>

            {/* OGGETTO EMAIL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                📝 Oggetto dell'Email
              </label>
              <input
                type="text"
                value={mailGruppoOggetto}
                onChange={(e) => setMailGruppoOggetto(e.target.value)}
                placeholder="es. 🔔 Avviso Supplenze del Giorno - Presa Visione Richiesta"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* CORPO DEL MESSAGGIO EDITABILE */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                📄 Testo del Messaggio (Completamente Editabile)
              </label>
              <textarea
                rows={6}
                value={mailGruppoCorpo}
                onChange={(e) => setMailGruppoCorpo(e.target.value)}
                placeholder="Scrivi qui il testo della mail..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition leading-relaxed"
              />
              <span className="text-[10px] text-slate-500 block">
                Puoi modificare il testo a tuo piacimento. Ricorda di lasciare il link al portale <code>https://sostituzioni-smart.web.app</code> affinché i docenti possano accedere con un click.
              </span>
            </div>
          </div>
        </div>

        {/* PULSANTE DI SALVATAGGIO CONFIGURAZIONE CON MORPHING FEEDBACK */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {salvato && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm animate-in fade-in slide-in-from-right duration-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 animate-bounce" />
              <span>Modifiche salvate con successo nel database!</span>
            </div>
          )}

          <button
            type="submit"
            className={`font-black text-sm px-6 py-3 rounded-xl shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              salvato
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-200 scale-105'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {salvato ? (
              <>
                <CheckCircle className="w-4 h-4 text-white" />
                <span>Salvataggio Eseguito! ✓</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salva Personalizzazioni</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* SEZIONE 5: SALVATAGGIO BACKUP & RIPRISTINO COMPLETO */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-3 mt-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">Salvataggio Backup & Ripristino Dati</h3>
            <p className="text-xs text-slate-500">Esporta o importa l'intero archivio (docenti, orari, assenze, uscite, debiti e impostazioni).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* EXPORT BACKUP */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
            <div>
              <span className="block text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Scarica File di Backup (.json)</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Salva una copia completa di sicurezza di tutti i dati per conservarli o trasferirli su un altro PC.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Esporta Backup Completo</span>
            </button>
          </div>

          {/* IMPORT RESTORE */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
            <div>
              <span className="block text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Ripristina da File Backup (.json)</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Carica un file di backup scaricato in precedenza per ripristinare l'intero stato della scuola.
              </p>
            </div>

            <input
              type="file"
              ref={fileBackupRef}
              onChange={handleUploadBackup}
              accept=".json"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileBackupRef.current?.click()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Carica File Backup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


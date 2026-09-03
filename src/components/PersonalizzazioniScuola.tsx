import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, Clock, Eye, Calendar, CheckCircle, RotateCcw, 
  Save, School, Sliders, ShieldAlert, Sparkles, LayoutGrid, List,
  Download, Upload, Plus, Trash2, ShieldCheck, Database,
  Mail, Send, ExternalLink, Info, HelpCircle, Code2, Copy, X,
  ChevronDown, ChevronUp, BookOpen, GraduationCap, Palette, Image as ImageIcon
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

  // 1. Stemma / Iconcina Intestazione Barra & Menu
  const [logoTipo, setLogoTipo] = useState<'DEFAULT' | 'CUSTOM_IMAGE' | 'BOOK' | 'GRADUATION' | 'BUILDING' | 'PALETTE' | 'SHIELD'>(impostazioniScuola.logoTipo || 'DEFAULT');
  const [logoUrl, setLogoUrl] = useState<string>(impostazioniScuola.logoUrl || '');
  const fileLogoRef = useRef<HTMLInputElement>(null);

  // 2. Icona Principale Applicazione (PWA, Home Screen, Favicon)
  const [appIconTipo, setAppIconTipo] = useState<'DEFAULT' | 'CUSTOM_IMAGE' | 'SMART_CLOCK' | 'TOGA_SHIELD' | 'SMART_S' | 'CLOCK_TOWER'>(impostazioniScuola.appIconTipo || 'DEFAULT');
  const [appIconUrl, setAppIconUrl] = useState<string>(impostazioniScuola.appIconUrl || '');
  const fileAppIconRef = useRef<HTMLInputElement>(null);

  const [pinPersonaleAta, setPinPersonaleAta] = useState(impostazioniScuola.pinPersonaleAta || '1234');
  const [tettoPermessi, setTettoPermessi] = useState(impostazioniScuola.tettoMaxPermessiBreviAnno || 12);
  const [tettoAssemblee, setTettoAssemblee] = useState(impostazioniScuola.tettoMaxAssembleeSindacaliAnno || 10);
  const [vistaTabellone, setVistaTabellone] = useState<'GRUPPI_ORA' | 'PER_DOCENTE'>(impostazioniScuola.vistaTabellonePredefinita || 'GRUPPI_ORA');
  const [nascondiWeekend, setNascondiWeekend] = useState(impostazioniScuola.nascondiWeekendCalendario ?? true);
  const [mostraInfoRegolaMail, setMostraInfoRegolaMail] = useState<boolean>(false);
  const [mostraGuidaWebhook, setMostraGuidaWebhook] = useState<boolean>(false);
  const [copiatoScript, setCopiatoScript] = useState<boolean>(false);
  const [infoSezioneAperta, setInfoSezioneAperta] = useState<string | null>(null);

  // Gestione Accordion Sezioni (Tutte Chiuse di default)
  const [sezioniAperte, setSezioniAperte] = useState<Record<string, boolean>>({
    sez_intestazione: false,
    sez_tetti: false,
    sez_vista: false,
    sez_priorita: false,
    sez_festivita: false,
    sez_notifiche_mail: false,
    sez_calendari_google: false,
    sez_backup: false
  });

  const toggleSezione = (idSezione: string) => {
    setSezioniAperte(prev => ({
      ...prev,
      [idSezione]: !prev[idSezione]
    }));
  };

  const apriTutte = () => {
    setSezioniAperte({
      sez_intestazione: true,
      sez_tetti: true,
      sez_vista: true,
      sez_priorita: true,
      sez_festivita: true,
      sez_notifiche_mail: true,
      sez_calendari_google: true,
      sez_backup: true
    });
  };

  const chiudiTutte = () => {
    setSezioniAperte({
      sez_intestazione: false,
      sez_tetti: false,
      sez_vista: false,
      sez_priorita: false,
      sez_festivita: false,
      sez_notifiche_mail: false,
      sez_calendari_google: false,
      sez_backup: false
    });
  };

  // Gestione Notifiche Email Gruppo Docenti
  const cfgEmail = impostazioniScuola.notificheEmailGruppo;
  const [mailGruppoAbilitato, setMailGruppoAbilitato] = useState(cfgEmail?.abilitato ?? false);
  const [mailGruppoIndirizzo, setMailGruppoIndirizzo] = useState(cfgEmail?.emailGruppo || '');
  const [mailGruppoOrario, setMailGruppoOrario] = useState(cfgEmail?.orarioInvio || '07:45');
  const [mailGruppoOggetto, setMailGruppoOggetto] = useState(cfgEmail?.oggetto || '🔔 Avviso Supplenze del Giorno - Presa Visione Richiesta');
  const [mailGruppoCorpo, setMailGruppoCorpo] = useState(cfgEmail?.corpoMessaggio || `Gentili docenti,\n\nvi informiamo che sono presenti sostituzioni e variazioni orarie per la giornata odierna.\n\nVi invitiamo a collegarvi al Portale Docenti per prendere visione e firmare le vostre supplenze:\nhttps://sostituzioni-smart.web.app\n\nCordiali saluti,\nLa Vicepresidenza`);
  const [mailGruppoWebhookUrl, setMailGruppoWebhookUrl] = useState(cfgEmail?.webhookAppScriptUrl || '');
  const [statoInvioTestMail, setStatoInvioTestMail] = useState<'IDLE' | 'INVIANDO' | 'SUCCESSO' | 'ERRORE'>('IDLE');
  const [messaggioInvioTestMail, setMessaggioInvioTestMail] = useState<string>('');

  // Gestione Integrazione Calendari Google Dinamici (Impegni & Risorse)
  const cfgCal = impostazioniScuola.calendariGoogle;
  
  // Helper per inizializzare le liste dinamiche preservando i dati legacy se presenti
  const initImpegni = (): { id: string; nome: string; googleId: string; colore?: string }[] => {
    if (cfgCal?.impegni && Array.isArray(cfgCal.impegni) && cfgCal.impegni.length > 0) {
      return cfgCal.impegni;
    }
    const legacy: { id: string; nome: string; googleId: string; colore?: string }[] = [];
    if (cfgCal?.impegniPlenariId) {
      legacy.push({ id: 'cal_plenari', nome: 'Impegni Plenari / Unitari', googleId: cfgCal.impegniPlenariId, colore: '#039BE5' });
    }
    if (cfgCal?.impegniSecondariaId) {
      legacy.push({ id: 'cal_secondaria', nome: 'Secondaria', googleId: cfgCal.impegniSecondariaId, colore: '#7986CB' });
    }
    return legacy;
  };

  const initRisorse = (): { id: string; nome: string; googleId: string; colore?: string }[] => {
    if (cfgCal?.risorse && Array.isArray(cfgCal.risorse) && cfgCal.risorse.length > 0) {
      return cfgCal.risorse;
    }
    const legacy: { id: string; nome: string; googleId: string; colore?: string }[] = [];
    if (cfgCal?.risorseInformaticaId) {
      legacy.push({ id: 'cal_informatica', nome: 'Laboratorio Informatica', googleId: cfgCal.risorseInformaticaId, colore: '#009688' });
    }
    if (cfgCal?.risorseTeatroId) {
      legacy.push({ id: 'cal_teatro', nome: 'Teatro / Aula Magna', googleId: cfgCal.risorseTeatroId, colore: '#E65100' });
    }
    return legacy;
  };

  const [calImpegniList, setCalImpegniList] = useState(initImpegni());
  const [calRisorseList, setCalRisorseList] = useState(initRisorse());

  // Sincronizzazione automatica se le impostazioni cambiano
  React.useEffect(() => {
    if (impostazioniScuola) {
      setNomeScuola(impostazioniScuola.nomeScuola || 'I.C. Anna Frank');
      setLogoTipo(impostazioniScuola.logoTipo || 'DEFAULT');
      setLogoUrl(impostazioniScuola.logoUrl || '');
      setAppIconTipo(impostazioniScuola.appIconTipo || 'DEFAULT');
      setAppIconUrl(impostazioniScuola.appIconUrl || '');
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
        setMailGruppoWebhookUrl(emailCfg.webhookAppScriptUrl || '');
      }

      const calCfg = impostazioniScuola.calendariGoogle;
      if (calCfg) {
        if (calCfg.impegni && Array.isArray(calCfg.impegni)) {
          setCalImpegniList(calCfg.impegni);
        } else {
          const l: { id: string; nome: string; googleId: string; colore?: string }[] = [];
          if (calCfg.impegniPlenariId) l.push({ id: 'cal_plenari', nome: 'Impegni Plenari / Unitari', googleId: calCfg.impegniPlenariId, colore: '#039BE5' });
          if (calCfg.impegniSecondariaId) l.push({ id: 'cal_secondaria', nome: 'Secondaria', googleId: calCfg.impegniSecondariaId, colore: '#7986CB' });
          setCalImpegniList(l);
        }

        if (calCfg.risorse && Array.isArray(calCfg.risorse)) {
          setCalRisorseList(calCfg.risorse);
        } else {
          const r: { id: string; nome: string; googleId: string; colore?: string }[] = [];
          if (calCfg.risorseInformaticaId) r.push({ id: 'cal_informatica', nome: 'Laboratorio Informatica', googleId: calCfg.risorseInformaticaId, colore: '#009688' });
          if (calCfg.risorseTeatroId) r.push({ id: 'cal_teatro', nome: 'Teatro / Aula Magna', googleId: calCfg.risorseTeatroId, colore: '#E65100' });
          setCalRisorseList(r);
        }
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
      .split(/[\n,;]+/)
      .map(d => d.trim().toLowerCase())
      .map(d => d.startsWith('@') ? d.slice(1) : d)
      .filter(Boolean);

    const emailViceParsed = emailViceStr
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    updateImpostazioniScuola({
      nomeScuola: nomeScuola.trim() || 'Istituto Scolastico',
      logoUrl: logoUrl.trim(),
      logoTipo: logoTipo,
      appIconUrl: appIconUrl.trim(),
      appIconTipo: appIconTipo,
      pinPersonaleAta: pinPersonaleAta.trim() || '1234',
      tettoMaxPermessiBreviAnno: Number(tettoPermessi) || 12,
      tettoMaxAssembleeSindacaliAnno: Number(tettoAssemblee) || 10,
      vistaTabellonePredefinita: vistaTabellone,
      nascondiWeekendCalendario: nascondiWeekend,
      giorniFestivi,
      dominiAutorizzatiGoogle: dominiParsed.length > 0 ? dominiParsed : ['gmail.com', 'scuola.edu.it'],
      emailVicepresidenzaGoogle: emailViceParsed.length > 0 ? emailViceParsed : ['vicepresidenza@scuola.edu.it'],
      notificheEmailGruppo: {
        abilitato: Boolean(mailGruppoAbilitato),
        emailGruppo: mailGruppoIndirizzo.trim().toLowerCase(),
        orarioInvio: mailGruppoOrario.trim(),
        oggetto: mailGruppoOggetto.trim(),
        corpoMessaggio: mailGruppoCorpo.trim(),
        webhookAppScriptUrl: mailGruppoWebhookUrl.trim(),
        ultimoInvioData: impostazioniScuola.notificheEmailGruppo?.ultimoInvioData || ''
      },
      calendariGoogle: {
        impegni: calImpegniList.filter(c => c.nome.trim() || c.googleId.trim()),
        risorse: calRisorseList.filter(c => c.nome.trim() || c.googleId.trim()),
        // Legacy fallback
        impegniPlenariId: calImpegniList[0]?.googleId || '',
        impegniSecondariaId: calImpegniList[1]?.googleId || '',
        risorseInformaticaId: calRisorseList[0]?.googleId || '',
        risorseTeatroId: calRisorseList[1]?.googleId || ''
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

  const handleTestInvioMail = async () => {
    setStatoInvioTestMail('INVIANDO');
    setMessaggioInvioTestMail('');
    try {
      const res = await inviaMailPromemoriaGruppoManuale(
        mailGruppoIndirizzo,
        mailGruppoOggetto,
        mailGruppoCorpo,
        mailGruppoWebhookUrl
      );
      if (res.successo) {
        setStatoInvioTestMail('SUCCESSO');
        setMessaggioInvioTestMail(res.messaggio);
      } else {
        setStatoInvioTestMail('ERRORE');
        setMessaggioInvioTestMail(res.messaggio);
      }
    } catch (e: any) {
      setStatoInvioTestMail('ERRORE');
      setMessaggioInvioTestMail(e.message || 'Errore durante l\'invio');
    }
    setTimeout(() => {
      setStatoInvioTestMail('IDLE');
    }, 4000);
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
            Tutte le sezioni sono raggruppate in comodi pannelli a comparsa (accordion). Clicca su un titolo per espanderlo e modificarlo.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={apriTutte}
            className="text-xs text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 transition cursor-pointer shadow-2xs"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Espandi Tutto</span>
          </button>

          <button
            type="button"
            onClick={chiudiTutte}
            className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Comprimi Tutto</span>
          </button>

          <button
            type="button"
            onClick={handleRipristinaPredefiniti}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ripristina Default</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSalva} className="space-y-4">
        {/* SEZIONE 1: NOME DELLA SCUOLA & SICUREZZA ACCESSI (ACCORDION) */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-visible transition-all duration-200">
          <div className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition gap-3">
            <button
              type="button"
              onClick={() => toggleSezione('sez_intestazione')}
              className="flex items-center gap-3 flex-1 cursor-pointer text-left min-w-0"
            >
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Intestazione Scuola & Sicurezza Accesso</h3>
                  
                  {/* ICONA 'i' SUBITO DOPO IL TITOLO */}
                  <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoSezioneAperta(prev => prev === 'sez_intestazione' ? null : 'sez_intestazione');
                      }}
                      className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
                        infoSezioneAperta === 'sez_intestazione'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="Spiegazione di questa sezione"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {infoSezioneAperta === 'sez_intestazione' && (
                      <div className="absolute left-0 sm:left-auto sm:right-auto top-full mt-2 w-72 sm:w-80 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-slate-700 leading-relaxed space-y-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between font-bold text-amber-400">
                          <span className="flex items-center gap-1.5">💡 Intestazione & Accessi</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoSezioneAperta(null);
                            }}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-slate-200 text-[11px]">
                          Personalizza il nome dell'istituto mostrato nella barra superiore, definisce il <strong>PIN numerico</strong> richiesto al personale ATA/segreteria per consultare il quadro e i <strong>domini Google Workspace</strong> autorizzati a fare login.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Denominazione istituto, PIN ATA e domini Google autorizzati</p>
              </div>
            </button>

            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => toggleSezione('sez_intestazione')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                  {sezioniAperte.sez_intestazione ? 'Chiudi' : 'Modifica'}
                </span>
                <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 ${sezioniAperte.sez_intestazione ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>

          {sezioniAperte.sez_intestazione && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
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

              {/* ========================================================= */}
              {/* 1. SELEZIONE E CARICAMENTO STEMMA / LOGO INTESTAZIONE INTERNA */}
              {/* ========================================================= */}
              <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-purple-50/50 rounded-2xl border border-indigo-100/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
                      <School className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">1. Stemma / Iconcina Intestazione (Desktop & Menu)</h4>
                      <p className="text-[11px] text-slate-500">L'iconcina che compare in alto a sinistra accanto al nome della scuola e nel menu di navigazione.</p>
                    </div>
                  </div>

                  {/* ANTEPRIMA LIVE STEMMA INTERNO */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anteprima Barra:</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center overflow-hidden shadow-2xs">
                      {logoTipo === 'CUSTOM_IMAGE' && logoUrl ? (
                        <img src={logoUrl} alt="Stemma Scuola" className="w-full h-full object-cover" />
                      ) : logoTipo === 'BOOK' ? (
                        <BookOpen className="w-4 h-4 text-white" />
                      ) : logoTipo === 'GRADUATION' ? (
                        <GraduationCap className="w-4 h-4 text-white" />
                      ) : logoTipo === 'BUILDING' ? (
                        <Building2 className="w-4 h-4 text-white" />
                      ) : logoTipo === 'PALETTE' ? (
                        <Palette className="w-4 h-4 text-white" />
                      ) : logoTipo === 'SHIELD' ? (
                        <ShieldCheck className="w-4 h-4 text-white" />
                      ) : (
                        <School className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                {/* OPZIONI SCELTA STEMMA INTERNO */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLogoTipo('DEFAULT')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      logoTipo === 'DEFAULT'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <School className="w-5 h-5" />
                    <span className="text-[10px]">Scuola</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoTipo('BOOK')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      logoTipo === 'BOOK'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-[10px]">Libro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoTipo('GRADUATION')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      logoTipo === 'GRADUATION'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span className="text-[10px]">Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoTipo('BUILDING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      logoTipo === 'BUILDING'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                    <span className="text-[10px]">Campus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoTipo('PALETTE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      logoTipo === 'PALETTE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Palette className="w-5 h-5" />
                    <span className="text-[10px]">Arte</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoTipo('SHIELD')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      logoTipo === 'SHIELD'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-[10px]">Stemma</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileLogoRef.current?.click()}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      logoTipo === 'CUSTOM_IMAGE' && logoUrl
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50/50'
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] truncate max-w-full">Carica Stemma</span>
                  </button>
                </div>

                <input
                  ref={fileLogoRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        alert('L\'immagine scelta è troppo grande (massimo 2MB). Si consiglia un file PNG trasparente.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (uploadEvent) => {
                        const base64Str = uploadEvent.target?.result as string;
                        if (base64Str) {
                          setLogoUrl(base64Str);
                          setLogoTipo('CUSTOM_IMAGE');
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                {logoTipo === 'CUSTOM_IMAGE' && logoUrl && (
                  <div className="bg-white p-3 rounded-xl border border-indigo-200 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={logoUrl} alt="Stemma Scuola Caricato" className="w-10 h-10 rounded-xl object-contain bg-slate-50 p-1 border border-slate-200 shrink-0 shadow-2xs" />
                      <div className="min-w-0">
                        <span className="text-xs font-black text-slate-800 block truncate">Stemma Intestazione Attivo</span>
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 inline" /> Mostrato accanto al nome della scuola
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileLogoRef.current?.click()}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition cursor-pointer"
                      >
                        Sostituisci
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl('');
                          setLogoTipo('DEFAULT');
                          if (fileLogoRef.current) fileLogoRef.current.value = '';
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1.5 rounded-lg border border-rose-200 transition cursor-pointer"
                        title="Rimuovi Stemma"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* 2. SELEZIONE E CARICAMENTO ICONA APPLICAZIONE (PWA & FAVICON) */}
              {/* ========================================================= */}
              <div className="p-4 bg-gradient-to-br from-purple-50/70 via-slate-50 to-indigo-50/50 rounded-2xl border border-purple-100/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-purple-600 text-white rounded-lg shadow-2xs">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">2. Icona Principale App (Home Smartphone, Favicon & Browser)</h4>
                      <p className="text-[11px] text-slate-500">L'icona mostrata sulla schermata Home di iPhone/Android, nella scheda del browser e all'avvio dell'app.</p>
                    </div>
                  </div>

                  {/* ANTEPRIMA LIVE ICONA APP */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anteprima Icona App:</span>
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden shadow-md border border-slate-700/50">
                      {appIconTipo === 'CUSTOM_IMAGE' && appIconUrl ? (
                        <img src={appIconUrl} alt="Icona App" className="w-full h-full object-cover" />
                      ) : appIconTipo === 'SMART_CLOCK' ? (
                        <span className="text-base">🕒</span>
                      ) : appIconTipo === 'TOGA_SHIELD' ? (
                        <span className="text-base">🎓</span>
                      ) : appIconTipo === 'SMART_S' ? (
                        <span className="text-base">⚡</span>
                      ) : appIconTipo === 'CLOCK_TOWER' ? (
                        <span className="text-base">🏛️</span>
                      ) : (
                        <School className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* OPZIONI SCELTA ICONA APP */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAppIconTipo('DEFAULT')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      appIconTipo === 'DEFAULT'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <School className="w-5 h-5" />
                    <span className="text-[10px]">Predefinita</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppIconTipo('SMART_CLOCK')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      appIconTipo === 'SMART_CLOCK'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-5 h-5 text-emerald-500" />
                    <span className="text-[10px]">Smart Clock</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppIconTipo('TOGA_SHIELD')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      appIconTipo === 'TOGA_SHIELD'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5 text-indigo-400" />
                    <span className="text-[10px]">Toga & Libro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppIconTipo('SMART_S')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      appIconTipo === 'SMART_S'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span className="text-[10px]">Smart 'S'</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppIconTipo('CLOCK_TOWER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      appIconTipo === 'CLOCK_TOWER'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <span className="text-[10px]">Torre Orario</span>
                  </button>

                  {/* CARICA ICONA PERSONALIZZATA PER LA HOME / PWA */}
                  <button
                    type="button"
                    onClick={() => fileAppIconRef.current?.click()}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      appIconTipo === 'CUSTOM_IMAGE' && appIconUrl
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50/50'
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] truncate max-w-full">Carica Icona</span>
                  </button>
                </div>

                <input
                  ref={fileAppIconRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        alert('L\'immagine dell\'icona è troppo grande (massimo 2MB). Si consiglia un file PNG o JPG quadrato.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (uploadEvent) => {
                        const base64Str = uploadEvent.target?.result as string;
                        if (base64Str) {
                          setAppIconUrl(base64Str);
                          setAppIconTipo('CUSTOM_IMAGE');
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                {appIconTipo === 'CUSTOM_IMAGE' && appIconUrl && (
                  <div className="bg-white p-3 rounded-xl border border-purple-200 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={appIconUrl} alt="Icona App Caricata" className="w-10 h-10 rounded-xl object-cover bg-slate-900 border border-slate-700 shrink-0 shadow-md" />
                      <div className="min-w-0">
                        <span className="text-xs font-black text-slate-800 block truncate">Icona App Personalizzata Attiva</span>
                        <span className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 inline" /> Attiva su Schermata Home, Scheda Browser e Favicon
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileAppIconRef.current?.click()}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 transition cursor-pointer"
                      >
                        Sostituisci
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAppIconUrl('');
                          setAppIconTipo('DEFAULT');
                          if (fileAppIconRef.current) fileAppIconRef.current.value = '';
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1.5 rounded-lg border border-rose-200 transition cursor-pointer"
                        title="Rimuovi Icona Personalizzata"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* GESTIONE ACCESSI GOOGLE WORKSPACE & VICEPRESIDENZA */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col justify-between space-y-2">
                  <div>
                    <label className="block text-xs font-black text-indigo-950">
                      🌐 Domini Google Workspace Autorizzati (Docenti & Personale)
                    </label>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Inserisci i domini consentiti separati da virgola (es. <code className="bg-white px-1 py-0.5 rounded border text-indigo-700 font-mono">icannafrank.edu.it, gmail.com</code>). Gli account esterni saranno bloccati.
                    </p>
                  </div>
                  <textarea
                    rows={3}
                    value={dominiGoogleStr}
                    onChange={(e) => setDominiGoogleStr(e.target.value)}
                    placeholder="icannafrank.edu.it, scuola.edu.it, gmail.com"
                    className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed shadow-2xs font-mono"
                  />
                </div>

                <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 flex flex-col justify-between space-y-2">
                  <div>
                    <label className="block text-xs font-black text-purple-950">
                      👑 Email Amministratori & Vicepresidenza
                    </label>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Email che hanno pieno accesso gestionale al Tabellone e alle Assenze (separate da virgola o a capo).
                    </p>
                  </div>
                  <textarea
                    rows={3}
                    value={emailViceStr}
                    onChange={(e) => setEmailViceStr(e.target.value)}
                    placeholder="cravero.anita@gmail.com, vicepresidenza@scuola.edu.it"
                    className="w-full bg-white border border-purple-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-y leading-relaxed shadow-2xs font-mono"
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
          )}
        </div>

        {/* SEZIONE 2: TETTI MASSIMI PERMESSI E ASSEMBLEE SINDACALI (ACCORDION) */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-visible transition-all duration-200">
          <div className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition gap-3">
            <button
              type="button"
              onClick={() => toggleSezione('sez_tetti')}
              className="flex items-center gap-3 flex-1 cursor-pointer text-left min-w-0"
            >
              <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Tetti Massimi & Limiti Monte Ore Annuale</h3>
                  
                  {/* ICONA 'i' SUBITO DOPO IL TITOLO */}
                  <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoSezioneAperta(prev => prev === 'sez_tetti' ? null : 'sez_tetti');
                      }}
                      className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
                        infoSezioneAperta === 'sez_tetti'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                      }`}
                      title="Spiegazione di questa sezione"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {infoSezioneAperta === 'sez_tetti' && (
                      <div className="absolute left-0 sm:left-auto sm:right-auto top-full mt-2 w-72 sm:w-80 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-slate-700 leading-relaxed space-y-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between font-bold text-amber-400">
                          <span className="flex items-center gap-1.5">💡 Tetti Massimi Orari</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoSezioneAperta(null);
                            }}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-slate-200 text-[11px]">
                          Imposta i limiti contrattuali CCNL per il monte ore annuo fruibile di <strong>Permessi Brevi</strong> (generalmente pari all'orario settimanale del docente) e di <strong>Assemblee Sindacali</strong> (10h). Permette all'app di avvisare la vicepresidenza in caso di superamento.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Valori di riferimento per allarmi e verifiche permessi/assemblee</p>
              </div>
            </button>

            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => toggleSezione('sez_tetti')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                  {sezioniAperte.sez_tetti ? 'Chiudi' : 'Modifica'}
                </span>
                <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 ${sezioniAperte.sez_tetti ? 'rotate-180 bg-purple-50 text-purple-600' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>

          {sezioniAperte.sez_tetti && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
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
          )}
        </div>

        {/* SEZIONE 3: PREFERENZE VISUALIZZAZIONE & CALENDARIO (ACCORDION) */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-visible transition-all duration-200">
          <div className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition gap-3">
            <button
              type="button"
              onClick={() => toggleSezione('sez_vista')}
              className="flex items-center gap-3 flex-1 cursor-pointer text-left min-w-0"
            >
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Preferenze di Visualizzazione & Calendario</h3>
                  
                  {/* ICONA 'i' SUBITO DOPO IL TITOLO */}
                  <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoSezioneAperta(prev => prev === 'sez_vista' ? null : 'sez_vista');
                      }}
                      className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
                        infoSezioneAperta === 'sez_vista'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                      }`}
                      title="Spiegazione di questa sezione"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {infoSezioneAperta === 'sez_vista' && (
                      <div className="absolute left-0 sm:left-auto sm:right-auto top-full mt-2 w-72 sm:w-80 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-slate-700 leading-relaxed space-y-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between font-bold text-amber-400">
                          <span className="flex items-center gap-1.5">💡 Preferenze Visualizzazione</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoSezioneAperta(null);
                            }}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-slate-200 text-[11px]">
                          Scegli il layout predefinito del tabellone (a <strong>Blocchi Orari</strong> per ora di lezione, oppure <strong>Per Docente Assente</strong>) e attiva la <strong>Settimana Corta</strong> per nascondere sabato e domenica da tutti i calendari.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Modalità predefinita tabellone e settimana corta (sabato/domenica)</p>
              </div>
            </button>

            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => toggleSezione('sez_vista')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                  {sezioniAperte.sez_vista ? 'Chiudi' : 'Modifica'}
                </span>
                <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 ${sezioniAperte.sez_vista ? 'rotate-180 bg-amber-50 text-amber-600' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>

          {sezioniAperte.sez_vista && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-3.5 animate-in fade-in duration-150">
              <div className="pt-4">
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
          )}
        </div>

        {/* SEZIONE 4: SOSTITUTORE SMART & PRIORITÀ ALGORITMO (ACCORDION) */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-visible transition-all duration-200">
          <div className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition gap-3">
            <button
              type="button"
              onClick={() => toggleSezione('sez_priorita')}
              className="flex items-center gap-3 flex-1 cursor-pointer text-left min-w-0"
            >
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Sostitutore Smart & Priorità Assegnazione</h3>
                  
                  {/* ICONA 'i' SUBITO DOPO IL TITOLO */}
                  <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoSezioneAperta(prev => prev === 'sez_priorita' ? null : 'sez_priorita');
                      }}
                      className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
                        infoSezioneAperta === 'sez_priorita'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="Spiegazione di questa sezione"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {infoSezioneAperta === 'sez_priorita' && (
                      <div className="absolute left-0 sm:left-auto sm:right-auto top-full mt-2 w-72 sm:w-80 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-slate-700 leading-relaxed space-y-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between font-bold text-amber-400">
                          <span className="flex items-center gap-1.5">💡 Algoritmo Sostitutore Smart</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoSezioneAperta(null);
                            }}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-slate-200 text-[11px]">
                          Configura l'ordine esatto con cui il motore automatico seleziona i candidati ottimali per coprire un'ora scoperta (es. prima <strong>Compresenti</strong>, poi <strong>Recupero debito</strong>, poi <strong>Potenziamento</strong>, ecc.), separato per assenze ordinarie e uscite didattiche.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Sequenza con cui l'algoritmo propone i docenti per assenze e uscite</p>
              </div>
            </button>

            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => toggleSezione('sez_priorita')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                  {sezioniAperte.sez_priorita ? 'Chiudi' : 'Modifica'}
                </span>
                <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 ${sezioniAperte.sez_priorita ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>

          {sezioniAperte.sez_priorita && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-end pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setPrioritaAssenze(DEFAULT_IMPOSTAZIONI_PRIORITA.prioritaAssenze);
                    setPrioritaGite(DEFAULT_IMPOSTAZIONI_PRIORITA.prioritaGite);
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ripristina Priorità Predefinite</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                        'RECUPERO_GENERICO': '🔄 Recupero Generico (Debito)',
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
          )}
        </div>

        {/* SEZIONE 5: GIORNI FESTIVI, PONTI E CHIUSURE SCUOLA (ACCORDION) */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-visible transition-all duration-200">
          <div className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition gap-3">
            <button
              type="button"
              onClick={() => toggleSezione('sez_festivita')}
              className="flex items-center gap-3 flex-1 cursor-pointer text-left min-w-0"
            >
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Giorni Festivi, Ponti & Chiusura Scuola</h3>
                  
                  {/* ICONA 'i' SUBITO DOPO IL TITOLO */}
                  <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoSezioneAperta(prev => prev === 'sez_festivita' ? null : 'sez_festivita');
                      }}
                      className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
                        infoSezioneAperta === 'sez_festivita'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title="Spiegazione di questa sezione"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {infoSezioneAperta === 'sez_festivita' && (
                      <div className="absolute left-0 sm:left-auto sm:right-auto top-full mt-2 w-72 sm:w-80 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-slate-700 leading-relaxed space-y-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between font-bold text-amber-400">
                          <span className="flex items-center gap-1.5">💡 Festività & Chiusure</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoSezioneAperta(null);
                            }}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-slate-200 text-[11px]">
                          Registra le festività nazionali, i ponti e i periodi di vacanza (Natale, Pasqua). I giorni registrati vengono <strong>saltati dal calendario</strong> e non considerati come giorni di lezione né conteggiati come assenze.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Calendario festività escluse dalle lezioni scolastiche</p>
              </div>
            </button>

            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => toggleSezione('sez_festivita')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                  {sezioniAperte.sez_festivita ? 'Chiudi' : 'Modifica'}
                </span>
                <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 ${sezioniAperte.sez_festivita ? 'rotate-180 bg-rose-50 text-rose-600' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>

          {sezioniAperte.sez_festivita && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
              <div className="space-y-3.5 pt-4">
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
          )}
        </div>

        {/* SEZIONE 6: NOTIFICHE EMAIL AUTOMATICHE A GRUPPO DOCENTI (ACCORDION) */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-visible transition-all duration-200">
          <div className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition gap-3">
            <button
              type="button"
              onClick={() => toggleSezione('sez_notifiche_mail')}
              className="flex items-center gap-3 flex-1 cursor-pointer text-left min-w-0"
            >
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Email Promemoria Giornaliero a Gruppo Google</h3>
                  
                  {/* ICONA 'i' SUBITO DOPO IL TITOLO */}
                  <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoSezioneAperta(prev => prev === 'sez_notifiche_mail' ? null : 'sez_notifiche_mail');
                      }}
                      className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
                        infoSezioneAperta === 'sez_notifiche_mail'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="Spiegazione di questa sezione"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {infoSezioneAperta === 'sez_notifiche_mail' && (
                      <div className="absolute left-0 sm:left-auto sm:right-auto top-full mt-2 w-72 sm:w-80 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-slate-700 leading-relaxed space-y-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between font-bold text-amber-400">
                          <span className="flex items-center gap-1.5">💡 Promemoria Email Mattutino</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoSezioneAperta(null);
                            }}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-slate-200 text-[11px]">
                          Spedisce ogni mattina all'orario prestabilito un'email al gruppo docenti per ricordare di accedere al portale per firmare le supplenze. L'invio avviene <strong>solo se ci sono supplenze</strong> attive per la giornata.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Invio automatico mattutino con webhook invisibile di Apps Script</p>
              </div>
            </button>

            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => toggleSezione('sez_notifiche_mail')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                  {sezioniAperte.sez_notifiche_mail ? 'Chiudi' : 'Modifica'}
                </span>
                <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 ${sezioniAperte.sez_notifiche_mail ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>

          {sezioniAperte.sez_notifiche_mail && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-2 pt-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Regola: invio attivo solo in presenza di supplenze</span>
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
                      <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-72 max-w-[calc(100vw-3rem)] sm:w-80 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-slate-700 leading-relaxed space-y-1.5">
                        <div className="flex items-center justify-between font-bold text-amber-400">
                          <span className="flex items-center gap-1.5">💡 Regola di invio automatico</span>
                          <button
                            type="button"
                            onClick={() => setMostraInfoRegolaMail(false)}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-slate-200 text-[11px]">
                          La mail viene generata all'orario indicato <strong>solo ed esclusivamente se ci sono assenze o sostituzioni attive</strong> per la giornata. Se non c'è nessun docente assente, l'invio viene automaticamente saltato per non disturbare i docenti.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={statoInvioTestMail === 'INVIANDO'}
                  onClick={handleTestInvioMail}
                  className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Invia o prova l'email con i parametri correnti"
                >
                  {statoInvioTestMail === 'INVIANDO' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>Invio in corso...</span>
                    </>
                  ) : statoInvioTestMail === 'SUCCESSO' ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Inviata con Successo!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Prova Invio Subito</span>
                    </>
                  )}
                </button>
              </div>

              {messaggioInvioTestMail && (
                <div className={`p-2.5 rounded-xl text-xs font-bold ${
                  statoInvioTestMail === 'SUCCESSO' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}>
                  {messaggioInvioTestMail}
                </div>
              )}

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
                      placeholder="es. docenti@icannafrank.edu.it"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Indirizzo del Google Group o lista di distribuzione di tutto il corpo docente.
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Orario consigliato prima dell'inizio delle lezioni (es. 07:30 o 07:45).
                    </span>
                  </div>
                </div>

                {/* OGGETTO EMAIL */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-800">
                    ✉️ Oggetto della Mail
                  </label>
                  <input
                    type="text"
                    value={mailGruppoOggetto}
                    onChange={(e) => setMailGruppoOggetto(e.target.value)}
                    placeholder="Oggetto dell'email..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* CORPO MESSAGGIO */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-800">
                    📝 Testo del Messaggio (Completamente Editabile)
                  </label>
                  <textarea
                    rows={5}
                    value={mailGruppoCorpo}
                    onChange={(e) => setMailGruppoCorpo(e.target.value)}
                    placeholder="Scrivi qui il testo della mail..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition leading-relaxed"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Puoi modificare il testo a tuo piacimento. Ricorda di lasciare il link al portale <code>https://sostituzioni-smart.web.app</code> affinché i docenti possano accedere con un click.
                  </span>
                </div>

                {/* WEBHOOK GOOGLE APPS SCRIPT PER INVIO AUTOMATICO TOTALE */}
                <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🚀</span>
                      <label className="text-xs font-black text-indigo-950">
                        Webhook Google Apps Script (Invio Automatico Silenzioso)
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => setMostraGuidaWebhook(!mostraGuidaWebhook)}
                        className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 rounded-full transition cursor-pointer"
                        title="Clicca per visualizzare le istruzioni e il codice dello script"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMostraGuidaWebhook(!mostraGuidaWebhook)}
                      className="text-[11px] font-black text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{mostraGuidaWebhook ? 'Nascondi Istruzioni & Codice' : 'Come creare lo Script & Codice ➔'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-indigo-900 leading-relaxed">
                    Inserendo l'URL Web App di uno script Google, le email verranno inviate <strong>in modo totalmente invisibile direttamente dal server di Google</strong> senza aprire finestre del browser o client di posta.
                  </p>

                  <input
                    type="url"
                    value={mailGruppoWebhookUrl}
                    onChange={(e) => setMailGruppoWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-600 transition shadow-2xs"
                  />

                  {/* GUIDA PASSO PASSO E CODICE DA COPIARE */}
                  {mostraGuidaWebhook && (
                    <div className="mt-3 p-4 bg-slate-900 text-white rounded-2xl border border-slate-700 space-y-3.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📋</span>
                          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                            Istruzioni di configurazione Google Apps Script (in 2 minuti)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMostraGuidaWebhook(false)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-300 leading-relaxed">
                        <li>
                          Vai su <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-bold underline hover:text-indigo-300">script.google.com</a> con l'account Google da cui vuoi spedire le mail.
                        </li>
                        <li>
                          Clicca su <strong>"Nuovo progetto"</strong> in alto a sinistra.
                        </li>
                        <li>
                          Cancella tutto il codice presente nell'editor e <strong>incolla il codice sottostante</strong>:
                        </li>
                      </ol>

                      {/* BOX CODICE CON TASTO COPIA RAPIDO */}
                      <div className="relative bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => {
                            const scriptCode = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var destinatario = data.destinatario;
    var oggetto = data.oggetto;
    var corpo = data.corpo;

    if (!destinatario || !oggetto) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Parametri mancanti" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    MailApp.sendEmail({
      to: destinatario,
      subject: oggetto,
      body: corpo
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "ok", message: "Email inviata con successo da " + Session.getActiveUser().getEmail() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
                            navigator.clipboard.writeText(scriptCode);
                            alert("Codice Google Apps Script copiato negli appunti!");
                          }}
                          className="absolute right-2.5 top-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[10px] font-bold px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Copy className="w-3 h-3 text-indigo-400" />
                          <span>Copia Script</span>
                        </button>
                        <pre className="text-[11px] font-mono leading-tight pr-24 whitespace-pre">
{`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var destinatario = data.destinatario;
    var oggetto = data.oggetto;
    var corpo = data.corpo;

    if (!destinatario || !oggetto) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Parametri mancanti" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    MailApp.sendEmail({
      to: destinatario,
      subject: oggetto,
      body: corpo
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "ok", message: "Email inviata con successo da " + Session.getActiveUser().getEmail() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                        </pre>
                      </div>

                      <ol start={4} className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                        <li>
                          Clicca in alto a destra su <strong>"Distribuisci" ➔ "Nuova implementazione"</strong>.
                        </li>
                        <li>
                          Clicca sull'ingranaggio ⚙️ ➔ seleziona <strong>"Applicazione web"</strong>.
                        </li>
                        <li>
                          Imposta:
                          <ul className="list-disc list-inside pl-4 text-slate-400 space-y-0.5 mt-0.5">
                            <li><strong>Esegui come:</strong> <em>Me stesso (la tua email)</em></li>
                            <li><strong>Chi può accedere:</strong> <em>Chiunque</em> (fondamentale affinché l'app possa inviare)</li>
                          </ul>
                        </li>
                        <li>
                          Clicca <strong>"Distribuisci"</strong> (autorizza i permessi di invio email con il tuo account Google).
                        </li>
                        <li>
                          Copia l'<strong>URL applicazione web</strong> (che finisce con <code>/exec</code>) e incollalo nel campo qui sopra!
                        </li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SEZIONE 7: INTEGRAZIONE GOOGLE CALENDAR (IMPEGNI & RISORSE DINAMICI) (ACCORDION) */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-visible transition-all duration-200">
          <div className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition gap-3">
            <button
              type="button"
              onClick={() => toggleSezione('sez_calendari_google')}
              className="flex items-center gap-3 flex-1 cursor-pointer text-left min-w-0"
            >
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Integrazione Google Calendar (Impegni & Risorse)</h3>
                  
                  {/* ICONA 'i' SUBITO DOPO IL TITOLO */}
                  <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInfoSezioneAperta(prev => prev === 'sez_calendari_google' ? null : 'sez_calendari_google');
                      }}
                      className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
                        infoSezioneAperta === 'sez_calendari_google'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="Spiegazione di questa sezione"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {infoSezioneAperta === 'sez_calendari_google' && (
                      <div className="absolute left-0 sm:left-auto sm:right-auto top-full mt-2 w-72 sm:w-80 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-slate-700 leading-relaxed space-y-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between font-bold text-amber-400">
                          <span className="flex items-center gap-1.5">💡 Google Calendar & Aule</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoSezioneAperta(null);
                            }}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-slate-200 text-[11px]">
                          Collega i calendari Google istituzionali di <strong>Impegni Scolastici</strong> (consigli di classe, collegi docenti) e di <strong>Risorse & Spazi</strong> (lab. informatica, teatro, palestra). Le schede appariranno automaticamente nel menu dei docenti solo se compilate.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Aggiungi calendari per impegni scolastici e aule/risorse speciali</p>
              </div>
            </button>

            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => toggleSezione('sez_calendari_google')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                  {sezioniAperte.sez_calendari_google ? 'Chiudi' : 'Modifica'}
                </span>
                <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 ${sezioniAperte.sez_calendari_google ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>

          {sezioniAperte.sez_calendari_google && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
              <div className="space-y-4 pt-4">
                {/* 1. CALENDARI IMPEGNI SCOLASTICI */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📅</span>
                      <div>
                        <h4 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                          1. Calendari Impegni Scolastici (Consigli, Collegi, Riunioni)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Collega i calendari Google che contengono le scadenze e gli appuntamenti collegiali.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCalImpegniList(prev => [
                          ...prev,
                          { id: `cal_${Date.now()}`, nome: '', googleId: '', colore: '#039BE5' }
                        ]);
                      }}
                      className="text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Aggiungi Calendario Impegno</span>
                    </button>
                  </div>

                  {calImpegniList.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      Nessun calendario di impegni aggiunto. Clicca su <strong>"+ Aggiungi Calendario Impegno"</strong> per configurarne uno.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {calImpegniList.map((cal, idx) => (
                        <div key={cal.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5 flex-wrap sm:flex-nowrap animate-in fade-in">
                          <div className="w-full sm:w-1/3 space-y-1">
                            <label className="block text-[10px] font-bold text-slate-700 uppercase">
                              Nome / Etichetta Scheda
                            </label>
                            <input
                              type="text"
                              value={cal.nome}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCalImpegniList(prev => prev.map((item, i) => i === idx ? { ...item, nome: val } : item));
                              }}
                              placeholder="es. Secondaria, Primaria, Plenari..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 transition"
                            />
                          </div>

                          <div className="w-full sm:flex-1 space-y-1">
                            <label className="block text-[10px] font-bold text-slate-700 uppercase">
                              ID Google Calendar o Indirizzo
                            </label>
                            <input
                              type="text"
                              value={cal.googleId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCalImpegniList(prev => prev.map((item, i) => i === idx ? { ...item, googleId: val } : item));
                              }}
                              placeholder="es. c_xxxxxxxxxxxx@group.calendar.google.com"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-500 transition"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setCalImpegniList(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition self-end sm:self-center cursor-pointer"
                            title="Rimuovi Calendario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. CALENDARI RISORSE & SPAZI (STANZE) */}
                <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏢</span>
                      <div>
                        <h4 className="font-black text-teal-950 text-xs sm:text-sm uppercase tracking-wider">
                          2. Calendari Risorse & Spazi (Aule Speciali / Stanze)
                        </h4>
                        <p className="text-[11px] text-teal-800">
                          Visualizza e verifica la disponibilità delle aule speciali (es. Lab. Informatica, Teatro, Palestra).
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCalRisorseList(prev => [
                          ...prev,
                          { id: `stanza_${Date.now()}`, nome: '', googleId: '', colore: '#009688' }
                        ]);
                      }}
                      className="text-xs font-black bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Aggiungi Stanza / Risorsa</span>
                    </button>
                  </div>

                  {calRisorseList.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-dashed border-teal-200 text-center text-xs text-slate-500">
                      Nessuna stanza o risorsa aggiunta. Clicca su <strong>"+ Aggiungi Stanza / Risorsa"</strong> per collegarne una.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {calRisorseList.map((res, idx) => (
                        <div key={res.id || idx} className="p-3 bg-white rounded-xl border border-teal-100 shadow-2xs flex items-center gap-2.5 flex-wrap sm:flex-nowrap animate-in fade-in">
                          <div className="w-full sm:w-1/3 space-y-1">
                            <label className="block text-[10px] font-bold text-teal-900 uppercase">
                              Nome Stanza / Spazio
                            </label>
                            <input
                              type="text"
                              value={res.nome}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCalRisorseList(prev => prev.map((item, i) => i === idx ? { ...item, nome: val } : item));
                              }}
                              placeholder="es. Lab. Informatica, Teatro, Palestra..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-500 transition"
                            />
                          </div>

                          <div className="w-full sm:flex-1 space-y-1">
                            <label className="block text-[10px] font-bold text-teal-900 uppercase">
                              ID Google Calendar o Indirizzo
                            </label>
                            <input
                              type="text"
                              value={res.googleId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCalRisorseList(prev => prev.map((item, i) => i === idx ? { ...item, googleId: val } : item));
                              }}
                              placeholder="es. c_informatica@group.calendar.google.com"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-teal-500 transition"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setCalRisorseList(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition self-end sm:self-center cursor-pointer"
                            title="Rimuovi Stanza"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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

      {/* SEZIONE 8: SALVATAGGIO BACKUP & RIPRISTINO COMPLETO (ACCORDION) */}
      <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-visible transition-all duration-200 mt-6">
        <div className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition gap-3">
          <button
            type="button"
            onClick={() => toggleSezione('sez_backup')}
            className="flex items-center gap-3 flex-1 cursor-pointer text-left min-w-0"
          >
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900">Salvataggio Backup & Ripristino Dati</h3>
                
                {/* ICONA 'i' SUBITO DOPO IL TITOLO */}
                <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoSezioneAperta(prev => prev === 'sez_backup' ? null : 'sez_backup');
                    }}
                    className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
                      infoSezioneAperta === 'sez_backup'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title="Spiegazione di questa sezione"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  {infoSezioneAperta === 'sez_backup' && (
                    <div className="absolute left-0 sm:left-auto sm:right-auto top-full mt-2 w-72 sm:w-80 bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-slate-700 leading-relaxed space-y-1.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between font-bold text-amber-400">
                        <span className="flex items-center gap-1.5">💡 Backup & Ripristino</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoSezioneAperta(null);
                          }}
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-slate-200 text-[11px]">
                        Scarica un file <code>.json</code> contenente tutti i docenti, l'orario scolastico, le assenze, le uscite e le preferenze per metterlo al sicuro sul tuo PC o importalo per ripristinare i dati istantaneamente.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">Esporta o importa l'intero archivio (docenti, orari, assenze, uscite, debiti e impostazioni)</p>
            </div>
          </button>

          <div className="flex items-center gap-2 text-slate-400 shrink-0">
            <button
              type="button"
              onClick={() => toggleSezione('sez_backup')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                {sezioniAperte.sez_backup ? 'Chiudi' : 'Visualizza'}
              </span>
              <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 ${sezioniAperte.sez_backup ? 'rotate-180 bg-emerald-50 text-emerald-600' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>

        {sezioniAperte.sez_backup && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
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
        )}
      </div>
    </div>
  );
};


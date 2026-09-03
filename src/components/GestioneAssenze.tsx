import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MotivoAssenza, GiornoSettimana, AssenzaDocente } from '../types';
import { UserMinus, Bus, Plus, Trash2, Calendar, Clock, MapPin, Users, ChevronDown, Check, X, Search, Ban, LayoutDashboard, ChevronLeft, ChevronRight, Info, Filter, UserCheck, ShieldCheck, Send, Bell, AlertTriangle, Scale, Megaphone } from 'lucide-react';
import { FASCE_ORARIE } from '../utils/fasceOrarie';
import { getDocentiUnici, getDocentiCollegatiIds, getBaseNomeDocente, formatDataItaliana, getOreStraordinarioDocente, getOrarioUnificatoDocente } from '../utils/docentiHelper';

export const GestioneAssenze: React.FC<{ 
  selectedDate: string; 
  selectedGiorno: any; 
  onChangeDate?: (newDate: string) => void;
  mostraRisorseLaterale?: boolean;
  onToggleRisorseLaterale?: () => void;
}> = ({ 
  selectedDate, 
  selectedGiorno, 
  onChangeDate,
  mostraRisorseLaterale = false,
  onToggleRisorseLaterale
}) => {
  const { 
    docenti, 
    orariDocenti, 
    assenze, 
    addAssenza, 
    removeAssenza, 
    annullaAssenza, 
    uscite, 
    addUscitaConAccompagnatori, 
    removeUscita, 
    annullaUscita, 
    sostituzioni,
    movimentiDebito,
    nomineSupplenti,
    addNominaSupplente,
    rimuoviNominaSupplente,
    prorogaNominaSupplente,
    annunciBacheca,
    addAnnuncioBacheca,
    rimuoviAnnuncioBacheca
  } = useApp();

  const [assenzaDaAnnullareConferma, setAssenzaDaAnnullareConferma] = useState<AssenzaDocente | null>(null);

  // Finestra aperta: null (chiusa), 'DOCENTE', 'GITA', 'NOMINA' o 'ANNUNCIO'
  const [modalitaAperta, setModalitaAperta] = useState<'DOCENTE' | 'GITA' | 'NOMINA' | 'ANNUNCIO' | null>(null);
  const [mostraInfo, setMostraInfo] = useState<boolean>(false);
  const [mostraDettagliEventi, setMostraDettagliEventi] = useState<boolean>(false);
  const [mostraRisorseInlineMobile, setMostraRisorseInlineMobile] = useState<boolean>(false);

  // --- STATO ANNUNCIO / COMUNICAZIONE BACHECA ---
  const [testoAnnuncio, setTestoAnnuncio] = useState<string>('');
  const [dataAnnuncio, setDataAnnuncio] = useState<string>(selectedDate);
  const [dataAnnuncioFine, setDataAnnuncioFine] = useState<string>(selectedDate);
  const [isAnnuncioPeriodo, setIsAnnuncioPeriodo] = useState<boolean>(false);
  const [invioInCorsoAnnuncio, setInvioInCorsoAnnuncio] = useState<boolean>(false);

  // --- STATO NOMINA SUPPLENTE CATTEDRA ---
  const [docenteTitolareNominaId, setDocenteTitolareNominaId] = useState<string>('');
  const [supplenteNome, setSupplenteNome] = useState<string>('');
  const [supplenteEmail, setSupplenteEmail] = useState<string>('');
  const [dataNominaInizio, setDataNominaInizio] = useState<string>(selectedDate);
  const [dataNominaFine, setDataNominaFine] = useState<string>(() => {
    // Default: fine anno scolastico o fine mese
    return selectedDate;
  });
  const [motivoNomina, setMotivoNomina] = useState<string>('Maternità / Congedo');
  const [docenteSostituitoDaNominaId, setDocenteSostituitoDaNominaId] = useState<string>('');

  // --- STATO ASSENZA DOCENTE ---
  const [dataDocente, setDataDocente] = useState<string>(selectedDate);
  const [dataDocenteFine, setDataDocenteFine] = useState<string>(selectedDate);
  const [isPeriodo, setIsPeriodo] = useState<boolean>(false);
  const [selectedDocenteId, setSelectedDocenteId] = useState('');
  const [motivo, setMotivo] = useState<MotivoAssenza>('Giornaliera');
  const [tipoDurataDoc, setTipoDurataDoc] = useState<'GIORNALIERA' | 'ORARIA'>('GIORNALIERA');
  const [oraInizioDoc, setOraInizioDoc] = useState<number>(8);
  const [oraFineDoc, setOraFineDoc] = useState<number>(14);

  // Aggiorna date quando cambia la data selezionata
  useEffect(() => {
    setDataDocente(selectedDate);
    setDataDocenteFine(selectedDate);
    setDataGita(selectedDate);
    setDataGitaFine(selectedDate);
  }, [selectedDate]);

  // --- STATO GITA / USCITA ---
  const [dataGita, setDataGita] = useState<string>(selectedDate);
  const [dataGitaFine, setDataGitaFine] = useState<string>(selectedDate);
  const [isGitaPeriodo, setIsGitaPeriodo] = useState<boolean>(false);
  const [titoloMeta, setTitoloMeta] = useState('');
  const [classiSelezionate, setClassiSelezionate] = useState<string[]>([]);
  const [tipoDurataGita, setTipoDurataGita] = useState<'GIORNALIERA' | 'ORARIA'>('GIORNALIERA');
  const [oraInizioGita, setOraInizioGita] = useState<number>(8);
  const [oraFineGita, setOraFineGita] = useState<number>(14);
  const [accompagnatoriIds, setAccompagnatoriIds] = useState<string[]>([]);
  
  // Dropdown a tendina per accompagnatori
  const [isDropdownAccompagnatoriOpen, setIsDropdownAccompagnatoriOpen] = useState(false);
  const [cercaDocente, setCercaDocente] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Su schermi desktop gestisci il click outside
      if (window.innerWidth >= 640 && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownAccompagnatoriOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const tutteClassi = [
    '1A', '2A', '3A',
    '1B', '2B', '3B',
    '1C', '2C', '3C',
    '1D', '2D', '3D',
    '1E', '2E', '3E',
    '1F', '2F', '3F'
  ];

  const orariDalleAlle = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  const getGiornoFromDate = (dateStr: string): GiornoSettimana => {
    if (!dateStr) return 'Lunedì';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const dayNum = d.getDay();
      if (dayNum === 1) return 'Lunedì';
      if (dayNum === 2) return 'Martedì';
      if (dayNum === 3) return 'Mercoledì';
      if (dayNum === 4) return 'Giovedì';
      if (dayNum === 5) return 'Venerdì';
    }
    return 'Lunedì';
  };

  const calcolaOreLezione = (tipo: 'GIORNALIERA' | 'ORARIA', da: number, a: number): number[] => {
    if (tipo === 'GIORNALIERA') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const res: number[] = [];
    const minH = Math.min(da, a);
    const maxH = Math.max(da, a);
    FASCE_ORARIE.forEach((f: any) => {
      if (minH < f.fine && maxH > f.inizio) res.push(f.ora);
    });
    return res.length > 0 ? res : [1];
  };

  const getDatesInRange = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      const d = current.getDay();
      if (d >= 1 && d <= 5) dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const toggleClasse = (classe: string) => {
    setClassiSelezionate(prev => 
      prev.includes(classe) ? prev.filter(c => c !== classe) : [...prev, classe].sort()
    );
  };

  const selezionaTutteClassiAnno = (anno: string) => {
    const classiAnno = tutteClassi.filter(c => c.startsWith(anno));
    const tutteGiaSelezionate = classiAnno.every(c => classiSelezionate.includes(c));
    if (tutteGiaSelezionate) {
      setClassiSelezionate(prev => prev.filter(c => !c.startsWith(anno)));
    } else {
      setClassiSelezionate(prev => Array.from(new Set([...prev, ...classiAnno])).sort());
    }
  };

  const toggleAccompagnatore = (docId: string) => {
    setAccompagnatoriIds(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // Stato per la finestra di dialogo scelta compensazione straordinario / debito
  const [richiestaCompensazioneStraordinario, setRichiestaCompensazioneStraordinario] = useState<{
    docenteId: string;
    docenteNome: string;
    oreDebito: number;
    oreStraordinarioDisponibili: number;
    dates: string[];
    oreInteressate: number[];
    motivo: MotivoAssenza;
    isOraria: boolean;
    note: string;
  } | null>(null);

  // Esegue il salvataggio effettivo con o senza compensazione dello straordinario
  const eseguiSalvataggioAssenza = (compensaConStraordinario: boolean, datiParam?: typeof richiestaCompensazioneStraordinario) => {
    const dati = datiParam || richiestaCompensazioneStraordinario;
    if (!dati) return;

    dati.dates.forEach(dStr => {
      addAssenza({
        data: dStr,
        giorno: getGiornoFromDate(dStr),
        docenteId: dati.docenteId,
        oreInteressate: dati.oreInteressate,
        motivo: dati.motivo,
        isOraria: dati.isOraria,
        note: dati.note
      }, compensaConStraordinario);
    });

    setSelectedDocenteId('');
    setModalitaAperta(null);
    setRichiestaCompensazioneStraordinario(null);
  };

  // Salvataggio Assenza Docente
  const handleSalvaDocente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocenteId) return;

    const oreInteressate = calcolaOreLezione(tipoDurataDoc, oraInizioDoc, oraFineDoc);
    const dates = isPeriodo ? getDatesInRange(dataDocente, dataDocenteFine) : [dataDocente];
    const isOraria = tipoDurataDoc === 'ORARIA' || motivo === 'Oraria';
    const note = tipoDurataDoc === 'ORARIA' ? `Fascia ${oraInizioDoc}:00 - ${oraFineDoc}:00` : 'Intera Giornata';

    // Calcola quante ore di reale debito verrebbero generate (esclude ore vuote o ore 'D')
    const orarioFuso = getOrarioUnificatoDocente(selectedDocenteId, docenti, orariDocenti);
    let totaleOreDebitoCalcolate = 0;

    if (isOraria && (motivo === 'Oraria' || motivo === 'Assenza')) {
      dates.forEach(dStr => {
        const targetGiorno = getGiornoFromDate(dStr);
        oreInteressate.forEach(ora => {
          const cella = orarioFuso.find(c => c.giorno === targetGiorno && c.ora === ora);
          const val = (cella?.valore || '').trim().toUpperCase();
          if (val && val !== 'D') {
            totaleOreDebitoCalcolate++;
          }
        });
      });
    }

    // Controlla se il docente ha ore di straordinario maturate a disposizione
    const oreStraordinarioDisponibili = getOreStraordinarioDocente(selectedDocenteId, docenti, sostituzioni, movimentiDebito);

    // Se genera debito e il docente ha ore di straordinario attive, chiedi alla vicepresidenza come procedere
    if (totaleOreDebitoCalcolate > 0 && oreStraordinarioDisponibili > 0) {
      const doc = docenti.find(d => d.id === selectedDocenteId);
      const nomeDocente = doc ? getBaseNomeDocente(doc.nome) : 'Docente';

      setRichiestaCompensazioneStraordinario({
        docenteId: selectedDocenteId,
        docenteNome: nomeDocente,
        oreDebito: totaleOreDebitoCalcolate,
        oreStraordinarioDisponibili,
        dates,
        oreInteressate,
        motivo,
        isOraria,
        note
      });
      return;
    }

    // Altrimenti procedi normalmente
    eseguiSalvataggioAssenza(false, {
      docenteId: selectedDocenteId,
      docenteNome: '',
      oreDebito: totaleOreDebitoCalcolate,
      oreStraordinarioDisponibili: 0,
      dates,
      oreInteressate,
      motivo,
      isOraria,
      note
    });
  };

  // Salvataggio Gita con Accompagnatori Atomico (Supporto Singolo Giorno o Più Giorni / Soggiorni)
  const handleSalvaGita = (e: React.FormEvent) => {
    e.preventDefault();
    if (classiSelezionate.length === 0) return;

    const oreInteressate = calcolaOreLezione(tipoDurataGita, oraInizioGita, oraFineGita);
    const metaFormatted = titoloMeta.trim() || 'Uscita Didattica / Gita';
    const dates = isGitaPeriodo ? getDatesInRange(dataGita, dataGitaFine) : [dataGita];

    dates.forEach(dStr => {
      const targetGiorno = getGiornoFromDate(dStr);
      addUscitaConAccompagnatori({
        data: dStr,
        giorno: targetGiorno,
        titoloMeta: metaFormatted,
        classi: classiSelezionate,
        oraInizio: tipoDurataGita === 'ORARIA' ? oraInizioGita : 8,
        oraFine: tipoDurataGita === 'ORARIA' ? oraFineGita : 14,
        ore: oreInteressate,
        docentiAccompagnatoriIds: accompagnatoriIds,
        note: tipoDurataGita === 'ORARIA' ? `${oraInizioGita}:00 - ${oraFineGita}:00` : (isGitaPeriodo ? `Soggiorno / Gita (${formatDataItaliana(dataGita)} - ${formatDataItaliana(dataGitaFine)})` : 'Intera Giornata')
      });
    });

    setTitoloMeta('');
    setClassiSelezionate([]);
    setAccompagnatoriIds([]);
    setIsDropdownAccompagnatoriOpen(false);
    setIsGitaPeriodo(false);
    setModalitaAperta(null);
  };

  // Salvataggio Nomina Supplente Cattedra
  const handleSalvaNomina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docenteTitolareNominaId || !supplenteNome.trim() || !dataNominaInizio || !dataNominaFine) return;

    const titolareDoc = docenti.find(d => d.id === docenteTitolareNominaId);
    const titolareNome = titolareDoc ? titolareDoc.nome : docenteTitolareNominaId;

    await addNominaSupplente({
      docenteTitolareId: docenteTitolareNominaId,
      docenteTitolareNome: titolareNome,
      docenteSostituitoDaNominaId: docenteSostituitoDaNominaId || undefined,
      supplenteNome: supplenteNome.trim().toUpperCase(),
      supplenteEmail: supplenteEmail.trim().toLowerCase() || undefined,
      dataInizio: dataNominaInizio,
      dataFine: dataNominaFine,
      motivo: motivoNomina
    });

    setDocenteTitolareNominaId('');
    setSupplenteNome('');
    setSupplenteEmail('');
    setDocenteSostituitoDaNominaId('');
    setModalitaAperta(null);
  };

  // Lista deduplicata di persone fisiche per assenze (include docenti curricolari, sostegno ed educatori)
  const docentiEdEducatoriUnici = getDocentiUnici(docenti, true);
  const docentiUnici = getDocentiUnici(docenti, false);

  // Docenti filtrati per la tendina degli accompagnatori
  const docentiFiltratiPerTendina = docentiUnici.filter(d => 
    d.nome.toLowerCase().includes(cercaDocente.toLowerCase()) ||
    d.materie.some(m => m.toLowerCase().includes(cercaDocente.toLowerCase()))
  );

  const getDocenteNome = (id: string) => {
    const doc = docenti.find(d => d.id === id);
    return doc ? getBaseNomeDocente(doc.nome) : id;
  };

  // Mostra solo le assenze dirette (malattia, permesso, assemblea, ecc.) escludendo le uscite già gestite nella card gite
  const assenzeOggi = assenze.filter(a => a.data === selectedDate && !a.annullata && a.motivo !== 'Uscita' && !a.dettagliUscita?.isAccompagnatore);
  const usciteOggi = uscite.filter(u => u.data === selectedDate && !u.annullata);

  // Raggruppa assenze oggi per persona fisica
  const assenzeOggiDeduplicate = Array.from(
    new Map(
      assenzeOggi.map(a => [getBaseNomeDocente(getDocenteNome(a.docenteId)), a])
    ).values()
  );

  // Calcolo Risorse Disponibili Oggi per la vista mobile integrata
  const personeUniche = getDocentiUnici(docenti);
  const tutteAssenzeOggi = assenze.filter(a => a.data === selectedDate && !a.annullata);
  const sostituzioniOggi = sostituzioni.filter(s => s.data === selectedDate);

  const dataIsoOggi = selectedDate.split('T')[0];

  const risorsePerOraMobile = [1, 2, 3, 4, 5, 6, 7, 8].map(oraNum => {
    const personeAssentiOra = new Set<string>();
    tutteAssenzeOggi.filter(a => a.oreInteressate.includes(oraNum)).forEach(a => {
      const d = docenti.find(doc => doc.id === a.docenteId);
      if (d) personeAssentiOra.add(getBaseNomeDocente(d.nome));
    });

    // Escludi docenti titolari che oggi hanno una nomina attiva (sono assenti con supplente)
    nomineSupplenti.forEach(n => {
      const inizio = n.dataInizio.split('T')[0];
      const fine = n.dataFine.split('T')[0];
      if (dataIsoOggi >= inizio && dataIsoOggi <= fine) {
        if (n.docenteTitolareNome) personeAssentiOra.add(getBaseNomeDocente(n.docenteTitolareNome));
        const titolareDoc = docenti.find(d => d.id === n.docenteTitolareId);
        if (titolareDoc) personeAssentiOra.add(getBaseNomeDocente(titolareDoc.nome));
      }
    });

    const personeGiaAssegnateOra = new Set<string>();
    sostituzioniOggi.filter(s => s.ora === oraNum).forEach(s => {
      const d = docenti.find(doc => doc.id === s.docenteSostitutoId);
      if (d) personeGiaAssegnateOra.add(getBaseNomeDocente(d.nome));
    });

    const classiInGitaOra = new Set<string>();
    usciteOggi.filter(u => u.ore.includes(oraNum)).forEach(u => {
      const cList = u.classi || [(u as any).classe];
      cList.forEach(c => classiInGitaOra.add(c.toUpperCase().trim()));
    });

    const potenziamentoList: { nome: string; docenteId: string; usata: boolean }[] = [];
    const disposizioniList: { nome: string; docenteId: string; debito: number; usata: boolean }[] = [];
    const liberatiGitaList: { nome: string; docenteId: string; classe: string; materia: string; usata: boolean }[] = [];

    personeUniche.forEach(persona => {
      if (persona.isEducatore) return;
      if (personeAssentiOra.has(persona.nome)) return;

      const isUsata = personeGiaAssegnateOra.has(persona.nome);
      const profiliCollegati = docenti.filter(d => persona.allIds.includes(d.id));

      let cellaVal = '';
      let profAttivo = profiliCollegati[0];
      let isGrave = persona.isCasoGraveSostegno || false;

      for (const prof of profiliCollegati) {
        const orario = orariDocenti.find(o => o.docenteId === prof.id);
        if (orario) {
          const c = orario.ore.find(cell => cell.giorno === selectedGiorno && cell.ora === oraNum);
          const val = (c?.valore || '').trim().toUpperCase();
          if (val !== '') {
            cellaVal = val;
            profAttivo = prof;
            if (c?.isCasoGrave || prof.isCasoGraveSostegno || (prof as any).casoGraveSostegno) isGrave = true;
            break;
          }
        }
      }

      if (isGrave) return;

      if (cellaVal && Array.from(classiInGitaOra).some(cg => cg === cellaVal.toUpperCase().trim())) {
        liberatiGitaList.push({
          nome: getBaseNomeDocente(persona.nome),
          docenteId: profAttivo.id,
          classe: cellaVal,
          materia: profAttivo.materia,
          usata: isUsata
        });
      } else if (
        (
          cellaVal === 'P' || 
          cellaVal === 'POT' || 
          cellaVal.endsWith(' P') || 
          cellaVal.endsWith(' POT') || 
          cellaVal.startsWith('P ') || 
          cellaVal.startsWith('POT ') || 
          cellaVal.includes('POTENZ') || 
          profAttivo.isPotenziamento ||
          profAttivo.materia === 'POTENZIAMENTO'
        ) && cellaVal !== '' && cellaVal !== 'D'
      ) {
        const classeCompresenza = cellaVal.replace(/POTENZIAMENTO|POT|P/g, '').trim();
        potenziamentoList.push({
          nome: getBaseNomeDocente(persona.nome) + (classeCompresenza ? ` (in ${classeCompresenza})` : ''),
          docenteId: profAttivo.id,
          usata: isUsata
        });
      } else if (cellaVal === 'D' || cellaVal === 'DISP' || cellaVal.startsWith('DISPOSIZ')) {
        disposizioniList.push({
          nome: getBaseNomeDocente(persona.nome),
          docenteId: profAttivo.id,
          debito: persona.oreDebitoPermesso || 0,
          usata: isUsata
        });
      }
    });

    const totDisponibili = potenziamentoList.length + disposizioniList.length + liberatiGitaList.length;

    return {
      ora: oraNum,
      totDisponibili,
      potenziamentoList,
      disposizioniList,
      liberatiGitaList
    };
  }).filter(r => r.totDisponibili > 0);

  const totPotenziamentoOggi = risorsePerOraMobile.reduce((acc, r) => acc + r.potenziamentoList.length, 0);
  const totGiteOggi = risorsePerOraMobile.reduce((acc, r) => acc + r.liberatiGitaList.length, 0);
  const totDisposizioniOggi = risorsePerOraMobile.reduce((acc, r) => acc + r.disposizioniList.length, 0);
  const totRisorseTotaliMobile = risorsePerOraMobile.reduce((acc, r) => acc + r.totDisponibili, 0);

  return (
    <div className="bg-slate-50/70 rounded-2xl rounded-t-none p-2.5 sm:p-3 shadow-2xs border border-t border-slate-200 space-y-3">
      
      {/* HEADER PULSANTERIA UNIFICATA PER TUTTI I DISPOSITIVI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* GRUPPO 1: AGGIUNGI (+ ASSENTE, + GITA, + NOMINA) COMPATTI */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 flex-1 sm:flex-none">
          <button
            id="targetBtnAssente"
            type="button"
            onClick={() => setModalitaAperta(modalitaAperta === 'DOCENTE' ? null : 'DOCENTE')}
            className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 shadow-2xs border cursor-pointer min-h-[54px] sm:min-h-0 ${
              modalitaAperta === 'DOCENTE'
                ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <UserMinus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] sm:text-xs font-black leading-tight text-center whitespace-nowrap">+ Assente</span>
          </button>

          <button
            id="targetBtnGita"
            type="button"
            onClick={() => setModalitaAperta(modalitaAperta === 'GITA' ? null : 'GITA')}
            className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 shadow-2xs border cursor-pointer min-h-[54px] sm:min-h-0 ${
              modalitaAperta === 'GITA'
                ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-300'
                : 'bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Bus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
            <span className="text-[11px] sm:text-xs font-black leading-tight text-center whitespace-nowrap">+ Gita</span>
          </button>

          {/* PULSANTE NOMINA SUPPLENTE */}
          <button
            id="targetBtnNomina"
            type="button"
            onClick={() => setModalitaAperta(modalitaAperta === 'NOMINA' ? null : 'NOMINA')}
            className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 shadow-2xs border cursor-pointer relative min-h-[54px] sm:min-h-0 ${
              modalitaAperta === 'NOMINA'
                ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-300'
                : 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <UserCheck className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
            <div className="flex items-center gap-1">
              <span className="text-[11px] sm:text-xs font-black leading-tight text-center whitespace-nowrap">+ Nomina</span>
              {nomineSupplenti.length > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                  modalitaAperta === 'NOMINA' ? 'bg-emerald-900 text-white' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {nomineSupplenti.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* GRUPPO 2: PULSANTI "EVENTI (N)", "RISORSE (N)" E MEGAFONO "AVVISI (N)" */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 flex-1 sm:flex-none">
          <button
            type="button"
            onClick={() => setMostraDettagliEventi(prev => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer shadow-2xs ${
              mostraDettagliEventi
                ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300 shadow-sm'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1">
              <span>📋</span>
              <span className="text-[11px] sm:text-xs">Eventi</span>
            </div>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              mostraDettagliEventi ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {assenzeOggiDeduplicate.length + usciteOggi.length + nomineSupplenti.filter(n => {
                const dIso = selectedDate.split('T')[0];
                return dIso >= n.dataInizio.split('T')[0] && dIso <= n.dataFine.split('T')[0];
              }).length + annunciBacheca.filter(a => {
                const dIso = selectedDate.split('T')[0];
                const fineIso = (a.dataFine || a.data).split('T')[0];
                return dIso >= a.data.split('T')[0] && dIso <= fineIso;
              }).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 640) {
                setMostraRisorseInlineMobile(prev => !prev);
              } else if (onToggleRisorseLaterale) {
                onToggleRisorseLaterale();
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer shadow-2xs ${
              (window.innerWidth < 640 ? mostraRisorseInlineMobile : mostraRisorseLaterale)
                ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1">
              <span>⚡</span>
              <span className="text-[11px] sm:text-xs">Risorse</span>
            </div>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              (window.innerWidth < 640 ? mostraRisorseInlineMobile : mostraRisorseLaterale) ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {totRisorseTotaliMobile}
            </span>
          </button>

          {/* PULSANTE MEGAFONO: SCRIVI AVVISO BACHECA / NOTIFICA BROADCAST */}
          <button
            type="button"
            onClick={() => setModalitaAperta(modalitaAperta === 'ANNUNCIO' ? null : 'ANNUNCIO')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer shadow-2xs ${
              modalitaAperta === 'ANNUNCIO'
                ? 'bg-violet-600 text-white border-violet-700 ring-2 ring-violet-300 shadow-sm'
                : 'bg-violet-50 text-violet-900 border-violet-200 hover:bg-violet-100'
            }`}
            title="Pubblica Annuncio / Avviso Generale per tutti i docenti e ATA"
          >
            <Megaphone className={`w-3.5 h-3.5 ${modalitaAperta === 'ANNUNCIO' ? 'text-white' : 'text-violet-600'}`} />
            <span className="text-[11px] sm:text-xs">Avviso</span>
            {(() => {
              const dIso = selectedDate.split('T')[0];
              const countOggi = annunciBacheca.filter(a => {
                const fineIso = (a.dataFine || a.data).split('T')[0];
                return dIso >= a.data.split('T')[0] && dIso <= fineIso;
              }).length;
              if (countOggi === 0) return null;
              return (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                  modalitaAperta === 'ANNUNCIO' ? 'bg-violet-900 text-white' : 'bg-violet-200 text-violet-900'
                }`}>
                  {countOggi}
                </span>
              );
            })()}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FINESTRINA POPUP / MODALE PER ASSENZA DOCENTE             */}
      {/* ========================================================= */}
      {modalitaAperta === 'DOCENTE' && (
        <div className="bg-indigo-50/50 border-2 border-indigo-200 rounded-2xl p-4 space-y-3.5 shadow-md relative animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
              <UserMinus className="w-4 h-4 text-indigo-600" />
              <span>Registra Assenza Docente</span>
            </span>
            <button
              type="button"
              onClick={() => setModalitaAperta(null)}
              className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-lg p-1 transition border border-slate-200"
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSalvaDocente} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-end">
            
            {/* DATA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black text-slate-600 uppercase">Giorno</label>
                <button
                  type="button"
                  onClick={() => setIsPeriodo(!isPeriodo)}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  {isPeriodo ? 'Giorno singolo' : '+ Più giorni'}
                </button>
              </div>
              <input
                type="date"
                value={dataDocente}
                onChange={(e) => {
                  setDataDocente(e.target.value);
                  if (!isPeriodo) setDataDocenteFine(e.target.value);
                }}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold bg-slate-50/50"
              />
            </div>

            {isPeriodo && (
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Fino al</label>
                <input
                  type="date"
                  value={dataDocenteFine}
                  onChange={(e) => setDataDocenteFine(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold bg-slate-50/50"
                />
              </div>
            )}

            {/* DOCENTE DEDUPLICATO A NOME SINGOLO (INCLUSI EDUCATORI) */}
            <div className={isPeriodo ? 'sm:col-span-2 md:col-span-1' : 'md:col-span-2'}>
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Docente / Educatore Assente</label>
              <select
                value={selectedDocenteId}
                onChange={(e) => setSelectedDocenteId(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white"
              >
                <option value="">-- Scegli Docente o Educatore --</option>
                {docentiEdEducatoriUnici.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.isEducatore ? `🧑‍🏫 [EDUCATORE] ${d.nome}` : `${d.nome} (${d.materie.join(', ')})`}
                  </option>
                ))}
              </select>
            </div>

            {/* TIPOLOGIA */}
            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Tipologia</label>
              <select
                value={motivo}
                onChange={(e) => {
                  const val = e.target.value as MotivoAssenza;
                  setMotivo(val);
                  if (val === 'Oraria' || val === 'Assemblea sindacale') {
                    setTipoDurataDoc('ORARIA');
                  } else if (val === 'Giornaliera') {
                    setTipoDurataDoc('GIORNALIERA');
                  }
                }}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white"
              >
                <option value="Giornaliera">Giornaliera</option>
                <option value="Oraria">Oraria (Permesso breve da recuperare)</option>
                <option value="Assemblea sindacale">Assemblea sindacale (Diritto CCNL, NO recupero)</option>
              </select>
            </div>
          </div>

          {/* DURATA ORE */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="durataDoc"
                  checked={tipoDurataDoc === 'GIORNALIERA'}
                  onChange={() => setTipoDurataDoc('GIORNALIERA')}
                  className="text-indigo-600"
                />
                <span>Intera Giornata</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="durataDoc"
                  checked={tipoDurataDoc === 'ORARIA'}
                  onChange={() => setTipoDurataDoc('ORARIA')}
                  className="text-indigo-600"
                />
                <span>
                  {motivo === 'Assemblea sindacale' 
                    ? 'Fascia Oraria Assemblea (NO debito)' 
                    : 'Fascia Oraria (Permesso breve con debito)'}
                </span>
              </label>
            </div>

            {tipoDurataDoc === 'ORARIA' && (
              <div className="flex items-center gap-2 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-semibold">Dalle:</span>
                <select
                  value={oraInizioDoc}
                  onChange={(e) => {
                    const start = Number(e.target.value);
                    setOraInizioDoc(start);
                    if (oraFineDoc <= start) setOraFineDoc(start + 1);
                  }}
                  className="border rounded p-1 text-xs font-bold"
                >
                  {orariDalleAlle.slice(0, -1).map(h => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>

                <span className="text-slate-500 font-semibold">Alle:</span>
                <select
                  value={oraFineDoc}
                  onChange={(e) => setOraFineDoc(Number(e.target.value))}
                  className="border rounded p-1 text-xs font-bold"
                >
                  {orariDalleAlle.filter(h => h > oraInizioDoc).map(h => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registra Assenza</span>
            </button>
          </div>
        </form>
      </div>
      )}

      {/* ========================================================= */}
      {/* FINESTRINA POPUP / MODALE COMPATTA PER NOMINA SUPPLENTE   */}
      {/* ========================================================= */}
      {modalitaAperta === 'NOMINA' && (
        <div className="bg-emerald-50/60 border-2 border-emerald-300 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-md relative animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
            <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Assegna Supplente da Graduatoria su Cattedra (Supplenza / Maternità)</span>
            </span>
            <button
              type="button"
              onClick={() => setModalitaAperta(null)}
              className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-lg p-1 transition border border-slate-200"
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSalvaNomina} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-end">
              
              {/* 1. DOCENTE TITOLARE */}
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Docente Titolare</label>
                <select
                  value={docenteTitolareNominaId}
                  onChange={(e) => setDocenteTitolareNominaId(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold bg-white text-slate-900 outline-none focus:border-emerald-500"
                >
                  <option value="">-- Scegli Titolare --</option>
                  {docentiUnici.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nome} ({d.materie.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. DATE PRESA DI SERVIZIO E FINE */}
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Presa di Servizio (Da)</label>
                <input
                  type="date"
                  value={dataNominaInizio}
                  onChange={(e) => setDataNominaInizio(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-bold bg-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Fine Nomina (A)</label>
                <input
                  type="date"
                  value={dataNominaFine}
                  onChange={(e) => setDataNominaFine(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-bold bg-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* 3. NOME SUPPLENTE */}
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Nome Supplente Nominato</label>
                <input
                  type="text"
                  placeholder="es. ROSSI MARCO"
                  value={supplenteNome}
                  onChange={(e) => setSupplenteNome(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-bold bg-white outline-none focus:border-emerald-500"
                />
              </div>

            </div>

            {/* RIGA 2: EMAIL ISTITUZIONALE + SUBMIT */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-emerald-100">
              
              <div className="flex-1 max-w-md">
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Email Istituzionale (Accesso Portale Docente - Opzionale):</label>
                <input
                  type="email"
                  placeholder="es. marco.rossi@icginostrada.it"
                  value={supplenteEmail}
                  onChange={(e) => setSupplenteEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-mono bg-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 justify-end pt-1 sm:pt-0">
                <button
                  type="button"
                  onClick={() => setModalitaAperta(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Attiva Nomina</span>
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* FINESTRINA POPUP / MODALE PER GITA / USCITA DIDATTICA     */}
      {/* ========================================================= */}
      {modalitaAperta === 'GITA' && (
        <div className="bg-amber-50/50 border-2 border-amber-200 rounded-2xl p-4 space-y-3.5 shadow-md relative animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-amber-600" />
              <span>Registra Gita / Uscita Didattica</span>
            </span>
            <button
              type="button"
              onClick={() => setModalitaAperta(null)}
              className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-lg p-1 transition border border-slate-200 cursor-pointer"
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSalvaGita} className="space-y-3">
            {/* RIGA 1: DATA (O PERIODO) + TITOLO/META */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-700 uppercase">
                    {isGitaPeriodo ? 'Data Inizio Soggiorno' : 'Data Gita'}
                  </label>
                  <label className="flex items-center gap-1 text-[10px] font-bold text-amber-900 cursor-pointer bg-amber-100/80 px-2 py-0.5 rounded-md hover:bg-amber-200/80 transition">
                    <input
                      type="checkbox"
                      checked={isGitaPeriodo}
                      onChange={(e) => {
                        setIsGitaPeriodo(e.target.checked);
                        if (!e.target.checked) setDataGitaFine(dataGita);
                        else if (dataGitaFine < dataGita) setDataGitaFine(dataGita);
                      }}
                      className="rounded text-amber-600 focus:ring-0"
                    />
                    <span>Più giorni / Soggiorno</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="date"
                      value={dataGita}
                      onChange={(e) => {
                        setDataGita(e.target.value);
                        if (dataGitaFine < e.target.value) setDataGitaFine(e.target.value);
                      }}
                      required
                      className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold bg-white text-slate-900 outline-none focus:border-amber-500 shadow-2xs"
                    />
                  </div>

                  {isGitaPeriodo && (
                    <div className="animate-in fade-in duration-150">
                      <input
                        type="date"
                        value={dataGitaFine}
                        min={dataGita}
                        onChange={(e) => setDataGitaFine(e.target.value)}
                        required
                        title="Data Fine Soggiorno"
                        className="w-full border border-amber-300 rounded-xl p-2 text-xs font-bold bg-amber-50/50 text-slate-900 outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={isGitaPeriodo ? "sm:col-span-7" : "sm:col-span-7"}>
                <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">Titolo / Destinazione</label>
                <input
                  type="text"
                  placeholder="Es: Viaggio d'Istruzione Roma, Soggiorno Neve, Museo, ecc."
                  value={titoloMeta}
                  onChange={(e) => setTitoloMeta(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2 text-xs bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
            </div>

            {/* SELEZIONE CLASSI PARTECIPANTI */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-700 uppercase">
                  Seleziona Classi Coinvolte ({classiSelezionate.length} selezionate)
                </label>
                
                {/* Filtri rapidi per anno scolastico */}
                <div className="flex items-center gap-1 text-[10px]">
                  <button 
                    type="button" 
                    onClick={() => selezionaTutteClassiAnno('1')} 
                    className={`px-2 py-0.5 rounded-md font-bold transition border ${
                      tutteClassi.filter(c => c.startsWith('1')).every(c => classiSelezionate.includes(c))
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Prime
                  </button>
                  <button 
                    type="button" 
                    onClick={() => selezionaTutteClassiAnno('2')} 
                    className={`px-2 py-0.5 rounded-md font-bold transition border ${
                      tutteClassi.filter(c => c.startsWith('2')).every(c => classiSelezionate.includes(c))
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Seconde
                  </button>
                  <button 
                    type="button" 
                    onClick={() => selezionaTutteClassiAnno('3')} 
                    className={`px-2 py-0.5 rounded-md font-bold transition border ${
                      tutteClassi.filter(c => c.startsWith('3')).every(c => classiSelezionate.includes(c))
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Terze
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setClassiSelezionate([...tutteClassi])} 
                    className="px-2 py-0.5 bg-white border border-slate-300 rounded-md font-bold text-indigo-700 hover:bg-indigo-50"
                  >
                    Tutti
                  </button>
                  {classiSelezionate.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setClassiSelezionate([])} 
                      className="px-1.5 py-0.5 text-rose-600 hover:underline font-bold"
                    >
                      Deseleziona
                    </button>
                  )}
                </div>
              </div>

              {/* Pillole Classi Compatte */}
              <div className="flex flex-wrap gap-1">
                {tutteClassi.map(c => {
                  const isSel = classiSelezionate.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleClasse(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition border ${
                        isSel 
                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELEZIONE DOCENTI ACCOMPAGNATORI */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-700 uppercase">
                Docenti Accompagnatori ({accompagnatoriIds.length} selezionati)
              </label>

              <div className="relative" ref={dropdownRef}>
                <div
                  onClick={() => setIsDropdownAccompagnatoriOpen(!isDropdownAccompagnatoriOpen)}
                  className="w-full min-h-[44px] border border-slate-300 rounded-xl p-2 bg-white flex flex-wrap items-center justify-between gap-1.5 cursor-pointer hover:border-amber-500 shadow-2xs transition"
                >
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    {accompagnatoriIds.length === 0 ? (
                      <span className="text-xs text-slate-400 font-medium py-1">Tocca per scegliere i docenti accompagnatori...</span>
                    ) : (
                      accompagnatoriIds.map(docId => (
                        <span
                          key={docId}
                          className="bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{getDocenteNome(docId)}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAccompagnatore(docId);
                            }}
                            className="text-amber-800 hover:text-red-600 p-0.5 rounded transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isDropdownAccompagnatoriOpen ? 'rotate-180 text-amber-600' : ''}`} />
                </div>

                {isDropdownAccompagnatoriOpen && (
                  <>
                    <div 
                      className="sm:hidden fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-2xs animate-fadeIn"
                      onClick={() => setIsDropdownAccompagnatoriOpen(false)}
                    />

                    <div className="fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto sm:top-full sm:left-0 sm:right-0 z-50 max-h-[75dvh] sm:max-h-[480px] sm:h-96 sm:mt-2 bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-top-2 duration-150 pb-[env(safe-area-inset-bottom,0px)]">
                      <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Cerca docente..."
                            value={cercaDocente}
                            onChange={(e) => setCercaDocente(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDropdownAccompagnatoriOpen(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100">
                        {docentiFiltratiPerTendina.map(doc => {
                          const isSel = accompagnatoriIds.includes(doc.id);
                          return (
                            <div
                              key={doc.id}
                              onClick={() => toggleAccompagnatore(doc.id)}
                              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition ${
                                isSel ? 'bg-amber-50 text-amber-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="text-xs">
                                <span className="block font-bold">{getBaseNomeDocente(doc.nome)}</span>
                                <span className="text-[10px] text-slate-400">{doc.materie.join(', ')}</span>
                              </div>
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                                isSel ? 'bg-amber-500 border-amber-600 text-white' : 'border-slate-300'
                              }`}>
                                {isSel && <Check className="w-3.5 h-3.5" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 border-t border-slate-100 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => setIsDropdownAccompagnatoriOpen(false)}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Check className="w-4 h-4" />
                          <span>Conferma ({accompagnatoriIds.length} Accompagnatori)</span>
                        </button>
                      </div>

                    </div>
                  </>
                )}
              </div>
            </div>

            {/* DURATA ORE GITA */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="durataGita"
                    checked={tipoDurataGita === 'GIORNALIERA'}
                    onChange={() => setTipoDurataGita('GIORNALIERA')}
                    className="text-amber-600"
                  />
                  <span>Intera Giornata</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="durataGita"
                    checked={tipoDurataGita === 'ORARIA'}
                    onChange={() => setTipoDurataGita('ORARIA')}
                    className="text-amber-600"
                  />
                  <span>Fascia Oraria</span>
                </label>
              </div>

              {tipoDurataGita === 'ORARIA' && (
                <div className="flex items-center gap-2 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-semibold">Dalle:</span>
                  <select
                    value={oraInizioGita}
                    onChange={(e) => {
                      const start = Number(e.target.value);
                      setOraInizioGita(start);
                      if (oraFineGita <= start) setOraFineGita(start + 1);
                    }}
                    className="border rounded p-1 text-xs font-bold"
                  >
                    {orariDalleAlle.slice(0, -1).map(h => (
                      <option key={h} value={h}>{h}:00</option>
                    ))}
                  </select>

                  <span className="text-slate-500 font-semibold">Alle:</span>
                  <select
                    value={oraFineGita}
                    onChange={(e) => setOraFineGita(Number(e.target.value))}
                    className="border rounded p-1 text-xs font-bold"
                  >
                    {orariDalleAlle.filter(h => h > oraInizioGita).map(h => (
                      <option key={h} value={h}>{h}:00</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition ml-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registra Gita & Libera Docenti</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* FINESTRINA POPUP / MODALE PER PUBBLICAZIONE ANNUNCIO      */}
      {/* ========================================================= */}
      {modalitaAperta === 'ANNUNCIO' && (
        <div className="bg-violet-50/70 border-2 border-violet-200 rounded-2xl p-4 space-y-3.5 shadow-md relative animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-violet-100 pb-2">
            <span className="text-xs font-black text-violet-950 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-violet-600" />
              <span>Pubblica Avviso / Comunicazione Vicepresidenza</span>
            </span>
            <button
              type="button"
              onClick={() => setModalitaAperta(null)}
              className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-lg p-1 transition border border-slate-200 cursor-pointer"
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!testoAnnuncio.trim()) {
                alert('Inserisci il testo dell\'annuncio prima di inviare.');
                return;
              }
              setInvioInCorsoAnnuncio(true);
              try {
                await addAnnuncioBacheca({
                  data: dataAnnuncio,
                  dataFine: isAnnuncioPeriodo ? dataAnnuncioFine : dataAnnuncio,
                  testo: testoAnnuncio.trim(),
                  autore: 'Vicepresidenza'
                });
                setTestoAnnuncio('');
                setModalitaAperta(null);
                setMostraDettagliEventi(true);
              } catch (err) {
                console.error('Errore pubblicazione annuncio:', err);
              } finally {
                setInvioInCorsoAnnuncio(false);
              }
            }}
            className="space-y-3"
          >
            {/* SELEZIONE DATA / PERIODO */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-violet-600" />
                <span className="text-xs font-bold text-slate-700">Data Visibilità:</span>
                <input
                  type="date"
                  value={dataAnnuncio}
                  onChange={(e) => setDataAnnuncio(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={isAnnuncioPeriodo}
                  onChange={(e) => {
                    setIsAnnuncioPeriodo(e.target.checked);
                    if (e.target.checked && dataAnnuncioFine < dataAnnuncio) {
                      setDataAnnuncioFine(dataAnnuncio);
                    }
                  }}
                  className="rounded text-violet-600"
                />
                <span>Fino a data (Periodo)</span>
              </label>

              {isAnnuncioPeriodo && (
                <div className="flex items-center gap-1.5 animate-in fade-in">
                  <span className="text-xs font-bold text-slate-500">Fino al:</span>
                  <input
                    type="date"
                    min={dataAnnuncio}
                    value={dataAnnuncioFine}
                    onChange={(e) => setDataAnnuncioFine(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              )}
            </div>

            {/* TESTO AVVISO */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-violet-950 uppercase">
                Testo dell'Avviso per Docenti & ATA
              </label>
              <textarea
                required
                rows={3}
                value={testoAnnuncio}
                onChange={(e) => setTestoAnnuncio(e.target.value)}
                placeholder="Es: Si ricorda che venerdì alle 14:30 si terrà il Collegio Docenti in aula magna..."
                className="w-full border border-slate-300 rounded-xl p-3 text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400 focus:border-violet-500 outline-none resize-y"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-violet-100 text-xs">
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-violet-600" />
                <span>Invierà una <strong>notifica push</strong> a tutti e comparirà in cima ai tabelloni</span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalitaAperta(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition font-bold cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={invioInCorsoAnnuncio}
                  className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{invioInCorsoAnnuncio ? 'Invio in corso...' : 'Invia e Notifica a Tutti'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. LISTA EVENTI REGISTRATI PER LA DATA SELEZIONATA        */}
      {/* ========================================================= */}
      {(assenzeOggiDeduplicate.length > 0 || usciteOggi.length > 0 || nomineSupplenti.some(n => {
        const dIso = selectedDate.split('T')[0];
        return dIso >= n.dataInizio.split('T')[0] && dIso <= n.dataFine.split('T')[0];
      }) || annunciBacheca.some(a => {
        const dIso = selectedDate.split('T')[0];
        const fineIso = (a.dataFine || a.data).split('T')[0];
        return dIso >= a.data.split('T')[0] && dIso <= fineIso;
      })) && mostraDettagliEventi && (
        <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              {/* Annunci e Comunicazioni Bacheca Attivi nella data selezionata */}
              {annunciBacheca.filter(a => {
                const dIso = selectedDate.split('T')[0];
                const fineIso = (a.dataFine || a.data).split('T')[0];
                return dIso >= a.data.split('T')[0] && dIso <= fineIso;
              }).map(a => (
                <div key={a.id} className="bg-violet-50/90 border border-violet-300 rounded-xl p-2.5 flex items-start justify-between gap-2 text-xs shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-violet-950">
                      <Megaphone className="w-3.5 h-3.5 text-violet-700 shrink-0" />
                      <span>Avviso Vicepresidenza</span>
                      <span className="bg-violet-200 text-violet-900 font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                        {a.dataFine && a.dataFine !== a.data ? 'Periodo' : 'Giornaliero'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-800 font-medium whitespace-pre-wrap">
                      {a.testo}
                    </p>
                    <div className="text-[10px] text-violet-700 font-medium">
                      Visibile: {formatDataItaliana(a.data)} {a.dataFine && a.dataFine !== a.data ? `➔ ${formatDataItaliana(a.dataFine)}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Vuoi eliminare questo avviso: "${a.testo.substring(0, 35)}..."?`)) {
                        rimuoviAnnuncioBacheca(a.id);
                      }
                    }}
                    className="text-violet-700 hover:text-red-600 p-1 hover:bg-violet-100 rounded transition shrink-0 cursor-pointer"
                    title="Elimina avviso dalla bacheca"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {/* Gite con Accompagnatori inclusi nello slot */}
              {usciteOggi.map(u => {
                const isGiornaliera = (u.ore.length >= 5) || (u.note?.includes('Intera Giornata')) || (!u.oraInizio && !u.oraFine);
                const labelDurata = isGiornaliera 
                  ? 'Giornaliera' 
                  : (u.note?.includes(':00') ? `Oraria (${u.note})` : `Oraria (${u.ore.map(o => `${o}ª`).join(', ')} ora)`);

                const nomiAccompagnatori = u.docentiAccompagnatoriIds.length > 0 
                  ? u.docentiAccompagnatoriIds.map(getDocenteNome).join(', ') 
                  : 'Nessuno';

                return (
                  <div key={u.id} className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 flex items-start justify-between gap-2 text-xs shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <Bus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{u.titoloMeta}</span>
                        <span className="bg-amber-200/80 text-amber-900 font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                          {labelDurata}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-900">
                        <strong className="text-amber-950">Classi:</strong> {u.classi ? u.classi.join(', ') : (u as any).classe}
                      </div>
                      <div className="text-[11px] text-amber-900">
                        <strong className="text-amber-950">Accompagnatori:</strong> {nomiAccompagnatori}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => annullaUscita(u.id)}
                      className="text-amber-700 hover:text-red-600 p-1 hover:bg-amber-100 rounded transition shrink-0"
                      title="Annulla gita"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {/* Nomine Supplenti Attive nella data selezionata */}
              {nomineSupplenti.filter(n => {
                const dIso = selectedDate.split('T')[0];
                return dIso >= n.dataInizio.split('T')[0] && dIso <= n.dataFine.split('T')[0];
              }).map(n => (
                <div key={n.id} className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-2.5 flex items-start justify-between gap-2 text-xs shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{n.supplenteNome}</span>
                      <span className="bg-emerald-200 text-emerald-900 font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                        Supplente Cattedra
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-900">
                      <strong className="text-emerald-950">Sostituisce:</strong> {n.docenteTitolareNome}
                    </div>
                    <div className="text-[10px] text-emerald-800 font-medium">
                      Periodo: {formatDataItaliana(n.dataInizio)} ➔ {formatDataItaliana(n.dataFine)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Vuoi revocare la nomina del supplente ${n.supplenteNome} su ${n.docenteTitolareNome}?`)) {
                        rimuoviNominaSupplente(n.id);
                      }
                    }}
                    className="text-emerald-700 hover:text-red-600 p-1 hover:bg-emerald-100 rounded transition shrink-0"
                    title="Revoca nomina supplente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Assenze Docenti Deduplicate */}
              {assenzeOggiDeduplicate.map(a => {
                const isGiornaliera = !a.isOraria && (a.oreInteressate.length >= 5 || a.note?.includes('Intera Giornata'));
                const dettaglioDurata = isGiornaliera 
                  ? 'Giornaliera (Intera giornata)' 
                  : (a.note?.includes('Fascia') ? a.note : `Oraria (${a.oreInteressate.map(o => `${o}ª`).join(', ')} ora)`);

                return (
                  <div key={a.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs shadow-2xs">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <UserMinus className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{getDocenteNome(a.docenteId)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        <span>{a.motivo}</span> • <span className="text-indigo-700 font-semibold">{dettaglioDurata}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssenzaDaAnnullareConferma(a)}
                      className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition cursor-pointer"
                      title="Annulla assenza"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. LISTA RISORSE DISPONIBILI INLINE SU MOBILE             */}
      {/* ========================================================= */}
      {mostraRisorseInlineMobile && (
        <div className="sm:hidden pt-2 border-t border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Risorse Disponibili Oggi ({totRisorseTotaliMobile})</span>
            </span>
            <button
              type="button"
              onClick={() => setMostraRisorseInlineMobile(false)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-lg"
            >
              Chiudi
            </button>
          </div>

          <div className="space-y-2">
            {risorsePerOraMobile.map(r => (
              <div key={r.ora} className="bg-amber-50/60 border border-amber-200 rounded-xl p-2.5 space-y-1.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between font-black text-amber-950 border-b border-amber-200 pb-1">
                  <span>{r.ora}ª ORA ({r.totDisponibili} disponibili)</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full">
                    {r.potenziamentoList.length} Pot. • {r.disposizioniList.length} Disp. • {r.liberatiGitaList.length} Gita
                  </span>
                </div>

                <div className="space-y-1 pt-0.5">
                  {/* Potenziamento */}
                  {r.potenziamentoList.map(p => (
                    <div key={p.docenteId} className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-purple-200 text-purple-950 text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        <span>🟣</span>
                        <span>{p.nome}</span>
                      </span>
                      <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">Potenziamento</span>
                    </div>
                  ))}

                  {/* Disposizioni */}
                  {r.disposizioniList.map(d => (
                    <div key={d.docenteId} className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-amber-200 text-amber-950 text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        <span>🟡</span>
                        <span>{d.nome}</span>
                      </span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">Disposizione (D)</span>
                    </div>
                  ))}

                  {/* Liberati da Gita */}
                  {r.liberatiGitaList.map(g => (
                    <div key={g.docenteId} className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-emerald-200 text-emerald-950 text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        <span>🟢</span>
                        <span>{g.nome} ({g.classe})</span>
                      </span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">Gita</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {risorsePerOraMobile.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-3">Nessuna risorsa libera registrata per questa giornata.</p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE DI CONFERMA: ANNULLAMENTO ASSENZA E NOTIFICA AI SUPPLENTI          */}
      {/* ========================================================================= */}
      {assenzaDaAnnullareConferma && (() => {
        const a = assenzaDaAnnullareConferma;
        const nomeDocAssente = getDocenteNome(a.docenteId);
        const collegatiIds = getDocentiCollegatiIds(a.docenteId, docenti);
        
        // Trova tutte le sostituzioni assegnate che verranno revocate
        const sostsCoinvolte = sostituzioni.filter(s => 
          s.data === a.data && 
          (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === a.docenteId) && 
          (a.oreInteressate || []).includes(s.ora) &&
          s.categoria !== 'NON_SOSTITUIRE' &&
          s.docenteSostitutoId
        );

        const sostsDaNotificare = sostsCoinvolte.filter(s => s.pubblicata || s.firmata);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
              
              {/* Header Modale */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                      Conferma Annullamento Assenza
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {formatDataItaliana(a.data)} • Prof. {nomeDocAssente}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAssenzaDaAnnullareConferma(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Corpo Modale */}
              <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-xs">
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-amber-950 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Stai per annullare l'assenza del docente:</span>
                  </div>
                  <div className="text-slate-800 space-y-0.5">
                    <div>Docente: <strong className="text-slate-900 font-black">{nomeDocAssente}</strong></div>
                    <div>Tipologia: <strong>{a.motivo}</strong> ({a.isOraria ? `Oraria ore: ${a.oreInteressate.join(', ')}` : 'Intera giornata'})</div>
                  </div>
                </div>

                {sostsDaNotificare.length > 0 ? (
                  <div className="space-y-2">
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-900">
                        <Bell className="w-4 h-4 text-rose-600" />
                        <span>Notifica Push di Annullamento ({sostsDaNotificare.length} docenti):</span>
                      </div>
                      <p className="text-[11px] text-rose-800 leading-relaxed">
                        I seguenti colleghi avevano già ricevuto la supplenza e riceveranno immediatamente una <strong>notifica push con suono</strong> di revoca:
                      </p>
                    </div>

                    <div className="space-y-1.5 max-h-44 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                      {sostsDaNotificare.map(s => {
                        const docSost = docenti.find(d => d.id === s.docenteSostitutoId);
                        return (
                          <div key={s.id} className="py-2 px-1 flex items-center justify-between text-xs gap-2">
                            <div>
                              <strong className="text-slate-900 font-black block">
                                Prof. {docSost ? getBaseNomeDocente(docSost.nome) : s.docenteSostitutoId}
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {s.ora}ª ora • Classe {s.classe}
                              </span>
                            </div>
                            <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md shrink-0">
                              Supplenza Revocata
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px]">
                    Nessun docente supplente aveva ancora ricevuto la richiesta di firma per questa assenza.
                  </p>
                )}
              </div>

              {/* Footer Azioni */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setAssenzaDaAnnullareConferma(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  Indietro
                </button>

                <button
                  type="button"
                  onClick={() => {
                    annullaAssenza(a.id);
                    setAssenzaDaAnnullareConferma(null);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Ban className="w-4 h-4" />
                  <span>Conferma Annullamento</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODALE DI SCELTA COMPENSAZIONE STRAORDINARIO vs DEBITO    */}
      {/* ========================================================= */}
      {richiestaCompensazioneStraordinario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* Intestazione */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-indigo-950 font-black text-sm sm:text-base">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="leading-tight">Compensazione Ore a Credito</h3>
                  <span className="text-[11px] font-normal text-slate-500">Rilevato saldo positivo di ore a credito</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRichiestaCompensazioneStraordinario(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo Informativo */}
            <div className="space-y-3 overflow-y-auto text-xs pr-1">
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3.5 space-y-2 text-indigo-950">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Docente:</span>
                  <strong className="font-black text-sm text-indigo-900">{richiestaCompensazioneStraordinario.docenteNome}</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-100">
                  <span>Permesso Breve richiesto:</span>
                  <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    -{richiestaCompensazioneStraordinario.oreDebito} {richiestaCompensazioneStraordinario.oreDebito === 1 ? 'ora di lezione' : 'ore di lezione'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-100">
                  <span>Ore a Credito disponibili:</span>
                  <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    +{richiestaCompensazioneStraordinario.oreStraordinarioDisponibili} {richiestaCompensazioneStraordinario.oreStraordinarioDisponibili === 1 ? 'ora a credito' : 'ore a credito'}
                  </span>
                </div>
              </div>

              <p className="text-slate-600 text-xs leading-relaxed">
                Il docente ha maturato delle ore a credito. Come desideri procedere per questo permesso breve?
              </p>

              {/* Opzioni di scelta */}
              <div className="space-y-2.5 pt-1">
                {/* Opzione 1: Compensa */}
                <button
                  type="button"
                  onClick={() => eseguiSalvataggioAssenza(true)}
                  className="w-full text-left p-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/70 transition space-y-1 group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 font-black" />
                      <span>1. Scala dal monte Ore a Credito (Consigliato)</span>
                    </strong>
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      Zero Debiti
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug pl-5">
                    Le ore di permesso vengono stornate dal credito ({richiestaCompensazioneStraordinario.oreStraordinarioDisponibili}h &rarr; {Math.max(0, richiestaCompensazioneStraordinario.oreStraordinarioDisponibili - richiestaCompensazioneStraordinario.oreDebito)}h). <strong>Il docente NON accumula debiti e non dovrà recuperare.</strong>
                  </p>
                </button>

                {/* Opzione 2: Non compensare */}
                <button
                  type="button"
                  onClick={() => eseguiSalvataggioAssenza(false)}
                  className="w-full text-left p-3.5 rounded-2xl border border-slate-300 bg-slate-50 hover:bg-slate-100 transition space-y-1 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span>2. Mantieni Ore a Credito e Assegna Debito</span>
                    </strong>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      Separati
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug pl-1">
                    Tutto il credito maturato rimane intatto (+{richiestaCompensazioneStraordinario.oreStraordinarioDisponibili}h) e il docente riceve regolarmente <strong>+{richiestaCompensazioneStraordinario.oreDebito}h di debito da recuperare</strong> tramite supplenze.
                  </p>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setRichiestaCompensazioneStraordinario(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                Annulla operazione
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

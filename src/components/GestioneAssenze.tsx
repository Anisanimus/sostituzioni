import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MotivoAssenza, GiornoSettimana } from '../types';
import { UserMinus, Bus, Plus, Trash2, Calendar, Clock, MapPin, Users, ChevronDown, Check, X, Search, Ban, LayoutDashboard, ChevronLeft, ChevronRight, Info, Filter } from 'lucide-react';
import { FASCE_ORARIE } from '../utils/fasceOrarie';
import { getDocentiUnici, getDocentiCollegatiIds, getBaseNomeDocente, formatDataItaliana } from '../utils/docentiHelper';

export const GestioneAssenze: React.FC<{ selectedDate: string; selectedGiorno: any; onChangeDate?: (newDate: string) => void }> = ({ selectedDate, selectedGiorno, onChangeDate }) => {
  const { docenti, orariDocenti, assenze, addAssenza, removeAssenza, annullaAssenza, uscite, addUscitaConAccompagnatori, removeUscita, annullaUscita, sostituzioni } = useApp();

  // Finestra aperta: null (chiusa), 'DOCENTE', o 'GITA'
  const [modalitaAperta, setModalitaAperta] = useState<'DOCENTE' | 'GITA' | null>(null);
  const [mostraInfo, setMostraInfo] = useState<boolean>(false);
  const [mostraDettagliEventi, setMostraDettagliEventi] = useState<boolean>(false);
  const [mostraDettagliRisorse, setMostraDettagliRisorse] = useState<boolean>(false);
  const [mostraFiltriRisorseMobile, setMostraFiltriRisorseMobile] = useState<boolean>(false);
  const [mostraPotenziamento, setMostraPotenziamento] = useState<boolean>(true);
  const [mostraLiberatiGita, setMostraLiberatiGita] = useState<boolean>(true);
  const [mostraDisposizioni, setMostraDisposizioni] = useState<boolean>(true);
  const [oreRisorseChiuse, setOreRisorseChiuse] = useState<number[]>([]);

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
  }, [selectedDate]);

  // --- STATO GITA / USCITA ---
  const [dataGita, setDataGita] = useState<string>(selectedDate);
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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownAccompagnatoriOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    const d = new Date(dateStr);
    const day = d.getDay();
    if (day === 1) return 'Lunedì';
    if (day === 2) return 'Martedì';
    if (day === 3) return 'Mercoledì';
    if (day === 4) return 'Giovedì';
    if (day === 5) return 'Venerdì';
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

  // Salvataggio Assenza Docente
  const handleSalvaDocente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocenteId) return;

    const oreInteressate = calcolaOreLezione(tipoDurataDoc, oraInizioDoc, oraFineDoc);
    const dates = isPeriodo ? getDatesInRange(dataDocente, dataDocenteFine) : [dataDocente];

    dates.forEach(dStr => {
      addAssenza({
        data: dStr,
        giorno: getGiornoFromDate(dStr),
        docenteId: selectedDocenteId,
        oreInteressate,
        motivo,
        isOraria: tipoDurataDoc === 'ORARIA',
        note: tipoDurataDoc === 'ORARIA' ? `Fascia ${oraInizioDoc}:00 - ${oraFineDoc}:00` : 'Intera Giornata'
      });
    });

    setSelectedDocenteId('');
    setModalitaAperta(null);
  };

  // Salvataggio Gita con Accompagnatori Atomico
  const handleSalvaGita = (e: React.FormEvent) => {
    e.preventDefault();
    if (classiSelezionate.length === 0) return;

    const oreInteressate = calcolaOreLezione(tipoDurataGita, oraInizioGita, oraFineGita);
    const metaFormatted = titoloMeta.trim() || 'Uscita Didattica / Gita';
    const targetGiorno = getGiornoFromDate(dataGita);

    addUscitaConAccompagnatori({
      data: dataGita,
      giorno: targetGiorno,
      titoloMeta: metaFormatted,
      classi: classiSelezionate,
      oraInizio: tipoDurataGita === 'ORARIA' ? oraInizioGita : 8,
      oraFine: tipoDurataGita === 'ORARIA' ? oraFineGita : 14,
      ore: oreInteressate,
      docentiAccompagnatoriIds: accompagnatoriIds,
      note: tipoDurataGita === 'ORARIA' ? `${oraInizioGita}:00 - ${oraFineGita}:00` : 'Intera Giornata'
    });

    setTitoloMeta('');
    setClassiSelezionate([]);
    setAccompagnatoriIds([]);
    setIsDropdownAccompagnatoriOpen(false);
    setModalitaAperta(null);
  };

  // Lista deduplicata di persone fisiche (singolo nome con materie aggregate)
  const docentiUnici = getDocentiUnici(docenti);

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

  const risorsePerOraMobile = [1, 2, 3, 4, 5, 6, 7, 8].map(oraNum => {
    const personeAssentiOra = new Set<string>();
    tutteAssenzeOggi.filter(a => a.oreInteressate.includes(oraNum)).forEach(a => {
      const d = docenti.find(doc => doc.id === a.docenteId);
      if (d) personeAssentiOra.add(getBaseNomeDocente(d.nome));
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
      } else if (cellaVal === 'P' || cellaVal === 'POT' || cellaVal.startsWith('POTENZ')) {
        potenziamentoList.push({
          nome: getBaseNomeDocente(persona.nome),
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
      
      {/* HEADER PULSANTERIA COMPATTA: RIGA 1 (+ ASSENTE, + GITA), RIGA 2 (REGISTRATI, RISORSE) SU MOBILE */}
      <div className="space-y-2">
        {/* RIGA 1: AZIONI PRINCIPALI */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <button
            id="targetBtnAssente"
            type="button"
            onClick={() => setModalitaAperta(modalitaAperta === 'DOCENTE' ? null : 'DOCENTE')}
            className={`flex-1 sm:flex-none px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs border cursor-pointer ${
              modalitaAperta === 'DOCENTE'
                ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <UserMinus className="w-4 h-4 text-indigo-600" />
            <span className="sm:hidden">+ Assente</span>
            <span className="hidden sm:inline">+ Aggiungi Assente</span>
          </button>

          <button
            id="targetBtnGita"
            type="button"
            onClick={() => setModalitaAperta(modalitaAperta === 'GITA' ? null : 'GITA')}
            className={`flex-1 sm:flex-none px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs border cursor-pointer ${
              modalitaAperta === 'GITA'
                ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-300'
                : 'bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Bus className="w-4 h-4 text-amber-600" />
            <span className="sm:hidden">+ Gita</span>
            <span className="hidden sm:inline">+ Aggiungi Gita</span>
          </button>
        </div>

        {/* RIGA 2 (SOLO MOBILE / COMPATTO): 2 PULSANTI AFFIANCATI "REGISTRATI (N)" E "RISORSE (N)" */}
        <div className="flex items-center gap-2 lg:hidden pt-0.5">
          <button
            type="button"
            onClick={() => setMostraDettagliEventi(prev => !prev)}
            className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer shadow-2xs ${
              mostraDettagliEventi
                ? 'bg-slate-800 text-white border-slate-900'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">📋</span>
              <span>Registrati</span>
            </div>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              mostraDettagliEventi ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {assenzeOggiDeduplicate.length + usciteOggi.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMostraDettagliRisorse(prev => !prev)}
            className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer shadow-2xs ${
              mostraDettagliRisorse
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⚡</span>
              <span>Risorse</span>
            </div>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              mostraDettagliRisorse ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {totRisorseTotaliMobile}
            </span>
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

            {/* DOCENTE DEDUPLICATO A NOME SINGOLO */}
            <div className={isPeriodo ? 'sm:col-span-2 md:col-span-1' : 'md:col-span-2'}>
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Docente Assente</label>
              <select
                value={selectedDocenteId}
                onChange={(e) => setSelectedDocenteId(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white"
              >
                <option value="">-- Scegli Docente --</option>
                {docentiUnici.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nome} ({d.materie.join(', ')})
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
                  if (val === 'Oraria') {
                    setTipoDurataDoc('ORARIA');
                  } else if (val === 'Giornaliera') {
                    setTipoDurataDoc('GIORNALIERA');
                  }
                }}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white"
              >
                <option value="Giornaliera">Giornaliera</option>
                <option value="Oraria">Oraria</option>
                <option value="Assemblea sindacale">Assemblea sindacale</option>
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
                <span>Fascia Oraria (Permesso breve)</span>
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
              className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-lg p-1 transition border border-slate-200"
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSalvaGita} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-black text-amber-900 uppercase mb-1">Data Gita</label>
              <input
                type="date"
                value={dataGita}
                onChange={(e) => setDataGita(e.target.value)}
                className="w-full border border-amber-300 rounded-lg p-2 text-xs font-bold bg-amber-50/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-amber-900 uppercase mb-1">Meta / Progetto</label>
              <input
                type="text"
                placeholder="Es. Museo Egizio, Teatro, Campestre..."
                value={titoloMeta}
                onChange={(e) => setTitoloMeta(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-white"
              />
            </div>
          </div>

          {/* CLASSI PARTECIPANTI COMPATTO */}
          <div className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-black text-slate-700 uppercase">
                Classi Partecipanti ({classiSelezionate.length} selezionate):
              </span>
              
              {/* Scorciatoie Rapide Compatte */}
              <div className="flex items-center gap-1 text-[10px] flex-wrap">
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

          {/* ========================================================= */}
          {/* SELEZIONE DOCENTI ACCOMPAGNATORI (DESKTOP & MOBILE SHEET) */}
          {/* ========================================================= */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-700 uppercase">
              Docenti Accompagnatori ({accompagnatoriIds.length} selezionati)
            </label>

            {/* Selettore a tendina / Pulsante apertura */}
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

              {/* MODALE / BOTTOM SHEET SU MOBILE O TENDINA SU DESKTOP */}
              {isDropdownAccompagnatoriOpen && (
                <>
                  {/* Backdrop per mobile */}
                  <div 
                    className="sm:hidden fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-2xs animate-fadeIn"
                    onClick={() => setIsDropdownAccompagnatoriOpen(false)}
                  />

                  {/* Finestra di selezione (Bottom sheet su mobile, dropdown absolute su desktop) */}
                  <div className="fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto sm:top-full sm:left-0 sm:right-0 z-50 max-h-[85vh] sm:max-h-96 sm:mt-1.5 bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                    
                    {/* Header Modale Mobile / Dropdown Desktop */}
                    <div className="p-3.5 bg-amber-500 text-white flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <UserMinus className="w-4 h-4 text-white" />
                        <span className="font-bold text-xs sm:text-sm">
                          Scegli Accompagnatori ({accompagnatoriIds.length} selezionati)
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setIsDropdownAccompagnatoriOpen(false)} 
                        className="bg-amber-600/60 hover:bg-amber-600 text-white rounded-lg p-1.5 transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span className="sm:hidden">Fatto</span>
                      </button>
                    </div>

                    {/* Barra Ricerca Interna */}
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Filtra per cognome o materia..."
                        value={cercaDocente}
                        onChange={(e) => setCercaDocente(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm outline-none font-semibold text-slate-800 placeholder:text-slate-400"
                        autoFocus
                      />
                      {cercaDocente && (
                        <button type="button" onClick={() => setCercaDocente('')} className="text-slate-400 hover:text-slate-600 p-1 text-xs font-bold">
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Selezioni Rapide se presenti */}
                    {accompagnatoriIds.length > 0 && (
                      <div className="px-3 py-1.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-[11px] shrink-0">
                        <span className="font-bold text-amber-900">
                          {accompagnatoriIds.length} docenti scelti
                        </span>
                        <button
                          type="button"
                          onClick={() => setAccompagnatoriIds([])}
                          className="text-rose-600 font-bold hover:underline"
                        >
                          Deseleziona tutti
                        </button>
                      </div>
                    )}

                    {/* Elenco Docenti con Checkbox Touch-Friendly */}
                    <div className="overflow-y-auto divide-y divide-slate-100 p-1.5 flex-1">
                      {docentiFiltratiPerTendina.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 italic">
                          Nessun docente trovato con "{cercaDocente}".
                        </div>
                      ) : (
                        docentiFiltratiPerTendina.map(d => {
                          const isSelected = accompagnatoriIds.includes(d.id);
                          return (
                            <div
                              key={d.id}
                              onClick={() => toggleAccompagnatore(d.id)}
                              className={`p-3 rounded-xl flex items-center justify-between text-xs sm:text-sm cursor-pointer transition select-none ${
                                isSelected ? 'bg-amber-100/70 text-amber-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                                  isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900">{d.nome}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">{d.materie.join(', ')}</span>
                                </div>
                              </div>
                              {isSelected && (
                                <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                                  Scelto
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer mobile conferma rapida */}
                    <div className="p-3 border-t border-slate-200 bg-slate-50 sm:hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsDropdownAccompagnatoriOpen(false)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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
      {/* 3. LISTA EVENTI REGISTRATI PER LA DATA SELEZIONATA        */}
      {/* ========================================================= */}
      {(assenzeOggiDeduplicate.length > 0 || usciteOggi.length > 0) && (
        <div className="pt-2 border-t border-slate-200 space-y-2">
          {/* HEADER ACCORDION SOLO DESKTOP (SU MOBILE USIAMO I PULSANTI SOPRA) */}
          <button
            type="button"
            onClick={() => setMostraDettagliEventi(prev => !prev)}
            className="hidden lg:flex w-full items-center justify-between text-left p-1 rounded-xl hover:bg-slate-100/60 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                Eventi Registrati ({assenzeOggiDeduplicate.length + usciteOggi.length})
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600">
              <span className="text-[10px] text-slate-400 font-normal">
                {mostraDettagliEventi ? 'Nascondi dettagli' : 'Tocca per dettagli'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${mostraDettagliEventi ? 'rotate-180 text-slate-600' : ''}`} />
            </div>
          </button>

          {/* CONTENUTO ESPANDIBILE EVENTI REGISTRATI */}
          {mostraDettagliEventi && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1 duration-150 pt-1">
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
                      onClick={() => annullaAssenza(a.id)}
                      className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition"
                      title="Annulla assenza"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONTENUTO ESPANDIBILE RISORSE DISPONIBILI OGGI SU MOBILE               */}
      {/* ========================================================================= */}
      {totRisorseTotaliMobile > 0 && mostraDettagliRisorse && (
        <div className="block lg:hidden pt-2 border-t border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* HEADER RISORSE MOBILE CON ICONA FILTRI CLASSICA */}
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
            <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
              <span>⚡ Risorse Docenti del Giorno</span>
              <span className="text-[10px] text-slate-500 font-normal">({totRisorseTotaliMobile} disponibili)</span>
            </span>

            {/* PULSANTE CON CLASSICA ICONA FILTRI */}
            <button
              type="button"
              onClick={() => setMostraFiltriRisorseMobile(prev => !prev)}
              className={`p-1.5 rounded-lg border transition flex items-center gap-1 text-[10px] font-bold cursor-pointer ${
                mostraFiltriRisorseMobile || (!mostraPotenziamento || !mostraLiberatiGita || !mostraDisposizioni)
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-black shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Filtri tipologie risorse"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtri</span>
              {(!mostraPotenziamento || !mostraLiberatiGita || !mostraDisposizioni) && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </button>
          </div>

          {/* FILTRI COLLASSABILI (ESCONO SOLO SE SI CLICCA L'ICONA FILTRI) */}
          {mostraFiltriRisorseMobile && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold animate-in fade-in duration-150">
              <button
                type="button"
                disabled={totPotenziamentoOggi === 0}
                onClick={() => setMostraPotenziamento(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                  totPotenziamentoOggi === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : mostraPotenziamento
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                      : 'bg-white text-slate-400 line-through border-slate-200'
                }`}
              >
                ⚡ Potenziamento ({totPotenziamentoOggi})
              </button>

              <button
                type="button"
                disabled={totGiteOggi === 0}
                onClick={() => setMostraLiberatiGita(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                  totGiteOggi === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : mostraLiberatiGita
                      ? 'bg-amber-100 text-amber-950 border-amber-300 font-black'
                      : 'bg-white text-slate-400 line-through border-slate-200'
                }`}
              >
                🚌 Gita ({totGiteOggi})
              </button>

              <button
                type="button"
                disabled={totDisposizioniOggi === 0}
                onClick={() => setMostraDisposizioni(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                  totDisposizioniOggi === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : mostraDisposizioni
                      ? 'bg-purple-100 text-purple-950 border-purple-300 font-black'
                      : 'bg-white text-slate-400 line-through border-slate-200'
                }`}
              >
                ⏱️ Disp. ({totDisposizioniOggi})
              </button>
            </div>
          )}

          {/* LISTA RISORSE PER ORA */}
          <div className="space-y-1.5">
            {risorsePerOraMobile.map(r => {
              const potVisibili = mostraPotenziamento ? r.potenziamentoList : [];
              const giteVisibili = mostraLiberatiGita ? r.liberatiGitaList : [];
              const dispVisibili = mostraDisposizioni ? r.disposizioniList : [];
              const totFiltrati = potVisibili.length + giteVisibili.length + dispVisibili.length;
              if (totFiltrati === 0) return null;

              const isOraRisorsaChiusa = oreRisorseChiuse.includes(r.ora);

              return (
                <div key={r.ora} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setOreRisorseChiuse(prev => 
                        prev.includes(r.ora) ? prev.filter(o => o !== r.ora) : [...prev, r.ora]
                      );
                    }}
                    className="w-full p-2 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800 text-xs">{r.ora}ª Ora</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded-full border border-slate-200">
                        {totFiltrati} {totFiltrati === 1 ? 'docente' : 'docenti'}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOraRisorsaChiusa ? '' : 'rotate-180 text-indigo-600'}`} />
                  </button>

                  {!isOraRisorsaChiusa && (
                    <div className="p-2 pt-0 border-t border-slate-100 flex flex-wrap gap-1.5 animate-in fade-in duration-150 mt-1">
                      {potVisibili.map(p => (
                        <span 
                          key={p.docenteId} 
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                            p.usata 
                              ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-75' 
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                          }`}
                          title={p.usata ? `${p.nome} è già assegnato in quest'ora` : `${p.nome} è disponibile`}
                        >
                          ⚡ {p.nome} {p.usata ? '(Occupato)' : ''}
                        </span>
                      ))}
                      {giteVisibili.map(g => (
                        <span 
                          key={g.docenteId} 
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                            g.usata 
                              ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-75' 
                              : 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs'
                          }`}
                          title={g.usata ? `${g.nome} è già assegnato in quest'ora` : `${g.nome} è disponibile (Liberato da ${g.classe})`}
                        >
                          🚌 {g.nome} ({g.classe}) {g.usata ? '(Occupato)' : ''}
                        </span>
                      ))}
                      {dispVisibili.map(d => (
                        <span 
                          key={d.docenteId} 
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                            d.usata 
                              ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-75' 
                              : 'bg-purple-50 text-purple-800 border-purple-200 shadow-2xs'
                          }`}
                          title={d.usata ? `${d.nome} è già assegnato in quest'ora` : `${d.nome} è a disposizione`}
                        >
                          ⏱️ {d.nome} {d.usata ? '(Occupato)' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

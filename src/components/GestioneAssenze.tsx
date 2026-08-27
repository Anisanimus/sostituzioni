import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MotivoAssenza, GiornoSettimana } from '../types';
import { UserMinus, Bus, Plus, Trash2, Calendar, Clock, MapPin, Users, ChevronDown, Check, X, Search, Ban, LayoutDashboard, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { FASCE_ORARIE } from '../utils/fasceOrarie';
import { getDocentiUnici, getDocentiCollegatiIds, getBaseNomeDocente, formatDataItaliana } from '../utils/docentiHelper';

export const GestioneAssenze: React.FC<{ selectedDate: string; selectedGiorno: any; onChangeDate?: (newDate: string) => void }> = ({ selectedDate, selectedGiorno, onChangeDate }) => {
  const { docenti, assenze, addAssenza, removeAssenza, annullaAssenza, uscite, addUscitaConAccompagnatori, removeUscita, annullaUscita } = useApp();

  // Finestra aperta: null (chiusa), 'DOCENTE', o 'GITA'
  const [modalitaAperta, setModalitaAperta] = useState<'DOCENTE' | 'GITA' | null>(null);
  const [mostraInfo, setMostraInfo] = useState<boolean>(false);
  const [mostraDettagliEventi, setMostraDettagliEventi] = useState<boolean>(false);

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

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-2xs border border-slate-200 space-y-3">
      
      {/* HEADER DELLA SCHEDA CON TITOLO, SOTTOTITOLO, DATA SUBITO DOPO E PULSANTI AZIONE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* GRUPPO SINISTRA: TITOLO + INFO + CASELLINA DATA & FRECCE */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg font-black border border-indigo-100 shrink-0">
              <LayoutDashboard className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 leading-none">Sostituzioni del Giorno</h2>
                <button
                  type="button"
                  onClick={() => setMostraInfo(prev => !prev)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition border ${
                    mostraInfo 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border-slate-300'
                  }`}
                  title={mostraInfo ? "Nascondi informazioni" : "Mostra informazioni"}
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
              {mostraInfo && (
                <p className="text-xs text-slate-500 mt-1 animate-in fade-in">
                  Gestisci assenze, gite e risorse disponibili per la giornata
                </p>
              )}
            </div>
          </div>

          {/* SELETTORE DATA RAPIDO CON FRECCE (FULL WIDTH SU MOBILE, AFFIANCATO SU DESKTOP) */}
          <div id="targetDataNavigator" className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 bg-slate-50 p-1.5 sm:p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                const cur = new Date(selectedDate);
                cur.setDate(cur.getDate() - 1);
                if (cur.getDay() === 0) cur.setDate(cur.getDate() - 2); // Salta domenica
                if (cur.getDay() === 6) cur.setDate(cur.getDate() - 1); // Salta sabato
                onChangeDate?.(cur.toISOString().split('T')[0]);
              }}
              className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-slate-200/80 rounded-lg text-slate-700 transition"
              title="Giorno Precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <label className="flex items-center gap-2 px-1 sm:px-1.5 cursor-pointer relative">
              <span className="font-black text-xs text-slate-900 tracking-tight">
                {formatDataItaliana(selectedDate)}
              </span>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                {selectedGiorno}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onChangeDate?.(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Seleziona data dal calendario"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                const cur = new Date(selectedDate);
                cur.setDate(cur.getDate() + 1);
                if (cur.getDay() === 6) cur.setDate(cur.getDate() + 2); // Salta sabato
                if (cur.getDay() === 0) cur.setDate(cur.getDate() + 1); // Salta domenica
                onChangeDate?.(cur.toISOString().split('T')[0]);
              }}
              className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-slate-200/80 rounded-lg text-slate-700 transition"
              title="Giorno Successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onChangeDate?.(new Date().toISOString().split('T')[0])}
              className="bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs px-2.5 py-1 sm:py-0.5 rounded-lg transition border border-slate-200 shadow-2xs ml-0.5"
            >
              Oggi
            </button>
          </div>
        </div>

        {/* RESTANTE SPAZIO: PULSANTI AZIONE (GRID 2 COLONNE FULL WIDTH SU MOBILE, CENTRATI SU DESKTOP) */}
        <div className="w-full lg:flex-1 grid grid-cols-2 sm:flex sm:w-auto items-center justify-center lg:justify-center gap-2.5">
          <button
            id="targetBtnAssente"
            type="button"
            onClick={() => setModalitaAperta(modalitaAperta === 'DOCENTE' ? null : 'DOCENTE')}
            className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs border ${
              modalitaAperta === 'DOCENTE'
                ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-900'
            }`}
          >
            <UserMinus className="w-4 h-4 text-indigo-600" />
            <span>+ Aggiungi Assente</span>
          </button>

          <button
            id="targetBtnGita"
            type="button"
            onClick={() => setModalitaAperta(modalitaAperta === 'GITA' ? null : 'GITA')}
            className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs border ${
              modalitaAperta === 'GITA'
                ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-300'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 hover:text-amber-950'
            }`}
          >
            <Bus className="w-4 h-4 text-amber-600" />
            <span>+ Aggiungi Gita</span>
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
                  Tutte le Prime
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
                  Tutte le Seconde
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
                  Tutte le Terze
                </button>
                <button 
                  type="button" 
                  onClick={() => setClassiSelezionate([...tutteClassi])} 
                  className="px-2 py-0.5 bg-white border border-slate-300 rounded-md font-bold text-indigo-700 hover:bg-indigo-50"
                >
                  Tutto l'Istituto
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
          {/* MENU A TENDINA MULTI-SELEZIONE PER DOCENTI ACCOMPAGNATORI */}
          {/* ========================================================= */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-700 uppercase">
              Docenti Accompagnatori ({accompagnatoriIds.length} selezionati)
            </label>

            {/* Selettore a tendina */}
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsDropdownAccompagnatoriOpen(!isDropdownAccompagnatoriOpen)}
                className="w-full min-h-[42px] border border-slate-300 rounded-xl p-2 bg-white flex flex-wrap items-center justify-between gap-1.5 cursor-pointer hover:border-amber-400 transition"
              >
                <div className="flex flex-wrap items-center gap-1">
                  {accompagnatoriIds.length === 0 ? (
                    <span className="text-xs text-slate-400">Clicca per aprire la tendina e scegliere i docenti...</span>
                  ) : (
                    accompagnatoriIds.map(docId => (
                      <span
                        key={docId}
                        className="bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
                      >
                        <span>{getDocenteNome(docId)}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAccompagnatore(docId);
                          }}
                          className="text-amber-700 hover:text-red-600 p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownAccompagnatoriOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Contenuto Tendina Dropdown con Ricerca */}
              {isDropdownAccompagnatoriOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                  {/* Barra Ricerca Interna */}
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cerca docente per nome o materia..."
                      value={cercaDocente}
                      onChange={(e) => setCercaDocente(e.target.value)}
                      className="w-full bg-transparent text-xs outline-none font-medium text-slate-800"
                      autoFocus
                    />
                    {cercaDocente && (
                      <button type="button" onClick={() => setCercaDocente('')} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Elenco Docenti con Checkbox Multipla */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
                    {docentiFiltratiPerTendina.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-400 italic">Nessun docente trovato.</p>
                    ) : (
                      docentiFiltratiPerTendina.map(d => {
                        const isSelected = accompagnatoriIds.includes(d.id);
                        return (
                          <div
                            key={d.id}
                            onClick={() => toggleAccompagnatore(d.id)}
                            className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${
                              isSelected ? 'bg-amber-50 text-amber-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span>{d.nome}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{d.materie.join(', ')}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
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
        <div className="pt-2.5 border-t border-slate-100 space-y-2">
          {/* BARRA COLLAPSIBILE / ACCORDION CON "TOCCA PER DETTAGLI" E TRIANGOLINO */}
          <button
            type="button"
            onClick={() => setMostraDettagliEventi(prev => !prev)}
            className="w-full flex items-center justify-between text-left p-1 rounded-xl hover:bg-slate-50 transition cursor-pointer"
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

          {/* CONTENUTO ESPANDIBILE */}
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

    </div>
  );
};

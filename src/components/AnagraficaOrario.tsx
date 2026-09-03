import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Docente, OrarioDocente, GiornoSettimana, CellaOrario, TipoOra, CategoriaSostituto } from '../types';
import { GIORNI } from '../data/initialData';
import { parseOrarioExcel, ParseResult } from '../utils/excelParser';
import { getDocentiUnici, getBaseNomeDocente } from '../utils/docentiHelper';
import * as XLSX from 'xlsx';
import { 
  Users, Edit, Save, Lock, Unlock, Search, CheckCircle, 
  AlertTriangle, RotateCcw, ShieldCheck, Sparkles, Plus, Clock, Filter,
  Upload, Download, FileSpreadsheet, ChevronDown, ChevronUp, UserCheck, User,
  Sliders, ArrowUp, ArrowDown, Info, Bus, UserMinus, Trash2
} from 'lucide-react';

const RichiestaCardItem: React.FC<{
  req: any;
  docentiUnici: ReturnType<typeof getDocentiUnici>;
  onApprova: (id: string, docenteId: string) => void;
  onRifiuta: (id: string) => void;
}> = ({ req, docentiUnici, onApprova, onRifiuta }) => {
  const [docenteSceltoId, setDocenteSceltoId] = useState<string>(req.docenteSuggeritoId || '');

  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
      <div className="space-y-1.5 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-black text-slate-900 text-sm">{req.displayName || 'Docente'}</span>
          <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
            {req.email}
          </span>
          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md">
            In Attesa di Assegnazione Cattedra
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-700">Assegna alla Cattedra / Docente:</span>
          <select
            value={docenteSceltoId}
            onChange={(e) => setDocenteSceltoId(e.target.value)}
            className="border-2 border-indigo-300 rounded-xl px-2.5 py-1 text-xs font-black bg-indigo-50/50 text-indigo-950 outline-none focus:border-indigo-600 focus:bg-white transition max-w-[320px]"
          >
            <option value="">-- Seleziona Docente / Cattedra --</option>
            {docentiUnici.map(d => (
              <option key={d.id} value={d.id}>
                {d.nome} {d.materie?.length ? `(${d.materie.join(', ')})` : ''}
              </option>
            ))}
          </select>
          {req.docenteSuggeritoNome && (
            <span className="text-[11px] text-slate-500 italic">
              (Suggerito: <strong>{req.docenteSuggeritoNome}</strong>)
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
        <button
          type="button"
          disabled={!docenteSceltoId}
          onClick={() => onApprova(req.id, docenteSceltoId)}
          className={`px-4 py-2 text-white text-xs font-black rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5 ${
            docenteSceltoId 
              ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md active:scale-95' 
              : 'bg-slate-300 cursor-not-allowed text-slate-500'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Assegna Cattedra & Abilita Accesso</span>
        </button>

        <button
          type="button"
          onClick={() => onRifiuta(req.id)}
          className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
        >
          Rifiuta
        </button>
      </div>
    </div>
  );
};

export const AnagraficaOrario: React.FC = () => {
  const { 
    docenti, setDocenti, orariDocenti, setOrariDocenti, 
    updateDocente, updateOrarioDocente, resetOrarioPredefinito, azzeraDocentiEOrario, importaNuovoOrarioCompleto,
    aggiornaOrarioSenzaCancellareStorico, richiesteAccessoDocenti, associaEmailDocente, approvaRichiestaAccesso, rifiutaRichiestaAccesso
  } = useApp();

  const docentiUnici = React.useMemo(() => getDocentiUnici(docenti), [docenti]);
  
  // Nessun docente selezionato di default (inizia vuoto)
  const [selectedDocenteId, setSelectedDocenteId] = useState<string>('');
  const [notificaSalvataggio, setNotificaSalvataggio] = useState<string | null>(null);

  // STATI PER IGNORARE / RIDURRE A BADGE I BOX DI AVVISO (default: minimizzati nei badge dell'header se l'utente vuole o espandibili al click)
  const [mostraBoxSovrapposizioni, setMostraBoxSovrapposizioni] = useState<boolean>(false);
  const [mostraBoxPotSenzaClasse, setMostraBoxPotSenzaClasse] = useState<boolean>(false);

  // Calcolo Sovrapposizioni Orarie
  const anomalieAttuali = React.useMemo(() => {
    interface ProfiloConflitto {
      docenteId: string;
      materia: string;
      valore: string;
    }
    const list: { docenteNome: string; giorno: GiornoSettimana; ora: number; profiliConflitto: ProfiloConflitto[] }[] = [];
    docentiUnici.forEach(du => {
      if (du.allIds.length <= 1) return;
      const profili = docenti.filter(d => du.allIds.includes(d.id));
      GIORNI.forEach(giorno => {
        for (let ora = 1; ora <= 9; ora++) {
          const occupati = profili.filter(p => {
            const o = orariDocenti.find(ord => ord.docenteId === p.id);
            const c = o?.ore.find(cell => cell.giorno === giorno && cell.ora === ora);
            return c && c.valore && c.valore.trim() !== '';
          });

          if (occupati.length > 1) {
            const profiliConflitto: ProfiloConflitto[] = occupati.map(p => {
              const o = orariDocenti.find(ord => ord.docenteId === p.id);
              const c = o?.ore.find(cell => cell.giorno === giorno && cell.ora === ora)!;
              return {
                docenteId: p.id,
                materia: p.materia,
                valore: c.valore
              };
            });

            list.push({
              docenteNome: du.nome,
              giorno,
              ora,
              profiliConflitto
            });
          }
        }
      });
    });
    return list;
  }, [docentiUnici, docenti, orariDocenti]);

  // Calcolo Potenziamenti 'P' senza classe
  const potenziamentiSenzaClasse = React.useMemo(() => {
    interface PotenziamentoPuro {
      docenteId: string;
      docenteNome: string;
      materia: string;
      giorno: GiornoSettimana;
      ora: number;
    }
    const list: PotenziamentoPuro[] = [];
    docenti.forEach(d => {
      const o = orariDocenti.find(ord => ord.docenteId === d.id);
      if (!o) return;

      o.ore.forEach(cell => {
        const v = (cell.valore || '').trim().toUpperCase();
        if (v === 'P' || v === 'POT' || v === 'POTENZIAMENTO') {
          list.push({
            docenteId: d.id,
            docenteNome: d.nome,
            materia: d.materia,
            giorno: cell.giorno,
            ora: cell.ora
          });
        }
      });
    });
    return list;
  }, [docenti, orariDocenti]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docenteSelezionato = docenti.find(d => d.id === selectedDocenteId);
  const orarioSelezionato = orariDocenti.find(o => o.docenteId === selectedDocenteId);

  // Stato orario in corso di modifica per il docente selezionato
  const [oreModificate, setOreModificate] = useState<CellaOrario[]>([]);

  useEffect(() => {
    if (orarioSelezionato) {
      setOreModificate(JSON.parse(JSON.stringify(orarioSelezionato.ore)));
    } else {
      const defaultOre: CellaOrario[] = [];
      GIORNI.forEach(giorno => {
        for (let ora = 1; ora <= 9; ora++) {
          defaultOre.push({ giorno, ora, valore: '', tipo: 'LIBERO' });
        }
      });
      setOreModificate(defaultOre);
    }
  }, [selectedDocenteId, orariDocenti]);

  const handleCellValoreChange = (giorno: GiornoSettimana, ora: number, valRaw: string) => {
    const rawUpper = valRaw.toUpperCase().trim();
    const hasAsterisk = rawUpper.includes('*');
    const val = rawUpper.replace(/\*/g, '').trim();

    let tipo: TipoOra = 'LIBERO';
    if (val === 'D') tipo = 'D';
    else if (val === 'P') tipo = 'P';
    else if (val !== '') tipo = 'LEZIONE';

    setOreModificate(prev => prev.map(c => {
      if (c.giorno === giorno && c.ora === ora) {
        return {
          ...c,
          valore: val,
          tipo,
          isCasoGrave: hasAsterisk ? true : (val === '' ? false : c.isCasoGrave)
        };
      }
      return c;
    }));
  };

  const toggleCasoGraveCella = (giorno: GiornoSettimana, ora: number) => {
    setOreModificate(prev => prev.map(c => {
      if (c.giorno === giorno && c.ora === ora) {
        return {
          ...c,
          isCasoGrave: !c.isCasoGrave
        };
      }
      return c;
    }));
  };

  const handleToggleTuttoGraveDocente = () => {
    if (!docenteSelezionato) return;
    const nuovoStato = !docenteSelezionato.isCasoGraveSostegno;
    updateDocente({
      ...docenteSelezionato,
      isCasoGraveSostegno: nuovoStato,
      casoGraveSostegno: nuovoStato
    });
  };

  // SALVATAGGIO: Salva le modifiche, resetta la selezione (torna vuoto) e mostra feedback
  const handleSalvaOrario = () => {
    if (!docenteSelezionato) return;
    const nomeDocenteSalvato = docenteSelezionato.nome;
    updateOrarioDocente(docenteSelezionato.id, oreModificate);
    
    // Torna vuoto come richiesto
    setSelectedDocenteId('');
    setOreModificate([]);
    
    // Feedback di buon fine evidente
    setNotificaSalvataggio(`✅ Modifiche salvate con successo per ${nomeDocenteSalvato}!`);
    setTimeout(() => setNotificaSalvataggio(null), 4000);
  };

  // UPLOAD FILE EXCEL (CON SCELTA AGGIORNAMENTO / SOVRASCRITTURA CONSERVA-STORICO E REPORT ERRORI)
  const [fileExcelInAttesa, setFileExcelInAttesa] = useState<ParseResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const result = parseOrarioExcel(buffer);
        if (result.docenti.length > 0 && result.orariDocenti.length > 0) {
          // Apre il popup di scelta se aggiornare mantenendo lo storico o reimpostare a zero
          setFileExcelInAttesa(result);
        } else {
          alert('Il file Excel non contiene una struttura orario valida.');
        }
      } catch (err) {
        console.error(err);
        alert('Errore durante la lettura del file Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confermaAggiornamentoOrario = (mantieniStorico: boolean) => {
    if (!fileExcelInAttesa) return;

    const { docenti: nuoviDocenti, orariDocenti: nuoviOrari } = fileExcelInAttesa;

    if (mantieniStorico) {
      aggiornaOrarioSenzaCancellareStorico(nuoviDocenti, nuoviOrari);
      setNotificaSalvataggio(`✅ Orario AGGIORNATO con successo! Mantenuto integro lo storico delle assenze, uscite e debiti pregressi.`);
    } else {
      importaNuovoOrarioCompleto(nuoviDocenti, nuoviOrari);
      setNotificaSalvataggio(`✅ Nuovo orario importato! Storico azzerato per il nuovo anno.`);
    }

    setSelectedDocenteId('');
    setOreModificate([]);
    setFileExcelInAttesa(null);
    setTimeout(() => setNotificaSalvataggio(null), 6000);
  };

  // DOWNLOAD FILE EXCEL
  const handleExportExcel = () => {
    try {
      const headerRow1 = ['docenti', 'materia'];
      const headerRow2 = ['', ''];

      GIORNI.forEach(g => {
        headerRow1.push(g.toLowerCase());
        for (let i = 1; i < 9; i++) headerRow1.push('');
        for (let h = 1; h <= 9; h++) headerRow2.push(String(h));
      });

      // Aggiungi Colonna EMAIL finale
      headerRow1.push('email');
      headerRow2.push('email istituzionale google');

      const rows: any[][] = [headerRow1, headerRow2];

      docenti.forEach(doc => {
        const orarioDoc = orariDocenti.find(o => o.docenteId === doc.id);
        const rowData: string[] = [doc.nome, doc.materia];

        GIORNI.forEach(giorno => {
          for (let ora = 1; ora <= 9; ora++) {
            const cell = orarioDoc?.ore.find(c => c.giorno === giorno && c.ora === ora);
            let v = cell?.valore || '';
            if (cell?.isCasoGrave && v && v !== 'D' && v !== 'P') {
              v = `${v}*`;
            }
            rowData.push(v);
          }
        });

        // Colonna Email associata
        rowData.push(doc.email || '');

        rows.push(rowData);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orario_Docenti');
      XLSX.writeFile(wb, `Orario_Docenti_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'esportazione del file Excel.');
    }
  };

  // MODELLO EXCEL VUOTO
  const handleExportModelloVuoto = () => {
    try {
      const headerRow1 = ['docenti', 'materia'];
      const headerRow2 = ['', ''];

      GIORNI.forEach(g => {
        headerRow1.push(g.toLowerCase());
        for (let i = 1; i < 9; i++) headerRow1.push('');
        for (let h = 1; h <= 9; h++) headerRow2.push(String(h));
      });

      headerRow1.push('email');
      headerRow2.push('email istituzionale google');

      // Alcune righe di esempio per guidare la compilazione
      const rows: any[][] = [
        headerRow1, 
        headerRow2,
        ['ROSSI MARIO', 'ITALIANO', '1A', '1A', '2B', 'D', '3C', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'mario.rossi@scuola.edu.it'],
        ['BIANCHI ANNA', 'SOSTEGNO', '1A*', '1A*', '2B', '2B', '3C*', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'anna.bianchi@scuola.edu.it'],
        ['VERDI LUCA', 'POTENZIAMENTO', '1B', '2A', 'P', '3C', 'D', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'luca.verdi@scuola.edu.it']
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Modello_Orario_Docenti');
      XLSX.writeFile(wb, `Modello_Import_Orario_Docenti.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Errore durante il download del modello Excel.');
    }
  };

  // STATO PER MOSTRARE LA GUIDA / ISTRUZIONI EXCEL (icona info)
  const [mostraGuidaExcel, setMostraGuidaExcel] = useState<boolean>(false);

  const getCella = (giorno: GiornoSettimana, ora: number): CellaOrario => {
    return oreModificate.find(c => c.giorno === giorno && c.ora === ora) || {
      giorno,
      ora,
      valore: '',
      tipo: 'LIBERO'
    };
  };

  // Docenti ordinati alfabeticamente per la select
  const docentiOrdinati = [...docenti]
    .filter(d => !d.isEducatore)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // STATO VISTA MACRO-TO-MICRO ('TUTTI', 'CONFLITTI', 'POTENZIAMENTO', 'EMAIL', null)
  const [macroFiltroAttivo, setMacroFiltroAttivo] = useState<'TUTTI' | 'CONFLITTI' | 'POTENZIAMENTO' | 'EMAIL' | null>('TUTTI');
  const [macroAccordionEspanso, setMacroAccordionEspanso] = useState<boolean>(true);
  const [ricercaDocente, setRicercaDocente] = useState<string>('');
  const [filtroMateria, setFiltroMateria] = useState<string>('TUTTE');

  // Materie uniche per chip di filtro
  const tutteMaterie = React.useMemo(() => {
    const setM = new Set<string>();
    docenti.forEach(d => {
      if (d.materia) setM.add(d.materia);
    });
    return Array.from(setM).sort();
  }, [docenti]);

  // Lista docenti filtrata in base al Macro Card cliccato e alla ricerca
  const docentiFiltrati = React.useMemo(() => {
    return docenti.filter(d => {
      // Filtro ricerca testuale
      if (ricercaDocente.trim() !== '') {
        const query = ricercaDocente.toLowerCase().trim();
        const matchNome = d.nome.toLowerCase().includes(query);
        const matchMateria = d.materia.toLowerCase().includes(query);
        const matchEmail = (d.email || '').toLowerCase().includes(query);
        if (!matchNome && !matchMateria && !matchEmail) return false;
      }

      // Filtro materia specifica
      if (filtroMateria !== 'TUTTE' && d.materia !== filtroMateria) {
        return false;
      }

      // Filtro da Macro Card
      if (macroFiltroAttivo === 'CONFLITTI') {
        return anomalieAttuali.some(a => a.profiliConflitto.some(p => p.docenteId === d.id));
      }

      if (macroFiltroAttivo === 'POTENZIAMENTO') {
        return potenziamentiSenzaClasse.some(p => p.docenteId === d.id) || d.isPotenziamento || d.materia === 'POTENZIAMENTO';
      }

      if (macroFiltroAttivo === 'EMAIL') {
        return !d.email; // Mostra chi non ha ancora l'email o tutti per completarle
      }

      return true;
    });
  }, [docenti, ricercaDocente, filtroMateria, macroFiltroAttivo, anomalieAttuali, potenziamentiSenzaClasse]);

  return (
    <div className="space-y-4">
      {/* NOTIFICA SALVATAGGIO E BUON FINE */}
      {notificaSalvataggio && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-md text-xs sm:text-sm font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{notificaSalvataggio}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotificaSalvataggio(null)}
            className="text-emerald-200 hover:text-white text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* MODALE DI SCELTA IMPORTAZIONE EXCEL: AGGIORNAMENTO VS NUOVO ANNO */}
      {fileExcelInAttesa && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl max-w-lg w-full border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">Controllo e Importazione Orario Excel</h3>
                <p className="text-xs text-slate-500">
                  Rilevati <strong>{fileExcelInAttesa.docenti.length} docenti / cattedre</strong> nel file Excel caricato.
                </p>
              </div>
            </div>

            {/* SEGNALAZIONI ERRORI / SOVRAPPOSIZIONI O NOTAZIONI POTENZIAMENTO */}
            {fileExcelInAttesa.problemi && fileExcelInAttesa.problemi.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                {fileExcelInAttesa.problemi.filter(p => p.tipo === 'SOVRAPPOSIZIONE_ORARIA').length > 0 && (
                  <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3 space-y-1.5 text-xs text-rose-950">
                    <div className="flex items-center gap-2 font-black text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Sovrapposizioni Orarie Rilevate ({fileExcelInAttesa.problemi.filter(p => p.tipo === 'SOVRAPPOSIZIONE_ORARIA').length})</span>
                    </div>
                    <div className="space-y-1 text-[11px] pl-6">
                      {fileExcelInAttesa.problemi.filter(p => p.tipo === 'SOVRAPPOSIZIONE_ORARIA').map((prob, idx) => (
                        <div key={idx} className="leading-tight">
                          • {prob.messaggio}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fileExcelInAttesa.problemi.filter(p => p.tipo === 'POTENZIAMENTO_SENZA_CLASSE').length > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 space-y-1.5 text-xs text-amber-950">
                    <div className="flex items-center gap-2 font-black text-amber-900">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Notazione Potenziamento 'P' ({fileExcelInAttesa.problemi.filter(p => p.tipo === 'POTENZIAMENTO_SENZA_CLASSE').length} ore)</span>
                    </div>
                    <p className="text-[11px] pl-6 leading-relaxed">
                      È presente solo <strong>'P'</strong> in alcune celle. Se lo desideri, in Excel puoi indicare la classe dove si trova in compresenza (es. <code>2B POT</code>) per sapere dove si trova ed utilizzarlo al meglio.
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Come desideri procedere con i dati attuali della scuola?
            </p>

            <div className="space-y-3">
              {/* OPZIONE 1: AGGIORNA E MANTIENI STORICO */}
              <button
                type="button"
                onClick={() => confermaAggiornamentoOrario(true)}
                className="w-full p-3.5 rounded-2xl border-2 border-indigo-600 bg-indigo-50/60 hover:bg-indigo-100/80 text-left transition flex items-start gap-3.5 cursor-pointer shadow-2xs group"
              >
                <div className="p-2 bg-indigo-600 text-white rounded-xl group-hover:scale-105 transition-transform shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm font-black text-indigo-950">
                    🔄 Aggiorna Orario (Conserva Storico Assenze & Debiti)
                  </span>
                  <span className="text-[11px] text-indigo-800 leading-normal block mt-0.5">
                    <strong>Raccomandato durante l'anno scolastico:</strong> aggiorna le classi e i docenti, ma <u>mantiene intatte</u> le assenze già registrate, le uscite e i debiti orari pregressi.
                  </span>
                </div>
              </button>

              {/* OPZIONE 2: NUOVO ANNO / AZZERA TUTTO */}
              <button
                type="button"
                onClick={() => confermaAggiornamentoOrario(false)}
                className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 text-left transition flex items-start gap-3.5 cursor-pointer group"
              >
                <div className="p-2 bg-slate-300 group-hover:bg-rose-600 group-hover:text-white text-slate-700 rounded-xl transition-colors shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-slate-900 group-hover:text-rose-950">
                    ⚠️ Nuovo Anno Scolastico (Azzera Storico e Ricomincia da Zero)
                  </span>
                  <span className="text-[11px] text-slate-500 group-hover:text-rose-800 leading-normal block mt-0.5">
                    Cancella tutte le vecchie assenze e sostituzioni dell'anno precedente, impostando solo il nuovo orario.
                  </span>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setFileExcelInAttesa(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL POPUP GUIDA & ISTRUZIONI COMPILAZIONE EXCEL         */}
      {/* ========================================================= */}
      {mostraGuidaExcel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Come Compilare l'Orario Excel</h3>
                  <p className="text-xs text-slate-500">Regole e notazioni supportate per l'importazione</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostraGuidaExcel(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                <strong className="text-slate-900 block text-xs font-black">📌 Notazioni nelle celle:</strong>
                <ul className="space-y-1 pl-4 list-disc text-[11px] text-slate-600">
                  <li><strong>Classi di Lezione:</strong> scrivi semplicemente la sezione (es. <code>1A</code>, <code>2B</code>, <code>3C</code>).</li>
                  <li><strong>Disposizione (D):</strong> scrivi <code>D</code> per le ore a disposizione.</li>
                  <li><strong>Potenziamento (P):</strong> scrivi <code>P</code> oppure la classe con cui fa compresenza (es. <code>3F P</code> o semplicemente la classe <code>3F</code> nella riga dedicata al Potenziamento).</li>
                  <li><strong>Sostegno con Caso Grave:</strong> aggiungi un asterisco dopo la classe (es. <code>1A*</code>) per bloccare la sostituzione in quell'ora.</li>
                  <li><strong>Email Docenti:</strong> puoi inserire l'email Google nella colonna finale del file Excel per l'accesso automatico.</li>
                </ul>
              </div>

              <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-black text-indigo-950 block text-xs">📥 Hai bisogno del file modello?</span>
                  <span className="text-[11px] text-indigo-800">Scarica un file Excel pre-impostato e pronto da compilare.</span>
                </div>
                <button
                  type="button"
                  onClick={handleExportModelloVuoto}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-2xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Scarica Modello Excel</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setMostraGuidaExcel(false)}
                className="px-4 py-2 rounded-xl text-xs font-black text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
              >
                Ho capito, Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RICHIESTE DI ACCESSO DOCENTI IN SOSPESO (COMPILAZIONE & ASSEGNAZIONE) */}
      {/* ========================================================= */}
      {richiesteAccessoDocenti.filter(r => r.stato === 'IN_ATTESA').length > 0 && (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                  <span>Richieste di Accesso Docenti in Sospeso</span>
                  <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {richiesteAccessoDocenti.filter(r => r.stato === 'IN_ATTESA').length} da gestire
                  </span>
                </h3>
                <p className="text-xs text-amber-800">
                  I docenti hanno effettuato il login con Google: seleziona la cattedra corrispondente per collegare l'account e dare l'accesso.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {richiesteAccessoDocenti
              .filter(r => r.stato === 'IN_ATTESA')
              .map(req => (
                <RichiestaCardItem
                  key={req.id}
                  req={req}
                  docentiUnici={docentiUnici}
                  onApprova={(reqId, docId) => {
                    const docTrovato = docentiUnici.find(d => d.id === docId);
                    approvaRichiestaAccesso(reqId, docId);
                    setNotificaSalvataggio(`✅ Cattedra ${docTrovato?.nome || ''} assegnata con successo a ${req.email}! Accesso abilitato.`);
                    setTimeout(() => setNotificaSalvataggio(null), 5000);
                  }}
                  onRifiuta={(reqId) => {
                    if (window.confirm(`Sei sicuro di voler rifiutare la richiesta per ${req.email}?`)) {
                      rifiutaRichiestaAccesso(reqId);
                      setNotificaSalvataggio(`Richiesta di accesso per ${req.email} rifiutata.`);
                      setTimeout(() => setNotificaSalvataggio(null), 4000);
                    }
                  }}
                />
              ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. LIVELLO MACRO: HEADER E GRANDI CARD INTERATTIVE        */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
        {/* TITOLO + AZIONI GENERALI (UPLOAD / DOWNLOAD / RESET / ACCORDION) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">Anagrafica e Orario</h3>
                <button
                  type="button"
                  onClick={() => setMostraGuidaExcel(true)}
                  className="w-6 h-6 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs shadow-2xs transition cursor-pointer"
                  title="Istruzioni orario Excel"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-500">Gestisci docenti, cattedre, disposizioni e potenziamenti</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.ods,.csv"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-2 rounded-xl border border-indigo-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Carica Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-2 rounded-xl border border-emerald-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Scarica Excel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Sei sicuro di voler azzerare tutti i docenti e l\'intero orario?')) {
                  azzeraDocentiEOrario();
                  setSelectedDocenteId('');
                  setNotificaSalvataggio('Docenti e orario azzerati con successo.');
                }
              }}
              className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs px-3 py-2 rounded-xl border border-red-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Azzera</span>
            </button>

            {/* FRECCIOLINA ACCORDION APRI / CHIUDI */}
            <button
              type="button"
              onClick={() => setMacroAccordionEspanso(prev => !prev)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1 text-xs font-bold shadow-2xs cursor-pointer ml-1"
              title={macroAccordionEspanso ? 'Comprimi cruscotto in icone' : 'Espandi cruscotto completo'}
            >
              {macroAccordionEspanso ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span className="text-[11px] hidden sm:inline">Comprimi</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span className="text-[11px] hidden sm:inline">Espandi</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CALCOLO DATI EMAIL PER LE VISTE */}
        {(() => {
          const docentiConEmail = docentiUnici.filter(d => {
            const orig = docenti.find(o => d.allIds.includes(o.id));
            return !!orig?.email;
          }).length;
          const percEmail = Math.round((docentiConEmail / docentiUnici.length) * 100);

          return macroAccordionEspanso ? (
            /* ========================================================= */
            /* VISTA ESPANSA: 4 GRANDI CARD (Email subito dopo Docenti)  */
            /* ========================================================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
              
              {/* CARD 1: DOCENTI & CATTEDRE */}
              <div
                onClick={() => setMacroFiltroAttivo('TUTTI')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer shadow-2xs flex flex-col justify-between gap-3 ${
                  macroFiltroAttivo === 'TUTTI'
                    ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Docenti e Cattedre</span>
                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900">{docentiUnici.length} Docenti</div>
                  <div className="text-xs text-indigo-700 font-semibold">{docenti.length} Cattedre totali</div>
                </div>
                <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                  <span>{macroFiltroAttivo === 'TUTTI' ? '● Selezionato' : 'Esplora tutti →'}</span>
                </div>
              </div>

              {/* CARD 2: ACCOUNT GOOGLE / EMAIL (SUBITO DOPO I DOCENTI) */}
              <div
                onClick={() => setMacroFiltroAttivo('EMAIL')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer shadow-2xs flex flex-col justify-between gap-3 ${
                  macroFiltroAttivo === 'EMAIL'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Google</span>
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-xl">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900">{docentiConEmail} / {docentiUnici.length}</div>
                  <div className="text-xs text-blue-700 font-semibold">{percEmail}% Email associate</div>
                </div>
                <div className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                  <span>{macroFiltroAttivo === 'EMAIL' ? '● Gestisci email' : 'Gestisci accessi →'}</span>
                </div>
              </div>

              {/* CARD 3: CONFLITTI ORARI */}
              <div
                onClick={() => setMacroFiltroAttivo(anomalieAttuali.length > 0 ? 'CONFLITTI' : 'TUTTI')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer shadow-2xs flex flex-col justify-between gap-3 ${
                  anomalieAttuali.length > 0
                    ? macroFiltroAttivo === 'CONFLITTI'
                      ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-200'
                      : 'bg-rose-50/50 border-rose-300 hover:bg-rose-100/60 animate-pulse'
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conflitti Orari</span>
                  <div className={`p-1.5 rounded-xl ${anomalieAttuali.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {anomalieAttuali.length > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </div>
                </div>
                <div>
                  <div className={`text-xl font-black ${anomalieAttuali.length > 0 ? 'text-rose-900' : 'text-emerald-900'}`}>
                    {anomalieAttuali.length > 0 ? `${anomalieAttuali.length} Conflitti` : '0 Conflitti'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {anomalieAttuali.length > 0 ? 'Sovrapposizioni da risolvere' : 'Nessuna sovrapposizione'}
                  </div>
                </div>
                <div className={`text-[11px] font-bold flex items-center gap-1 ${anomalieAttuali.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  <span>{anomalieAttuali.length > 0 ? (macroFiltroAttivo === 'CONFLITTI' ? '● Risolvi conflitti' : 'Risolvi subito →') : 'Tutto regolare ✓'}</span>
                </div>
              </div>

              {/* CARD 4: POTENZIAMENTI */}
              <div
                onClick={() => setMacroFiltroAttivo(potenziamentiSenzaClasse.length > 0 ? 'POTENZIAMENTO' : 'TUTTI')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer shadow-2xs flex flex-col justify-between gap-3 ${
                  potenziamentiSenzaClasse.length > 0
                    ? macroFiltroAttivo === 'POTENZIAMENTO'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200'
                      : 'bg-amber-50/50 border-amber-300 hover:bg-amber-100/60'
                    : 'bg-white border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Potenziamenti (P)</span>
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-xl">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-amber-950">
                    {potenziamentiSenzaClasse.length} Ore 'P'
                  </div>
                  <div className="text-xs text-amber-800 font-medium">
                    {potenziamentiSenzaClasse.length > 0 ? 'Senza classe di compresenza' : 'Tutte con classe associata'}
                  </div>
                </div>
                <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                  <span>{potenziamentiSenzaClasse.length > 0 ? (macroFiltroAttivo === 'POTENZIAMENTO' ? '● Assegna classi' : 'Assegna classi →') : 'Orario completo ✓'}</span>
                </div>
              </div>

            </div>
          ) : (
            /* ========================================================= */
            /* VISTA COMPRESSA (ACCORDION CHIUSO): BARRA MINI ICONE      */
            /* ========================================================= */
            <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in duration-200">
              {/* MINI PULSANTE 1: DOCENTI */}
              <button
                type="button"
                onClick={() => setMacroFiltroAttivo('TUTTI')}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-2xs ${
                  macroFiltroAttivo === 'TUTTI'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Docenti ({docentiUnici.length})</span>
              </button>

              {/* MINI PULSANTE 2: EMAIL */}
              <button
                type="button"
                onClick={() => setMacroFiltroAttivo('EMAIL')}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-2xs ${
                  macroFiltroAttivo === 'EMAIL'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Email ({docentiConEmail}/{docentiUnici.length})</span>
              </button>

              {/* MINI PULSANTE 3: CONFLITTI */}
              <button
                type="button"
                onClick={() => setMacroFiltroAttivo(anomalieAttuali.length > 0 ? 'CONFLITTI' : 'TUTTI')}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-2xs ${
                  anomalieAttuali.length > 0
                    ? macroFiltroAttivo === 'CONFLITTI'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {anomalieAttuali.length > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                <span>Conflitti ({anomalieAttuali.length})</span>
              </button>

              {/* MINI PULSANTE 4: POTENZIAMENTI */}
              <button
                type="button"
                onClick={() => setMacroFiltroAttivo(potenziamentiSenzaClasse.length > 0 ? 'POTENZIAMENTO' : 'TUTTI')}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-2xs ${
                  macroFiltroAttivo === 'POTENZIAMENTO'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Potenziamenti 'P' ({potenziamentiSenzaClasse.length})</span>
              </button>
            </div>
          );
        })()}
      </div>

      {/* ========================================================= */}
      {/* 2. LIVELLO MEDIO & 3. LIVELLO MICRO: GRIGLIA MACRO-TO-MICRO */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* COLONNA SINISTRA (LIVELLO MEDIO): LISTA DOCENTI INTERATTIVA CON RICERCA */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-4 shadow-2xs border border-slate-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <span>📋 Seleziona Docente</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {docentiFiltrati.length}
              </span>
            </h4>

            {macroFiltroAttivo && macroFiltroAttivo !== 'TUTTI' && (
              <button
                type="button"
                onClick={() => setMacroFiltroAttivo('TUTTI')}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg transition cursor-pointer"
              >
                Mostra Tutti ✕
              </button>
            )}
          </div>

          {/* BARRA DI RICERCA VELOCE */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={ricercaDocente}
              onChange={(e) => setRicercaDocente(e.target.value)}
              placeholder="Cerca docente o materia..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* FILTRO PER MATERIA */}
          {tutteMaterie.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
              <button
                type="button"
                onClick={() => setFiltroMateria('TUTTE')}
                className={`px-2 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                  filtroMateria === 'TUTTE' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tutte
              </button>
              {tutteMaterie.slice(0, 5).map(mat => (
                <button
                  key={mat}
                  type="button"
                  onClick={() => setFiltroMateria(mat)}
                  className={`px-2 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                    filtroMateria === mat ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mat}
                </button>
              ))}
            </div>
          )}

          {/* LISTA DOCENTI SCORREVOLE */}
          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {docentiFiltrati.length > 0 ? (
              docentiFiltrati.map(d => {
                const isSelected = d.id === selectedDocenteId;
                const haConflitti = anomalieAttuali.some(a => a.profiliConflitto.some(p => p.docenteId === d.id));
                const haPotSenzaClasse = potenziamentiSenzaClasse.some(p => p.docenteId === d.id);

                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDocenteId(d.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-800'
                    }`}
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <strong className={`block text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {d.nome}
                        </strong>
                        {haConflitti && (
                          <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded font-black shrink-0">
                            ⚠️ Conflitto
                          </span>
                        )}
                        {haPotSenzaClasse && (
                          <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-black shrink-0">
                            🟣 'P'
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={isSelected ? 'text-indigo-100 font-bold' : 'text-indigo-700 font-semibold'}>
                          {d.materia}
                        </span>
                        {d.email && (
                          <span className={`truncate font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            ✉️ {d.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'text-slate-400'
                    }`}>
                      →
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                Nessun docente trovato con i filtri attuali.
              </div>
            )}
          </div>
        </div>

        {/* COLONNA DESTRA (LIVELLO MICRO): DETTAGLIO ORARIO & MODIFICA */}
        <div className="lg:col-span-8 space-y-3">
          {docenteSelezionato ? (
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4 animate-in fade-in">
              
              {/* TESTATA DOCENTE SELEZIONATO */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base sm:text-lg font-black text-slate-900">{docenteSelezionato.nome}</h4>
                    <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2.5 py-0.5 rounded-lg border border-indigo-200">
                      {docenteSelezionato.materia}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modifica le classi per ora, gestisci le Disposizioni (D), i Potenziamenti (P) e il Caso Grave (*).
                  </p>
                </div>

                {docenteSelezionato.isSostegno && (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl shrink-0">
                    <input
                      type="checkbox"
                      id="toggleTuttoGrave"
                      checked={docenteSelezionato.isCasoGraveSostegno || false}
                      onChange={handleToggleTuttoGraveDocente}
                      className="rounded text-rose-600 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="toggleTuttoGrave" className="text-xs font-bold text-rose-900 cursor-pointer">
                      Caso Grave 100%
                    </label>
                  </div>
                )}
              </div>

              {/* CAMPO EMAIL GOOGLE WORKSPACE */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email Google Workspace (per Accesso Senza PIN):
                  </label>
                  <input
                    type="email"
                    value={docenteSelezionato.email || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      associaEmailDocente(docenteSelezionato.id, val);
                    }}
                    placeholder="es. nome.cognome@scuola.edu.it"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                {docenteSelezionato.email && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1.5 rounded-xl shrink-0 self-start sm:self-end">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Associato</span>
                  </span>
                )}
              </div>

              {/* LEGENDA CELLE */}
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-bold text-slate-600 text-[11px]">Legenda:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400"></span>
                    <span className="text-[10px] text-slate-700">Lezione</span>
                  </div>
                  {docenteSelezionato.isSostegno && (
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-rose-500 border border-rose-600"></span>
                      <span className="text-[10px] font-black text-rose-700">🔒 Caso Grave (*)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>
                    <span className="text-[10px] text-slate-700">D (Disposizione)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300"></span>
                    <span className="text-[10px] text-slate-700">P (Potenziamento)</span>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 font-medium">
                  Digita la classe (es. <code>1A</code>, <code>2C</code>), <code>D</code>, <code>P</code> o aggiungi l'asterisco (es. <code>1A*</code>)
                </span>
              </div>

              {/* TABELLA ORARIO 9 ORE x 5 GIORNI */}
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs border-collapse min-w-[580px]">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold text-[11px]">
                      <th className="p-2 text-left rounded-tl-xl w-20">Giorno</th>
                      <th className="p-1.5 w-12">1ª (8-9)</th>
                      <th className="p-1.5 w-12">2ª (9-10)</th>
                      <th className="p-1.5 w-12">3ª (10-11)</th>
                      <th className="p-1.5 w-12">4ª (11-12)</th>
                      <th className="p-1.5 w-12">5ª (12-13)</th>
                      <th className="p-1.5 w-12">6ª (13-14)</th>
                      <th className="p-1.5 w-12">7ª (14-15)</th>
                      <th className="p-1.5 w-12">8ª (15-16)</th>
                      <th className="p-1.5 w-12 rounded-tr-xl">9ª (16-17)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {GIORNI.map(giorno => (
                      <tr key={giorno} className="hover:bg-slate-50/50">
                        <td className="p-2 font-black text-slate-700 text-left bg-slate-50">
                          {giorno}
                        </td>

                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(oraNum => {
                          const cella = getCella(giorno, oraNum);
                          const val = cella.valore;
                          const isGrave = cella.isCasoGrave || false;
                          const isD = val === 'D';
                          const isP = val === 'P' || val === 'POT';
                          const isLezione = val !== '' && !isD && !isP;

                          let bgClass = 'bg-slate-50 border-slate-200 text-slate-400';
                          if (isGrave) {
                            bgClass = 'bg-rose-500 border-rose-600 text-white shadow-2xs';
                          } else if (isD) {
                            bgClass = 'bg-amber-100 border-amber-300 text-amber-950 font-bold';
                          } else if (isP) {
                            bgClass = 'bg-indigo-100 border-indigo-300 text-indigo-950 font-bold';
                          } else if (isLezione) {
                            bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold';
                          }

                          return (
                            <td key={oraNum} className="p-1">
                              <div className={`border rounded-lg p-1 transition flex flex-col items-center justify-center gap-0.5 ${bgClass}`}>
                                <input
                                  type="text"
                                  value={val}
                                  placeholder="-"
                                  onChange={(e) => handleCellValoreChange(giorno, oraNum, e.target.value)}
                                  className={`w-full text-center text-xs font-black outline-none bg-transparent ${
                                    isGrave ? 'text-white' : ''
                                  }`}
                                />

                                {docenteSelezionato.isSostegno && isLezione && (
                                  <button
                                    type="button"
                                    onClick={() => toggleCasoGraveCella(giorno, oraNum)}
                                    className={`w-full text-[9px] py-0.2 rounded font-black flex items-center justify-center gap-0.5 transition ${
                                      isGrave 
                                        ? 'bg-rose-700 text-rose-100 hover:bg-rose-800' 
                                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                    }`}
                                    title={isGrave ? 'Rimuovi Caso Grave' : 'Segna come Caso Grave'}
                                  >
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>{isGrave ? 'GRAVE' : 'Grave'}</span>
                                  </button>
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

              {/* SALVATAGGIO IN CALCE */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Modifiche attive immediatamente per le prossime sostituzioni.</span>
                </div>
                <button
                  type="button"
                  onClick={handleSalvaOrario}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Conferma & Salva Orario</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-slate-200 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-slate-800">Seleziona un docente dalla lista</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Clicca su un docente nell'elenco a sinistra per visualizzare, verificare e modificare la sua griglia oraria.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

// ==============================================================================
// COMPONENTE IMPOSTAZIONI PRIORITA' SOSTITUZIONI SMART
// ==============================================================================
const CATEGORIE_CONFIG: Record<CategoriaSostituto, { label: string; desc: string; icon: string }> = {
  COMPRESENTE_CLASSE: {
    label: 'Docente Compresente in Classe',
    desc: 'Docente già fisicamente presente in aula (es. compresenza cattedra/sostegno non grave).',
    icon: '👥'
  },
  LIBERATO_STESSA_CLASSE: {
    label: 'Liberato da Gita - Insegna nella Stessa Classe',
    desc: 'Docente la cui classe è in gita e che insegna in quella classe (continuità didattica max).',
    icon: '⭐'
  },
  LIBERATO_STESSA_MATERIA: {
    label: 'Liberato da Gita - Stessa Materia del Docente Assente',
    desc: 'Docente liberato dalla gita con la stessa materia dell\'assente (es. Matematica per Matematica).',
    icon: '📚'
  },
  LIBERATO_ALTRA_CLASSE: {
    label: 'Altri Docenti Liberati da Gita (Altre Materie)',
    desc: 'Docenti la cui classe è in gita, disponibili per coperture generiche d\'ufficio.',
    icon: '🚌'
  },
  RECUPERO_STESSA_CLASSE: {
    label: 'Recupero Debito Permessi (Stessa Classe)',
    desc: 'Docente con ore a debito che insegna in quella classe (recupera 1h debito).',
    icon: '⏱️'
  },
  POTENZIAMENTO: {
    label: 'Docenti in Potenziamento (P)',
    desc: 'Docente che in quell\'ora specifica ha l\'ora di Potenziamento (P) da orario curricolare.',
    icon: '⚡'
  },
  RECUPERO_GENERICO: {
    label: 'Recupero Debito Permessi (Altra Classe / Disposizione D)',
    desc: 'Docente con debito orario in ora di D o a disposizione generica.',
    icon: '🔄'
  },
  SOSTEGNO: {
    label: 'Docenti di Sostegno Disponibili (Rotazione Equa)',
    desc: 'Docenti di sostegno liberi in quell\'ora, ordinati con rotazione equa tra tutti.',
    icon: '🤝'
  },
  STRAORDINARIO_D: {
    label: 'Docenti in Disposizione (D) - Ore a Pagamento',
    desc: 'Docenti con ora di disposizione (D) senza debito (assegnazione retribuita).',
    icon: '💶'
  },
  SMISTAMENTO_CLASSE: {
    label: 'Smistamento Classe',
    desc: 'Opzione per indicare che gli alunni sono stati smistati e suddivisi in altre classi.',
    icon: '🔀'
  },
  NON_SOSTITUIRE: {
    label: 'Non Sostituire',
    desc: 'Opzione per non assegnare alcun docente (classe lasciata scoperta o senza sostituto).',
    icon: '🚫'
  }
};

export const ImpostazioniPriorita: React.FC = () => {
  const { impostazioniPriorita, setImpostazioniPriorita, resetImpostazioniPrioritaPredefinite } = useApp();
  const [salvato, setSalvato] = useState(false);

  const spostaElemento = (
    tipo: 'prioritaAssenze' | 'prioritaGite',
    index: number,
    direzione: -1 | 1
  ) => {
    const lista = [...impostazioniPriorita[tipo]];
    const targetIndex = index + direzione;
    if (targetIndex < 0 || targetIndex >= lista.length) return;

    const temp = lista[index];
    lista[index] = lista[targetIndex];
    lista[targetIndex] = temp;

    setImpostazioniPriorita({
      ...impostazioniPriorita,
      [tipo]: lista
    });

    setSalvato(true);
    setTimeout(() => setSalvato(false), 2000);
  };

  const renderListaPriorita = (
    tipo: 'prioritaAssenze' | 'prioritaGite',
    titolo: string,
    descrizione: string,
    icona: React.ReactNode,
    coloreBordo: string
  ) => {
    const lista = impostazioniPriorita[tipo];

    return (
      <div className={`bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border ${coloreBordo} space-y-3.5`}>
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
              {icona}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">{titolo}</h3>
              <p className="text-xs text-slate-500">{descrizione}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {lista.map((cat, idx) => {
            const cfg = CATEGORIE_CONFIG[cat] || {
              label: cat,
              desc: '',
              icon: '📌'
            };

            const isFirst = idx === 0;
            const isLast = idx === lista.length - 1;

            return (
              <div
                key={cat}
                className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base leading-none">{cfg.icon}</span>
                      <strong className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {cfg.label}
                      </strong>
                    </div>
                    {cfg.desc && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {cfg.desc}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => spostaElemento(tipo, idx, -1)}
                    className={`p-1.5 rounded-lg border transition ${
                      isFirst
                        ? 'opacity-30 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                        : 'bg-white hover:bg-indigo-50 hover:text-indigo-600 border-slate-200 text-slate-700 shadow-2xs'
                    }`}
                    title="Sposta prima (Priorita più alta)"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => spostaElemento(tipo, idx, 1)}
                    className={`p-1.5 rounded-lg border transition ${
                      isLast
                        ? 'opacity-30 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                        : 'bg-white hover:bg-indigo-50 hover:text-indigo-600 border-slate-200 text-slate-700 shadow-2xs'
                    }`}
                    title="Sposta dopo (Priorita più bassa)"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-2xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Impostazioni Priorità Sostituzioni Smart</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h2>
            <p className="text-xs text-slate-500">
              Personalizza l'ordine con cui l'algoritmo automatico seleziona e propone i docenti per le sostituzioni.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {salvato && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle className="w-3.5 h-3.5" />
              Salvate in automatico
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              if (window.confirm("Vuoi ripristinare l'ordine di priorità predefinito dell'algoritmo?")) {
                resetImpostazioniPrioritaPredefinite();
                setSalvato(true);
                setTimeout(() => setSalvato(false), 2000);
              }
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ripristina Predefiniti</span>
          </button>
        </div>
      </div>

      <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3.5 text-xs text-indigo-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Come funziona:</strong> Quando premi il pulsante <em>"Assegnazione Automatica Smart"</em> o apri la scelta assistita, l'algoritmo verificherà la disponibilità dei docenti seguendo rigorosamente l'ordine <strong>1°, 2°, 3°...</strong> configurato qui sotto. Puoi usare le frecce per riordinare le priorità sia per le giornate con gite che per le assenze ordinarie.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderListaPriorita(
          'prioritaAssenze',
          'Priorità per Assenze Normali',
          'Ordine applicato per le assenze ordinarie di classe.',
          <UserMinus className="w-4 h-4 text-indigo-600" />,
          'border-slate-200'
        )}

        {renderListaPriorita(
          'prioritaGite',
          'Priorità in Presenza di Gite & Uscite',
          'Ordine applicato quando ci sono classi in gita e docenti liberati.',
          <Bus className="w-4 h-4 text-amber-600" />,
          'border-amber-200'
        )}
      </div>
    </div>
  );
};

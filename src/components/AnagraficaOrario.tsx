import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Docente, GiornoSettimana, CellaOrario, TipoOra, CategoriaSostituto } from '../types';
import { GIORNI } from '../data/initialData';
import { parseOrarioExcel } from '../utils/excelParser';
import { getDocentiUnici, getBaseNomeDocente } from '../utils/docentiHelper';
import * as XLSX from 'xlsx';
import { 
  Users, Edit, Save, Lock, Unlock, Search, CheckCircle, 
  AlertTriangle, RotateCcw, ShieldCheck, Sparkles, Plus, Clock, Filter,
  Upload, Download, FileSpreadsheet, ChevronDown, UserCheck, User,
  Sliders, ArrowUp, ArrowDown, Info, Bus, UserMinus, Trash2
} from 'lucide-react';

export const AnagraficaOrario: React.FC = () => {
  const { 
    docenti, setDocenti, orariDocenti, setOrariDocenti, 
    updateDocente, updateOrarioDocente, resetOrarioPredefinito, azzeraDocentiEOrario, importaNuovoOrarioCompleto 
  } = useApp();

  const docentiUnici = React.useMemo(() => getDocentiUnici(docenti), [docenti]);
  
  // Nessun docente selezionato di default (inizia vuoto)
  const [selectedDocenteId, setSelectedDocenteId] = useState<string>('');
  const [notificaSalvataggio, setNotificaSalvataggio] = useState<string | null>(null);
  
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
    const val = valRaw.toUpperCase().trim();
    let tipo: TipoOra = 'LIBERO';
    if (val === 'D') tipo = 'D';
    else if (val === 'P') tipo = 'P';
    else if (val !== '') tipo = 'LEZIONE';

    setOreModificate(prev => prev.map(c => {
      if (c.giorno === giorno && c.ora === ora) {
        return {
          ...c,
          valore: val,
          tipo
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

  // UPLOAD FILE EXCEL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const result = parseOrarioExcel(buffer);
        if (result.docenti.length > 0 && result.orariDocenti.length > 0) {
          importaNuovoOrarioCompleto(result.docenti, result.orariDocenti);
          setSelectedDocenteId('');
          setOreModificate([]);
          
          const righeCaricate = result.docenti.length;
          const uniciNomi = new Set(result.docenti.map(d => getBaseNomeDocente(d.nome)));
          const docentiEffettivi = uniciNomi.size;

          setNotificaSalvataggio(`✅ Orario caricato con successo! Importate ${righeCaricate} righe orario per ${docentiEffettivi} docenti effettivi.`);
          setTimeout(() => setNotificaSalvataggio(null), 6000);
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

      {/* HEADER ANAGRAFICA CON UPLOAD E DOWNLOAD */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Anagrafica & Modifica Orario Docenti</span>
            </h3>
            {docentiUnici.length > 0 && (
              <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2.5 py-0.5 rounded-lg border border-indigo-200">
                {docentiUnici.length} Docenti Effettivi ({docenti.length} Righe / Cattedre)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Modifica le classi per ora, gestisci le <strong>Disposizioni (D)</strong>, i <strong>Potenziamenti (P)</strong> e le ore con <strong>Alunno a Caso Grave</strong>. Se fai upload di un orario, segna le ore dei sostegni bloccati con caso grave con un asterisco (es. <strong>1A*</strong>).
          </p>
        </div>

        {/* AZIONI: UPLOAD, DOWNLOAD, RESET */}
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
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-indigo-200 transition flex items-center gap-1.5 shadow-2xs"
            title="Importa o aggiorna l'orario caricando un file Excel"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Carica Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-200 transition flex items-center gap-1.5 shadow-2xs"
            title="Scarica l'orario attuale completo in formato Excel .xlsx"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Scarica Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Sei sicuro di voler azzerare a zero tutti i docenti e l\'intero orario?')) {
                azzeraDocentiEOrario();
                setSelectedDocenteId('');
                setNotificaSalvataggio('Docenti e orario azzerati completamente a zero.');
              }
            }}
            className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs px-3 py-1.5 rounded-xl border border-red-200 transition flex items-center gap-1.5 shadow-2xs"
            title="Azzera a zero tutti i docenti e l'orario"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Azzera a Zero</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Vuoi ricaricare l\'orario predefinito demo?')) {
                resetOrarioPredefinito();
                setNotificaSalvataggio('Orario predefinito ripristinato.');
              }
            }}
            className="text-slate-500 hover:text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition flex items-center gap-1.5"
            title="Ripristina orario demo originale"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ripristina Demo</span>
          </button>

          {docenteSelezionato && (
            <button
              type="button"
              onClick={handleSalvaOrario}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-2xs transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salva Modifiche</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SELETTORE DOCENTE STANDARD A TENDINA (COME AGGIUNGI ASSENTE) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-2xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex-1">
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5 tracking-wider">
              Docente da Modificare:
            </label>
            <select
              value={selectedDocenteId}
              onChange={(e) => setSelectedDocenteId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-bold bg-white text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
            >
              <option value="">-- Scegli Docente --</option>
              {docentiOrdinati.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nome} ({d.materia}{d.isSostegno ? ' - Sost.' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Switch Caso Grave Rapido se Sostegno */}
          {docenteSelezionato?.isSostegno && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl shrink-0 self-start sm:self-end">
              <input
                type="checkbox"
                id="toggleTuttoGrave"
                checked={docenteSelezionato.isCasoGraveSostegno || false}
                onChange={handleToggleTuttoGraveDocente}
                className="rounded text-rose-600 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="toggleTuttoGrave" className="text-xs font-bold text-rose-900 cursor-pointer">
                Tutte le ore sono Caso Grave (Bloccato 100%)
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TABELLA EDITABILE 9 ORE x 5 GIORNI                       */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
        {docenteSelezionato ? (
          <>
            {/* LEGENDA E ISTRUZIONI RAPIDE */}
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-bold text-slate-600 text-[11px]">Legenda Cella:</span>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400"></span>
                  <span className="text-[10px] text-slate-700">Lezione/Sostegno</span>
                </div>
                {docenteSelezionato.isSostegno && (
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-rose-500 border border-rose-600"></span>
                    <span className="text-[10px] font-black text-rose-700">🔒 Caso Grave (Bloccato)</span>
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

              <span className="text-[10px] text-slate-400 italic">
                Digita la classe (es. 1A, 2C), D, P oppure tocca 🔒 per segnare il Caso Grave
              </span>
            </div>

            {/* TABELLA EDITABILE 9 ORE x 5 GIORNI */}
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold text-[11px]">
                    <th className="p-2 text-left rounded-tl-xl w-20">Giorno</th>
                    <th className="p-1.5 w-14">1ª (8-9)</th>
                    <th className="p-1.5 w-14">2ª (9-10)</th>
                    <th className="p-1.5 w-14">3ª (10-11)</th>
                    <th className="p-1.5 w-14">4ª (11-12)</th>
                    <th className="p-1.5 w-14">5ª (12-13)</th>
                    <th className="p-1.5 w-14">6ª (13-14)</th>
                    <th className="p-1.5 w-14">7ª (14-15)</th>
                    <th className="p-1.5 w-14">8ª (15-16)</th>
                    <th className="p-1.5 w-14 rounded-tr-xl">9ª (16-17)</th>
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
                        const isP = val === 'P';
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

                              {/* Pulsante Caso Grave per docenti di sostegno */}
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
                <span>Le modifiche avranno effetto immediato su tutte le prossime proposte di sostituzione.</span>
              </div>
              <button
                type="button"
                onClick={handleSalvaOrario}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Conferma & Salva Orario</span>
              </button>
            </div>
          </>
        ) : (
          <div className="py-12 px-4 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-slate-800">Nessun docente selezionato</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Scegli un docente dal menu a tendina in alto per visualizzare e modificare il suo orario.
            </p>
          </div>
        )}
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

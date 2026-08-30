import * as XLSX from 'xlsx';
import { Docente, OrarioDocente, GiornoSettimana, TipoMateria, CellaOrario, TipoOra } from '../types';
import { getBaseNomeDocente } from './docentiHelper';

export interface ProblemaOrarioExcel {
  tipo: 'SOVRAPPOSIZIONE_ORARIA' | 'POTENZIAMENTO_SENZA_CLASSE' | 'VALORE_SCONOSCIUTO';
  docenteNome: string;
  giorno: GiornoSettimana;
  ora: number;
  messaggio: string;
  valore1?: string;
  valore2?: string;
}

export interface ParseResult {
  docenti: Docente[];
  orariDocenti: OrarioDocente[];
  problemi: ProblemaOrarioExcel[];
}

export function parseOrarioExcel(fileData: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const docenti: Docente[] = [];
  const orariDocenti: OrarioDocente[] = [];
  const problemi: ProblemaOrarioExcel[] = [];

  const giorni: GiornoSettimana[] = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

  const colsPerDay = 9;
  const startCol = 2;

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const nomeRaw = String(row[0] || '').trim();
    const materiaRaw = String(row[1] || '').trim().toUpperCase();

    // Salta le sole righe di testata (es. 'docenti', 'materia' o vuote)
    if (!nomeRaw || nomeRaw.toLowerCase() === 'docenti' || nomeRaw.toLowerCase() === 'docente') continue;
    if (materiaRaw === 'LUNEDÌ' || materiaRaw === 'LUNEDI' || materiaRaw === 'MATERIA') continue;

    const baseNome = getBaseNomeDocente(nomeRaw);
    const isSostegno = materiaRaw.includes('SOSTEGNO');
    const isEducatore = materiaRaw.includes('EDUCATORE') || nomeRaw.toUpperCase().includes('EDUCATORE');
    const isPotenziamento = materiaRaw.includes('POTENZIAMEN') || materiaRaw.includes('POTENZIAMENTO') || nomeRaw.toUpperCase().includes('POTENZIAMENTO');
    const isAlternativa = materiaRaw.includes('ALTERNATIVA') || materiaRaw.startsWith('ALT') || materiaRaw.includes('ATTIVITÀ ALTERNATIVA') || materiaRaw.includes('ATTIVITA ALTERNATIVA') || materiaRaw.includes('ATT. ALTERNATIVA') || nomeRaw.toUpperCase().includes('ALTERNATIVA');

    // Usa la materia specificata nella colonna B del foglio Excel
    let materia: TipoMateria = materiaRaw as TipoMateria;
    if (isAlternativa) materia = 'ALTERNATIVA';
    else if (isPotenziamento) materia = 'POTENZIAMENTO';
    else if (isSostegno) materia = 'SOSTEGNO';
    else if (isEducatore) materia = 'EDUCATORE';
    else if (materiaRaw.includes('LETTERE') || materiaRaw.includes('ITALIANO')) materia = 'LETTERE';
    else if (materiaRaw.includes('MATEMATICA') || materiaRaw.includes('SCIENZE')) materia = 'MATEMATICA';
    else if (materiaRaw.includes('FRANCESE')) materia = 'FRANCESE';
    else if (materiaRaw.includes('INGLESE')) materia = 'INGLESE';
    else if (materiaRaw.includes('TECNOLOGIA')) materia = 'TECNOLOGIA';
    else if (materiaRaw.includes('ARTE')) materia = 'ARTE';
    else if (materiaRaw.includes('MUSICA')) materia = 'MUSICA';
    else if (materiaRaw.includes('FISICA') || materiaRaw.includes('MOTORIA')) materia = 'ED. FISICA';
    else if (materiaRaw.includes('IRC') || materiaRaw.includes('RELIGIONE')) materia = 'IRC';
    else if (['STRUMENTO', 'VIOLINO', 'FLAUTO', 'CLARINETTO', 'CHITARRA', 'PIANOFORTE', 'PIANO', 'PERCUSSIONI', 'TROMBA'].some(m => materiaRaw.includes(m))) materia = 'STRUMENTO';
    else if (!materia) materia = 'ALTRO';

    // Leggi le 45 celle di questa riga
    const oreRiga: CellaOrario[] = [];
    let colIdx = startCol;

    for (let g = 0; g < giorni.length; g++) {
      const giorno = giorni[g];
      for (let ora = 1; ora <= colsPerDay; ora++) {
        let rawVal = String(row[colIdx] || '').trim().toUpperCase();
        
        // Rileva presenza di asterisco * (es. "1A*", "*1A", "1A *") che denota CASO GRAVE
        const hasAsterisk = rawVal.includes('*');
        let val = rawVal.replace(/\*/g, '').trim();

        // Controllo se è scritto solo 'P' (senza specificare la classe es. '2B POT')
        if (val === 'P' || val === 'POT' || val === 'POTENZIAMENTO') {
          problemi.push({
            tipo: 'POTENZIAMENTO_SENZA_CLASSE',
            docenteNome: baseNome,
            giorno,
            ora,
            messaggio: `Cella con solo 'P' (Potenziamento puro). Suggerimento: puoi specificare la classe dove si trova in compresenza (es. '2B POT').`,
            valore1: val
          });
        }

        // Supporto per notazioni miste tipo "2B POT" -> classe 2B ma con flag potenziamento
        if (val.includes('POT') && val !== 'POT' && val !== 'POTENZIAMENTO') {
          // es. '2B POT' -> classe '2B'
          val = val.replace(/POTENZIAMENTO|POT/g, '').trim();
        }

        let tipo: TipoOra = 'LIBERO';
        if (val === 'D' || val === 'DISP' || val === 'DISPOSIZIONE') {
          tipo = 'D';
          val = 'D';
        } else if (val === 'P' || val === 'POT' || isPotenziamento) {
          tipo = 'P';
          // Se la riga è di potenziamento e non c'è scritto nulla o c'è scritto POT, impostiamo 'P', altrimenti preserviamo la classe scritta (es. '3F')
          if (!val || val === 'POT') val = 'P';
        } else if (val !== '') {
          tipo = 'LEZIONE';
        }

        const isCasoGrave = hasAsterisk || false;

        oreRiga.push({
          giorno,
          ora,
          valore: val,
          tipo,
          isCasoGrave
        });
        colIdx++;
      }
    }

    // Cerca l'email nell'ultima colonna o dopo la 45esima ora
    let emailParsed: string | undefined = undefined;
    for (let c = colIdx; c < row.length; c++) {
      const valStr = String(row[c] || '').trim();
      if (valStr.includes('@') && valStr.includes('.')) {
        emailParsed = valStr.toLowerCase();
        break;
      }
    }

    let id = `${baseNome.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${materia.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    if (docenti.some(d => d.id === id)) {
      id = `${id}_${docenti.length + 1}`;
    }

    const docente: Docente = {
      id,
      nome: baseNome,
      email: emailParsed,
      materia,
      dettaglioMateria: materiaRaw || materia,
      isSostegno,
      isEducatore,
      isPotenziamento,
      isAlternativa,
      casoGraveSostegno: false,
      oreDebitoPermesso: 0,
      pinAccesso: '1234'
    };

    docenti.push(docente);
    orariDocenti.push({
      docenteId: id,
      ore: oreRiga
    });
  }

  // =========================================================================
  // VALIDATORE SOVRAPPOSIZIONI MULTI-RIGA PER LO STESSO DOCENTE
  // =========================================================================
  const docentiPerNome: Record<string, { doc: Docente; orario: OrarioDocente }[]> = {};
  docenti.forEach((d, idx) => {
    const nome = d.nome;
    if (!docentiPerNome[nome]) docentiPerNome[nome] = [];
    docentiPerNome[nome].push({ doc: d, orario: orariDocenti[idx] });
  });

  Object.entries(docentiPerNome).forEach(([nome, listaProfili]) => {
    if (listaProfili.length <= 1) return;

    // Per ogni giorno e ora, verifica se ci sono 2 celle piene in contemporanea
    giorni.forEach(giorno => {
      for (let ora = 1; ora <= colsPerDay; ora++) {
        const occupati = listaProfili.filter(p => {
          const c = p.orario.ore.find(cell => cell.giorno === giorno && cell.ora === ora);
          return c && c.valore && c.valore.trim() !== '';
        });

        if (occupati.length > 1) {
          const dettagli = occupati.map(o => {
            const cell = o.orario.ore.find(c => c.giorno === giorno && c.ora === ora)!;
            return `${o.doc.materia} (${cell.valore})`;
          }).join(' e ');

          problemi.push({
            tipo: 'SOVRAPPOSIZIONE_ORARIA',
            docenteNome: nome,
            giorno,
            ora,
            messaggio: `⚠️ Attenzione: ${nome} risulta impegnato contemporaneamente in più materie (${dettagli}) il ${giorno} alla ${ora}ª ora!`,
            valore1: dettagli
          });
        }
      }
    });
  });

  return { docenti, orariDocenti, problemi };
}

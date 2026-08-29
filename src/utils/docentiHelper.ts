import { Docente, OrarioDocente, CellaOrario, GiornoSettimana } from '../types';

/**
 * Normalizza il nome del docente rimuovendo suffissi tra parentesi
 * Es: "COLETTA SERGIO (ALTERNATIVA)" -> "COLETTA SERGIO"
 *     "AIME GIANLUCA (POTENZIAMENTO)" -> "AIME GIANLUCA"
 *     "AIME GIANLUCA (SOSTEGNO)" -> "AIME GIANLUCA"
 *     "CHIRICO TERESA (ALTERNATIVA)" -> "CHIRICO TERESA"
 */
/**
 * Normalizza il nome del docente rimuovendo suffissi tra parentesi
 * Es: "COLETTA SERGIO (ALTERNATIVA)" -> "COLETTA SERGIO"
 *     "AIME GIANLUCA (POTENZIAMENTO)" -> "AIME GIANLUCA"
 *     "AIME GIANLUCA (SOSTEGNO)" -> "AIME GIANLUCA"
 *     "CHIRICO TERESA (ALTERNATIVA)" -> "CHIRICO TERESA"
 */
export function getBaseNomeDocente(nome: string): string {
  return nome.replace(/\s*\([^)]*\)\s*$/, '').trim().toUpperCase();
}

/**
 * Converte qualsiasi data YYYY-MM-DD o ISO nel formato standard italiano DD/MM/YYYY
 */
export function formatDataItaliana(dataStr: string): string {
  if (!dataStr) return '';
  const clean = dataStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  }
  return dataStr;
}

/**
 * Verifica se una data è un giorno di lezione (non weekend e non festivo)
 */
export function isGiornoScolastico(dataStr: string, nascondiWeekend: boolean = true, giorniFestivi: string[] = []): boolean {
  if (!dataStr) return false;
  const d = new Date(dataStr);
  const day = d.getDay(); // 0 = Domenica, 6 = Sabato
  if (nascondiWeekend && (day === 0 || day === 6)) return false;
  const iso = d.toISOString().split('T')[0];
  if (giorniFestivi && giorniFestivi.includes(iso)) return false;
  return true;
}

/**
 * Calcola il primo giorno scolastico valido a partire da una data (se oggi è weekend/festivo, salta a Lunedì/primo giorno utile)
 */
export function getPrimoGiornoScolasticoValido(dataStr: string, nascondiWeekend: boolean = true, giorniFestivi: string[] = []): string {
  let d = new Date(dataStr);
  let attempts = 0;
  while (attempts < 60) {
    const day = d.getDay();
    const iso = d.toISOString().split('T')[0];
    const isWeekend = day === 0 || day === 6;
    const isFestivo = giorniFestivi && giorniFestivi.includes(iso);
    if ((!nascondiWeekend || !isWeekend) && !isFestivo) {
      return iso;
    }
    d.setDate(d.getDate() + 1);
    attempts++;
  }
  return dataStr;
}

/**
 * Calcola il giorno scolastico successivo o precedente (+1 o -1) saltando automaticamente weekend e festività
 */
export function spostaGiornoScolastico(dataStr: string, delta: number, nascondiWeekend: boolean = true, giorniFestivi: string[] = []): string {
  let d = new Date(dataStr);
  const step = delta >= 0 ? 1 : -1;
  const count = Math.abs(delta) || 1;
  let advanced = 0;
  let attempts = 0;

  while (advanced < count && attempts < 100) {
    d.setDate(d.getDate() + step);
    const day = d.getDay();
    const iso = d.toISOString().split('T')[0];
    const isWeekend = day === 0 || day === 6;
    const isFestivo = giorniFestivi && giorniFestivi.includes(iso);
    if ((!nascondiWeekend || !isWeekend) && !isFestivo) {
      advanced++;
    }
    attempts++;
  }
  return d.toISOString().split('T')[0];
}

/**
 * Restituisce tutti gli ID dei profili associati alla stessa persona fisica
 */
export function getDocentiCollegatiIds(docenteIdOrNome: string, docenti: Docente[]): string[] {
  const targetDoc = docenti.find(d => d.id === docenteIdOrNome || d.nome === docenteIdOrNome);
  const baseNome = targetDoc ? getBaseNomeDocente(targetDoc.nome) : getBaseNomeDocente(docenteIdOrNome);
  
  return docenti
    .filter(d => getBaseNomeDocente(d.nome) === baseNome)
    .map(d => d.id);
}

/**
 * Restituisce la lista deduplicata di docenti unici per persona fisica,
 * aggregando le informazioni su tutte le materie/ruoli svolti
 */
export interface DocenteUnico {
  id: string; // ID primario
  allIds: string[]; // Tutti gli ID associati
  nome: string; // Nome pulito senza parentesi
  materie: string[]; // Es. ["LETTERE", "ALTERNATIVA"]
  isSostegno: boolean;
  isEducatore: boolean;
  isPotenziamento: boolean;
  isAlternativa: boolean;
  isCasoGraveSostegno?: boolean;
  oreDebitoPermesso: number;
  pinAccesso?: string;
}

export function getDocentiUnici(docenti: Docente[]): DocenteUnico[] {
  const map = new Map<string, DocenteUnico>();

  docenti.forEach(d => {
    if (d.isEducatore) return; // gli educatori rimangono gestiti a parte se necessario

    const baseNome = getBaseNomeDocente(d.nome);
    
    // Determina la label reale della materia del profilo corrente
    let materiaEffettiva: string = d.materia;
    if (d.isAlternativa || d.nome.toUpperCase().includes('ALTERNATIVA') || d.dettaglioMateria?.toUpperCase().includes('ALTERNATIVA')) {
      materiaEffettiva = 'ALTERNATIVA';
    } else if (d.isPotenziamento || d.nome.toUpperCase().includes('POTENZIAMENTO') || d.dettaglioMateria?.toUpperCase().includes('POTENZIAMENTO')) {
      materiaEffettiva = 'POTENZIAMENTO';
    } else if (d.isSostegno || d.nome.toUpperCase().includes('SOSTEGNO') || d.dettaglioMateria?.toUpperCase().includes('SOSTEGNO')) {
      materiaEffettiva = 'SOSTEGNO';
    }

    if (!map.has(baseNome)) {
      map.set(baseNome, {
        id: d.id,
        allIds: [d.id],
        nome: baseNome,
        materie: [materiaEffettiva],
        isSostegno: d.isSostegno,
        isEducatore: d.isEducatore,
        isPotenziamento: d.isPotenziamento,
        isAlternativa: d.isAlternativa,
        isCasoGraveSostegno: d.isCasoGraveSostegno || (d as any).casoGraveSostegno,
        oreDebitoPermesso: d.oreDebitoPermesso || 0,
        pinAccesso: d.pinAccesso
      });
    } else {
      const existing = map.get(baseNome)!;
      if (!existing.allIds.includes(d.id)) {
        existing.allIds.push(d.id);
      }
      if (!existing.materie.includes(materiaEffettiva)) {
        existing.materie.push(materiaEffettiva);
      }
      existing.isSostegno = existing.isSostegno || d.isSostegno;
      existing.isPotenziamento = existing.isPotenziamento || d.isPotenziamento;
      existing.isAlternativa = existing.isAlternativa || d.isAlternativa;
      existing.isCasoGraveSostegno = existing.isCasoGraveSostegno || d.isCasoGraveSostegno || (d as any).casoGraveSostegno;
      existing.oreDebitoPermesso = Math.max(existing.oreDebitoPermesso, d.oreDebitoPermesso || 0);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Fonde e restituisce tutte le 45 celle orarie di una persona fisica
 * unificando tutti i suoi profili/ruoli orari in una singola matrice
 */
export function getOrarioUnificatoDocente(
  docenteIdOrNome: string,
  docenti: Docente[],
  orariDocenti: OrarioDocente[]
): CellaOrario[] {
  const allIds = getDocentiCollegatiIds(docenteIdOrNome, docenti);
  const orariTrovati = orariDocenti.filter(o => allIds.includes(o.docenteId));

  const GIORNI: GiornoSettimana[] = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
  const orarioFuso: CellaOrario[] = [];

  GIORNI.forEach(giorno => {
    for (let ora = 1; ora <= 9; ora++) {
      let cellaVal = '';
      let tipo: any = 'LIBERO';
      let isCasoGrave = false;

      // Cerca tra tutti i profili orari della persona
      for (const o of orariTrovati) {
        const c = o.ore.find(cell => cell.giorno === giorno && cell.ora === ora);
        if (c && c.valore && c.valore.trim() !== '') {
          cellaVal = c.valore.trim();
          tipo = c.tipo;
          if (c.isCasoGrave) isCasoGrave = true;
          break; // Trovata ora di lezione/D/P
        }
      }

      orarioFuso.push({
        giorno,
        ora,
        valore: cellaVal,
        tipo,
        isCasoGrave
      });
    }
  });

  return orarioFuso;
}

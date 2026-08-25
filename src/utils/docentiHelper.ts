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

export type GiornoSettimana = 'Lunedì' | 'Martedì' | 'Mercoledì' | 'Giovedì' | 'Venerdì';

export type TipoMateria = 
  | 'LETTERE'
  | 'MATEMATICA'
  | 'INGLESE'
  | 'FRANCESE'
  | 'SPAGNOLO'
  | 'TEDESCO'
  | 'ARTE'
  | 'MUSICA'
  | 'STRUMENTO'
  | 'SCIENZE_MOTORIE'
  | 'ED. FISICA'
  | 'TECNOLOGIA'
  | 'RELIGIONE'
  | 'IRC'
  | 'SOSTEGNO'
  | 'EDUCATORE'
  | 'POTENZIAMENTO'
  | 'ALTERNATIVA'
  | 'ALTRO';

export interface Docente {
  id: string;
  nome: string;
  materia: TipoMateria;
  dettaglioMateria?: string;
  classeRiferimento?: string;
  isSostegno: boolean;
  isCasoGraveSostegno?: boolean; // Se true, non può MAI essere spostato per fare supplenze su nessuna ora
  casoGraveSostegno?: boolean;   // Alias retrocompatibilità
  isEducatore: boolean;          // Gli educatori non possono mai essere usati da soli per le sostituzioni
  isPotenziamento: boolean;
  isAlternativa: boolean;
  oreDebitoPermesso: number;     // Ore da recuperare per permessi brevi (usa le sue D)
  pinAccesso?: string;
}

export type TipoOra = 'LEZIONE' | 'D' | 'P' | 'LIBERO';

export interface CellaOrario {
  giorno: GiornoSettimana;
  ora: number; // 1 to 9
  valore: string; // Es. "1A", "D", "P", ""
  tipo: TipoOra;
  isCasoGrave?: boolean; // Se true in questa specifica ora, il docente di sostegno segue un alunno grave
}

export interface OrarioDocente {
  docenteId: string;
  ore: CellaOrario[];
}

export type MotivoAssenza = 
  | 'Giornaliera'
  | 'Oraria'
  | 'Assemblea sindacale'
  | 'Assenza'
  | 'Uscita';

export interface AssenzaDocente {
  id: string;
  data: string; // YYYY-MM-DD
  giorno: GiornoSettimana;
  docenteId: string;
  oreInteressate: number[];
  motivo: MotivoAssenza;
  isOraria?: boolean;
  oreDebitoGenerate?: number;
  annullata?: boolean;
  annullataIl?: string;
  dettagliUscita?: {
    uscitaId: string;
    titoloMeta: string;
    classiInUscita?: string[];
    isAccompagnatore?: boolean;
  };
  note?: string;
  createdAt: string;
}

export interface MovimentoDebito {
  id: string;
  docenteId: string;
  data: string;
  giorno: GiornoSettimana;
  tipo: 'DEBITO_GENERATO' | 'DEBITO_RECUPERATO' | 'MODIFICA_MANUALE';
  deltaOre: number; // es: -2 per debito, +1 per recupero
  descrizione: string;
  createdAt: string;
}

export interface UscitaClasse {
  id: string;
  data: string;
  giorno: GiornoSettimana;
  titoloMeta: string;
  classi: string[];
  oraInizio: number;
  oraFine: number;
  ore: number[];
  docentiAccompagnatoriIds: string[];
  annullata?: boolean;
  annullataIl?: string;
  note?: string;
  createdAt: string;
}

export type CategoriaSostituto = 
  | 'COMPRESENTE_CLASSE'
  | 'RECUPERO_STESSA_CLASSE'
  | 'LIBERATO_STESSA_CLASSE'
  | 'LIBERATO_STESSA_MATERIA'
  | 'LIBERATO_ALTRA_CLASSE'
  | 'POTENZIAMENTO'
  | 'RECUPERO_GENERICO'
  | 'SOSTEGNO'
  | 'STRAORDINARIO_D';

export interface ImpostazioniPriorita {
  prioritaAssenze: CategoriaSostituto[];
  prioritaGite: CategoriaSostituto[];
}

export interface CandidatoSostituto {
  docente: Docente;
  categoria: CategoriaSostituto;
  punteggioPriorita: number;
  oreSostegnoPregresse?: number;
  isCasoGrave?: boolean;
  dettagli: string;
}

export interface OraScoperta {
  ora: number;
  classe: string;
  docenteAssente: Docente;
  motivo: MotivoAssenza;
  isUscita: boolean;
}

export interface SostituzioneAssegnata {
  id: string;
  data: string;
  giorno: GiornoSettimana;
  ora: number;
  classe: string;
  docenteAssenteId: string;
  docenteSostitutoId: string;
  categoria: CategoriaSostituto;
  isStraordinario: boolean;
  consumaDebito: boolean;
  pubblicata: boolean;
  firmata: boolean;
  dataFirma?: string;
}

export interface NotificaDocente {
  id: string;
  docenteId: string;
  data: string;
  ora: number;
  classe: string;
  tipo: 'NUOVA_SOSTITUZIONE' | 'SOSTITUZIONE_ANNULLATA';
  titolo: string;
  messaggio: string;
  letta: boolean;
  createdAt: string;
}


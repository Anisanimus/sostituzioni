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
  email?: string;                // Email istituzionale Google Workspace
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

export type RuoloSistema = 'SUPER_ADMIN' | 'VICEPRESIDENZA' | 'DOCENTE' | 'PERSONALE_ATA' | 'GUEST';

export interface UtenteAutenticato {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  ruolo: RuoloSistema;
  scuolaId: string;
  docenteCollegatoId?: string; // Se è un docente, l'ID corrispondente
}

export interface IstitutoScolastico {
  id: string;                    // Es. "IC_ANNA_FRANK"
  codiceMeccanografico?: string;
  nomeScuola: string;
  dominiAutorizzati: string[];   // Es. ["icannafrank.edu.it"]
  emailVicepresidenza: string[]; // Es. ["vicepresidenza@icannafrank.edu.it"]
  attiva: boolean;
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
  | 'STRAORDINARIO_D'
  | 'SMISTAMENTO_CLASSE'
  | 'NON_SOSTITUIRE';

export interface ImpostazioniPriorita {
  prioritaAssenze: CategoriaSostituto[];
  prioritaGite: CategoriaSostituto[];
}

export interface CalendarioGoogleCustom {
  id: string;          // ID unico del record (es. 'cal_1234')
  nome: string;        // Nome personalizzato (es. "Impegni Plenari", "Aula Informatica", "Palestra")
  googleId: string;    // ID del Google Calendar (es. "rosselli@icginostrada.it" o "c_xxxx@group.calendar.google.com")
  colore?: string;     // Colore esadecimale opzionale
}

export interface ImpostazioniScuola {
  nomeScuola: string;
  appUrl?: string; // URL pubblico dell'applicazione web/PWA (es. https://sostituzioni-smart.web.app)
  // 1. Iconcina Intestazione Barra & Menu (Interna)
  logoUrl?: string; // Base64 o URL immagine logo personalizzato
  logoTipo?: 'DEFAULT' | 'CUSTOM_IMAGE' | 'BOOK' | 'GRADUATION' | 'BUILDING' | 'PALETTE' | 'SHIELD';
  // 2. Icona Principale Applicazione (PWA, Home Screen, Favicon Scheda Browser)
  appIconUrl?: string; // Base64 o URL icona app
  appIconTipo?: 'DEFAULT' | 'CUSTOM_IMAGE' | 'SMART_CLOCK' | 'TOGA_SHIELD' | 'SMART_S' | 'CLOCK_TOWER';
  tettoMaxPermessiBreviAnno: number;
  tettoMaxAssembleeSindacaliAnno: number;
  vistaTabellonePredefinita: 'GRUPPI_ORA' | 'PER_DOCENTE';
  nascondiWeekendCalendario: boolean;
  giorniFestivi?: string[]; // Array di date ISO YYYY-MM-DD per festività, ponti e chiusure
  pinPersonaleAta?: string; // PIN di accesso riservato per Personale ATA / Segreteria
  dominiAutorizzatiGoogle?: string[]; // Domini email ammessi (es. ["icannafrank.edu.it", "scuola.edu.it"])
  emailVicepresidenzaGoogle?: string[]; // Email con poteri di Vicepresidenza/Admin (es. ["vicepresidenza@..."])
  notificheEmailGruppo?: {
    abilitato: boolean;
    emailGruppo: string;          // es. "docenti-tutti@icannafrank.edu.it"
    orarioInvio: string;          // es. "07:30"
    oggetto: string;              // Oggetto della mail
    corpoMessaggio: string;       // Testo personalizzato con link al portale
    webhookAppScriptUrl?: string; // URL Webhook Google Apps Script (per invio 100% invisibile da server Google)
    ultimoInvioData?: string;     // YYYY-MM-DD
  };
  notificheEmailDocenteSingolo?: {
    abilitato: boolean;           // Abilita invio email personale ai docenti supplenti
    inviaRiepilogoMattino: boolean; // Invio al mattino (orario invio gruppo o personalizzato)
    orarioInvioRiepilogo?: string; // es. "07:30" (orario dedicato riepilogo docente)
    inviaIstantaneeOrarioLavoro: boolean; // Invio istantaneo per nuove assegnazioni o revoche nella fascia oraria
    orarioInizioIstantanee?: string; // es. "08:00"
    orarioFineIstantanee?: string;   // es. "17:00"
    modelli?: {
      // 1. Nuova assegnazione istantanea
      assegnazioneOggetto?: string;
      assegnazioneCorpo?: string;
      // 2. Supplenza revocata / annullata
      annullamentoOggetto?: string;
      annullamentoCorpo?: string;
      // 3. Riepilogo mattutino
      riepilogoOggetto?: string;
      riepilogoCorpo?: string;
    };
  };
  calendariGoogle?: {
    // Liste dinamiche generiche
    impegni?: CalendarioGoogleCustom[];
    risorse?: CalendarioGoogleCustom[];
    // Campi legacy per retrocompatibilità
    impegniPlenariId?: string;
    impegniSecondariaId?: string;
    risorseInformaticaId?: string;
    risorseTeatroId?: string;
  };
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

export interface RichiestaAccessoDocente {
  id: string;
  email: string;
  displayName: string;
  dataRichiesta: string;
  docenteSuggeritoId?: string;
  docenteSuggeritoNome?: string;
  stato: 'IN_ATTESA' | 'APPROVATA' | 'RIFIUTATA';
}

export interface NominaSupplente {
  id: string;
  docenteTitolareId: string;       // ID o baseNome del titolare di cattedra
  docenteTitolareNome: string;     // Nome del docente di ruolo
  docenteSostituitoDaNominaId?: string; // Se è una sub-supplenza, l'ID della nomina padre
  supplenteNome: string;           // Nome del supplente nominato
  supplenteEmail?: string;         // Email Google per accesso portale docente
  dataInizio: string;              // YYYY-MM-DD (Presa di servizio)
  dataFine: string;                // YYYY-MM-DD
  motivo?: string;                 // es. Maternità, Infortunio, Malattia Lunga
  note?: string;
  creataIl: string;
}

export interface AnnuncioBacheca {
  id: string;
  data: string;          // YYYY-MM-DD
  dataFine?: string;      // YYYY-MM-DD (se periodo)
  testo: string;
  autore?: string;
  createdAt: string;
}




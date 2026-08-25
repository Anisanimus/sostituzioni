import { Docente, OrarioDocente, GiornoSettimana, TipoMateria, CellaOrario, TipoOra } from '../types';

export const DOCENTI_PRECARICATI: Docente[] = [
  // LETTERE
  { id: 'pellegrino', nome: 'ROSSI MARIO', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'frassi', nome: 'BIANCHI LAURA', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'viotto', nome: 'VERDI GIUSEPPE', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'nobile_c', nome: 'FERRARI ALESSANDRO', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'la_grotta', nome: 'ESPOSITO CLAUDIA', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'merlo', nome: 'ROMANO MARCO', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'saracco', nome: 'COLOMBO SILVIA', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'coletta', nome: 'RICCI ANDREA', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'simioni', nome: 'MARINO VALENTINA', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'foti', nome: 'GRECO DAVIDE', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'merli', nome: 'BRUNO CHIARA', materia: 'LETTERE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  
  // MATEMATICA
  { id: 'montesperelli', nome: 'GALLI FEDERICO', materia: 'MATEMATICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'guarino', nome: 'CONTI ELENA', materia: 'MATEMATICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'salvetto', nome: 'DE LUCA SIMONE', materia: 'MATEMATICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'croni', nome: 'COSTA MATTEO', materia: 'MATEMATICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'trabucco', nome: 'GIORDANO SARA', materia: 'MATEMATICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'di_mambro', nome: 'RIZZO FABIO', materia: 'MATEMATICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // FRANCESE
  { id: 'd_autilio', nome: 'LOMBARDI MARTA', materia: 'FRANCESE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'cannistraro', nome: 'MORETTI LUCA', materia: 'FRANCESE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // INGLESE
  { id: 'paradiso', nome: 'BARBIERI GIULIA', materia: 'INGLESE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'bussino', nome: 'FONTANA ROBERTO', materia: 'INGLESE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'd_agate', nome: 'SANTORO ELISA', materia: 'INGLESE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // TECNOLOGIA
  { id: 'chirico', nome: 'MARI ELENA', materia: 'TECNOLOGIA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'gulino', nome: 'RINALDI STEFANO', materia: 'TECNOLOGIA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // ARTE
  { id: 'elice', nome: 'CARUSO ALICE', materia: 'ARTE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'vassiadis', nome: 'FERRARO DANIELE', materia: 'ARTE', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // MUSICA
  { id: 'vighetto', nome: 'LEONE BEATRICE', materia: 'MUSICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'verzi', nome: 'LONGO GIOVANNI', materia: 'MUSICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // ED. FISICA
  { id: 'parato', nome: 'GENTILE MASSIMO', materia: 'ED. FISICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'falcone', nome: 'MARTINELLI ANNA', materia: 'ED. FISICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'rando_ef', nome: 'VITALE PAOLA (ED. FISICA)', materia: 'ED. FISICA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // IRC & STRUMENTO
  { id: 'marchi', nome: 'SERRA TOMMASO', materia: 'IRC', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'brutti', nome: 'BENEDETTI ENRICO', materia: 'STRUMENTO', dettaglioMateria: 'VIOLINO', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'cravero', nome: 'PELLEGRINI SOFIA', materia: 'STRUMENTO', dettaglioMateria: 'FLAUTO', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'pascali', nome: 'PALUMBO GABRIELE', materia: 'STRUMENTO', dettaglioMateria: 'CLARINETTO', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'defeo', nome: 'D\'AMICO FEDERICO', materia: 'STRUMENTO', dettaglioMateria: 'CHITARRA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // SOSTEGNO
  { id: 'distefano', nome: 'SORRENTINO GIULIA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'carrozza', nome: 'DE ANGELIS ROSA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'corbellini', nome: 'FARINA DEBORA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'aldi', nome: 'PARISI MARCO', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'coccia', nome: 'BERNARDI DOMENICA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'fazzone', nome: 'MARCHETTI NOEMI', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'maza', nome: 'VILLA MARCO', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'nuccio', nome: 'ORLANDO ANTONELLA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'esposito', nome: 'FERRI MARIA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'castronovo', nome: 'MAZZI IRENE', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'barbaro', nome: 'ROSSINI DANIELA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'dho', nome: 'SILVESTRI STEFANIA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'venezia', nome: 'TESTA ALBA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'papa', nome: 'GRASSI ANNA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'mure', nome: 'D\'ANGELO CARMELA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'rando_sost', nome: 'VITALE PAOLA (SOSTEGNO)', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'melchiorri', nome: 'PIRAS DANIELA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'volpe', nome: 'LISI MARIA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'fiore', nome: 'FABBRI ILARIA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'spataro', nome: 'PELLEGRINI DOMENICO', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'romano', nome: 'DE ROSA AZZURRA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'palazzo', nome: 'GUERRA KATIA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'coppola', nome: 'COSTA FEDERICA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'galante', nome: 'PAGANO PIETRO', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'aime_sost', nome: 'VALENTI GIANLUCA (SOSTEGNO)', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'castellano', nome: 'BASILE ILARIA', materia: 'SOSTEGNO', isSostegno: true, isEducatore: false, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // POTENZIAMENTO
  { id: 'aime_pot', nome: 'VALENTI GIANLUCA', materia: 'POTENZIAMENTO', isSostegno: false, isEducatore: false, isPotenziamento: true, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'simioni_pot', nome: 'MARINO VALENTINA', materia: 'POTENZIAMENTO', isSostegno: false, isEducatore: false, isPotenziamento: true, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'merli_pot', nome: 'BRUNO CHIARA', materia: 'POTENZIAMENTO', isSostegno: false, isEducatore: false, isPotenziamento: true, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // ALTERNATIVA
  { id: 'saracco_alt', nome: 'COLOMBO SILVIA', materia: 'ALTERNATIVA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: true, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'foti_alt', nome: 'GRECO DAVIDE', materia: 'ALTERNATIVA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: true, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'brutti_alt', nome: 'BENEDETTI ENRICO', materia: 'ALTERNATIVA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: true, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'coletta_alt', nome: 'RICCI ANDREA', materia: 'ALTERNATIVA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: true, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'gulino_alt', nome: 'RINALDI STEFANO', materia: 'ALTERNATIVA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: true, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'simioni_alt', nome: 'MARINO VALENTINA', materia: 'ALTERNATIVA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: true, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'chirico_alt', nome: 'MARI ELENA', materia: 'ALTERNATIVA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: true, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'trabucco_alt', nome: 'GIORDANO SARA', materia: 'ALTERNATIVA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: true, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'cravero_alt', nome: 'PELLEGRINI SOFIA', materia: 'ALTERNATIVA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: true, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'coppola_alt', nome: 'COSTA FEDERICA', materia: 'ALTERNATIVA', isSostegno: false, isEducatore: false, isPotenziamento: false, isAlternativa: true, oreDebitoPermesso: 0, pinAccesso: '1234' },

  // EDUCATORI
  { id: 'thiebat', nome: 'CLARA BONI (1C)', materia: 'EDUCATORE', classeRiferimento: '1C', isSostegno: false, isEducatore: true, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'milieri', nome: 'ELENA NERI (1E)', materia: 'EDUCATORE', classeRiferimento: '1E', isSostegno: false, isEducatore: true, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'brambini', nome: 'FEDERICA POLI (3C)', materia: 'EDUCATORE', classeRiferimento: '3C', isSostegno: false, isEducatore: true, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'montesion', nome: 'MARTINA GATTI (2A)', materia: 'EDUCATORE', classeRiferimento: '2A', isSostegno: false, isEducatore: true, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'chiodi', nome: 'LUCIA RIVA (1A)', materia: 'EDUCATORE', classeRiferimento: '1A', isSostegno: false, isEducatore: true, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'montalti', nome: 'SIMONA ROTA (2D)', materia: 'EDUCATORE', classeRiferimento: '2D', isSostegno: false, isEducatore: true, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
  { id: 'contratto', nome: 'SARA DONATI (3C)', materia: 'EDUCATORE', classeRiferimento: '3C', isSostegno: false, isEducatore: true, isPotenziamento: false, isAlternativa: false, oreDebitoPermesso: 0, pinAccesso: '1234' },
];

export const GIORNI: GiornoSettimana[] = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

// Matrice Oraria Esatta: 9 Colonne per ogni giorno (Lunedì, Martedì, Mercoledì, Giovedì, Venerdì) = 45 colonne totali
const rawTimetable9Cols: { [docId: string]: string[] } = {
  // Lettere
  pellegrino:   [
    '','','1B','1B','1D','1D','','','',          // Lunedì (1-9)
    '1B','1D','1D','D','','','','','',            // Martedì (1-9)
    '1B','1B','1D','1D','','','','','',          // Mercoledì
    '1B','1B','1D','1D','','','','','',          // Giovedì
    '1D','1D','D','1B','','','','',''            // Venerdì
  ],
  frassi:       [
    'D','2A','2A','','1A','1A','','','',
    '1A','1A','','2A','2A','2A','','','',
    '2A','2A','D','','','','','','',
    '1A','1A','1A','2A','2A','','','','',
    'D','1A','2A','','','','','',''
  ],
  viotto:       [
    '3C','3C','1C','D','','','','','',
    '1C','1C','3C','3C','','','','','',
    '1C','1C','3C','3C','','','','','',
    '3C','3C','','1C','1C','','','','',
    'D','3C','3C','1C','','','','',''
  ],
  nobile_c:     [
    'D','3A','3A','','3D','3D','','','',
    '','','','3A','3A','','','','',
    '','3A','3A','','3D','','','','',
    'D','3A','3A','D','','','','','',
    '3A','3A','3D','D','','','','',''
  ],
  la_grotta:    [
    '3F','3F','2F','2F','D','','','','',
    '2F','2F','D','3F','3F','','','','',
    'D','D','3F','3F','','','','','',
    '3F','3F','2F','2F','','','','','',
    '2F','2F','3F','3F','D','','','',''
  ],
  merlo:        [
    '3D','3D','','2D','1E','','','','',
    '1E','1E','2E','3D','','2D','','','',
    '2D','D','1E','D','','','','','',
    '2D','2D','2E','3D','','','','','',
    'D','2D','3D','3D','','','','',''
  ],
  saracco:      [
    '3E','3E','D','','','','','','',
    '','1F','1F','','3E','3E','','','',
    '3E','3E','','1F','1F','','','','',
    '1F','1F','3E','3E','','','','','',
    '1F','1F','','3E','3E','D','','',''
  ],
  coletta:      [
    '3B','3B','2C','2C','D','','','','',
    '2C','2C','3B','3B','D','','','','',
    '2C','2C','D','3B','3B','','','','',
    '3B','3B','D','D','','','','','',
    '2C','2C','3B','3B','D','','','',''
  ],
  simioni:      [
    '2B','2B','','','D','','','','',
    '2B','2B','','2F','2F','','','','',
    'D','2B','2B','','','','','','',
    'D','2B','2B','','','','','','',
    '2B','2B','D','','','','','',''
  ],
  foti:         [
    '2D','','2E','D','2D','','','','',
    '2E','2E','D','1A','','','','','',
    '2E','2E','D','','','','','','',
    'D','2E','2E','1A','','','','','',
    'D','2D','2D','2E','','','','',''
  ],
  merli:        [
    '','D','D','1E','1F','1C','','','',
    'D','1E','1E','1C','1F','','','','',
    'D','2C','','','','','','','',
    'D','1B','1E','','','','','','',
    '1B','2C','1E','1E','','','','',''
  ],

  // Matematica
  montesperelli:[
    '1A','1A','','3A','2A','','','','',
    '3A','3A','2A','D','','','','','',
    '','2A','D','3A','1A','','','','',
    '2A','2A','1A','3A','','','','','',
    '1A','1A','3A','2A','D','','','',''
  ],
  guarino:      [
    '1B','1B','2B','2B','','','','','',
    '3B','3B','1B','2B','','','','','',
    '2B','2B','1B','3B','','','','','',
    '2B','D','3B','1B','','','','','',
    '3B','3B','1B','','','','','',''
  ],
  salvetto:     [
    '1C','1C','3C','2C','','','','','',
    'D','3C','1C','2C','','','','','',
    '3C','3C','2C','1C','','','','','',
    '2C','2C','1C','3C','','','','','',
    'D','2C','1C','3C','','','','',''
  ],
  croni:        [
    '1E','1E','2E','3E','D','','','','',
    '3E','3E','D','2E','1E','D','','','',
    '2E','2E','D','3E','D','D','','','',
    '1E','2E','D','D','D','','','','',
    '3E','3E','1E','1E','2E','','','',''
  ],
  trabucco:     [
    '1F','1F','3F','3F','D','','','','',
    '1F','2F','2F','D','','','','','',
    '3F','3F','1F','2F','2F','','','','',
    '2F','1F','1F','3F','','','','','',
    '3F','D','2F','D','','','','',''
  ],
  di_mambro:    [
    '1D','1D','D','','','','','','',
    '2D','2D','3D','1D','','','','','',
    '3D','3D','2D','1D','','','','','',
    '2D','2D','D','3D','','','','','',
    '3D','3D','1D','1D','2D','','','',''
  ],

  // Francese
  d_autilio:    [
    'D','D','3E','3F','2C','','','','',
    'D','3F','1F','3C','2E','','','','',
    'D','D','2E','1E','','','','','',
    '3E','1E','2C','2F','1C','','','','',
    'D','3C','1C','1F','2F','','','',''
  ],
  cannistraro:  [
    '2D','1D','3D','D','3A','','','','',
    'D','1A','D','1B','2B','','','','',
    '3B','1A','2A','D','1D','','','','',
    '3D','1B','D','2D','3B','','','','',
    'D','3A','2A','2B','','','','',''
  ],

  // Inglese
  paradiso:     [
    'D','1C','2B','3B','','','','','',
    '3C','1B','1C','3B','','','','','',
    '3B','2B','1B','2C','','','','','',
    'D','2B','2C','3C','','','','','',
    '3C','1B','1C','2C','D','','','',''
  ],
  bussino:      [
    '2E','2F','3E','D','','','','','',
    'D','1F','1E','3F','','','','','',
    '1F','2F','3E','1E','2E','','','','',
    'D','3F','3E','','','','','','',
    '1E','3F','2E','2F','1F','','','',''
  ],
  d_agate:      [
    '2A','3D','1D','3A','','','','','',
    '1D','3D','D','','','','','','',
    '1D','2D','1A','2A','3A','','','','',
    '2A','3A','1A','3D','2D','','','','',
    'D','2D','1A','','','','','',''
  ],

  // Tecnologia
  chirico:      [
    '3A','2C','1E','3C','2A','','','','',
    '','','','','D','2E','1C','','',
    '2C','1A','D','','','','','','',
    '1C','3E','3C','1E','2E','','','','',
    '2A','3E','1A','3A','','','','',''
  ],
  gulino:       [
    '','','3B','3B','1B','1B','','','',
    '','','2D','2D','3D','3D','','','',
    '','','','D','2F','2F','','','',
    '2B','2B','D','D','','1D','1D','','',
    '','1F','1F','3F','3F','','','',''
  ],

  // Arte
  elice:        [
    '','','D','3C','2D','2B','','','',
    '3D','2C','2B','2D','3B','','','','',
    '1C','1C','3B','1B','1B','','','','',
    '3D','D','2C','3C','','','','','',
    '','','D','1D','1D','','','',''
  ],
  vassiadis:    [
    '','','','','3E','D','1F','1F','',
    '3F','D','1A','1A','','','','','',
    '2F','3A','3F','3E','','','','','',
    '2E','D','1E','1E','','','','','',
    '2E','2A','2A','2F','3A','','','',''
  ],

  // Musica
  vighetto:     [
    '2F','','1F','2A','3B','','','','',
    '','','','','1B','D','3F','3F','',
    '3A','1F','2B','1A','2A','','','','',
    '','','D','1B','3A','2F','','','',
    '1A','D','2B','3B','','','','',''
  ],
  verzi:        [
    '2C','2E','2D','1C','1E','','','','',
    '','','','','1D','3C','','','',
    '1D','D','2D','3D','1C','','','','',
    '','','D','3D','D','3E','2C','','',
    '1E','3C','D','2E','3E','','','',''
  ],

  // Ed. Fisica
  parato:       [
    '','','D','1A','1A','D','','','',
    '2A','2A','3A','3A','','','','','',
    '','','3D','3D','2D','2D','','','',
    '1D','1D','3B','3B','','','','','',
    '','','','','','','','',''
  ],
  falcone:      [
    '','','','','2E','2E','2F','2F','',
    '','','','3E','3E','2C','2C','','',
    '1E','1E','3C','3C','','','','','',
    '','','3F','3F','1F','1F','','','',
    '1C','1C','D','','','','','',''
  ],
  rando_ef:     [
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '2B','2B','1B','1B','','','','',''
  ],

  // IRC & Strumento
  marchi:       [
    'D','3C','1F','D','2F','3F','1B','2B','1A',
    '1D','','','D','1E','3E','3A','1C','D',
    '2A','2D','2E','3D','3B','2C','','','',
    '','','','','','','','','',
    '','','','','','','','',''
  ],
  brutti:       [
    'D','','1F','2F','3F','','','','',
    '','','','','','','D','','',
    '','2F','3F','D','1F','','','','',
    'D','','D','','','','','','',
    '','','','','','','D','',''
  ],
  cravero:      [
    '','','1F','2F','3F','','','','',
    '','','','','','','','','',
    '','2F','3F','D','1F','','','','',
    '','','','','','','','','',
    '','','','','','','D','',''
  ],
  pascali:      [
    '','','1F','2F','3F','','','','',
    '','','','','','','','','',
    '','2F','3F','1F','','','','','',
    '','','','','','','','','',
    '','','','','','','','',''
  ],
  defeo:        [
    '','','1F','2F','3F','','','','',
    '','','','','','','','','',
    '','2F','3F','1F','','','','','',
    '','','','','','','','','',
    '','','','','','','','',''
  ],

  // Sostegno
  distefano:    [
    '1B','1B','D','1B','','','','','',
    '1A','1A','1B','1B','D','','','','',
    '1A','1A','D','D','','','','','',
    'D','1B','1A','1A','','','','','',
    '1B','1B','1B','1A','1A','','','',''
  ],
  carrozza:     [
    '3A','1A','1A','3A','1A','','','','',
    '3A','1A','1A','','','','','','',
    '1A','3A','1A','','','','','','',
    '1A','3A','1A','1A','','','','','',
    '1A','1A','3A','','','','','',''
  ],
  corbellini:   [
    '3C','3C','1A','1A','','','','','',
    '3C','3C','1A','1A','','','','','',
    '3C','3C','','','','','','','',
    '3C','1A','1A','','','','','','',
    '3C','3C','1A','1A','','','','',''
  ],
  aldi:         [
    '2A','3C','2A','2A','','','','','',
    '2A','3C','2A','2A','','','','','',
    '2A','2A','3C','3C','2A','2A','','','',
    '3C','3C','3C','2A','2A','','','','',
    '3C','3C','2A','2A','2A','','','',''
  ],
  coccia:       [
    '2C','2C','','','','','','','',
    '2A','2A','2C','2A','','','','','',
    '2A','2A','2C','2C','','','','','',
    '2A','2A','2C','2C','','','','','',
    '2A','2A','2C','2C','','','','',''
  ],
  fazzone:      [
    '3A','3A','D','3A','','','','','',
    '3A','3A','3A','','','','','','',
    '3A','3A','3A','3A','','','','','',
    '3A','3A','D','3A','','','','','',
    '3A','3A','3A','','','','','',''
  ],
  maza:         [
    '3A','3A','2B','3A','','','','','',
    '3C','3A','2B','3A','3C','','','','',
    '3C','3C','2B','2B','','','','','',
    '3A','2B','','','','','','','',
    '2B','2B','3A','','','','','',''
  ],
  nuccio:       [
    '1B','3B','','','','','','','',
    '3B','3B','1B','1B','','','','','',
    '1B','3B','1B','1B','3B','','','','',
    '3B','1B','D','3B','','','','','',
    '3B','1B','3B','1B','','','','',''
  ],
  esposito:     [
    '3C','3E','3E','3E','','','','','',
    '3E','3E','D','D','','','','','',
    '3E','3C','3E','D','','','','','',
    'D','3C','3E','3C','D','','','','',
    '3E','3E','3C','3C','3C','','','',''
  ],
  castronovo:   [
    '2B','2B','2D','2D','D','','','','',
    '2B','2B','2D','2D','2D','','','','',
    'D','2B','2B','','','','','','',
    '2B','2D','2B','2B','2D','D','','','',
    '2D','2D','','','','','','',''
  ],
  barbaro:      [
    '1E','D','1C','','','','','','',
    '1E','1E','1C','1C','1C','','','','',
    'D','1C','1C','1E','1E','','','','',
    '1C','1C','1E','1E','','','','','',
    'D','1E','1C','1E','','','','',''
  ],
  dho:          [
    '3F','3F','D','3F','1C','','','','',
    '1C','1C','D','1C','3F','','','','',
    '1C','1C','D','D','1C','','','','',
    'D','1C','1C','3F','3F','D','','','',
    '3F','3F','3F','','','','','',''
  ],
  venezia:      [
    '1C','1C','1C','2C','','','','','',
    '2C','2C','D','D','1C','','','','',
    '2C','1C','1C','2C','D','','','','',
    '1C','D','1C','1C','D','','','','',
    '1C','2C','1C','','','','','',''
  ],
  papa:         [
    '3B','2C','2C','3B','D','','','','',
    '3B','3B','D','3B','D','','','','',
    '3B','2C','2C','3B','3B','','','','',
    '2C','2C','2C','D','','','','','',
    '3B','2C','D','D','','','','',''
  ],
  mure:         [
    '2D','2D','1D','1D','','','','','',
    '2D','2D','2D','1D','','','','','',
    '2D','1D','1D','2D','','','','','',
    '2D','2D','1D','','','','','','',
    '1D','1D','1D','','','','','',''
  ],
  rando_sost:   [
    'D','1D','D','3F','1D','1D','','','',
    '1D','1D','1D','3F','D','','','','',
    '3F','3F','1D','3F','1D','','','','',
    '3F','3F','3F','1D','','','','','',
    'D','2B','2B','1B','1B','','','',''
  ],
  melchiorri:   [
    '3D','3D','3D','3D','3D','','','','',
    '3D','3D','3D','3D','','','','','',
    '','','','','','','','','',
    '3D','3D','','','','','','','',
    '','','','','','','','',''
  ],
  volpe:        [
    '1E','1E','2B','2B','','','','','',
    '1E','2B','2B','1E','','','','','',
    '1E','1E','2B','','','','','','',
    '1E','2B','1E','1E','','','','','',
    '2B','2B','','','','','','',''
  ],
  fiore:        [
    'D','2E','2E','','','','','','',
    'D','D','2E','2E','2E','','','','',
    '2E','2E','2E','2E','2E','','','','',
    '2E','2E','2E','2E','','','','','',
    '2E','2E','2E','','','','','',''
  ],
  spataro:      [
    '2B','2B','3C','2B','','','','','',
    '2F','2F','2F','2B','2B','','','','',
    '2B','2B','2F','2F','','','','','',
    '2B','2B','2F','','','','','','',
    '2F','2B','2B','','','','','',''
  ],
  romano:       [
    'D','3E','3D','3D','3D','D','','','',
    'D','3E','3D','3D','3D','','','','',
    '3D','3D','3E','3E','','','','','',
    '3E','3D','3E','D','','','','','',
    '3D','3D','D','','','','','',''
  ],
  palazzo:      [
    '1F','1F','1F','','','','','','',
    '1F','1F','1F','','','','','','',
    '3D','3D','1F','1F','1F','','','','',
    '3D','3D','','','','','','','',
    '3D','3D','1F','1F','1F','','','',''
  ],
  coppola:      [
    '1F','1F','3B','','','','','','',
    '1F','1F','3B','','','','','','',
    '1F','1F','3B','','','','','','',
    '1F','1F','1F','1F','3B','','','','',
    '1F','1F','3B','','','','','',''
  ],
  galante:      [
    '2A','3D','3E','3E','2A','','','','',
    '3E','3D','2A','D','D','','','','',
    '3E','3E','D','2A','2A','','','','',
    'D','3E','D','3E','','','','','',
    'D','3E','2A','2A','2A','','','',''
  ],
  aime_sost:    [
    '2D','2D','2D','','','','','','',
    '2D','','','','','','','','',
    '2D','','','','','','','','',
    '2D','2D','','','','','','','',
    '2D','2D','2D','','','','','',''
  ],
  castellano:   [
    'D','3B','3B','3B','D','','','','',
    '','','','','','','','','',
    'D','3B','3B','3B','D','','','','',
    '3B','D','3B','3B','','','','','',
    '','','','','','','','',''
  ],

  // Potenziamento P
  aime_pot:     [
    '','','P','','','','','','',
    '','P','','','','','','','',
    'P','','','P','P','','','','',
    '','','','P','P','','','','',
    'P','','','','','','','',''
  ],
  simioni_pot:  [
    '','','P','P','','','','','',
    '','','','','','','','','',
    '','','P','','','','','','',
    '','','P','','','','','','',
    '','P','','P','','','','',''
  ],
  merli_pot:    [
    '','','','','','','','','',
    '','','','','','','','','',
    '','','P','P','','','','','',
    '','P','','','','','','','',
    '','','P','','','','','',''
  ],

  // Alternativa
  saracco_alt:  [
    '','','','','','','','','',
    '','','','1A','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','',''
  ],
  foti_alt:     [
    '','','','','','1F','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','',''
  ],
  brutti_alt:   [
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','1C','','','','','','','',
    '','','','','','','','',''
  ],
  coletta_alt:  [
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','2A','','','','','','',
    '','','','','','','','',''
  ],
  gulino_alt:   [
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','2E','','','','','','',''
  ],
  simioni_alt:  [
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','3D','','','','','',''
  ],
  chirico_alt:  [
    '','','','','','','','','',
    '','2B','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','',''
  ],
  trabucco_alt: [
    '','','','','','','','','',
    '1B','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','',''
  ],
  cravero_alt:  [
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','3B','','','','',''
  ],
  coppola_alt:  [
    '','','','','','','','','',
    '','','','','','','','','',
    '','','','','1E','','','','',
    '','','','','','','','','',
    '','','','','','','','',''
  ],

  // Educatori
  thiebat:      [
    '1C','1C','1C','1C','','','','','',
    '','','','','','','','','',
    '','','','','','','','','',
    '','','1C','1C','','','','','',
    '1C','1C','1C','1C','','','','',''
  ],
  milieri:      [
    '','','1E','1E','1E','','','','',
    '','','1E','1E','','','','','',
    '','','','','','1E','','','',
    '','','','','','','','','',
    '1E','1E','1E','','1E','','','',''
  ],
  brambini:     [
    '','','3C','3C','','','','','',
    '','3C','3C','3C','3D','','','','',
    '3C','3C','3D','3D','3D','3D','','','',
    '3C','3D','3C','3C','','','','','',
    '3D','3D','3D','3D','','','','',''
  ],
  montesion:    [
    '2A','2A','2A','2A','','','','','',
    '','','','','','','','','',
    '2A','2A','','','','','','','',
    '2A','2A','','','','','','','',
    '2A','2A','','','','','','',''
  ],
  chiodi:       [
    '1A','1A','1A','','','','','','',
    '','','1A','1A','','','','','',
    '','','1A','1A','1A','','','','',
    '','','','','','','','','',
    '1A','1A','','','','','','',''
  ],
  montalti:     [
    '','','2D','2D','','','','','',
    '','','','','','','','','',
    '','','2D','2D','','','','','',
    '','','2D','2D','','','','','',
    '2D','2D','2D','2D','','','','',''
  ],
  contratto:    [
    '3C','3C','3C','3E','','','','','',
    '3E','3C','3E','3C','','','','','',
    '3E','3E','3E','','','','','','',
    '3E','3E','3C','3C','','','','','',
    '3E','3E','3C','3E','3E','','','',''
  ]
};

export const ORARI_DOCENTI_PRECARICATI: OrarioDocente[] = DOCENTI_PRECARICATI.map(doc => {
  const rowVals = rawTimetable9Cols[doc.id] || [];
  const ore: CellaOrario[] = [];
  let idx = 0;

  for (let g = 0; g < GIORNI.length; g++) {
    const giorno = GIORNI[g];
    for (let ora = 1; ora <= 9; ora++) {
      const val = (rowVals[idx] || '').trim();
      let tipo: TipoOra = 'LIBERO';
      if (val === 'D') tipo = 'D';
      else if (val === 'P') tipo = 'P';
      else if (val !== '') tipo = 'LEZIONE';

      ore.push({
        giorno,
        ora,
        valore: val,
        tipo
      });
      idx++;
    }
  }

  return {
    docenteId: doc.id,
    ore
  };
});

export interface AppVersionInfo {
  version: string;
  buildTime: string;
  title: string;
  novita: string[];
}

export const CURRENT_APP_VERSION: AppVersionInfo = {
  version: '1.4.2',
  buildTime: '2026-09-03T15:15:00Z',
  title: 'Versione 1.4.2',
  novita: [
    'Ridisegnato Bilanci & Report a 4 reparti con Drawer movimenti',
    'Supporto a soggiorni e viaggi di istruzione multi-giorno in Aggiungi Gita',
    'Migliorata la visualizzazione della classe a tutta larghezza nell\'orario',
    'Nuovo sistema di aggiornamento istantaneo automatico'
  ]
};

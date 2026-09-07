import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, X, Check } from 'lucide-react';

interface Step {
  targetId?: string;
  titolo: string;
  descrizione: string;
  tip: string;
  pos?: 'top' | 'bottom' | 'center';
}

const GUIDA_STEPS_VICE: Step[] = [
  {
    targetId: 'targetDataNavigator',
    titolo: '1. Scelta del Giorno & Avanzamento Lavori',
    descrizione: 'Controlla e seleziona la data di lavoro con le freccette o clicca sulle schede giornaliere. Il tabellone, gli eventi e le risorse si aggiornano all\'istante.',
    tip: 'Puoi cliccare su "Settimana" o "Mese" (o sull\'icona 📈 da smartphone) per visualizzare il trend delle assenze future.',
    pos: 'bottom'
  },
  {
    targetId: 'targetBtnAssente',
    titolo: '2. Registra un Docente Assente',
    descrizione: 'Registra rapidamente l\'assenza di un docente: puoi impostarla per l\'intera giornata, per un periodo di date, o per singole ore/permessi brevi.',
    tip: 'L\'app genera in tempo reale gli slot scoperti per tutte le classi di quell\'insegnante e traccia il monte ore di debito.',
    pos: 'bottom'
  },
  {
    targetId: 'targetBtnGita',
    titolo: '3. Registra Uscite & Gite Didattiche',
    descrizione: 'Registra le uscite didattiche selezionando le classi partecipanti e i docenti accompagnatori.',
    tip: 'I docenti curricolari rimasti a scuola vengono automaticamente liberati e resi disponibili come risorse per le supplenze!',
    pos: 'bottom'
  },
  {
    targetId: 'targetBtnNomina',
    titolo: '4. Nomina Supplenti su Cattedra',
    descrizione: 'Gestisci le supplenze su assenze prolungate: associa un supplente al titolare. Il supplente eredita orario e classi, coprendo il periodo senza generare ore scoperte.',
    tip: 'Supporta catene ricorsive e proroghe con aggiornamento automatico di anagrafica e orari.',
    pos: 'bottom'
  },
  {
    targetId: 'targetBtnRisorse',
    titolo: '5. Consulta le Risorse Disponibili',
    descrizione: 'Visualizza ora per ora i docenti disponibili a costo zero: docenti in Potenziamento (⚡), docenti liberati da uscite didattiche (🚌) e ore a disposizione (⏱️).',
    tip: 'Su desktop apre il comodo pannello laterale, su smartphone espande il riepilogo orario.',
    pos: 'bottom'
  },
  {
    targetId: 'targetSelettoreViste',
    titolo: '6. Scegli la Vista del Tabellone',
    descrizione: 'Commuta a piacere tra la visualizzazione "A Blocchi Orari" (1ª, 2ª ora...) e la vista "Per Docente Assente", con il pratico pulsante per espandere o comprimere tutto.',
    tip: 'Puoi impostare la tua vista predefinita preferita nella sezione Personalizzazioni.',
    pos: 'bottom'
  },
  {
    targetId: 'targetBtnAssegnaTutto',
    titolo: '7. Assegnazione Automatica Smart (1 Click)',
    descrizione: 'Premi "Assegna Tutto": l\'algoritmo intelligente assegna istantaneamente tutte le supplenze rispettando compresenze, debiti, potenziamento e rotazione equa.',
    tip: 'Nella sezione Personalizzazioni puoi riordinare la scala di priorità secondo le regole del tuo istituto.',
    pos: 'bottom'
  },
  {
    targetId: 'targetSlotOraScoperta',
    titolo: '8. Assegnazione Manuale, Co-Docenze & Note',
    descrizione: 'Clicca su uno slot scoperto per scegliere tu il sostituto ideale con punteggio e debito. Puoi assegnare anche co-docenti multipli, smistamenti o note (es. "Uscita anticipata", "Entrata posticipata", "INVALSI").',
    tip: 'Puoi aggiungere sia docenti che note contemporaneamente sullo stesso slot in qualsiasi ordine.',
    pos: 'bottom'
  },
  {
    targetId: 'targetBtnPubblicaFirme',
    titolo: '9. Pubblica Firme & Notifiche Email',
    descrizione: 'Quando il quadro è pronto, clicca su "Pubblica Firme": i docenti ricevono notifica (e le email automatiche se attive) e possono firmare digitalmente dal loro portale!',
    tip: 'Zero carta, tracciabilità legale con marca temporale e monitoraggio firme in tempo reale.',
    pos: 'bottom'
  }
];

const GUIDA_STEPS_DOCENTE: Step[] = [
  {
    titolo: '1. Benvenuto nel Portale Docente',
    descrizione: 'Qui visualizzi in tempo reale le supplenze a te assegnate, il quadro generale dell\'istituto, il tuo orario settimanale e i tuoi impegni collegiali.',
    tip: 'Accedi comodamente da smartphone, tablet o PC con il tuo account Google istituzionale.',
    pos: 'center'
  },
  {
    titolo: '2. Presa Visione & Firma Digitale',
    descrizione: 'Nella scheda "Le Mie Supplenze", trovi le ore di sostituzione assegnate dalla Vicepresidenza. Clicca su "Firma per Presa Visione" per confermare con un click.',
    tip: 'La firma registra istantaneamente data e ora esatta, eliminando registri e fogli cartacei in vicepresidenza.',
    pos: 'center'
  },
  {
    titolo: '3. Quadro Sostituzioni dell\'Istituto',
    descrizione: 'Nella scheda "Quadro Sostituzioni", consulta il prospetto generale di tutte le classi della scuola e dei colleghi assenti o impegnati per la giornata.',
    tip: 'Ideale per sapere in anticipo come sono coperte le classi vicine o i colleghi del proprio team.',
    pos: 'center'
  },
  {
    titolo: '4. Orari, Consigli di Classe & Calendari Google',
    descrizione: 'Consulta il tuo orario personale o quello di qualsiasi collega e classe. Visualizza la composizione dei Consigli di Classe e gli appuntamenti collegiali (consigli, scrutini, collegi) e aule speciali (laboratori, teatro, palestra).',
    tip: 'Puoi esportare o stampare il tuo orario anche in formato PDF con un click.',
    pos: 'center'
  }
];

const GUIDA_STEPS_ATA: Step[] = [
  {
    titolo: '1. Benvenuto nell\'Area Personale ATA & Collaboratori',
    descrizione: 'Questa sezione è dedicata ai collaboratori scolastici e alla segreteria: offre una panoramica chiara e immediata delle presenze e delle supplenze del giorno.',
    tip: 'Accedi velocemente digitando il PIN numerico della scuola o con account Google autorizzato.',
    pos: 'center'
  },
  {
    titolo: '2. Quadro Generale Sostituzioni del Giorno',
    descrizione: 'Visualizza ora per ora quali docenti sono assenti, quali classi hanno una variazione oraria e chi è il docente sostituto presente in aula.',
    tip: 'Consente ai collaboratori di piano di sapere esattamente chi si trova in ciascuna aula in ogni momento.',
    pos: 'center'
  },
  {
    titolo: '3. Consultazione Orari, Aule & Impegni',
    descrizione: 'Cerca istantaneamente l\'orario di qualsiasi docente o classe, l\'elenco insegnanti per sezione e le prenotazioni delle aule speciali.',
    tip: 'Tutti i dati si aggiornano automaticamente in tempo reale non appena la Vicepresidenza effettua modifiche.',
    pos: 'center'
  }
];

export interface CoachmarkProps {
  isOpen?: boolean;
  onClose?: () => void;
  ruolo?: 'VICEPRESIDENZA' | 'PORTALE_DOCENTE' | 'QUADRO_SCUOLA';
}

export const Coachmark: React.FC<CoachmarkProps> = ({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  ruolo = 'VICEPRESIDENZA'
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const [cardPos, setCardPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number; width?: string; maxWidth?: string }>({});

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  // Seleziona i passi della guida in base al profilo/ruolo attivo
  const activeSteps = React.useMemo(() => {
    if (ruolo === 'PORTALE_DOCENTE') return GUIDA_STEPS_DOCENTE;
    if (ruolo === 'QUADRO_SCUOLA') return GUIDA_STEPS_ATA;
    return GUIDA_STEPS_VICE;
  }, [ruolo]);

  const roleLabel = React.useMemo(() => {
    if (ruolo === 'PORTALE_DOCENTE') return 'Guida Portale Docenti';
    if (ruolo === 'QUADRO_SCUOLA') return 'Guida Personale ATA';
    return 'Guida Vicepresidenza';
  }, [ruolo]);

  const roleColor = React.useMemo(() => {
    if (ruolo === 'PORTALE_DOCENTE') return 'bg-emerald-600';
    if (ruolo === 'QUADRO_SCUOLA') return 'bg-amber-600';
    return 'bg-indigo-600';
  }, [ruolo]);

  useEffect(() => {
    if (externalIsOpen) {
      setCurrentStepIdx(0);
    }
  }, [externalIsOpen, ruolo]);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('scuola_has_seen_tour_v2');
    if (!hasSeenTour && externalIsOpen === undefined) {
      setInternalIsOpen(true);
    }
  }, [externalIsOpen]);

  const updateCardPosition = (idx: number) => {
    const step = activeSteps[idx];
    if (!step) return;

    // Rimuovi classe da precedenti
    document.querySelectorAll('.spotlight-active').forEach(el => el.classList.remove('spotlight-active'));

    const isMobileSmall = window.innerWidth < 640;
    const isMobile = window.innerWidth < 1024;
    const isLandscape = window.innerHeight < 520 && window.innerWidth > window.innerHeight;

    // Se lo step non ha un targetId o è impostato su 'center', posiziona al centro dello schermo
    if (!step.targetId || step.pos === 'center') {
      const cardWidth = Math.min(440, window.innerWidth - 32);
      const cardHeight = 260;
      setCardPos({
        top: Math.max(16, Math.floor((window.innerHeight - cardHeight) / 2)),
        left: Math.max(16, Math.floor((window.innerWidth - cardWidth) / 2)),
        width: `${cardWidth}px`,
        maxWidth: 'calc(100vw - 32px)'
      });
      return;
    }

    let targetId = step.targetId;
    if (isMobileSmall && step.targetId === 'targetDataNavigator') {
      targetId = 'targetDataNavigatorMobile';
    } else if (isMobile && step.targetId === 'targetSpecchiettoRisorse') {
      targetId = 'targetBtnRisorse';
    }

    let targetElem = document.getElementById(targetId);
    if (!targetElem && step.targetId) {
      targetElem = document.getElementById(step.targetId);
    }

    if (targetElem) {
      targetElem.classList.add('spotlight-active');

      // Scroll appropriato
      if (isLandscape) {
        if (idx <= 4) {
          targetElem.scrollIntoView({ behavior: 'auto', block: 'start' });
        } else if (idx >= 7) {
          targetElem.scrollIntoView({ behavior: 'auto', block: 'end' });
        } else {
          targetElem.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      } else if (isMobileSmall && idx >= 7) {
        targetElem.scrollIntoView({ behavior: 'auto', block: 'end' });
      } else if (isMobileSmall && idx < 5) {
        targetElem.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        targetElem.scrollIntoView({ behavior: 'auto', block: 'center' });
      }

      const targetRect = targetElem.getBoundingClientRect();
      const cardElem = document.getElementById('coachmarkCard');
      const cardRect = cardElem ? cardElem.getBoundingClientRect() : { width: 400, height: 200 };
      const cardWidth = cardRect.width || 400;
      const cardHeight = cardRect.height || 200;

      // Mobile Portrait: Bottom Sheet o Top Sheet dinamico
      if (isMobileSmall && !isLandscape) {
        if (targetRect.top + targetRect.height / 2 > window.innerHeight / 2) {
          setCardPos({ top: 12, bottom: undefined, left: 12, right: 12, width: 'auto', maxWidth: 'calc(100vw - 24px)' });
        } else {
          setCardPos({ top: undefined, bottom: 12, left: 12, right: 12, width: 'auto', maxWidth: 'calc(100vw - 24px)' });
        }
        return;
      }

      // Desktop / Tablet / Landscape
      let left = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
      if (left < 16) left = 16;
      if (left + cardWidth > window.innerWidth - 16) {
        left = window.innerWidth - cardWidth - 16;
      }

      let top = 0;
      const spaceBelow = window.innerHeight - targetRect.bottom;
      const spaceAbove = targetRect.top;

      if (isLandscape) {
        if (targetRect.left > cardWidth + 16) {
          left = targetRect.left - cardWidth - 16;
          top = Math.max(12, Math.min(targetRect.top, window.innerHeight - cardHeight - 12));
          setCardPos({ top, left, width: `${cardWidth}px`, maxWidth: '400px' });
          return;
        } else if (window.innerWidth - targetRect.right > cardWidth + 16) {
          left = targetRect.right + 16;
          top = Math.max(12, Math.min(targetRect.top, window.innerHeight - cardHeight - 12));
          setCardPos({ top, left, width: `${cardWidth}px`, maxWidth: '400px' });
          return;
        } else {
          top = targetRect.top > window.innerHeight / 2 ? 12 : window.innerHeight - cardHeight - 12;
          left = Math.max(12, Math.min(left, window.innerWidth - cardWidth - 12));
          setCardPos({ top, left, width: `${cardWidth}px`, maxWidth: '400px' });
          return;
        }
      }

      // Posizionamento sopra o sotto il target in base allo spazio
      if (spaceBelow >= cardHeight + 20) {
        top = targetRect.bottom + 16;
      } else if (spaceAbove >= cardHeight + 20) {
        top = targetRect.top - cardHeight - 16;
      } else {
        top = spaceBelow > spaceAbove ? targetRect.bottom + 16 : Math.max(12, targetRect.top - cardHeight - 16);
      }

      setCardPos({ top, left, width: `${cardWidth}px`, maxWidth: '400px' });
    } else {
      // Fallback: se l'elemento non è trovato o presente nella vista
      const cardWidth = Math.min(440, window.innerWidth - 32);
      const cardHeight = 260;
      setCardPos({
        top: Math.max(16, Math.floor((window.innerHeight - cardHeight) / 2)),
        left: Math.max(16, Math.floor((window.innerWidth - cardWidth) / 2)),
        width: `${cardWidth}px`,
        maxWidth: 'calc(100vw - 32px)'
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCardPosition(currentStepIdx);
      const timer1 = setTimeout(() => updateCardPosition(currentStepIdx), 50);
      const timer2 = setTimeout(() => updateCardPosition(currentStepIdx), 150);

      const handleResize = () => updateCardPosition(currentStepIdx);
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        window.removeEventListener('resize', handleResize);
        document.querySelectorAll('.spotlight-active').forEach(el => el.classList.remove('spotlight-active'));
      };
    }
  }, [isOpen, currentStepIdx, activeSteps]);

  const handleNext = () => {
    if (currentStepIdx < activeSteps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleClose = () => {
    localStorage.setItem('scuola_has_seen_tour_v2', 'true');
    document.querySelectorAll('.spotlight-active').forEach(el => el.classList.remove('spotlight-active'));
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  if (!isOpen) return null;

  const step = activeSteps[currentStepIdx];
  if (!step) return null;

  return (
    <>
      {/* OVERLAY SFONDO SCURO */}
      <div 
        onClick={handleClose}
        className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* SCHEDA GUIDA COACHMARK */}
      <div
        id="coachmarkCard"
        style={{
          top: cardPos.top !== undefined ? `${cardPos.top}px` : undefined,
          bottom: cardPos.bottom !== undefined ? `${cardPos.bottom}px` : undefined,
          left: cardPos.left !== undefined ? `${cardPos.left}px` : undefined,
          right: cardPos.right !== undefined ? `${cardPos.right}px` : undefined,
          width: cardPos.width,
          maxWidth: cardPos.maxWidth,
        }}
        className="fixed z-50 bg-white rounded-2xl shadow-2xl border-2 border-indigo-500 p-4 sm:p-5 space-y-3 pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* HEADER CARD CON BADGE RUOLO E CHIUSURA */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full ${roleColor} text-white font-black text-xs flex items-center justify-center shadow-xs`}>
              {currentStepIdx + 1}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                {roleLabel}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                • Passo {currentStepIdx + 1} di {activeSteps.length}
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Chiudi Guida"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TITOLO E DESCRIZIONE */}
        <div className="space-y-1.5">
          <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
            {step.titolo}
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {step.descrizione}
          </p>
        </div>

        {/* TIP PRATICO */}
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-2.5 text-[11px] text-amber-900 leading-snug">
          <strong>Consiglio pratico:</strong> {step.tip}
        </div>

        {/* FOOTER CON PALLINI E PULSANTI AVANTI/INDIETRO */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1">
            {activeSteps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStepIdx ? `${roleColor} w-5` : 'bg-slate-200 w-2'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIdx > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Indietro</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className={`${roleColor} hover:opacity-90 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer`}
            >
              <span>{currentStepIdx === activeSteps.length - 1 ? 'Completa' : 'Avanti'}</span>
              {currentStepIdx === activeSteps.length - 1 ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

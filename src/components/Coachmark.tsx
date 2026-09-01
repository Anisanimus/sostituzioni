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
    titolo: '1. Scelta del Giorno di Lavoro',
    descrizione: 'Inizia sempre controllando la data. Usa le freccette per muoverti nei giorni della settimana: tutto il tabellone e le risorse si aggiorneranno in tempo reale.',
    tip: 'Le modifiche e le assegnazioni vengono salvate istantaneamente per la data selezionata.',
    pos: 'bottom'
  },
  {
    targetId: 'targetBtnAssente',
    titolo: '2. Registra un Docente Assente',
    descrizione: 'Clicca su questo pulsante quando un docente comunica assenza (giornaliera, per periodo o per singole ore/permessi).',
    tip: 'Il sistema genererà automaticamente gli slot scoperti per tutte le classi di quell\'insegnante.',
    pos: 'bottom'
  },
  {
    targetId: 'targetBtnGita',
    titolo: '3. Registra un\'Uscita o Gita Didattica',
    descrizione: 'Se ci sono classi in gita, inseriscile qui: puoi selezionare più classi contemporaneamente e indicare i docenti accompagnatori.',
    tip: 'I docenti curricolari rimasti a scuola vengono liberati e messi a disposizione per fare supplenze!',
    pos: 'bottom'
  },
  {
    targetId: 'targetSpecchiettoRisorse',
    titolo: '4. Consulta le Risorse Disponibili',
    descrizione: 'Questo specchietto riassume ora per ora chi puoi impiegare: docenti in Potenziamento (⚡), docenti liberati da gite (🚌) e disposizioni (⏱️).',
    tip: 'Cliccando sui filtri colorati in alto puoi visualizzare o nascondere le rispettive categorie di risorse.',
    pos: 'bottom'
  },
  {
    targetId: 'targetBtnAssegnaTutto',
    titolo: '5. Assegnazione Automatica (1 Click)',
    descrizione: 'Premi "Assegna Tutto": l\'algoritmo assegna tutte le supplenze rispettando i criteri stabiliti (compresenze, stessa materia, potenziamento, rotazione).',
    tip: 'Nella sezione "Personalizzazioni" puoi personalizzare liberamente l\'ordine di priorità dell\'algoritmo in base alle esigenze della tua scuola.',
    pos: 'bottom'
  },
  {
    targetId: 'targetSlotOraScoperta',
    titolo: '6. Regolazione Manuale Assistita',
    descrizione: 'Vuoi scegliere tu il docente? Clicca su qualsiasi slot scoperto: si aprirà l\'elenco con i candidati ideali ordinati per punteggio e priorità.',
    tip: 'Puoi sempre sovrascrivere o cambiare qualsiasi decisione con un semplice click.',
    pos: 'bottom'
  },
  {
    targetId: 'targetBtnPubblicaFirme',
    titolo: '7. Pubblica le Firme per i Docenti',
    descrizione: 'Quando il tabellone è completo, clicca su "Pubblica Firme": i docenti potranno accedere alla loro area personale con account Google e firmare digitalmente!',
    tip: 'Azzeri i foglietti di carta e hai la tracciabilità oraria di ogni firma presa visione.',
    pos: 'bottom'
  }
];

const GUIDA_STEPS_DOCENTE: Step[] = [
  {
    titolo: '1. Benvenuto nel Portale Docente',
    descrizione: 'Qui puoi visualizzare in tempo reale tutte le supplenze assegnate a te per la giornata, il quadro generale della scuola, il tuo orario settimanale e i tuoi impegni.',
    tip: 'Accedi comodamente da smartphone, tablet o PC usando il tuo account Google istituzionale.',
    pos: 'center'
  },
  {
    titolo: '2. Presa Visione & Firma Digitale',
    descrizione: 'Nella scheda "Le Mie Supplenze", trovi le ore di sostituzione che la Vicepresidenza ti ha assegnato. Clicca su "Firma per Presa Visione" per confermare.',
    tip: 'La firma registra istantaneamente data e ora, eliminando completamente la necessità di firmare fogli cartacei in vicepresidenza.',
    pos: 'center'
  },
  {
    titolo: '3. Quadro Sostituzioni dell\'Istituto',
    descrizione: 'Cliccando su "Quadro Sostituzioni", puoi consultare il prospetto generale di tutte le classi e dei colleghi assenti o impegnati per la giornata.',
    tip: 'Utilissimo per sapere in anticipo come sono coperte le classi adiacenti o i colleghi del proprio team/dipartimento.',
    pos: 'center'
  },
  {
    titolo: '4. Orario & Consigli di Classe',
    descrizione: 'Nelle schede "Orario" e "Consigli di Classe" puoi consultare il tuo orario settimanale, quello di qualsiasi collega o visualizzare la composizione di ciascuna classe.',
    tip: 'Trovi anche le schede dedicate ai calendari Google degli Impegni Scolastici e delle Risorse & Aule speciali se configurate dalla scuola.',
    pos: 'center'
  }
];

const GUIDA_STEPS_ATA: Step[] = [
  {
    titolo: '1. Benvenuto nell\'Area Personale ATA & Collaboratori',
    descrizione: 'Questa sezione è pensata per il personale ATA e la segreteria: offre una panoramica chiara e immediata delle supplenze e della presenza dei docenti.',
    tip: 'Puoi accedere rapidamente con il PIN della scuola o con il tuo account autorizzato.',
    pos: 'center'
  },
  {
    titolo: '2. Quadro Generale Sostituzioni del Giorno',
    descrizione: 'Visualizza ora per ora quali docenti sono assenti, quali classi hanno una variazione e chi è il docente sostituto in aula.',
    tip: 'Consente ai collaboratori scolastici di piano di sapere esattamente chi si trova in ciascuna aula in ogni momento della giornata.',
    pos: 'center'
  },
  {
    titolo: '3. Consultazione Orari e Consigli di Classe',
    descrizione: 'Puoi cercare l\'orario di qualsiasi docente o classe e visualizzare l\'elenco degli insegnanti per ciascuna sezione.',
    tip: 'Tutti i dati si aggiornano in tempo reale non appena la Vicepresidenza effettua modifiche.',
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
    if (isMobile && step.targetId === 'targetSpecchiettoRisorse') {
      targetId = 'targetSpecchiettoRisorseMobile';
    }

    const targetElem = document.getElementById(targetId);

    if (targetElem) {
      targetElem.classList.add('spotlight-active');

      // Scroll appropriato
      if (isLandscape) {
        if (idx <= 3) {
          targetElem.scrollIntoView({ behavior: 'auto', block: 'start' });
        } else if (idx === 5) {
          targetElem.scrollIntoView({ behavior: 'auto', block: 'end' });
        } else {
          targetElem.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      } else if (isMobileSmall && idx === 5) {
        targetElem.scrollIntoView({ behavior: 'auto', block: 'end' });
      } else if (isMobileSmall && idx < 4) {
        targetElem.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        targetElem.scrollIntoView({ behavior: 'auto', block: 'center' });
      }

      const targetRect = targetElem.getBoundingClientRect();
      const cardElem = document.getElementById('coachmarkCard');
      const cardRect = cardElem ? cardElem.getBoundingClientRect() : { width: 400, height: 200 };
      const cardWidth = cardRect.width || 400;
      const cardHeight = cardRect.height || 200;

      // Mobile Portrait: Bottom Sheet o Top Sheet
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

      // Step specific overrides per visibilità ottimale
      if (idx === 4 || idx === 6) {
        if (spaceBelow >= cardHeight + 20) {
          top = targetRect.bottom + 16;
        } else {
          top = Math.max(12, targetRect.top - cardHeight - 16);
        }
      } else if (spaceBelow >= cardHeight + 24) {
        top = targetRect.bottom + 20;
      } else if (spaceAbove >= cardHeight + 24) {
        top = targetRect.top - cardHeight - 20;
      } else {
        top = spaceBelow > spaceAbove ? targetRect.bottom + 20 : Math.max(12, targetRect.top - cardHeight - 20);
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

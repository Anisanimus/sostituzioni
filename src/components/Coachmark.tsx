import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, X, Check } from 'lucide-react';

interface Step {
  targetId: string;
  titolo: string;
  descrizione: string;
  tip: string;
  pos: 'top' | 'bottom' | 'center';
}

const GUIDA_STEPS: Step[] = [
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
    tip: 'Nella sezione "Regole" puoi personalizzare liberamente l\'ordine di priorità dell\'algoritmo in base alle esigenze della tua scuola.',
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
    descrizione: 'Quando il tabellone è completo, clicca su "Pubblica Firme": i docenti potranno accedere alla loro area personale con PIN e firmare digitalmente!',
    tip: 'Azzeri i foglietti di carta e hai la tracciabilità oraria di ogni firma presa visione.',
    pos: 'bottom'
  }
];

export const Coachmark: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({
  isOpen: externalIsOpen,
  onClose: externalOnClose
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const [cardPos, setCardPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number; width?: string; maxWidth?: string }>({});

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  useEffect(() => {
    if (externalIsOpen) {
      setCurrentStepIdx(0);
    }
  }, [externalIsOpen]);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('scuola_has_seen_tour_v2');
    if (!hasSeenTour && externalIsOpen === undefined) {
      setInternalIsOpen(true);
    }
  }, [externalIsOpen]);

  const updateCardPosition = (idx: number) => {
    const step = GUIDA_STEPS[idx];
    if (!step) return;

    const isMobile = window.innerWidth < 1024;
    let targetId = step.targetId;
    if (isMobile && step.targetId === 'targetSpecchiettoRisorse') {
      targetId = 'targetSpecchiettoRisorseMobile';
    }

    const targetElem = document.getElementById(targetId);

    // Rimuovi classe da precedenti
    document.querySelectorAll('.spotlight-active').forEach(el => el.classList.remove('spotlight-active'));

    if (targetElem) {
      targetElem.classList.add('spotlight-active');

      const isMobileSmall = window.innerWidth < 640;
      const isLandscape = window.innerHeight < 520 && window.innerWidth > window.innerHeight;

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
      if (idx === 4 || idx === 6) { // Step 5 (Assegna Tutto) e Step 7 (Pubblica Firme)
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
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Calcolo iniziale con update rapido post-layout
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
  }, [isOpen, currentStepIdx]);

  const handleNext = () => {
    if (currentStepIdx < GUIDA_STEPS.length - 1) {
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
    document.querySelectorAll('.spotlight-active').forEach(el => el.classList.remove('spotlight-active'));
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
    localStorage.setItem('scuola_has_seen_tour_v2', 'true');
  };

  if (!isOpen) return null;

  const step = GUIDA_STEPS[currentStepIdx];

  return (
    <>
      {/* OVERLAY SFONDO SCURO CON SPOTLIGHT */}
      <div 
        onClick={handleClose}
        className="fixed inset-0 bg-slate-950/75 z-40 backdrop-blur-xs transition-opacity duration-300 pointer-events-auto"
      />

      {/* CARD INTERATTIVA GUIDATA */}
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
        {/* HEADER CARD CON BADGE E CHIUSURA */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {currentStepIdx + 1}
            </span>
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
              Passo {currentStepIdx + 1} di {GUIDA_STEPS.length}
            </span>
          </div>

          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-lg transition"
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
            {GUIDA_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStepIdx ? 'bg-indigo-600 w-5' : 'bg-slate-200 w-2'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIdx > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Indietro</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition"
            >
              <span>{currentStepIdx === GUIDA_STEPS.length - 1 ? 'Completa' : 'Avanti'}</span>
              {currentStepIdx === GUIDA_STEPS.length - 1 ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

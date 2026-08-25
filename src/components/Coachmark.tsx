import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, HelpCircle, CheckCircle } from 'lucide-react';

interface Step {
  targetId?: string;
  titolo: string;
  descrizione: string;
  posizione: 'top' | 'bottom' | 'center';
}

const STEPS: Step[] = [
  {
    titolo: '👋 Benvenuto nel Sistema Sostituzioni!',
    descrizione: 'Questa guida rapida ti mostrerà in pochi secondi come pianificare le supplenze giornaliere, gestire le gite scolastiche e consentire ai docenti di firmare.',
    posizione: 'center'
  },
  {
    titolo: '📅 1. Scelta Data e Schede',
    descrizione: 'Dalla barra in alto puoi selezionare il giorno di lavoro e navigare tra il Quadro Sostituzioni, l\'Inserimento Assenze/Gite, il Registro Storico permanente e l\'Anagrafica.',
    posizione: 'bottom'
  },
  {
    titolo: '✨ 2. Quadro Sostituzioni & Auto-Assegna',
    descrizione: 'Le ore scoperte sono raggruppate per 1ª, 2ª, 3ª ora... Puoi cliccare su "Assegna Tutto" per generare una bozza automatica perfetta rispettando tutte le priorità normative.',
    posizione: 'bottom'
  },
  {
    titolo: '🎯 3. Selezione Manuale Assistita (Human-in-the-Loop)',
    descrizione: 'Cliccando su un\'ora scoperta si apre il popup con tutti i candidati ordinati per priorità con in cima i compresenti già presenti in aula.',
    posizione: 'center'
  },
  {
    titolo: '🚍 4. Uscite Didattiche & Gite Multi-Classe',
    descrizione: 'Nel tab "Quadro & Inserimento" puoi registrare gite indicando la meta, selezionando più classi contemporaneamente e gli accompagnatori con dropdown rapido.',
    posizione: 'center'
  },
  {
    titolo: '📱 5. Area Personale Docente & Firme',
    descrizione: 'I docenti possono accedere all\'Area Personale con il proprio PIN (default: 1234), visualizzare il proprio orario e firmare digitalmente per presa visione.',
    posizione: 'bottom'
  }
];

export const Coachmark: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({ isOpen: externalIsOpen, onClose: externalOnClose }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('scuola_has_seen_tour');
    if (!hasSeenTour) {
      setInternalIsOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
    localStorage.setItem('scuola_has_seen_tour', 'true');
  };

  if (!isOpen) return null;

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          title="Chiudi Guida"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Barra di avanzamento step */}
        <div className="flex items-center gap-1.5 pt-1">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                idx === currentStep ? 'bg-indigo-600' : idx < currentStep ? 'bg-indigo-200' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">
            Passo {currentStep + 1} di {STEPS.length}
          </span>
          <h3 className="text-lg font-black text-slate-900 leading-snug">
            {step.titolo}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {step.descrizione}
          </p>
        </div>

        {/* Bottoni di navigazione */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              currentStep === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Indietro</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1.5"
            >
              Salta
            </button>
            <button
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition"
            >
              <span>{currentStep === STEPS.length - 1 ? 'Inizia ad Usare' : 'Avanti'}</span>
              {currentStep === STEPS.length - 1 ? <CheckCircle className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, Wand2, Download, ChevronRight } from 'lucide-react';
import { elaboratePrompt, generateMasterpiece } from './services/geminiService';
import './types';

type Step = 'input' | 'elaborating' | 'review' | 'generating' | 'result';

const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

export default function App() {
  const [step, setStep] = useState<Step>('input');
  const [situation, setSituation] = useState('');
  const [description, setDescription] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  
  const [prompt, setPrompt] = useState('');
  const [feedback, setFeedback] = useState('');
  
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  const handleElaborate = async (isRefinement = false) => {
    if (!situation.trim() || !description.trim()) {
      setError('Please provide both a situation and a description.');
      return;
    }
    setError('');
    setStep('elaborating');
    try {
      const newPrompt = await elaboratePrompt(
        situation, 
        description, 
        isRefinement ? feedback : undefined, 
        isRefinement ? prompt : undefined
      );
      setPrompt(newPrompt);
      setFeedback('');
      setStep('review');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to elaborate prompt.');
      setStep(isRefinement ? 'review' : 'input');
    }
  };

  const handleGenerate = async () => {
    setError('');
    setStep('generating');
    try {
      const url = await generateMasterpiece(prompt, aspectRatio);
      setImageUrl(url);
      setStep('result');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate image.');
      setStep('review');
    }
  };

  const reset = () => {
    setStep('input');
    setPrompt('');
    setImageUrl('');
    setFeedback('');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/5 blur-[120px] rounded-full" />
      </div>

      <div className="z-10 w-full max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-5xl md:text-7xl font-light tracking-tight mb-4"
          >
            Lumina
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm uppercase tracking-[0.2em] text-white/50"
          >
            The Art of the Prompt
          </motion.p>
        </header>

        <main className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-panel p-8 md:p-12 rounded-3xl"
              >
                <div className="space-y-8">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/60 mb-3">
                      01. The Situation
                    </label>
                    <input
                      type="text"
                      value={situation}
                      onChange={(e) => setSituation(e.target.value)}
                      placeholder="e.g., A quiet cafe in Paris"
                      className="w-full input-field rounded-xl p-4 text-lg font-serif"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/60 mb-3">
                      02. The Details
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Raining outside, warm light inside, a cat sleeping on a velvet chair..."
                      className="w-full input-field rounded-xl p-4 text-lg font-serif min-h-[120px] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/60 mb-3">
                      03. Canvas Ratio
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {ASPECT_RATIOS.map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={`px-4 py-2 rounded-full text-sm transition-all ${
                            aspectRatio === ratio 
                              ? 'bg-white text-black font-medium' 
                              : 'border border-white/20 text-white/60 hover:border-white/50'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => handleElaborate(false)}
                      className="btn-primary px-8 py-4 rounded-full flex items-center gap-3 text-sm uppercase tracking-wider font-medium"
                    >
                      Envision <Sparkles size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'elaborating' && (
              <motion.div
                key="elaborating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-[400px] space-y-6"
              >
                <div className="w-16 h-16 border-t-2 border-white rounded-full animate-spin" />
                <p className="font-serif text-2xl italic text-white/80 loader-pulse">
                  Consulting the oracle...
                </p>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Crafting the perfect prompt
                </p>
              </motion.div>
            )}

            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-panel p-8 md:p-12 rounded-3xl"
              >
                <div className="space-y-8">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/60 mb-4 flex justify-between items-center">
                      <span>The Master Prompt</span>
                      <button onClick={reset} className="text-white/40 hover:text-white transition-colors">Start Over</button>
                    </label>
                    <div className="p-6 rounded-2xl bg-black/40 border border-white/10">
                      <p className="font-serif text-xl md:text-2xl leading-relaxed text-white/90">
                        {prompt}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <label className="block text-xs uppercase tracking-widest text-white/60 mb-3">
                      Refine (Optional)
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="e.g., Make it more cinematic, add neon lights..."
                        className="flex-1 input-field rounded-xl p-4 text-base"
                      />
                      <button
                        onClick={() => handleElaborate(true)}
                        disabled={!feedback.trim()}
                        className="btn-secondary px-6 rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleGenerate}
                      className="btn-primary px-8 py-4 rounded-full flex items-center gap-3 text-sm uppercase tracking-wider font-medium"
                    >
                      Manifest Image <Wand2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-[400px] space-y-6"
              >
                <div className="w-16 h-16 border-t-2 border-white rounded-full animate-spin" />
                <p className="font-serif text-2xl italic text-white/80 loader-pulse">
                  Manifesting vision...
                </p>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Rendering masterpiece
                </p>
              </motion.div>
            )}

            {step === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="relative group rounded-3xl overflow-hidden glass-panel p-2">
                  <img 
                    src={imageUrl} 
                    alt={prompt}
                    className="w-full h-auto rounded-2xl object-contain max-h-[70vh]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-3xl">
                    <a 
                      href={imageUrl} 
                      download="lumina-masterpiece.png"
                      className="btn-primary px-6 py-3 rounded-full flex items-center gap-2"
                    >
                      <Download size={18} /> Download High-Res
                    </a>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                  <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Final Prompt</p>
                  <p className="font-serif text-lg text-white/80 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                    {prompt}
                  </p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={reset}
                    className="btn-secondary px-8 py-3 rounded-full flex items-center gap-2 text-sm uppercase tracking-wider"
                  >
                    Create Another <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

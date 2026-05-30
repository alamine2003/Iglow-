import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Scan, X, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import { apiFetch } from '../api/client';

interface StockProduct {
  id: number;
  name: string;
  description: string;
  category_name: string;
  price: number;
  stock: number;
}

function getGeminiApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  return typeof key === 'string' ? key.trim() : '';
}

const GEMINI_SETUP_HINT =
  'Ajoutez VITE_GEMINI_API_KEY=votre_cle dans iglow/.env (à la racine, pas dans backend/.env), puis redémarrez le serveur (npm run dev ou docker compose restart frontend). Clé : https://aistudio.google.com/apikey';

const createGeminiClient = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(`Clé API Gemini manquante. ${GEMINI_SETUP_HINT}`);
  }
  return new GoogleGenAI({ apiKey });
};

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/api/products/', null)
      .then((res) => res.ok ? res.json() : [])
      .then((data: StockProduct[]) => {
        const inStock = (Array.isArray(data) ? data : []).filter((p) => p.stock > 0);
        setStockProducts(inStock);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!analysis) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);
    let index = 0;
    const total = analysis.length;
    const charsPerTick = Math.max(1, Math.ceil(total / 280));

    const timer = window.setInterval(() => {
      index = Math.min(index + charsPerTick, total);
      setDisplayedText(analysis.slice(0, index));
      if (index >= total) {
        setIsTyping(false);
        window.clearInterval(timer);
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [analysis]);

  useEffect(() => {
    if (!getGeminiApiKey()) {
      setError(`Configuration requise : ${GEMINI_SETUP_HINT}`);
      return;
    }
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setError(null);
    setAnalysis(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Veuillez autoriser l'accès dans votre navigateur.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

    try {
      const ai = createGeminiClient();

      const catalogSection = stockProducts.length > 0
        ? `\n\n---\n**Catalogue iGlow disponible en stock (recommande uniquement parmi ces produits) :**\n${stockProducts
            .map((p) => `- **${p.name}** (${p.category_name}) — ${Number(p.price).toLocaleString('fr-FR')} FCFA — ${p.description}`)
            .join('\n')}\n---`
        : '';

      const prompt = `Tu es un dermatologue expert IA et conseiller beauté iGlow. Analyse cette image du visage de l'utilisateur et fournis une réponse structurée en français avec les sections suivantes :

1. **Type de peau estimé** (grasse, sèche, mixte, sensible, normale)
2. **État des pores**
3. **Niveau d'hydratation apparent**
4. **Problématiques détectées** (rougeurs, rides, acné, taches, etc.)
5. **Routine recommandée** : propose 2 à 3 produits spécifiques issus du catalogue ci-dessous, en expliquant pourquoi chaque produit est adapté à ce type de peau.${catalogSection}

Sois bienveillant, professionnel et concis. Formate la réponse en Markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
            ],
          },
        ],
      });

      if (response.text) {
        setAnalysis(response.text);
        stopCamera();
      } else {
        throw new Error("Pas de réponse de l'IA.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de l'analyse IA : " + (err.message || "Erreur inconnue"));
    } finally {
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setAnalysis(null);
    setDisplayedText('');
    setIsTyping(false);
    startCamera();
  };

  const skipTyping = () => {
    if (analysis && isTyping) {
      setDisplayedText(analysis);
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 relative">
      <div className="bg-glow-orb glow-1 top-[-100px] right-[-100px]" />
      <div className="bg-glow-orb glow-2 bottom-[-100px] left-[-100px]" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-glass-border mb-6">
            <Scan className="w-8 h-8 text-glow-green" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">
            Skin Scanner <span className="text-gradient">v4.0</span>
          </h1>
          <p className="text-pure-white/70 max-w-xl mx-auto">
            Notre IA analyse la texture de votre peau en temps réel pour vous proposer une routine 100% personnalisée.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-8 text-center">
            {error}
          </div>
        )}

        {!analysis ? (
          <div className="glass p-4 md:p-8 rounded-3xl relative overflow-hidden">
            <div className="relative rounded-2xl overflow-hidden bg-velvet-dark aspect-[4/3] md:aspect-video flex items-center justify-center border border-glass-border">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              
              {/* Scanning Overlay Animation */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-glow-green/10" />
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-glow-green shadow-[0_0_20px_rgba(0,255,136,1)]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="glass px-6 py-3 rounded-full flex items-center gap-3 animate-pulse">
                      <Sparkles className="w-5 h-5 text-glow-green" />
                      <span className="font-bold tracking-widest text-sm">ANALYSE EN COURS...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera Guidelines */}
              {!isScanning && stream && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-80 border-2 border-dashed border-white/30 rounded-[100px] flex items-center justify-center">
                    <span className="text-white/50 text-sm font-medium tracking-widest uppercase text-center px-4">
                      Placez votre visage ici
                    </span>
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-8 flex justify-center">
              <button
                onClick={captureAndAnalyze}
                disabled={!stream || isScanning}
                className="bg-glow-green text-velvet-black px-8 py-4 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:shadow-[0_0_30px_rgba(0,255,136,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                <Camera className="w-6 h-6" />
                {isScanning ? 'Analyse...' : 'Lancer l\'analyse'}
              </button>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-8 rounded-3xl"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="badge mb-4 inline-block">Résultat de l'analyse</div>
                <h2 className="text-3xl font-display font-bold">Diagnostic IA</h2>
              </div>
              <button 
                onClick={resetScanner}
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-glass-border text-pure-white/70 hover:text-pure-white"
                title="Recommencer"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`prose prose-invert prose-p:text-pure-white/80 prose-headings:text-pure-white prose-strong:text-glow-green max-w-none mb-10 min-h-[120px] ${
                isTyping ? 'cursor-pointer' : ''
              }`}
              onClick={isTyping ? skipTyping : undefined}
              title={isTyping ? 'Cliquer pour afficher tout le texte' : undefined}
            >
              <div className="markdown-body">
                <Markdown>{displayedText}</Markdown>
                {isTyping && (
                  <span
                    className="inline-block w-0.5 h-[1.1em] bg-glow-green ml-0.5 align-text-bottom animate-pulse"
                    aria-hidden
                  />
                )}
              </div>
            </div>

            <div
              className={`border-t border-glass-border pt-8 flex flex-col sm:flex-row gap-4 justify-between items-center transition-opacity duration-500 ${
                isTyping ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <p className="text-sm text-pure-white/50">
                Ce diagnostic est généré par IA et ne remplace pas l'avis d'un médecin dermatologue.
              </p>
              <button
                onClick={() => navigate('/catalog')}
                className="bg-transparent border border-glow-green text-glow-green px-6 py-3 rounded-xl font-bold hover:bg-glow-green/10 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                Voir les produits recommandés
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, ShieldCheck, Droplets, Sparkles, Scan } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const TiltWrapper = ({ children, className, innerClassName, onClick }: { children: React.ReactNode, className?: string, innerClassName?: string, onClick?: () => void }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 1000 }}
      className={className}
    >
      <div style={{ transform: "translateZ(30px)" }} className={`w-full h-full ${innerClassName || ''}`}>
        {children}
      </div>
    </motion.div>
  );
};

const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-glow-green rounded-full opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`
          }}
          animate={{
            y: [0, -200 - Math.random() * 300],
            x: [0, (Math.random() - 0.5) * 200],
            opacity: [0, 0.8, 0],
            scale: [0, Math.random() * 2 + 1, 0]
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10
          }}
        />
      ))}
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-28">
      <div className="bg-glow-orb glow-1 top-[-200px] right-[-100px]" />
      <div className="bg-glow-orb glow-2 bottom-[-200px] left-[-100px]" />
      <FloatingParticles />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-rows-[auto_1fr_auto] gap-6 min-h-[calc(100vh-120px)] relative z-10">
        
        <main className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-center">
          <TiltWrapper 
            onClick={() => navigate('/scanner')}
            className="glass relative cursor-pointer hover:bg-white/10 transition-colors group overflow-hidden border-2 border-glow-green"
            innerClassName="p-8 flex flex-col justify-center items-center text-center"
          >
            <div className="relative w-[240px] h-[240px] rounded-full border border-glow-green/30 overflow-hidden flex items-center justify-center bg-velvet-dark/50 group-hover:border-glow-green transition-colors duration-500 mb-6 mx-auto shadow-[0_0_40px_rgba(0,255,136,0.2)]">
              {/* Grid background */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,136,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,136,0.1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-50" />
              
              {/* Abstract Face / Scan Target */}
              <Scan className="w-24 h-24 text-glow-green/20 absolute z-10 group-hover:scale-110 transition-transform duration-500" />
              
              {/* Scanning laser */}
              <motion.div 
                animate={{ top: ['-10%', '110%', '-10%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[2px] bg-glow-green shadow-[0_0_20px_rgba(0,255,136,1)] z-20"
              />
              
              {/* Floating data points */}
              <motion.div 
                animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 0.8] }} 
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} 
                className="absolute top-[20%] left-[15%] text-[9px] text-glow-green font-mono bg-velvet-black/80 px-1 rounded z-30"
              >
                HYDRATATION: 92%
              </motion.div>
              <motion.div 
                animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 0.8] }} 
                transition={{ duration: 2.5, repeat: Infinity, delay: 1.2 }} 
                className="absolute bottom-[30%] right-[10%] text-[9px] text-glow-green font-mono bg-velvet-black/80 px-1 rounded z-30"
              >
                PORES: CLAIR
              </motion.div>
              <motion.div 
                animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 0.8] }} 
                transition={{ duration: 1.8, repeat: Infinity, delay: 2 }} 
                className="absolute top-[40%] right-[15%] text-[9px] text-skin-pink font-mono bg-velvet-black/80 px-1 rounded z-30"
              >
                TEXTURE: LISSE
              </motion.div>
            </div>
            <h2 className="text-[32px] font-light mb-2 flex items-center gap-3">
              Skin Scanner v4.0
              <ArrowRight className="w-6 h-6 text-glow-green opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
            </h2>
            <p className="opacity-60 text-sm max-w-[300px]">Analyse IA en temps réel de la texture de votre peau via flux caméra.</p>
            <div className="mt-6 text-xs text-glow-green tracking-widest">CLIQUEZ POUR LANCER L'ANALYSE</div>
          </TiltWrapper>

          <TiltWrapper 
            className="glass relative"
            innerClassName="p-6 flex flex-col gap-4"
          >
            <div className="badge self-start">Must-have 2026</div>
            
            <div className="relative w-full h-[220px] flex items-center justify-center mb-4 overflow-hidden">
              {/* Central Product */}
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-glow-green to-skin-pink p-[2px] shadow-[0_0_30px_rgba(0,255,136,0.2)] z-20">
                <div className="w-full h-full rounded-full bg-velvet-black flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=200" 
                    alt="Glow Serum" 
                    className="w-full h-full object-cover opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              
              {/* Orbiting Ring 1 */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute w-[160px] h-[160px] border border-white/10 rounded-full flex items-center justify-center z-10"
              >
                <div className="absolute -top-3 w-6 h-6 rounded-full bg-velvet-black border border-glow-green flex items-center justify-center text-glow-green shadow-[0_0_10px_rgba(0,255,136,0.5)]">
                  <Droplets className="w-3 h-3" />
                </div>
              </motion.div>

              {/* Orbiting Ring 2 */}
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute w-[220px] h-[220px] border border-white/5 rounded-full flex items-center justify-center z-0"
              >
                <div className="absolute -bottom-4 w-8 h-8 rounded-full bg-velvet-black border border-skin-pink flex items-center justify-center text-skin-pink shadow-[0_0_10px_rgba(255,105,180,0.5)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="absolute -left-4 w-8 h-8 rounded-full bg-velvet-black border border-glow-green flex items-center justify-center text-glow-green shadow-[0_0_10px_rgba(0,255,136,0.5)]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </motion.div>
            </div>

            <h3 className="text-2xl font-bold text-center">Glow Catalyst Serum</h3>
            <p className="text-[13px] opacity-60 leading-relaxed">Une formule révolutionnaire à base de micro-particules luminescentes pour un éclat instantané.</p>
            <div className="text-[32px] font-light">18.500 FCFA</div>
            <Link to="/catalog" className="bg-transparent border border-glow-green text-glow-green p-3 rounded-xl font-bold text-center hover:bg-glow-green/10 transition-colors">
              DÉCOUVRIR LE CATALOGUE
            </Link>
          </TiltWrapper>
        </main>

        <footer className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
          <div className="glass p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center border border-glass-border">
              <ShieldCheck className="w-5 h-5 text-glow-green" />
            </div>
            <div>
              <span className="block text-[11px] opacity-50 uppercase tracking-wider">Dernière Commande</span>
              <strong className="text-base font-mono text-glow-green">IGLOW-20240512-4291</strong>
            </div>
          </div>

          <div className="glass p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center border border-glass-border">
              <span className="font-bold text-[#22a6b3]">W</span>
            </div>
            <div>
              <span className="block text-[11px] opacity-50 uppercase tracking-wider">Paiement Wave</span>
              <strong className="text-base text-[#22a6b3]">Confirmé / QR OK</strong>
            </div>
          </div>

          <div className="glass p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center border border-glass-border">
              <Sparkles className="w-5 h-5 text-skin-pink" />
            </div>
            <div>
              <span className="block text-[11px] opacity-50 uppercase tracking-wider">Expert Coaching</span>
              <strong className="text-base flex items-center">
                <span className="w-2 h-2 rounded-full bg-glow-green shadow-[0_0_5px_var(--color-glow-green)] mr-2" />
                Dr. Sarr est en ligne
              </strong>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

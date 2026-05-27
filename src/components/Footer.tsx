import React from 'react';
import { Facebook, Instagram, Twitter, MessageCircle } from 'lucide-react';

export default function Footer() {
  // Remplacez par votre vrai numéro WhatsApp (avec l'indicatif du pays, ex: 221 pour le Sénégal)
  const whatsappNumber = "221770000000"; 
  const whatsappMessage = encodeURIComponent("Bonjour iGlow ! J'aimerais avoir plus d'informations sur vos produits.");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <footer className="border-t border-glass-border bg-velvet-black/80 backdrop-blur-xl mt-20 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & Description */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-[28px] font-black tracking-tighter text-gradient uppercase mb-4">
              iGLOW.
            </h3>
            <p className="text-pure-white/60 text-sm max-w-md leading-relaxed">
              Votre plateforme interactive de conseil dermatologique et d'e-commerce skincare. 
              Révélez l'éclat naturel de votre peau grâce à notre expertise et notre IA.
            </p>
          </div>

          {/* Liens Rapides */}
          <div>
            <h4 className="font-display font-bold text-lg mb-4 text-pure-white">Liens Rapides</h4>
            <ul className="space-y-2 text-sm text-pure-white/60">
              <li><a href="/catalog" className="hover:text-glow-green transition-colors">Catalogue</a></li>
              <li><a href="/consultation" className="hover:text-glow-green transition-colors">Consultation</a></li>
              <li><a href="/scanner" className="hover:text-glow-green transition-colors">Skin Scanner IA</a></li>
            </ul>
          </div>

          {/* Réseaux Sociaux */}
          <div>
            <h4 className="font-display font-bold text-lg mb-4 text-pure-white">Contact & Réseaux</h4>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-glass-border flex items-center justify-center text-pure-white/70 hover:text-glow-green hover:border-glow-green hover:bg-glow-green/10 transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-glass-border flex items-center justify-center text-pure-white/70 hover:text-skin-pink hover:border-skin-pink hover:bg-skin-pink/10 transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-glass-border flex items-center justify-center text-pure-white/70 hover:text-[#1DA1F2] hover:border-[#1DA1F2] hover:bg-[#1DA1F2]/10 transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/5 border border-glass-border flex items-center justify-center text-pure-white/70 hover:text-[#25D366] hover:border-[#25D366] hover:bg-[#25D366]/10 transition-all shadow-[0_0_0_rgba(37,211,102,0)] hover:shadow-[0_0_15px_rgba(37,211,102,0.5)]"
                title="Discuter sur WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
            <p className="mt-4 text-xs text-pure-white/40">
              Cliquez sur l'icône WhatsApp pour discuter directement avec nos experts.
            </p>
          </div>

        </div>

        <div className="border-t border-glass-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-pure-white/40 text-sm">
            &copy; {new Date().getFullYear()} iGlow. Tous droits réservés.
          </p>
          <div className="flex space-x-6 text-sm text-pure-white/40">
            <a href="#" className="hover:text-pure-white transition-colors">Politique de confidentialité</a>
            <a href="#" className="hover:text-pure-white transition-colors">CGV</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

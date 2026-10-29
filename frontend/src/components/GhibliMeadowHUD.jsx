import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Wind, 
  Sun, 
  Bot, 
  Smartphone, 
  Maximize2, 
  Minimize2, 
  Scroll, 
  Compass, 
  Heart, 
  Flower2, 
  Coffee,
  Volume2,
  VolumeX
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import GhibliButton, { GhibliSootSprite } from './GhibliButton';
import confetti from 'canvas-confetti';

export default function GhibliMeadowHUD({
  summary,
  budget,
  forecast,
  onToggleChat,
  onTogglePhoneAlerts,
  onNavigateTab
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [sootCount, setSootCount] = useState(0);
  const [activeStory, setActiveStory] = useState('TOTORO'); // 'TOTORO', 'HOWL', 'SPIRITED', 'KIKI'
  const [dandelionPuffs, setDandelionPuffs] = useState([]);

  // Generate floating dandelion seeds / petals
  useEffect(() => {
    const seeds = Array.from({ length: 9 }).map((_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      top: `${30 + Math.random() * 60}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${14 + Math.random() * 10}s`,
      size: 6 + Math.random() * 8,
    }));
    setDandelionPuffs(seeds);
  }, []);

  // Gentle Ghibli wind chime synthesizer
  const playWindChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C pentatonic

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 1.2);
      });
    } catch {
      // Audio not permitted
    }
  };

  const handleSootClick = (e) => {
    setSootCount(prev => prev + 1);
    playWindChime();

    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 18,
        spread: 60,
        origin: { x, y },
        colors: ['#fde047', '#f472b6', '#86efac', '#67e8f9', '#f97316'],
        scalar: 0.8
      });
    } catch {
      // Confetti fallback
    }
  };

  const pct = summary?.percentage_used || 0;

  return (
    <div className={`relative rounded-3xl border-2 border-emerald-400/40 bg-[#07130e] shadow-[0_20px_60px_rgba(16,185,129,0.22)] overflow-hidden transition-all duration-500 ${
      isFullscreen ? 'fixed inset-4 z-50 rounded-2xl flex flex-col' : 'w-full'
    }`}>
      
      {/* Top Ghibli Pastel Navigation Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-950/85 via-slate-900/80 to-amber-950/80 border-b border-emerald-400/30 text-xs backdrop-blur-md">
        
        {/* Left: Studio Ghibli Badge */}
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm">
            <Flower2 className="w-4 h-4 animate-spin" style={{ animationDuration: '16s' }} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-emerald-200 tracking-wide text-xs sm:text-sm font-sans">
                スタジオジブリ // STUDIO GHIBLI MEADOW
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-800/60 text-emerald-200 font-mono border border-emerald-500/30">
                LUSH SUMMER
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden md:block">
              Hayao Miyazaki Watercolor Aesthetic • Peaceful Financial Sanctuary
            </p>
          </div>
        </div>

        {/* Right: Sound Chime Toggle & Story Tag */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-xl bg-black/40 border border-emerald-500/20 text-[11px] font-sans text-emerald-300">
            <Sun className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Gentle Breeze: 22°C Clear</span>
          </div>

          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playWindChime();
            }}
            title={soundEnabled ? "Wind Chime Sound ON" : "Turn Sound ON"}
            className={`p-2 rounded-xl border text-xs transition-all ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-black/40 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Ghibli Landscape Banner Container */}
      <div className={`relative w-full overflow-hidden select-none ${
        isFullscreen ? 'flex-1 min-h-0' : 'aspect-[16/9] sm:aspect-[21/9] min-h-[420px] sm:min-h-[480px]'
      }`}>
        
        {/* Hand-painted Studio Ghibli Meadow Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('/ghibli_peaceful_meadow.jpg')` }}
        />

        {/* Sunlight Lens Flare & Warm Dapple Light */}
        <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-amber-200/25 blur-3xl animate-ghibli-sunbeam pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06120c] via-transparent to-sky-900/20 pointer-events-none" />

        {/* Animated Rotating Windmill Blades Overlay */}
        <div 
          className="absolute left-[34.8%] top-[39.5%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{ width: '130px', height: '130px' }}
        >
          {/* Rotating 4-Cross Sail Blades */}
          <div className="w-full h-full animate-ghibli-windmill flex items-center justify-center opacity-85">
            <svg viewBox="-60 -60 120 120" className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
              {/* Central hub pin */}
              <circle cx="0" cy="0" r="4" fill="#5c4033" />
              {/* Blade 1 (North) */}
              <rect x="-3" y="-55" width="6" height="55" fill="#4a3728" rx="2" />
              <rect x="-12" y="-50" width="10" height="42" fill="#d2b48c" opacity="0.6" stroke="#4a3728" strokeWidth="1" />
              {/* Blade 2 (South) */}
              <rect x="-3" y="0" width="6" height="55" fill="#4a3728" rx="2" />
              <rect x="2" y="8" width="10" height="42" fill="#d2b48c" opacity="0.6" stroke="#4a3728" strokeWidth="1" />
              {/* Blade 3 (East) */}
              <rect x="0" y="-3" width="55" height="6" fill="#4a3728" rx="2" />
              <rect x="8" y="-12" width="42" height="10" fill="#d2b48c" opacity="0.6" stroke="#4a3728" strokeWidth="1" />
              {/* Blade 4 (West) */}
              <rect x="-55" y="-3" width="55" height="6" fill="#4a3728" rx="2" />
              <rect x="-50" y="2" width="42" height="10" fill="#d2b48c" opacity="0.6" stroke="#4a3728" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Floating Dandelion Parachutes / Cherry Blossoms */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-15">
          {dandelionPuffs.map(seed => (
            <div
              key={seed.id}
              className="absolute text-white/80"
              style={{
                left: seed.left,
                top: seed.top,
                animation: `ghibliDandelionFloat ${seed.duration} ease-in-out infinite ${seed.delay}`,
              }}
            >
              {/* Cute white dandelion seed with glowing head */}
              <div className="relative flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
                <span className="text-xs">✨</span>
              </div>
            </div>
          ))}
        </div>

        {/* Top Left: Ghibli Storyteller Ribbon */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/65 backdrop-blur-md border border-emerald-400/40 shadow-lg text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
              となりのトトロ // MY NEIGHBOR TOTORO'S MEADOW
            </span>
          </div>

          {/* Calcifer's Cozy Financial Hearth Wisdom */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-black/75 to-transparent backdrop-blur-md border border-amber-500/40 text-xs text-amber-200">
            <span className="text-base animate-bounce">🔥</span>
            <div>
              <span className="font-bold text-amber-300">Calcifer's Hearth: </span>
              <span className="text-slate-200 text-[11px]">
                {pct >= 100 
                  ? "Whoa! You're burning through logs too fast! Let me lower the furnace."
                  : pct >= 75
                  ? "Careful with the bacon! Savor the budget until month-end."
                  : `Safe to spend ~${formatCurrency(summary?.daily_budget_remaining || 0)}/day in gentle peace.`}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right: Kodama Spirit & Meadow Harmony Indicator */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-3 pointer-events-auto">
          
          {/* Kodama Tree Spirit with head tilt */}
          <div 
            onClick={playWindChime}
            title="Kodama Tree Spirit (Click for forest chime)"
            className="cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/25 hover:border-emerald-400/60 shadow-lg transition-all"
          >
            <div className="w-6 h-7 animate-ghibli-kodama flex items-center justify-center">
              <svg viewBox="0 0 30 36" className="w-full h-full fill-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">
                {/* Kodama head with asymmetrical eyes */}
                <ellipse cx="15" cy="14" rx="12" ry="11" />
                <circle cx="11" cy="13" r="2.5" fill="#0f172a" />
                <circle cx="19" cy="12" r="3" fill="#0f172a" />
                <ellipse cx="16" cy="18" rx="2" ry="1.5" fill="#0f172a" />
                {/* Tiny body */}
                <path d="M10 24 Q15 22 20 24 L18 34 Q15 36 12 34 Z" fill="#f8fafc" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-[10px] font-bold text-white tracking-wider">KODAMA SPIRIT</div>
              <div className="text-[9px] text-emerald-300 font-mono">HARMONY: 99.4%</div>
            </div>
          </div>

        </div>

        {/* Interactive Susuwatari (Soot Sprites) in the Grass! */}
        {/* Sprite 1: Bottom Left */}
        <div 
          onClick={handleSootClick}
          title="Click the Soot Sprite (Susuwatari) to collect star candies!"
          className="absolute left-[14%] bottom-[22%] z-20 cursor-pointer pointer-events-auto group transition-transform hover:scale-125"
        >
          <div className="flex flex-col items-center">
            <GhibliSootSprite size={38} isHappy={true} />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/75 text-emerald-300 border border-emerald-400/40 opacity-0 group-hover:opacity-100 transition-opacity">
              Susuwatari ✨
            </span>
          </div>
        </div>

        {/* Sprite 2: Center Meadow */}
        <div 
          onClick={handleSootClick}
          title="Click to play with Soot Sprite!"
          className="absolute left-[46%] bottom-[18%] z-20 cursor-pointer pointer-events-auto group transition-transform hover:scale-125"
        >
          <div className="flex flex-col items-center">
            <GhibliSootSprite size={34} isHappy={true} />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/75 text-amber-300 border border-amber-400/40 opacity-0 group-hover:opacity-100 transition-opacity">
              Konpeito 🍬
            </span>
          </div>
        </div>

        {/* Sprite 3: Right Path */}
        <div 
          onClick={handleSootClick}
          title="Click to play with Soot Sprite!"
          className="absolute right-[22%] bottom-[24%] z-20 cursor-pointer pointer-events-auto group transition-transform hover:scale-125"
        >
          <div className="flex flex-col items-center">
            <GhibliSootSprite size={30} isHappy={true} />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/75 text-sky-300 border border-sky-400/40 opacity-0 group-hover:opacity-100 transition-opacity">
              Sparkle 🌸
            </span>
          </div>
        </div>

        {/* Bottom Meadow Overlay Ticker */}
        <div className="absolute bottom-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1 rounded-2xl bg-black/65 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>STAR CANDIES COLLECTED: {sootCount} • SAFE CEILING: {formatCurrency(budget?.total_budget || 0)}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-sans text-slate-300 bg-black/50 px-2.5 py-1 rounded-xl">
            <span>🌿 "Always believe in yourself. Do this and no matter where you are, you will have nothing to fear."</span>
          </div>
        </div>

      </div>

      {/* Studio Ghibli Animated Button Action Bar */}
      <div className="relative z-30 p-3 sm:p-4 bg-[#0a1811]/95 border-t-2 border-emerald-500/40 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left Ghibli Animated Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Button 1: Wander Meadow & Talk with Ghibli Copilot */}
          <GhibliButton
            onClick={onToggleChat}
            variant="forest"
            icon={Bot}
            showSprite={true}
            spritePosition="right"
            title="Chat with Totoro AI Financial Spirit"
          >
            <span>Wander Meadow with AI</span>
          </GhibliButton>

          {/* Button 2: Pigeon Post Phone Alerts */}
          <GhibliButton
            onClick={onTogglePhoneAlerts}
            variant="sunset"
            icon={Smartphone}
            showSprite={true}
            spritePosition="top"
            title="Setup Bird Post & Phone Alerts"
          >
            <span>Bird Post Phone Alerts</span>
          </GhibliButton>

          {/* Button 3: Kiki's Delivery 90-Day Roadmap */}
          <GhibliButton
            onClick={() => onNavigateTab ? onNavigateTab('invoices') : null}
            variant="parchment"
            icon={Scroll}
            showSprite={false}
            title="View 90-Day Invoices & Ghibli Roadmap"
          >
            <span>📜 Kiki's 90-Day Roadmap</span>
          </GhibliButton>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          
          {/* Wish on Dandelion Burst Button */}
          <GhibliButton
            onClick={handleSootClick}
            variant="sky"
            icon={Sparkles}
            showSprite={true}
            spritePosition="left"
            title="Make a wish on the meadow flowers"
          >
            <span>Make a Meadow Wish</span>
          </GhibliButton>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Ghibli View"}
            className="p-2.5 rounded-xl text-emerald-300 hover:text-white bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/60 transition-all shadow-sm"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

      </div>

    </div>
  );
}

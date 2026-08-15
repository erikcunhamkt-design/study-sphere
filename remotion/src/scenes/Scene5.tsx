import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene5 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const finalSpring = spring({ frame, fps, config: { damping: 15 } });
  const y = interpolate(finalSpring, [0, 1], [50, 0]);

  return (
    <AbsoluteFill className="bg-[#0A0A0A] flex flex-col items-center justify-center p-12 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[#d9006e]/10 to-transparent opacity-50" />
      
      <div style={{ transform: `translateY(${y}px)`, opacity: finalSpring }} className="relative z-10 space-y-12">
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
          Daqui a 3 meses você vai ter <span className="text-[#d9006e]">Dominado</span>.
        </h2>
        
        <div className="space-y-4">
          <div className="h-16 px-10 bg-[#d9006e] flex items-center justify-center rounded-2xl shadow-[0_0_50px_-10px_rgba(217,0,110,0.5)]">
            <span className="text-xl font-black text-white italic uppercase tracking-widest">Quero dominar agora</span>
          </div>
          <p className="text-xs text-white/40 font-black uppercase tracking-widest">
            DominusApp · Do estudo ao domínio
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene3 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stagger = (i: number) => spring({ frame: frame - i * 10, fps, config: { damping: 15 } });

  const features = [
    "Recuperação Ativa",
    "Repetição Espaçada",
    "Fila do Dia Pronta"
  ];

  return (
    <AbsoluteFill className="bg-[#0A0A0A] flex flex-col justify-center p-12 space-y-6">
      <h3 className="text-xs font-black tracking-[0.3em] text-[#d9006e] uppercase mb-4">
        O SISTEMA DOMINUS
      </h3>
      {features.map((f, i) => {
        const s = stagger(i);
        const x = interpolate(s, [0, 1], [-50, 0]);
        return (
          <div key={f} style={{ transform: `translateX(${x}px)`, opacity: s }} className="flex items-center space-x-4">
            <div className="w-2 h-2 rounded-full bg-[#d9006e]" />
            <span className="text-3xl font-black text-white italic uppercase tracking-tighter">{f}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

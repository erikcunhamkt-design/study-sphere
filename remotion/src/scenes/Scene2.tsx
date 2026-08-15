import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const revealSpring = spring({ frame, fps, config: { damping: 20 } });
  const clipPath = interpolate(revealSpring, [0, 1], [100, 0]);

  return (
    <AbsoluteFill className="bg-[#111] flex flex-col items-center justify-center p-12">
      <div className="w-full space-y-8">
        <div style={{ clipPath: `inset(0 ${clipPath}% 0 0)` }} className="bg-[#d9006e]/10 p-8 rounded-3xl border border-[#d9006e]/30">
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
            Reler não é estudar.
          </h2>
          <p className="text-xl text-white/50 leading-snug font-bold">
            Grifar página inteira é decorar a cor amarela. Você está sem sistema.
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

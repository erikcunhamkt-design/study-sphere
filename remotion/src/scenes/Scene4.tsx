import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene4 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleSpring = spring({ frame, fps, config: { damping: 12 } });
  const scale = interpolate(scaleSpring, [0, 1], [0.8, 1]);

  return (
    <AbsoluteFill className="bg-[#111] flex flex-col items-center justify-center p-12 text-center">
      <div style={{ transform: `scale(${scale})`, opacity: scaleSpring }} className="space-y-8">
        <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
          Domine o <span className="text-[#d9006e]">Conteúdo</span>.
        </h2>
        <p className="text-xl text-white/60 font-bold max-w-xs mx-auto">
          Cada hora estudada conta. Sem conteúdo escorrendo pelo ralo.
        </p>
      </div>
    </AbsoluteFill>
  );
};

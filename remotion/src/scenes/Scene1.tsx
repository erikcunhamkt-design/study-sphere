import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 15 } });
  const textSpring = spring({ frame: frame - 15, fps, config: { damping: 15 } });

  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill className="flex flex-col items-center justify-center bg-[#0A0A0A] px-10 text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#d9006e]/20 blur-[150px] rounded-full" />
      
      <div style={{ transform: `translateY(${titleY}px)`, opacity: titleSpring }}>
        <h1 className="text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
          Dominus<span className="text-[#d9006e]">App</span>
        </h1>
        <div className="mt-4 h-1 w-24 bg-[#d9006e] mx-auto" />
      </div>

      <div style={{ opacity: textOpacity }} className="mt-12">
        <p className="text-2xl font-bold text-white/60 tracking-tight">
          Você não tem problema de esforço.<br />
          Você tem um método que te faz esquecer tudo.
        </p>
      </div>
    </AbsoluteFill>
  );
};

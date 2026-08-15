import { AbsoluteFill } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";

export const MainVideo = () => {
  return (
    <AbsoluteFill className="bg-[#0A0A0A]">
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          durationInFrames={15}
        />
        <TransitionSeries.Sequence durationInFrames={75}>
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          durationInFrames={15}
        />
        <TransitionSeries.Sequence durationInFrames={75}>
          <Scene3 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          durationInFrames={15}
        />
        <TransitionSeries.Sequence durationInFrames={75}>
          <Scene4 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-top" })}
          durationInFrames={15}
        />
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene5 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

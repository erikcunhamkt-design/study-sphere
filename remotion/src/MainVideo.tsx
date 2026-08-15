import { AbsoluteFill, Sequence } from "remotion";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";

export const MainVideo = () => {
  return (
    <AbsoluteFill className="bg-[#0A0A0A]">
      <Sequence from={0} durationInFrames={75}>
        <Scene1 />
      </Sequence>
      <Sequence from={75} durationInFrames={75}>
        <Scene2 />
      </Sequence>
      <Sequence from={150} durationInFrames={75}>
        <Scene3 />
      </Sequence>
      <Sequence from={225} durationInFrames={75}>
        <Scene4 />
      </Sequence>
      <Sequence from={300} durationInFrames={60}>
        <Scene5 />
      </Sequence>
    </AbsoluteFill>
  );
};


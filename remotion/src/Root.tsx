import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSyne } from "@remotion/google-fonts/Syne";

loadInter("normal", { weights: ["400", "700"] });
loadSyne("normal", { weights: ["800"] });

export const RemotionRoot = () => {
  return (
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={360} // 12 seconds
      fps={30}
      width={1080}
      height={1920} // Vertical video for landing page/marketing
    />
  );
};

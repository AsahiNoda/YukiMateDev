import React from "react";
import { ContentDisplaySection } from "./ContentDisplaySection";
import { FooterSection } from "./FooterSection";
import { HeroSection } from "./HeroSection";
import { MainContentSection } from "./MainContentSection";
import { OverlaySection } from "./OverlaySection";
import background from "./background.svg";

export const Explore = (): JSX.Element => {
  return (
    <div className="bg-white w-full min-w-[393px] min-h-[1743px] relative">
      <img
        className="absolute top-0 left-0 w-[393px] h-[1743px]"
        alt="Background"
        src={background}
      />

      <div className="absolute top-0 left-0 w-[393px] h-[1743px] flex flex-col overflow-y-scroll">
        <MainContentSection />
        <HeroSection />
        <ContentDisplaySection />
      </div>

      <FooterSection />
      <OverlaySection />
    </div>
  );
};

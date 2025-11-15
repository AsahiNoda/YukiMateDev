import React from "react";
import { ContentDisplaySection } from "./ContentDisplaySection";
import { FooterSection } from "./FooterSection";
import { HeroSection } from "./HeroSection";
import { MainContentSection } from "./MainContentSection";
import { OverlaySection } from "./OverlaySection";

export default function ExploreScreen(): React.ReactElement {
  return (
    <div className="bg-white w-full min-w-[393px] min-h-[1743px] relative">
      <div className="absolute top-0 left-0 w-[393px] h-[1743px] bg-gradient-to-b from-blue-900 via-blue-700 to-blue-900" />

      <div className="absolute top-0 left-0 w-[393px] h-[1743px] flex flex-col overflow-y-scroll">
        <MainContentSection />
        <HeroSection />
        <ContentDisplaySection />
      </div>

      <FooterSection />
      <OverlaySection />
    </div>
  );
}

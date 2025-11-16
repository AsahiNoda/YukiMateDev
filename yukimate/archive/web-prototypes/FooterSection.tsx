import React from "react";

export const FooterSection = (): JSX.Element => {
  return (
    <footer className="flex w-[393px] h-[81px] items-center justify-center gap-[37px] pl-[26px] pr-[26px] pt-4 pb-[18px] absolute bottom-0 left-0 bg-[#0f172acc] border-t [border-top-style:solid] border-slate-800 backdrop-blur-[2px]">
      <div className="flex items-center gap-4">
        <span className="[font-family:'Inter-Regular',Helvetica] font-normal text-gray-300 text-xs tracking-[0] leading-4">
          © 2024 YukiMate
        </span>
      </div>
    </footer>
  );
};


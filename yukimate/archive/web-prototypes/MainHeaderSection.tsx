import React from "react";

export const MainHeaderSection = (): JSX.Element => {
  return (
    <header className="flex w-[393px] h-[91px] items-center justify-between px-4 py-0 absolute top-0 left-0 bg-[#0b1220] border-b [border-bottom-style:solid] border-slate-800">
      <button
        className="flex flex-col w-[53px] items-start justify-center pl-2 pr-0 py-0 relative"
        aria-label="Go back"
      >
        <span className="text-white text-[26px] leading-7 relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Bold',Helvetica] font-bold tracking-[0] whitespace-nowrap">
          ←
        </span>
      </button>
      <h1 className="inline-flex flex-col items-center justify-center px-0 py-0 relative flex-[0_0_auto]">
        <span className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Bold',Helvetica] font-bold text-white text-[26px] tracking-[0] leading-7 whitespace-nowrap">
          Filters
        </span>
      </h1>
      <div className="w-[53px]" />
    </header>
  );
};


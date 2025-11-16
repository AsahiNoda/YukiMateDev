import React from "react";

export const PriceRangeSection = (): JSX.Element => {
  return (
    <div className="flex flex-col w-[393px] items-start justify-center pt-4 pb-4 px-4 border-t [border-top-style:solid] border-slate-800">
      <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto] mb-3">
        <h3 className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-white text-base tracking-[0] leading-6 whitespace-nowrap">
          Price Range
        </h3>
      </div>
      <div className="flex items-center gap-3 relative self-stretch w-full">
        <input
          type="number"
          placeholder="Min"
          className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg [font-family:'Inter-Regular',Helvetica] text-sm placeholder:text-gray-400 border-none outline-none"
        />
        <span className="text-gray-400 text-sm">-</span>
        <input
          type="number"
          placeholder="Max"
          className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg [font-family:'Inter-Regular',Helvetica] text-sm placeholder:text-gray-400 border-none outline-none"
        />
      </div>
    </div>
  );
};


import React from "react";

export const DateSelectionSection = (): JSX.Element => {
  return (
    <div className="flex flex-col w-[393px] items-start justify-center pt-4 pb-4 px-4 border-t [border-top-style:solid] border-slate-800">
      <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
        <h3 className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-white text-base tracking-[0] leading-6 whitespace-nowrap">
          Date
        </h3>
      </div>
      <div className="flex items-center gap-2 relative self-stretch w-full mt-3">
        <button className="all-[unset] box-border flex flex-1 items-center justify-center px-4 py-2 relative bg-slate-800 rounded-lg">
          <span className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-white text-sm tracking-[0] leading-5 whitespace-nowrap">
            Start Date
          </span>
        </button>
        <button className="all-[unset] box-border flex flex-1 items-center justify-center px-4 py-2 relative bg-slate-800 rounded-lg">
          <span className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-white text-sm tracking-[0] leading-5 whitespace-nowrap">
            End Date
          </span>
        </button>
      </div>
    </div>
  );
};


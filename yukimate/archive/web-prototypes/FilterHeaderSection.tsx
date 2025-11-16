import React from "react";

export const FilterHeaderSection = (): JSX.Element => {
  return (
    <div className="flex flex-col w-[393px] items-start justify-center pt-4 pb-4 px-4 border-t [border-top-style:solid] border-slate-800">
      <div className="flex items-center justify-between relative self-stretch w-full">
        <h3 className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-white text-base tracking-[0] leading-6 whitespace-nowrap">
          Location
        </h3>
        <button className="all-[unset] box-border">
          <span className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-blue-500 text-sm tracking-[0] leading-5 whitespace-nowrap">
            Clear
          </span>
        </button>
      </div>
      <div className="flex items-center gap-2 relative self-stretch w-full mt-3">
        <input
          type="text"
          placeholder="Search location..."
          className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg [font-family:'Inter-Regular',Helvetica] text-sm placeholder:text-gray-400 border-none outline-none"
        />
      </div>
    </div>
  );
};


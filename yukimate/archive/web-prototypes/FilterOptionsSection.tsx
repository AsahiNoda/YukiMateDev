import React from "react";

const options = [
  { label: "Free", active: false },
  { label: "Paid", active: false },
  { label: "Private", active: false },
  { label: "Public", active: true },
];

export const FilterOptionsSection = (): JSX.Element => {
  return (
    <div className="flex flex-col w-[393px] items-start justify-center pt-4 pb-4 px-4 border-t [border-top-style:solid] border-slate-800">
      <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto] mb-3">
        <h3 className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-white text-base tracking-[0] leading-6 whitespace-nowrap">
          Type
        </h3>
      </div>
      <div className="flex flex-wrap items-center gap-2 relative self-stretch w-full">
        {options.map((option, index) => (
          <button
            key={index}
            className={`all-[unset] box-border flex items-center justify-center px-4 py-2 relative rounded-lg ${
              option.active
                ? "bg-blue-500"
                : "bg-slate-800"
            }`}
          >
            <span className={`relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-sm tracking-[0] leading-5 whitespace-nowrap ${
              option.active ? "text-white" : "text-gray-300"
            }`}>
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};


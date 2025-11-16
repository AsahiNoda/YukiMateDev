import React from "react";

const skillLevels = [
  { label: "Beginner", active: false },
  { label: "Intermediate", active: true },
  { label: "Advanced", active: false },
  { label: "Expert", active: false },
];

export const SkillLevelSection = (): JSX.Element => {
  return (
    <div className="flex flex-col w-[393px] items-start justify-center pt-4 pb-4 px-4 border-t [border-top-style:solid] border-slate-800">
      <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto] mb-3">
        <h3 className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-white text-base tracking-[0] leading-6 whitespace-nowrap">
          Skill Level
        </h3>
      </div>
      <div className="flex flex-wrap items-center gap-2 relative self-stretch w-full">
        {skillLevels.map((level, index) => (
          <button
            key={index}
            className={`all-[unset] box-border flex items-center justify-center px-4 py-2 relative rounded-lg ${
              level.active
                ? "bg-blue-500"
                : "bg-slate-800"
            }`}
          >
            <span className={`relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-sm tracking-[0] leading-5 whitespace-nowrap ${
              level.active ? "text-white" : "text-gray-300"
            }`}>
              {level.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};


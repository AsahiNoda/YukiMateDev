import React from "react";
import { DateSelectionSection } from "./DateSelectionSection";
import { FilterCategoriesSection } from "./FilterCategoriesSection";
import { FilterHeaderSection } from "./FilterHeaderSection";
import { FilterOptionsSection } from "./FilterOptionsSection";
import { MainHeaderSection } from "./MainHeaderSection";
import { PriceRangeSection } from "./PriceRangeSection";
import { SkillLevelSection } from "./SkillLevelSection";

export const Filter = (): JSX.Element => {
  return (
    <div className="bg-white overflow-hidden w-full min-w-[392px] min-h-[928px] relative">
      <div className="absolute top-0 left-0 w-[393px] h-[928px] bg-[#0b1220]" />

      <div className="absolute top-0 -left-px w-[394px] h-[928px] flex overflow-y-scroll">
        <div className="mt-[91px] w-[393px] h-[751px] relative overflow-y-scroll">
          <FilterCategoriesSection />
          <FilterOptionsSection />
          <PriceRangeSection />
          <DateSelectionSection />
          <SkillLevelSection />
          <FilterHeaderSection />
          <div className="flex flex-col w-[393px] items-center justify-center pt-[17px] pb-4 px-4 absolute top-[679px] left-px border-t [border-top-style:solid] border-slate-800 overflow-y-scroll">
            <button className="all-[unset] box-border flex h-[42px] items-center justify-center px-0 py-3 relative self-stretch w-full bg-blue-500 rounded-xl">
              <div className="relative flex items-center justify-center flex-1 mt-[-4.00px] mb-[-2.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-white text-base text-center tracking-[0] leading-6">
                Apply Filters
              </div>
            </button>
          </div>
        </div>
      </div>

      <MainHeaderSection />
    </div>
  );
};

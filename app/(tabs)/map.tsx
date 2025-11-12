import React, { useState } from "react";
import { DateSelectorSection } from "./DateSelectorSection";
import { EventCardSection } from "./EventCardSection";
import { ExploreSection } from "./ExploreSection";
import { FilterOptionsSection } from "./FilterOptionsSection";
import { FooterSection } from "./FooterSection";
import { GroupSection } from "./GroupSection";
import { HeaderSection } from "./HeaderSection";
import { NavigationSection } from "./NavigationSection";
import { ResultsSection } from "./ResultsSection";
import { RideshareSection } from "./RideshareSection";
import { SearchSection } from "./SearchSection";
import { UserProfileSection } from "./UserProfileSection";
import vector10 from "./vector-10.svg";
import vector11 from "./vector-11.svg";

interface DateItem {
  id: number;
  day: string;
  date: number;
  isToday: boolean;
}

export const Map = (): JSX.Element => {
  const [selectedDate, setSelectedDate] = useState<number>(18);

  const dateItems: DateItem[] = [
    { id: 1, day: "Mon", date: 18, isToday: true },
    { id: 2, day: "Tue", date: 19, isToday: false },
    { id: 3, day: "Wed", date: 20, isToday: false },
    { id: 4, day: "Thu", date: 21, isToday: false },
    { id: 5, day: "Fri", date: 22, isToday: false },
    { id: 6, day: "Sat", date: 23, isToday: false },
    { id: 7, day: "Sun", date: 24, isToday: false },
  ];

  return (
    <div className="bg-[linear-gradient(0deg,rgba(17,24,39,1)_0%,rgba(17,24,39,1)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)] overflow-x-hidden w-full min-w-[393px] h-[856px] relative">
      <GroupSection />
      <div className="flex flex-col w-full h-[207.71%] items-start pt-4 pb-0 px-0 absolute top-[36.92%] -left-px bg-[#0f172acc] rounded-[16px_16px_0px_0px] overflow-hidden shadow-[0px_8px_24px_#00000033] backdrop-blur-[2px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(2px)_brightness(100%)]">
        <div className="flex flex-col items-start pt-0 pb-2 px-0 relative self-stretch w-full flex-[0_0_auto]">
          <div className="flex items-start justify-center relative self-stretch w-full flex-[0_0_auto]">
            <div className="relative w-16 h-1.5 bg-[#a9b7d1] rounded-full" />
          </div>
        </div>

        <div className="flex items-center gap-[96.6px] pl-4 pr-[16.02px] pt-0 pb-2 relative self-stretch w-full flex-[0_0_auto]">
          <button
            className="inline-flex flex-col items-start px-0 py-0.5 relative flex-[0_0_auto]"
            aria-label="Previous month"
          >
            <div className="relative w-5 h-6">
              <img
                className="absolute w-[49.06%] h-[69.44%] top-[15.28%] left-0"
                alt="Previous"
                src={vector10}
              />
            </div>
          </button>

          <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
            <h2 className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#f0f4f8] text-base tracking-[0] leading-6 whitespace-nowrap">
              December 2023
            </h2>
          </div>

          <button
            className="inline-flex flex-col items-start px-0 py-0.5 relative flex-[0_0_auto]"
            aria-label="Next month"
          >
            <div className="relative w-5 h-6">
              <img
                className="absolute w-[49.06%] h-[69.44%] top-[15.28%] left-[26.04%]"
                alt="Next"
                src={vector11}
              />
            </div>
          </button>
        </div>

        <div className="relative self-stretch w-full h-[94px] overflow-scroll">
          <div className="flex w-[calc(100%_+_74px)] h-[94px] items-start relative left-4">
            {dateItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex ${
                  item.isToday
                    ? "flex-col"
                    : "flex-col justify-center pl-3 pr-0 py-0"
                } ${item.isToday ? "w-14 h-[81px]" : "w-[68px]"} ${
                  index === 2
                    ? "h-[108px] mb-[-14.00px]"
                    : item.isToday
                      ? ""
                      : "h-[72px]"
                } ${index === 4 ? "h-[73px]" : ""} items-start ${
                  item.isToday ? "p-2 bg-blue-700" : ""
                } ${
                  item.isToday
                    ? "rounded-xl shadow-[0px_1px_2px_-1px_#0000001a,0px_1px_3px_#0000001a]"
                    : ""
                } relative ${item.isToday ? "overflow-hidden" : ""}`}
              >
                {item.isToday ? (
                  <>
                    <div className="flex flex-col items-center pl-[1.47px] pr-0 py-0 relative self-stretch w-full flex-[0_0_auto]">
                      <div className="self-stretch [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#f0f4f8] text-[13px] relative flex items-center justify-center mt-[-1.00px] text-center tracking-[0] leading-5">
                        Today
                      </div>
                    </div>
                    <div className="flex flex-col items-center relative self-stretch w-full flex-[0_0_auto]">
                      <div className="relative flex items-center justify-center self-stretch mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-[#f0f4f8] text-[11px] text-center tracking-[0] leading-4">
                        {item.date}
                        <br />
                        {item.day}
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    className={`flex flex-col w-14 ${
                      index === 2
                        ? "h-[calc(100%_-_41px)] top-[5px] left-3 absolute"
                        : "h-[68px]"
                    } items-start ${
                      index === 2 ? "" : "p-[9px]"
                    } relative bg-gray-900 rounded-xl border border-solid border-slate-800`}
                  >
                    <div
                      className={`flex ${
                        index === 2
                          ? "ml-[9px] mr-[9px] flex-1 max-h-5 mt-[9px]"
                          : ""
                      } flex-col ${
                        index === 2
                          ? "w-[38px]"
                          : "self-stretch w-full flex-[0_0_auto]"
                      } items-center ${index === 2 ? "relative" : ""}`}
                    >
                      <div className="relative flex items-center justify-center self-stretch mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#d6e2ff] text-sm text-center tracking-[0] leading-5">
                        {item.date}
                      </div>
                    </div>
                    <div
                      className={`flex ${
                        index === 2 ? "ml-[9px] mr-[9px] flex-1 max-h-4" : ""
                      } flex-col ${
                        index === 2
                          ? "w-[38px]"
                          : "self-stretch w-full flex-[0_0_auto]"
                      } items-center ${index === 2 ? "relative" : ""}`}
                    >
                      <div className="relative flex items-center justify-center self-stretch mt-[-1.00px] font-semantic-link font-[number:var(--semantic-link-font-weight)] text-[#d6e2ff] text-[length:var(--semantic-link-font-size)] text-center tracking-[var(--semantic-link-letter-spacing)] leading-[var(--semantic-link-line-height)] [font-style:var(--semantic-link-font-style)]">
                        {item.day}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start pt-0 pb-2 px-4 relative self-stretch w-full flex-[0_0_auto]">
          <p className="relative flex items-center justify-center self-stretch mt-[-1.00px] font-inter-regular font-[number:var(--inter-regular-font-weight)] text-[#a9b7d1] text-[length:var(--inter-regular-font-size)] tracking-[var(--inter-regular-letter-spacing)] leading-[var(--inter-regular-line-height)] [font-style:var(--inter-regular-font-style)]">
            Showing 128 results
          </p>
        </div>

        <div className="relative self-stretch w-full h-[1613px] overflow-scroll">
          <article className="inline-flex flex-col h-[calc(100%_+_314px)] items-center p-4 absolute top-[541px] left-[calc(50.00%_-_178px)]">
            <div className="flex flex-col max-w-md items-start relative w-full flex-[0_0_auto] bg-gray-900 rounded-2xl shadow-[0px_8px_24px_#00000033]">
              <div className="relative self-stretch w-full h-[509px]">
                <SearchSection />
                <FilterOptionsSection />
                <ResultsSection />
              </div>
            </div>
          </article>

          <article className="inline-flex flex-col h-[calc(100%_+_314px)] items-center p-4 absolute top-[1059px] left-[calc(50.00%_-_178px)]">
            <div className="flex flex-col max-w-md items-start relative w-full flex-[0_0_auto] bg-gray-900 rounded-2xl shadow-[0px_8px_24px_#00000033]">
              <div className="relative self-stretch w-full h-[509px]">
                <RideshareSection />
                <NavigationSection />
                <EventCardSection />
              </div>
            </div>
          </article>

          <article className="flex flex-col max-w-md w-[calc(100%_-_32px)] items-start pt-0 pb-4 px-0 absolute top-4 left-4">
            <div className="flex flex-col max-w-md items-start relative w-full flex-[0_0_auto] bg-gray-900 rounded-2xl shadow-[0px_8px_24px_#00000033]">
              <div className="relative self-stretch w-full h-[509px]">
                <UserProfileSection />
                <DateSelectorSection />
                <ExploreSection />
              </div>
            </div>
          </article>
        </div>
      </div>

      <FooterSection />
      <HeaderSection />
    </div>
  );
};

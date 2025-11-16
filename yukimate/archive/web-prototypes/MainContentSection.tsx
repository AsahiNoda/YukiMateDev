import React from "react";

export const MainContentSection = (): JSX.Element => {
  return (
    <main className="flex flex-col w-[393px] items-start justify-center pt-8 pb-8 px-4">
      <div className="flex flex-col items-start relative self-stretch w-full gap-4">
        <div className="flex flex-col items-start relative self-stretch w-full p-4 bg-[#ffffff1a] rounded-lg backdrop-blur-[10px]">
          <h3 className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-white text-lg tracking-[0] leading-6 mb-2">
            Featured Destinations
          </h3>
          <p className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-gray-200 text-sm tracking-[0] leading-5">
            Explore top-rated ski resorts and snow destinations
          </p>
        </div>
      </div>
    </main>
  );
};


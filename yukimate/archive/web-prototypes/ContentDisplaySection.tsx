import React from "react";

export const ContentDisplaySection = (): JSX.Element => {
  return (
    <div className="flex flex-col w-[393px] items-start justify-center pt-8 pb-8 px-4">
      <div className="flex flex-col items-start relative self-stretch w-full">
        <h2 className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Bold',Helvetica] font-bold text-white text-2xl tracking-[0] leading-8 mb-4">
          Explore
        </h2>
        <p className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-gray-200 text-base tracking-[0] leading-6">
          Discover amazing places and experiences
        </p>
      </div>
    </div>
  );
};


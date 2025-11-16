import React from "react";

export const HeroSection = (): JSX.Element => {
  return (
    <section className="flex flex-col w-[393px] items-center justify-center pt-16 pb-16 px-4">
      <div className="flex flex-col items-center relative w-full">
        <h1 className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Bold',Helvetica] font-bold text-white text-4xl tracking-[0] leading-[48px] text-center mb-4">
          Welcome to YukiMate
        </h1>
        <p className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-gray-200 text-lg tracking-[0] leading-7 text-center max-w-md">
          Your ultimate companion for snow adventures
        </p>
      </div>
    </section>
  );
};


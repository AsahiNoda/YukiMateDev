import React from "react";

const categories = [
  { label: "All", active: true },
  { label: "Events", active: false },
  { label: "Groups", active: false },
  { label: "Rentals", active: false },
];

export const FilterCategoriesSection = (): JSX.Element => {
  return (
    <div className="flex flex-col w-[393px] items-start justify-center pt-4 pb-4 px-4">
      <div className="flex items-center gap-2 relative self-stretch w-full">
        {categories.map((category, index) => (
          <button
            key={index}
            className={`all-[unset] box-border flex items-center justify-center px-4 py-2 relative rounded-lg ${
              category.active
                ? "bg-blue-500"
                : "bg-slate-800"
            }`}
          >
            <span className={`relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-sm tracking-[0] leading-5 whitespace-nowrap ${
              category.active ? "text-white" : "text-gray-300"
            }`}>
              {category.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};


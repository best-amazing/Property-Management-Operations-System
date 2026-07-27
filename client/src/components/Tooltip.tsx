import React from "react";

interface Props {
  text: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<Props> = ({ text, children }) => (
  <div className="relative group inline-block">
    {children}
    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded px-2 py-1 whitespace-nowrap">
      {text}
    </div>
  </div>
);

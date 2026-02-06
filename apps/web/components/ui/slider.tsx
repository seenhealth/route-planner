"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number[];
  onValueChange?: (value: number[]) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const currentValue = value?.[0] ?? Number(min);

    return (
      <input
        type="range"
        ref={ref}
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        className={cn(
          "w-full h-2 rounded-full appearance-none cursor-pointer bg-secondary",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:border-0",
          "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:border-0",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          className
        )}
        {...props}
      />
    );
  }
);
Slider.displayName = "Slider";

export { Slider };

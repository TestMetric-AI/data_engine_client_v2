import { forwardRef, SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className = "", label, error, options, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label
                        className="mb-2 block text-sm font-bold text-text-secondary"
                        htmlFor={props.id}
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={`appearance-none flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-red-500 focus-visible:ring-red-500" : ""
                            } ${className}`}
                        {...props}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-2.5 h-4 w-4 text-text-secondary pointer-events-none" />
                </div>
                {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);

Select.displayName = "Select";

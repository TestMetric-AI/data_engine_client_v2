import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = "", label, error, ...props }, ref) => {
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
                <input
                    ref={ref}
                    className={`flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-red-500 focus-visible:ring-red-500" : ""
                        } ${className}`}
                    {...props}
                />
                {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";

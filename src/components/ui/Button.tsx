import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "danger";
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = "primary", isLoading, children, ...props }, ref) => {
        const baseStyles =
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";

        const variants = {
            primary: "bg-slate-900 text-slate-50 hover:bg-slate-900/90",
            secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
            outline:
                "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
            danger: "bg-red-500 text-white hover:bg-red-600",
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${className}`}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

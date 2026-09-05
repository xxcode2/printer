import clsx from "clsx";

const VARIANTS = {
  primary: "bg-signal text-white hover:bg-signal-dark disabled:bg-ink-300",
  secondary: "bg-white text-ink-900 border border-ink-200 hover:bg-paper-100 disabled:text-ink-300",
  ghost: "text-ink-700 hover:bg-ink-900/5 disabled:text-ink-300",
  danger: "bg-white text-signal border border-signal/30 hover:bg-signal/5",
};

export default function Button({
  children,
  variant = "primary",
  className,
  icon: Icon,
  loading = false,
  disabled,
  ...props
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5",
        "text-sm font-medium transition-colors duration-150",
        "disabled:cursor-not-allowed",
        VARIANTS[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        Icon && <Icon size={16} strokeWidth={2} />
      )}
      {children}
    </button>
  );
}

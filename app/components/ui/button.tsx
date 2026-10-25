import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center px-[22px] py-2 min-w-[220px] min-h-[50px] text-[0.9375rem] font-medium leading-[1.75] tracking-[0.02857em] [text-transform:var(--btn-transform,uppercase)] text-primary-foreground bg-(--primary) border-0 rounded-[var(--radius-btn,25px)] cursor-pointer select-none shadow-(--shadow-2) transition-[background-color,box-shadow] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-(--primary-hover) hover:shadow-(--shadow-4) active:shadow-(--shadow-8) focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-(--primary) focus-visible:outline-offset-2 disabled:text-(--text-disabled) disabled:bg-[rgba(255,255,255,0.12)] disabled:shadow-none disabled:cursor-default disabled:pointer-events-none [html[data-theme=light]_&]:disabled:bg-[rgba(0,0,0,0.12)] max-[899.95px]:min-w-[150px] [html[data-palette=cyberdeck]_&]:tracking-[0.1em] [html[data-palette=cyberdeck]_&]:text-[0.875rem] [html[data-palette=matcha]_&]:font-bold [html[data-palette=matcha]_&]:tracking-[0.01em]",
  {
    variants: {
      variant: {
        default: "",
        text: "bg-transparent text-(--primary) shadow-none min-w-[64px] max-[899.95px]:min-w-[64px] min-h-[36px] px-4 py-1.5 rounded-(--radius-input) hover:bg-(--primary-soft) hover:shadow-none active:shadow-none disabled:text-(--text-disabled) disabled:bg-transparent disabled:pointer-events-none",
        secondary: "bg-(--bg-appbar) text-white hover:bg-(--bg-paper-header) [html[data-theme=light]_&]:bg-[rgba(0,0,0,0.08)] [html[data-theme=light]_&]:text-(--text-primary) [html[data-theme=light]_&]:shadow-none [html[data-theme=light]_&]:hover:bg-[rgba(0,0,0,0.14)] [html[data-theme=light]_&]:hover:shadow-none",
      },
      size: {
        default: "",
        sm: "min-w-[64px] max-[899.95px]:min-w-[56px] min-h-[28px] px-3 py-1 text-[0.75rem] leading-[1.75] tracking-[0.04em] shadow-(--shadow-1)",
        md: "min-w-[180px] max-[899.95px]:min-w-[180px] min-h-[46px] px-[22px] py-2 rounded-[var(--radius-btn,23px)] text-[0.8125rem] leading-[1.75] bg-(--btn-md-bg) hover:bg-(--btn-md-bg-hover)",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

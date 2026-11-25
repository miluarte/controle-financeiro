import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "w-full min-w-0 transition-colors outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-(--alpha-half)",
  {
    variants: {
      variant: {
        default:
          "h-11 rounded-lg border border-input bg-transparent px-3.5 py-2 text-body file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-subheadline file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/(--alpha-half) disabled:bg-input/(--alpha-half) aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/(--alpha-soft) dark:bg-input/(--alpha-medium) dark:disabled:bg-input/(--alpha-strong) dark:aria-invalid:border-destructive/(--alpha-half) dark:aria-invalid:ring-destructive/(--alpha-medium)",
        // campo sem borda, para linhas de formulário agrupado do iOS
        bare: "h-row bg-transparent text-body",
        // valor em destaque no topo do registro (estilo Apple Wallet)
        display: "h-auto bg-transparent text-center text-large-title font-bold tabular-nums",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Input({
  className,
  type,
  variant,
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }

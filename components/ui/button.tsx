import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-subheadline font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/(--alpha-half) active:not-aria-[haspopup]:opacity-(--alpha-muted) disabled:pointer-events-none disabled:opacity-(--alpha-half) aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/(--alpha-soft) dark:aria-invalid:border-destructive/(--alpha-half) dark:aria-invalid:ring-destructive/(--alpha-medium) [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/(--alpha-strong)",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/(--alpha-medium) dark:hover:bg-input/(--alpha-half)",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/(--alpha-strong) aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/(--alpha-half)",
        destructive:
          "bg-destructive/(--alpha-faint) text-destructive hover:bg-destructive/(--alpha-soft) focus-visible:border-destructive/(--alpha-medium) focus-visible:ring-destructive/(--alpha-soft) dark:bg-destructive/(--alpha-soft) dark:hover:bg-destructive/(--alpha-medium) dark:focus-visible:ring-destructive/(--alpha-medium)",
        link: "text-primary underline-offset-4 hover:underline",
        // botão de texto da barra de navegação do iOS (Cancelar, Salvar)
        plain: "text-tint active:opacity-(--alpha-half) disabled:text-muted-foreground disabled:opacity-100",
        // ação de excluir discreta (texto vermelho, sem fundo)
        "plain-destructive": "text-destructive active:opacity-(--alpha-half) disabled:opacity-(--alpha-medium)",
      },
      size: {
        default:
          "h-11 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-md px-2.5 text-caption1 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 rounded-md px-3 text-footnote in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12.5 gap-1.5 rounded-full px-5 text-headline font-semibold has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        // altura da barra de navegação, texto em tamanho body
        nav: "h-11 px-2 text-body",
        icon: "size-11",
        "icon-xs":
          "size-7 rounded-md in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 rounded-md in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-12",
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

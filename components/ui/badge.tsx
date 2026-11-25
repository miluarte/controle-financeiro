import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-caption1 font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/(--alpha-half) has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/(--alpha-soft) dark:aria-invalid:ring-destructive/(--alpha-medium) [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/(--alpha-strong)",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/(--alpha-strong)",
        destructive:
          "bg-destructive/(--alpha-faint) text-destructive focus-visible:ring-destructive/(--alpha-soft) dark:bg-destructive/(--alpha-soft) dark:focus-visible:ring-destructive/(--alpha-medium) [a]:hover:bg-destructive/(--alpha-soft)",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        success:
          "bg-success/(--alpha-faint) text-success-content dark:bg-success/(--alpha-soft) [a]:hover:bg-success/(--alpha-soft)",
        warning: "bg-warning/(--alpha-soft) text-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/(--alpha-half)",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }

'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { cn } from '@/lib/utils'

// Popover (shadcn/ui sobre Base UI) no visual do iOS 26: vidro e cantos grandes.
function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  align = 'end', side = 'bottom', sideOffset = 8, className, ...props
}: PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, 'align' | 'side' | 'sideOffset'>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner className="isolate z-50 outline-none" align={align} side={side} sideOffset={sideOffset}>
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            'glass-strong z-50 origin-(--transform-origin) rounded-3xl p-3 text-foreground outline-none duration-150',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent }

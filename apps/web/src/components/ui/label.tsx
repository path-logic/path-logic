import * as React from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">): React.JSX.Element {
    return (
        <label
            className={cn(
                "text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2",
                className
            )}
            {...props}
        />
    )
}

export { Label }

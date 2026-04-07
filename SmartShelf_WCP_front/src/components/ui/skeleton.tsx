import * as React from "react"
import { cn } from "@/utils/cn"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-border/40 dark:bg-white/10",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent dark:before:via-white/10",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

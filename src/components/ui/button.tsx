import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-70 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "rounded-full bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 active:shadow-none",
        destructive: "rounded-full bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 active:shadow-none",
        outline: "rounded-full border border-border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        secondary: "rounded-full bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "rounded-full bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

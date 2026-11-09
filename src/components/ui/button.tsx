import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function Button({
  asChild,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={twMerge(clsx("btn", className))} {...props} />;
}

interface ScrollRevealProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function ScrollReveal({ children, className }: ScrollRevealProps) {
  return <div className={className}>{children}</div>
}

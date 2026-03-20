import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      if (scrollHeight > 0) {
        setProgress((window.scrollY / scrollHeight) * 100)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Don't show if page is not scrollable
  if (progress === 0) return null

  return (
    <motion.div
      className="fixed top-0 left-0 z-[60] h-0.5 bg-gradient-to-r from-primary via-info to-primary rounded-r-full"
      style={{ width: `${progress}%` }}
      initial={false}
      transition={{ duration: 0.1 }}
    />
  )
}

import { useState } from 'react'
import { ImageOff } from 'lucide-react'

export default function ImageWithFallback({ src, alt, className }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const useFallback = !src || failedSrc === src

  if (useFallback) {
    return (
      <div className={[className, 'image-fallback'].filter(Boolean).join(' ')}>
        <ImageOff size={28} strokeWidth={1.75} />
        <span>Image unavailable</span>
      </div>
    )
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />
}

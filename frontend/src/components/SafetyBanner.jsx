import { ShieldAlert } from 'lucide-react'

export default function SafetyBanner({ text, className }) {
  if (!text) {
    return null
  }

  return (
    <div className={['safety-banner', className].filter(Boolean).join(' ')}>
      <ShieldAlert size={20} strokeWidth={2} />
      <p>{text}</p>
    </div>
  )
}

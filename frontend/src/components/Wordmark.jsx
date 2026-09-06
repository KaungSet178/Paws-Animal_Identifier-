// The PAWS wordmark: "P", "W", "S" in teal, "A" in pink.
// Base colour follows --wordmark-color (defaults to teal); override it on dark
// surfaces (e.g. the footer) so the letters stay readable.
export default function Wordmark({ className }) {
  return (
    <span className={['wordmark', className].filter(Boolean).join(' ')}>
      P<span className="wordmark-a">A</span>WS
    </span>
  )
}

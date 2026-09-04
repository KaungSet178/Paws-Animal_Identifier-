const EVIDENCE_LABEL = {
  strong: 'Strong evidence',
  moderate: 'Moderate evidence',
  weak: 'Weak evidence',
  conflicting: 'Conflicting evidence',
  none: 'Minimal evidence',
}

export default function EvidenceBadge({ evidence }) {
  const level = EVIDENCE_LABEL[evidence] ? evidence : 'none'
  return <span className={`evidence-badge evidence-${level}`}>{EVIDENCE_LABEL[level]}</span>
}

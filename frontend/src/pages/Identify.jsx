import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CircleHelp, Loader2, RotateCcw, SearchX } from 'lucide-react'
import SafetyBanner from '../components/SafetyBanner'
import SpeciesPanel from '../components/SpeciesPanel'
import { identify } from '../api'

const CORRECTABLE_CODES = new Set([
  'INVALID_OBSERVATION',
  'INVALID_ATTRIBUTE',
  'INVALID_VALUE',
  'DUPLICATE_ATTRIBUTE',
])

function attributeLabel(attribute) {
  return attribute
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function Identify() {
  const [observations, setObservations] = useState([])
  const [answerLabels, setAnswerLabels] = useState({})
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [status, setStatus] = useState('idle')
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorInfo, setErrorInfo] = useState(null)
  const requestRef = useRef({ id: 0, controller: null })

  useEffect(() => {
    runIdentify([])
    return () => {
      requestRef.current.controller?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runIdentify(nextObservations) {
    requestRef.current.controller?.abort()
    const controller = new AbortController()
    const requestId = requestRef.current.id + 1
    requestRef.current = { id: requestId, controller }

    setLoading(true)
    setErrorInfo(null)

    try {
      const result = await identify(nextObservations, { signal: controller.signal })
      if (requestRef.current.id !== requestId) return

      setObservations(nextObservations)

      if (result.status === 'continue' && result.nextQuestion) {
        setCurrentQuestion(result.nextQuestion)
        setCandidates([])
        setStatus('questioning')
      } else if (result.status === 'complete') {
        setCurrentQuestion(null)
        setCandidates(Array.isArray(result.candidates) ? result.candidates : [])
        setStatus('complete')
      } else if (result.status === 'ambiguous') {
        setCurrentQuestion(null)
        setCandidates(Array.isArray(result.candidates) ? result.candidates : [])
        setStatus('ambiguous')
      } else if (result.status === 'insufficient_evidence') {
        setCurrentQuestion(null)
        setCandidates([])
        setStatus('insufficient')
      } else {
        setStatus('error')
        setErrorInfo({
          message: 'The identification service returned an unexpected response.',
          correctable: false,
        })
      }
    } catch (error) {
      if (error.name === 'AbortError' || requestRef.current.id !== requestId) return
      const correctable = CORRECTABLE_CODES.has(error.code)
      setStatus('error')
      setErrorInfo({
        message: correctable
          ? error.message
          : 'The identification service is temporarily unavailable. Please try again.',
        correctable,
      })
    } finally {
      if (requestRef.current.id === requestId) {
        requestRef.current.controller = null
        setLoading(false)
      }
    }
  }

  function answer(option) {
    const observation = { attribute: currentQuestion.id, value: option.value }
    setAnswerLabels((prev) => ({ ...prev, [observation.attribute]: option.label }))
    runIdentify([...observations, observation])
  }

  function goBack() {
    if (observations.length === 0) return
    runIdentify(observations.slice(0, -1))
  }

  function restart() {
    setAnswerLabels({})
    setErrorInfo(null)
    runIdentify([])
  }

  const answeredChips = observations.map((observation) => (
    <span className="chip" key={observation.attribute}>
      {attributeLabel(observation.attribute)}: {answerLabels[observation.attribute] || observation.value}
    </span>
  ))

  return (
    <div className="page identify-page">
      <SafetyBanner
        className="identify-safety-notice"
        text="Observe wildlife from a safe distance. If you're unsure about a feature, choose 'Not sure.'"
      />

      {status === 'error' && errorInfo && (
        <section className="error-screen">
          <div className="no-match-card">
            <AlertTriangle size={32} />
            <p className="no-match-message">{errorInfo.message}</p>
          </div>
          <div className="no-match-actions">
            {errorInfo.correctable && observations.length > 0 && (
              <button type="button" className="secondary-button" onClick={goBack}>
                <ArrowLeft size={16} /> Go Back
              </button>
            )}
            <button type="button" className="primary-button" onClick={() => runIdentify(observations)}>
              Try Again
            </button>
            <button type="button" className="secondary-button" onClick={restart}>
              <RotateCcw size={16} /> Start Over
            </button>
          </div>
        </section>
      )}

      {status === 'questioning' && currentQuestion && (
        <section className="question-screen">
          {observations.length > 0 && (
            <button type="button" className="question-back" onClick={goBack} disabled={loading}>
              <ArrowLeft size={18} /> Back
            </button>
          )}

          <p className="question-progress">Question {observations.length + 1}</p>

          <h2>{currentQuestion.text}</h2>

          {answeredChips.length > 0 && <div className="answered-chips">{answeredChips}</div>}

          <div className="option-box">
            <div className="option-grid">
              {currentQuestion.options.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={
                    option.value === 'unknown' ? 'option-card option-card-muted' : 'option-card'
                  }
                  onClick={() => answer(option)}
                  disabled={loading}
                >
                  {option.value === 'unknown' && (
                    <span className="option-card-icon">
                      <CircleHelp size={28} strokeWidth={1.75} />
                    </span>
                  )}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="page-loading">
              <Loader2 className="spin" size={24} />
            </div>
          )}
        </section>
      )}

      {loading && status !== 'questioning' && status !== 'error' && (
        <div className="page-loading">
          <Loader2 className="spin" size={28} />
          <span>Checking your observations&hellip;</span>
        </div>
      )}

      {!loading && status === 'complete' && (
        <section className="result-screen">
          <header className="result-header">
            <p className="result-eyebrow">Identification Result</p>
            <h2>Best match</h2>
          </header>

          {answeredChips.length > 0 && (
            <div className="result-choices">
              <p className="result-choices-title">Based on what you told us</p>
              <div className="result-choices-tags">{answeredChips}</div>
            </div>
          )}

          {candidates.length > 0 ? (
            <SpeciesPanel candidate={candidates[0]} highlight />
          ) : (
            <div className="no-match-card">
              <SearchX size={32} />
              <p className="no-match-message">No matching species were returned for these observations.</p>
            </div>
          )}

          <div className="result-actions">
            <button type="button" className="secondary-button" onClick={restart}>
              <RotateCcw size={16} /> Start Over
            </button>
          </div>
        </section>
      )}

      {!loading && status === 'ambiguous' && (
        <section className="result-screen">
          <header className="result-header">
            <p className="result-eyebrow">Identification Result</p>
            <h2>Possible matches</h2>
          </header>

          <p className="ambiguous-note">
            We could not confidently distinguish between these animals based on the available
            observations.
          </p>

          {answeredChips.length > 0 && (
            <div className="result-choices">
              <p className="result-choices-title">Based on what you told us</p>
              <div className="result-choices-tags">{answeredChips}</div>
            </div>
          )}

          <div className="ambiguous-list">
            {candidates.slice(0, 3).map((candidate) => (
              <SpeciesPanel candidate={candidate} key={candidate.key} />
            ))}
          </div>

          <div className="result-actions">
            <button type="button" className="secondary-button" onClick={restart}>
              <RotateCcw size={16} /> Start Over
            </button>
          </div>
        </section>
      )}

      {!loading && status === 'insufficient' && (
        <section className="no-match-screen">
          <div className="no-match-card">
            <SearchX size={32} />
            <p className="no-match-message">
              There isn&rsquo;t enough information to identify this animal reliably. Try again if
              you can provide more observable details.
            </p>
          </div>
          <div className="no-match-actions">
            <button type="button" className="secondary-button" onClick={restart}>
              <RotateCcw size={16} /> Start Over
            </button>
          </div>
        </section>
      )}

      {!loading && status === 'idle' && (
        <p className="page-error">
          Unable to start identification. <Link to="/">Return home</Link>.
        </p>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PALETTE, SIZE_PRESETS } from './lib/colors'
import { useDrawing, type Tool } from './hooks/useDrawing'

const WORD_MAX = 24

const TOOLS: { id: Tool; label: string; shortcut: string }[] = [
  { id: 'pen', label: 'Pen', shortcut: 'B' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E' },
  { id: 'fill', label: 'Fill', shortcut: 'G' },
  { id: 'line', label: 'Line', shortcut: 'L' },
  { id: 'rect', label: 'Rect', shortcut: 'R' },
  { id: 'ellipse', label: 'Oval', shortcut: 'O' },
]

type Words = [string, string, string]
type Stage = 'draw' | 'front' | 'back'

const STAGES: { id: Stage; label: string }[] = [
  { id: 'draw', label: 'Draw' },
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
]

function emptyWords(): Words {
  return ['', '', '']
}

function filledCount(words: Words) {
  return words.filter((w) => w.trim().length > 0).length
}

function ToolIcon({ tool }: { tool: Tool }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (tool) {
    case 'pen':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="M4 20l4.5-1.2L19 8.3 15.7 5 5.2 15.5 4 20z" />
        </svg>
      )
    case 'eraser':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="M7 17l-3-3 8-8 6 6-8 8H7z" />
          <path {...common} d="M4 20h16" />
        </svg>
      )
    case 'fill':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="M7 14l5-9 5 9H7z" />
          <path {...common} d="M6 18h12" />
        </svg>
      )
    case 'line':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="M5 19L19 5" />
        </svg>
      )
    case 'rect':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="6" width="14" height="12" {...common} />
        </svg>
      )
    case 'ellipse':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="8" ry="6" {...common} />
        </svg>
      )
  }
}

export default function App() {
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(PALETTE[0].hex)
  const [size, setSize] = useState<number>(SIZE_PRESETS[1].value)
  const [frontWords, setFrontWords] = useState<Words>(emptyWords)
  const [backWords, setBackWords] = useState<Words>(emptyWords)
  const [status, setStatus] = useState('Pen selected.')
  const [nudgeWords, setNudgeWords] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [stage, setStage] = useState<Stage>('draw')

  const announce = useCallback((msg: string) => setStatus(msg), [])
  const drawing = useDrawing({ tool, color, size, onAnnounce: announce })

  const frontReady = filledCount(frontWords) === 3
  const backReady = filledCount(backWords) === 3
  const canSubmit = frontReady && backReady

  useEffect(() => {
    if (!drawing.hasMarks || frontReady) return
    const t = window.setTimeout(() => setNudgeWords(true), 1200)
    return () => window.clearTimeout(t)
  }, [drawing.hasMarks, frontReady])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (submitted) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) drawing.redo()
        else drawing.undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        drawing.redo()
        return
      }

      const key = e.key.toLowerCase()
      const map: Record<string, Tool> = {
        b: 'pen',
        e: 'eraser',
        g: 'fill',
        l: 'line',
        r: 'rect',
        o: 'ellipse',
      }
      if (map[key]) {
        setTool(map[key])
        setStage('draw')
        announce(`${TOOLS.find((t) => t.id === map[key])?.label} selected`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [announce, drawing, submitted])

  const submitHint = useMemo(() => {
    if (canSubmit) return 'Ready to submit.'
    const missing: string[] = []
    if (!frontReady) missing.push(`${3 - filledCount(frontWords)} front`)
    if (!backReady) missing.push(`${3 - filledCount(backWords)} back`)
    return `Need ${missing.join(' + ')} word${missing.length === 1 && missing[0].startsWith('1') ? '' : 's'}.`
  }, [backReady, backWords, canSubmit, frontReady, frontWords])

  const startNewDrawing = useCallback(() => {
    const hasContent =
      drawing.hasMarks ||
      frontWords.some((w) => w.trim()) ||
      backWords.some((w) => w.trim())
    if (hasContent && !window.confirm('Start a new mask? This clears the drawing and all six words.')) {
      return
    }
    drawing.reset()
    setFrontWords(emptyWords())
    setBackWords(emptyWords())
    setNudgeWords(false)
    setSubmitted(false)
    setStage('draw')
    setTool('pen')
    setColor(PALETTE[0].hex)
    setSize(SIZE_PRESETS[1].value)
    announce('New drawing started')
  }, [announce, backWords, drawing, frontWords])

  const goNext = () => {
    if (stage === 'draw') {
      setStage('front')
      announce('Front of the mask — add three words')
      return
    }
    if (stage === 'front') {
      setStage('back')
      announce('Back of the mask — add three words')
      return
    }
    if (!canSubmit) {
      announce(submitHint)
      return
    }
    setSubmitted(true)
    announce('Mask submitted locally.')
  }

  const nextLabel =
    stage === 'draw' ? 'Next: Front' : stage === 'front' ? 'Next: Back' : canSubmit ? 'Submit mask' : 'Need words'

  // Keep the canvas mounted across stages so drawing is never wiped.
  return (
    <main className="app">
      <div className={submitted ? 'app-shell is-dimmed' : 'app-shell'} aria-hidden={submitted}>
        <header className="topbar">
          <div className="brand">
            <span className="brand__name">w3m3</span>
            <span className="brand__sub">#MillionMaskMovement</span>
          </div>
          <p className="stage-caption" aria-live="polite">
            {stage === 'draw' && 'Draw the front of your mask'}
            {stage === 'front' && '3 words you show'}
            {stage === 'back' && '3 words you usually hide'}
          </p>
        </header>

        <div className="panels">
          <section
            className={`panel panel--draw${stage === 'draw' ? ' is-active' : ''}`}
            aria-hidden={stage !== 'draw'}
            aria-label="Mask drawing"
          >
            <aside className="tool-rail" aria-label="Drawing tools">
              <div className="tool-group" role="group" aria-label="Tools">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="tool-btn"
                    aria-pressed={tool === t.id}
                    aria-label={`${t.label} (${t.shortcut})`}
                    title={`${t.label} (${t.shortcut})`}
                    disabled={submitted}
                    onClick={() => {
                      setTool(t.id)
                      announce(`${t.label} selected`)
                    }}
                  >
                    <ToolIcon tool={t.id} />
                    <span className="tool-btn__label">{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="tool-group" role="group" aria-label="Brush size">
                {SIZE_PRESETS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="tool-btn tool-btn--size"
                    aria-pressed={size === s.value}
                    aria-label={`Size ${s.label}`}
                    title={`Size ${s.label}`}
                    disabled={submitted}
                    onClick={() => {
                      setSize(s.value)
                      announce(`Size ${s.label}`)
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="tool-group" role="group" aria-label="History">
                <button
                  type="button"
                  className="tool-btn"
                  disabled={submitted || !drawing.canUndo}
                  onClick={drawing.undo}
                  aria-label="Undo"
                  title="Undo (Ctrl+Z)"
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="tool-btn"
                  disabled={submitted || !drawing.canRedo}
                  onClick={drawing.redo}
                  aria-label="Redo"
                  title="Redo (Ctrl+Y)"
                >
                  Redo
                </button>
                <button
                  type="button"
                  className="tool-btn"
                  disabled={submitted}
                  onClick={drawing.clear}
                  aria-label="Clear canvas"
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="tool-btn"
                  disabled={submitted}
                  onClick={startNewDrawing}
                  aria-label="New drawing"
                  title="Start a new mask"
                >
                  New
                </button>
              </div>

              <div className="tool-group tool-group--swatches" role="group" aria-label="Colors">
                <div className="swatches">
                  {PALETTE.map((swatch) => (
                    <button
                      key={swatch.id}
                      type="button"
                      className={`swatch${swatch.id === 'white' ? ' swatch--light' : ''}`}
                      style={{ background: swatch.hex }}
                      aria-label={swatch.name}
                      aria-pressed={color === swatch.hex}
                      title={swatch.name}
                      disabled={submitted}
                      onClick={() => {
                        setColor(swatch.hex)
                        if (tool === 'eraser') setTool('pen')
                        announce(`${swatch.name} selected`)
                      }}
                    />
                  ))}
                </div>
              </div>
            </aside>

            <div className="canvas-area">
              <canvas
                ref={drawing.canvasRef}
                className="draw-canvas"
                aria-label="Front of mask drawing area"
                onPointerDown={submitted || stage !== 'draw' ? undefined : drawing.onPointerDown}
                onPointerMove={submitted || stage !== 'draw' ? undefined : drawing.onPointerMove}
                onPointerUp={submitted || stage !== 'draw' ? undefined : drawing.onPointerUp}
                onPointerCancel={submitted || stage !== 'draw' ? undefined : drawing.onPointerUp}
              />
            </div>
          </section>

          <section
            className={`panel panel--words${stage === 'front' ? ' is-active' : ''}`}
            aria-hidden={stage !== 'front'}
            aria-label="Front of the mask"
          >
            <div className="words-card">
              <header className="face-header">
                <p className="card-tab__kicker">Front of the mask</p>
                <p className="card-tab__meta">Words you gladly let others see</p>
              </header>
              <FaceWords
                id="front"
                tag="Front"
                prompt="Qualities you gladly let others see"
                words={frontWords}
                nudge={nudgeWords && !frontReady}
                disabled={submitted}
                solo
                onChange={setFrontWords}
              />
            </div>
          </section>

          <section
            className={`panel panel--words${stage === 'back' ? ' is-active' : ''}`}
            aria-hidden={stage !== 'back'}
            aria-label="Back of the mask"
          >
            <div className="words-card">
              <header className="face-header">
                <p className="card-tab__kicker">Back of the mask</p>
                <p className="card-tab__meta">What you usually carry but don’t let others see</p>
              </header>
              <FaceWords
                id="back"
                tag="Back"
                prompt="What you usually carry but don’t let others see"
                words={backWords}
                nudge={nudgeWords && frontReady && !backReady}
                disabled={submitted}
                solo
                onChange={setBackWords}
              />
            </div>
          </section>
        </div>

        <nav className="stage-nav" aria-label="Mask steps">
          <div className="stage-tabs" role="tablist" aria-label="Steps">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                className="stage-tab"
                aria-selected={stage === s.id}
                disabled={submitted}
                onClick={() => {
                  setStage(s.id)
                  announce(`${s.label} step`)
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="stage-actions">
            <p className="submit-hint" id="submit-hint">
              {stage === 'back' ? submitHint : drawing.hasMarks ? 'Drawing in progress' : 'Sketch first, then add words'}
            </p>
            <button
              type="button"
              className="submit-btn"
              disabled={submitted || (stage === 'back' && !canSubmit)}
              aria-describedby="submit-hint"
              onClick={goNext}
            >
              {nextLabel}
            </button>
          </div>
        </nav>
      </div>

      {submitted && (
        <div className="done-overlay" role="dialog" aria-modal="true" aria-labelledby="done-title">
          <div className="done" role="status">
            <h2 id="done-title">Mask ready</h2>
            <p>
              <strong>Front:</strong> {frontWords.map((w) => w.trim()).join(' · ')}
            </p>
            <p>
              <strong>Back:</strong> {backWords.map((w) => w.trim()).join(' · ')}
            </p>
            <p>Your drawing is still saved behind this. Keep editing or start fresh.</p>
            <div className="done-actions">
              <button
                type="button"
                className="submit-btn"
                onClick={() => {
                  setSubmitted(false)
                  setStage('draw')
                }}
              >
                Keep editing
              </button>
              <button type="button" className="ghost-btn" onClick={startNewDrawing}>
                New drawing
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
    </main>
  )
}

function FaceWords({
  id,
  tag,
  prompt,
  words,
  nudge,
  disabled = false,
  solo = false,
  onChange,
}: {
  id: string
  tag: string
  prompt: string
  words: Words
  nudge: boolean
  disabled?: boolean
  solo?: boolean
  onChange: (next: Words) => void
}) {
  const focusFirstEmpty = () => {
    if (disabled) return
    const emptyIndex = words.findIndex((w) => !w.trim())
    const index = emptyIndex === -1 ? 0 : emptyIndex
    document.getElementById(`${id}-word-${index}`)?.focus()
  }

  return (
    <div className={`face-words${solo ? ' face-words--solo' : ''}`}>
      <button
        type="button"
        className="face-prompt face-prompt--btn"
        id={`${id}-prompt`}
        disabled={disabled}
        onClick={focusFirstEmpty}
      >
        <span className="face-prompt__tag">{tag}</span>
        <span>{prompt}</span>
        <span className="face-prompt__hint">Tap to type</span>
      </button>
      <div className="face-word-list" role="group" aria-labelledby={`${id}-prompt`}>
        {words.map((value, i) => (
          <div key={`${id}-wrap-${i}`}>
            <label className="sr-only" htmlFor={`${id}-word-${i}`}>
              {tag} word {i + 1}: {prompt}
            </label>
            <input
              id={`${id}-word-${i}`}
              className={`face-word-input${nudge && !value.trim() ? ' is-nudge' : ''}`}
              value={value}
              maxLength={WORD_MAX}
              autoComplete="off"
              enterKeyHint={i === 2 ? 'done' : 'next'}
              placeholder={`Word ${i + 1}`}
              disabled={disabled}
              onChange={(e) => {
                const next = [...words] as Words
                next[i] = e.target.value
                onChange(next)
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                if (i < 2) document.getElementById(`${id}-word-${i + 1}`)?.focus()
                else (e.target as HTMLInputElement).blur()
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

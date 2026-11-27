import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PALETTE, SIZE_PRESETS } from './lib/colors'
import { isMenuShapeTool } from './lib/shapes'
import { useDrawing, type Tool } from './hooks/useDrawing'

const WORD_MAX = 24

const PRIMARY_TOOLS: { id: Tool; label: string; shortcut: string }[] = [
  { id: 'pen', label: 'Pen', shortcut: 'B' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E' },
  { id: 'fill', label: 'Fill', shortcut: 'G' },
  { id: 'line', label: 'Line', shortcut: 'L' },
]

const SHAPE_TOOLS: { id: Tool; label: string; shortcut: string }[] = [
  { id: 'rect', label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', label: 'Oval', shortcut: 'O' },
  { id: 'heart', label: 'Heart', shortcut: 'H' },
  { id: 'star', label: 'Star', shortcut: 'S' },
  { id: 'cloud', label: 'Cloud', shortcut: 'C' },
]

const ALL_TOOLS = [...PRIMARY_TOOLS, ...SHAPE_TOOLS]

type Words = [string, string, string]

type SubmitMeta = {
  gender: string
  age: string
  location: string
  teacherCode: string
}

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other'] as const

function emptyWords(): Words {
  return ['', '', '']
}

function RequiredMark() {
  return (
    <span className="req-mark" aria-hidden="true">
      *
    </span>
  )
}

function filledCount(words: Words) {
  return words.filter((w) => w.trim().length > 0).length
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Paint-bucket / pour-can icon (MS Paint–style fill). */
function FillBucketIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        {...stroke}
        d="M4.5 11.5l7-7 7.5 7.5-4.2 4.2a3 3 0 0 1-4.2 0L4.5 11.5z"
      />
      <path {...stroke} d="M9.2 6.8l2.8-2.8 1.6 1.6" />
      <path
        {...stroke}
        d="M14.8 16.2c.9 1.4 2.4 2.3 4 2.3.2-1.7-.6-3.3-1.9-4.2"
      />
      <path {...stroke} d="M18.6 19.8c.15.9-.2 1.7-1 1.7-.7 0-1.2-.7-1.1-1.5" />
    </svg>
  )
}

/** Menu mark: rect + triangle + circle clustered. */
function ShapesMenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="3.5" width="8" height="7" {...stroke} />
      <path {...stroke} d="M13.5 10.5L17.5 3.5 21.5 10.5z" />
      <circle cx="8.5" cy="17.5" r="4" {...stroke} />
    </svg>
  )
}

function ToolIcon({ tool }: { tool: Tool }) {
  switch (tool) {
    case 'pen':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...stroke} d="M4 20l4.5-1.2L19 8.3 15.7 5 5.2 15.5 4 20z" />
        </svg>
      )
    case 'eraser':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...stroke} d="M7 17l-3-3 8-8 6 6-8 8H7z" />
          <path {...stroke} d="M4 20h16" />
        </svg>
      )
    case 'fill':
      return <FillBucketIcon />
    case 'line':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...stroke} d="M5 19L19 5" />
        </svg>
      )
    case 'rect':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="6" width="14" height="12" {...stroke} />
        </svg>
      )
    case 'ellipse':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="8" ry="6" {...stroke} />
        </svg>
      )
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            {...stroke}
            d="M12 20s-7-4.4-7-9.2C5 7.5 7.2 5.5 9.4 5.5c1.3 0 2.4.7 2.6 1.7.2-1 1.3-1.7 2.6-1.7 2.2 0 4.4 2 4.4 5.3C19 15.6 12 20 12 20z"
          />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            {...stroke}
            d="M12 3.5l2.2 4.6 5.1.7-3.7 3.6.9 5.1L12 15.6 7.5 17.5l.9-5.1L4.7 8.8l5.1-.7L12 3.5z"
          />
        </svg>
      )
    case 'cloud':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            {...stroke}
            d="M6.2 17.2h11.2c1.7 0 3-1.3 3-2.9s-1.2-2.8-2.8-2.9A4.2 4.2 0 0 0 10.2 7a3.6 3.6 0 0 0-5.5 3.2A2.9 2.9 0 0 0 6.2 17.2z"
          />
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
  const [submitStep, setSubmitStep] = useState<'edit' | 'details' | 'done'>('edit')
  const [submitMeta, setSubmitMeta] = useState<SubmitMeta | null>(null)
  const [shapesOpen, setShapesOpen] = useState(false)
  const shapesMenuRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((msg: string) => setStatus(msg), [])
  const drawing = useDrawing({ tool, color, size, onAnnounce: announce })
  const shapeActive = isMenuShapeTool(tool)
  const locked = submitStep !== 'edit'

  const frontReady = filledCount(frontWords) === 3
  const backReady = filledCount(backWords) === 3
  const canSubmit = frontReady && backReady

  useEffect(() => {
    if (!drawing.hasMarks || frontReady) return
    const t = window.setTimeout(() => setNudgeWords(true), 1200)
    return () => window.clearTimeout(t)
  }, [drawing.hasMarks, frontReady])

  useEffect(() => {
    if (!shapesOpen) return
    const onPointer = (e: MouseEvent) => {
      if (!shapesMenuRef.current?.contains(e.target as Node)) setShapesOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShapesOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [shapesOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

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
        h: 'heart',
        s: 'star',
        c: 'cloud',
      }
      if (map[key]) {
        setTool(map[key])
        setShapesOpen(false)
        announce(`${ALL_TOOLS.find((t) => t.id === map[key])?.label} selected`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [announce, drawing, locked])

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
    setSubmitStep('edit')
    setSubmitMeta(null)
    setTool('pen')
    setColor(PALETTE[0].hex)
    setSize(SIZE_PRESETS[1].value)
    announce('New drawing started')
  }, [announce, backWords, drawing, frontWords])

  // Keep the canvas mounted across overlays so Keep editing does not wipe pixels.
  return (
    <main className="app">
      <div className={locked ? 'app-shell is-dimmed' : 'app-shell'} aria-hidden={locked}>
        <header className="chrome">
          <div className="brand">
            <span className="brand__name">w3m3</span>
            <span className="brand__sub">#MillionMaskMovement</span>
          </div>

          <div className="toolbar" role="toolbar" aria-label="Drawing tools">
            <div className="tool-group" role="group" aria-label="Tools">
              {PRIMARY_TOOLS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="tool-btn"
                  aria-pressed={tool === t.id}
                  aria-label={`${t.label} (${t.shortcut})`}
                  title={`${t.label} (${t.shortcut})`}
                  disabled={locked}
                  onClick={() => {
                    setTool(t.id)
                    setShapesOpen(false)
                    announce(`${t.label} selected`)
                  }}
                >
                  <ToolIcon tool={t.id} />
                  <span className="sr-only">{t.label}</span>
                </button>
              ))}

              <div className="shapes-menu" ref={shapesMenuRef}>
                <button
                  type="button"
                  className="tool-btn tool-btn--menu"
                  aria-pressed={shapeActive}
                  aria-expanded={shapesOpen}
                  aria-haspopup="menu"
                  aria-label="Shapes"
                  title="Shapes"
                  disabled={locked}
                  onClick={() => setShapesOpen((open) => !open)}
                >
                  {shapeActive ? <ToolIcon tool={tool} /> : <ShapesMenuIcon />}
                  <span className="shapes-caret" aria-hidden="true" />
                  <span className="sr-only">Shapes</span>
                </button>
                {shapesOpen && (
                  <div className="shapes-popover" role="menu" aria-label="Shape tools">
                    {SHAPE_TOOLS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="menuitemradio"
                        className="shapes-option"
                        aria-checked={tool === t.id}
                        title={`${t.label} (${t.shortcut})`}
                        onClick={() => {
                          setTool(t.id)
                          setShapesOpen(false)
                          announce(`${t.label} selected`)
                        }}
                      >
                        <ToolIcon tool={t.id} />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="tool-group" role="group" aria-label="Brush size">
              {SIZE_PRESETS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="tool-btn"
                  aria-pressed={size === s.value}
                  aria-label={`Size ${s.label}`}
                  title={`Size ${s.label}`}
                  disabled={locked}
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
                disabled={locked || !drawing.canUndo}
                onClick={drawing.undo}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
              >
                Undo
              </button>
              <button
                type="button"
                className="tool-btn"
                disabled={locked || !drawing.canRedo}
                onClick={drawing.redo}
                aria-label="Redo"
                title="Redo (Ctrl+Y)"
              >
                Redo
              </button>
              <button
                type="button"
                className="tool-btn"
                disabled={locked}
                onClick={drawing.clear}
                aria-label="Clear canvas"
              >
                Clear
              </button>
              <button
                type="button"
                className="tool-btn"
                disabled={locked}
                onClick={startNewDrawing}
                aria-label="New drawing"
                title="Start a new mask"
              >
                New
              </button>
            </div>

            <div className="tool-group" role="group" aria-label="Colors">
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
                    disabled={locked}
                    onClick={() => {
                      setColor(swatch.hex)
                      if (tool === 'eraser') setTool('pen')
                      announce(`${swatch.name} selected`)
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="chrome-actions">
            <button
              type="button"
              className="submit-btn"
              disabled={!canSubmit || locked}
              onClick={() => {
                if (!canSubmit) return
                setShapesOpen(false)
                setSubmitStep('details')
                announce('Add a few details to submit your mask')
              }}
              aria-describedby="submit-hint"
            >
              Submit mask
            </button>
            <p id="submit-hint" className="submit-hint">
              {submitHint}
            </p>
          </div>
        </header>

        <section className="workspace" aria-label="Mask card">
          <div className="mask-card">
            <article className="face face--front" aria-labelledby="front-face-title">
              <header className="face-header">
                <p className="card-tab__kicker" id="front-face-title">
                  Front of the mask
                </p>
                <p className="card-tab__meta">Drawings + words</p>
              </header>

              <div className="canvas-area">
                <canvas
                  ref={drawing.canvasRef}
                  className="draw-canvas"
                  aria-label="Front of mask drawing area"
                  onPointerDown={locked ? undefined : drawing.onPointerDown}
                  onPointerMove={locked ? undefined : drawing.onPointerMove}
                  onPointerUp={locked ? undefined : drawing.onPointerUp}
                  onPointerCancel={locked ? undefined : drawing.onPointerUp}
                />
              </div>

              <FaceWords
                id="front"
                tag="Front"
                prompt="Qualities you gladly let others see"
                words={frontWords}
                nudge={nudgeWords && !frontReady}
                disabled={locked}
                onChange={setFrontWords}
              />
            </article>

            <article className="face face--back" aria-labelledby="back-face-title">
              <header className="face-header">
                <p className="card-tab__kicker" id="back-face-title">
                  Back of the mask
                </p>
                <p className="card-tab__meta">Words only</p>
              </header>

              <FaceWords
                id="back"
                tag="Back"
                prompt="What you usually carry but don’t let others see"
                words={backWords}
                nudge={nudgeWords && frontReady && !backReady}
                disabled={locked}
                solo
                onChange={setBackWords}
              />
            </article>
          </div>
        </section>
      </div>

      {submitStep === 'details' && (
        <SubmitDetailsDialog
          initial={submitMeta}
          onCancel={() => {
            setSubmitStep('edit')
            announce('Submit cancelled')
          }}
          onSubmit={(meta) => {
            setSubmitMeta(meta)
            setSubmitStep('done')
            announce('Mask submitted locally.')
          }}
        />
      )}

      {submitStep === 'done' && (
        <div className="done-overlay" role="dialog" aria-modal="true" aria-labelledby="done-title">
          <div className="done" role="status">
            <h2 id="done-title">Mask ready</h2>
            <p>
              <strong>Front:</strong> {frontWords.map((w) => w.trim()).join(' · ')}
            </p>
            <p>
              <strong>Back:</strong> {backWords.map((w) => w.trim()).join(' · ')}
            </p>
            {submitMeta && (
              <p className="done-meta">
                {submitMeta.gender} · age {submitMeta.age} · {submitMeta.location}
                {submitMeta.teacherCode ? ` · code ${submitMeta.teacherCode}` : ''}
              </p>
            )}
            <p>Your drawing is still on the card behind this. Keep editing or start fresh.</p>
            <div className="done-actions">
              <button type="button" className="submit-btn" onClick={() => setSubmitStep('edit')}>
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

function SubmitDetailsDialog({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: SubmitMeta | null
  onCancel: () => void
  onSubmit: (meta: SubmitMeta) => void
}) {
  const [gender, setGender] = useState(initial?.gender ?? '')
  const [age, setAge] = useState(initial?.age ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [teacherCode, setTeacherCode] = useState(initial?.teacherCode ?? '')
  const [attempted, setAttempted] = useState(false)

  const ageOk = /^\d{1,3}$/.test(age.trim()) && Number(age.trim()) > 0 && Number(age.trim()) < 130
  const ready = Boolean(gender) && ageOk && location.trim().length > 0

  return (
    <div className="done-overlay" role="dialog" aria-modal="true" aria-labelledby="submit-details-title">
      <form
        className="submit-details"
        onSubmit={(e) => {
          e.preventDefault()
          setAttempted(true)
          if (!ready) return
          onSubmit({
            gender,
            age: age.trim(),
            location: location.trim(),
            teacherCode: teacherCode.trim(),
          })
        }}
      >
        <h2 id="submit-details-title">Please fill these to submit your mask.</h2>

        <div className="submit-details__row submit-details__row--split">
          <label className="field">
            <span className="field__label">
              Gender
              <RequiredMark />
            </span>
            <select
              className="field__control"
              value={gender}
              required
              aria-invalid={attempted && !gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="" disabled>
                Select
              </option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">
              Age
              <RequiredMark />
            </span>
            <input
              className="field__control"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Age"
              value={age}
              required
              aria-invalid={attempted && !ageOk}
              onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">
            City, State, Region, Or Country
            <RequiredMark />
          </span>
          <input
            className="field__control"
            placeholder="City, State, Region, or Country"
            value={location}
            required
            aria-invalid={attempted && !location.trim()}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Teacher Code (Optional)</span>
          <input
            className="field__control"
            value={teacherCode}
            autoComplete="off"
            onChange={(e) => setTeacherCode(e.target.value)}
          />
        </label>

        {attempted && !ready && (
          <p className="submit-details__error" role="alert">
            Fill in the required fields marked with{' '}
            <span className="req-mark" aria-hidden="true">
              *
            </span>
            .
          </p>
        )}

        <div className="submit-details__actions">
          <button type="submit" className="submit-details__submit">
            Submit mask
          </button>
          <button type="button" className="submit-details__cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
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
        <span className="face-prompt__hint">Click to type</span>
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
              placeholder={`Word ${i + 1}`}
              disabled={disabled}
              onChange={(e) => {
                const next = [...words] as Words
                next[i] = e.target.value
                onChange(next)
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AppFeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState<'like'|'dislike'|null>(null)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const send = async () => {
    if (!rating) { setOpen(true); return }
    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/app-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          'x-path': window.location.pathname,
        },
        body: JSON.stringify({ rating, message: msg })
      })
      setDone(true)
      setTimeout(()=>{ setOpen(false); setRating(null); setMsg(''); setDone(false) }, 1500)
    } catch {
      setSending(false)
    }
  }

  return (
    <div className="app-feedback">
      {!open ? (
        <button className="appfb-fab" onClick={()=>setOpen(true)} aria-label="Give feedback">💬</button>
      ) : (
        <div className="appfb-card">
          <div className="appfb-row">
            <button className={`appfb-thumb ${rating==='like'?'active':''}`} onClick={()=>setRating('like')} aria-label="Thumbs up">👍</button>
            <button className={`appfb-thumb ${rating==='dislike'?'active':''}`} onClick={()=>setRating('dislike')} aria-label="Thumbs down">👎</button>
          </div>
          <textarea className="appfb-input" placeholder="Optional message..." value={msg} onChange={e=>setMsg(e.target.value)} maxLength={500} />
          <div className="appfb-actions">
            <button className="appfb-cancel" onClick={()=>{ setOpen(false); setRating(null); setMsg('') }}>Cancel</button>
            <button className="appfb-send" onClick={send} disabled={sending || !rating}>{done ? 'Thanks!' : sending ? 'Sending...' : 'Send'}</button>
          </div>
        </div>
      )}
      <style jsx>{`
        .app-feedback { position: fixed; right: 16px; bottom: 16px; z-index: 9999; }
        .appfb-fab { background: var(--pastel-green); color: var(--navy-blue); border: none; border-radius: 999px; padding: 12px 16px; font-weight: 700; box-shadow: 0 4px 16px rgba(0,0,0,.1); }
        .appfb-card { width: 280px; background: #fff; border: 1px solid var(--border-grey); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.12); padding: 12px; }
        .appfb-row { display: flex; gap: 8px; }
        .appfb-thumb { flex:1; background: var(--light-grey); border: 1px solid var(--border-grey); border-radius: 8px; padding: 8px 0; font-size: 20px; }
        .appfb-thumb.active { background: var(--pastel-green); border-color: var(--pastel-green); }
        .appfb-input { width: 100%; min-height: 80px; margin-top: 8px; border: 1px solid var(--border-grey); border-radius: 8px; padding: 8px; font-family: inherit; }
        .appfb-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
        .appfb-cancel { background: transparent; border: 1px solid var(--border-grey); color: var(--dark-grey); padding: 6px 10px; border-radius: 8px; }
        .appfb-send { background: var(--pastel-green); color: var(--navy-blue); border: none; padding: 8px 12px; border-radius: 8px; font-weight: 700; }
      `}</style>
    </div>
  )
} 
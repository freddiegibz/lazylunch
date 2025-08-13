import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import DashboardNavbar from '../components/DashboardNavbar'

export default function RecipesTried() {
  const [user, setUser] = useState<any>(null)
  const [membership, setMembership] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Array<{ recipe_id: string, name: string, image?: string, feedback: 'like'|'dislike' }>>([])
  const [updatingId, setUpdatingId] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('membership').eq('id', user.id).single()
      setMembership(profile?.membership || 'free')
      // load feedback rows
      const { data: rows } = await supabase.from('recipe_feedback').select('recipe_id, feedback').eq('user_id', user.id)
      // Try to enrich with names/images if present in recent meal plans (best-effort)
      const { data: plans } = await supabase.from('meal_plans').select('week_data').order('created_at', { ascending: false }).limit(5)
      const idToMeta: Record<string,{name:string,image?:string}> = {}
      plans?.forEach(p => {
        p.week_data?.forEach((d: any) => {
          Object.values(d.meals||{}).forEach((m: any) => {
            if (m && typeof m === 'object' && m.id) idToMeta[m.id] = { name: m.name, image: m.image }
          })
        })
      })
      const mapped = (rows||[]).map(r => ({
        recipe_id: r.recipe_id,
        name: idToMeta[r.recipe_id]?.name || r.recipe_id,
        image: idToMeta[r.recipe_id]?.image,
        feedback: r.feedback as 'like'|'dislike'
      }))
      setItems(mapped)
      setLoading(false)
    }
    init()
  }, [])

  const updateFeedback = async (recipe_id: string, feedback: 'like'|'dislike') => {
    if (!user) return
    setUpdatingId(recipe_id)
    await fetch('/api/recipe-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      body: JSON.stringify({ recipe_id, feedback })
    })
    setItems(prev => prev.map(i => i.recipe_id === recipe_id ? { ...i, feedback } : i))
    setUpdatingId('')
  }

  return (
    <>
      <Head><title>Recipes Tried - LazyLunch</title></Head>
      <div className="dashboard-container">
        {user && (
          <DashboardNavbar user={user} membership={membership} showBackButton={true} />
        )}
        <main className="dashboard-main">
          <div className="dashboard-content" style={{textAlign:'left'}}>
            <h2 className="dashboard-title">Recipes Tried</h2>
            <p className="dashboard-subtitle">All recipes you liked or disliked. Tap to change your rating.</p>
            {loading ? (
              <div className="loading-spinner" />
            ) : (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16}}>
                {items.map(item => (
                  <div key={item.recipe_id} className="stat-card" style={{display:'flex', alignItems:'center', gap:12}}>
                    <div style={{width:56, height:56, borderRadius:8, overflow:'hidden', background:'var(--light-grey)'}}>
                      {item.image ? <img src={item.image} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : null}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700, color:'var(--navy-blue)'}}>{item.name}</div>
                      <div style={{fontSize:12, color:'var(--dark-grey)'}}>{item.recipe_id}</div>
                    </div>
                    <div style={{display:'flex', gap:8}}>
                      <button
                        disabled={updatingId===item.recipe_id}
                        onClick={() => updateFeedback(item.recipe_id, 'like')}
                        className={`rating-button ${item.feedback==='like' ? 'active-like' : ''}`}
                        aria-label="Like"
                      >
                        👍 {item.feedback==='like' ? 'Saved' : 'Like'}
                      </button>
                      <button
                        disabled={updatingId===item.recipe_id}
                        onClick={() => updateFeedback(item.recipe_id, 'dislike')}
                        className={`rating-button ${item.feedback==='dislike' ? 'active-dislike' : ''}`}
                        aria-label="Dislike"
                      >
                        👎 {item.feedback==='dislike' ? 'Saved' : 'Dislike'}
                      </button>
                    </div>
                  </div>
                ))}
                {items.length===0 && <div>No recipes yet. Open a meal and leave a thumbs up or down.</div>}
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .rating-button {
          background: var(--light-grey);
          border: 1px solid var(--border-grey);
          border-radius: 999px;
          padding: 0.5rem 0.9rem;
          font-weight: 700;
          color: var(--navy-blue);
          transition: all 0.2s ease;
        }
        .rating-button:hover {
          background: #eaeef1;
          transform: translateY(-1px);
        }
        .rating-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .rating-button.active-like {
          background: var(--pastel-green);
          border-color: var(--pastel-green);
          color: var(--navy-blue);
        }
        .rating-button.active-dislike {
          background: rgba(242, 140, 140, 0.15);
          border-color: var(--soft-coral);
          color: var(--navy-blue);
        }
      `}</style>
    </>
  )
} 
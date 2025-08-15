import Head from 'next/head'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ManageMembership() {
	const [membership, setMembership] = useState<string>('free')
	const [subId, setSubId] = useState<string | null>(null)
	const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean | null>(null)
	const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null)
	const [busy, setBusy] = useState<string>('')

	useEffect(() => {
		const load = async () => {
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) return
			const { data: profile } = await supabase
				.from('profiles')
				.select('membership')
				.eq('id', user.id)
				.single()
			setMembership(profile?.membership || 'free')
			setSubId(null)
			setCancelAtPeriodEnd(null)
			setCurrentPeriodEnd(null)
		}
		load()
	}, [])

	const openCheckout = async () => {
		setBusy('checkout')
		try {
			const { data: { user } } = await supabase.auth.getUser()
			const res = await fetch('/api/create-checkout-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ priceId: 'price_1RifEpB4uyQdSSUI7iRCrIcE', supabaseUserId: user?.id })
			})
			const data = await res.json()
			if (data.url) window.location.href = data.url
		} finally {
			setBusy('')
		}
	}

	const cancel = async () => {
		if (!subId) return
		setBusy('cancel')
		try {
			const { data: { session } } = await supabase.auth.getSession()
			const res = await fetch('/api/subscription/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` } })
			if (res.ok) setCancelAtPeriodEnd(true)
		} finally { setBusy('') }
	}

	const resume = async () => {
		if (!subId) return
		setBusy('resume')
		try {
			const { data: { session } } = await supabase.auth.getSession()
			const res = await fetch('/api/subscription/resume', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` } })
			if (res.ok) setCancelAtPeriodEnd(false)
		} finally { setBusy('') }
	}

	const hasActive = membership !== 'free'
	const statusColor = hasActive ? 'var(--pastel-green)' : 'var(--border-grey)'
	const statusTextColor = hasActive ? 'var(--navy-blue)' : 'var(--dark-grey)'

	return (
		<>
			<Head>
				<title>Manage Membership - LazyLunch</title>
			</Head>
			<div className="pricing-section" style={{ minHeight: '100vh' }}>
				<div className="container" style={{ maxWidth: 960 }}>
					<h2 className="section-title">Manage Membership</h2>
					<p className="page-subtitle">View your current plan, benefits, and manage billing actions.</p>

					<div className="membership-layout">
						<div className="card">
							<div className="card-header">
								<div className="plan-title">
									<span className="status-badge" style={{ background: statusColor, color: statusTextColor }}>
										{hasActive ? 'Active' : 'Free'}
									</span>
									<span className="current-plan-label">Current plan</span>
								</div>
								<div className="plan-name" style={{ textTransform: 'capitalize' }}>{membership}</div>
							</div>

							<div className="card-section">
								<h3 className="section-heading">What you get</h3>
								<ul className="info-list">
									<li>Personalized weekly meal plans</li>
									<li>Recipe book with step-by-step cooking</li>
									<li>Save presets for fast plan generation</li>
									<li>Like/Dislike recipes to refine future plans</li>
								</ul>
							</div>

							{hasActive && (
								<div className="card-section muted">
									{cancelAtPeriodEnd ? (
										<div>Set to cancel at period end{currentPeriodEnd ? ` on ${new Date(currentPeriodEnd).toLocaleDateString()}` : ''}.</div>
									) : (
										<div>Enjoy uninterrupted access to all Basic features.</div>
									)}
								</div>
							)}
						</div>

						<div className="card">
							<h3 className="section-heading">Billing actions</h3>

							{hasActive ? (
								<>
									{subId ? (
										<div className="actions">
											{cancelAtPeriodEnd ? (
												<button className="dashboard-card-button" onClick={resume} disabled={busy==='resume'}>
													{busy==='resume' ? 'Resuming…' : 'Resume membership'}
												</button>
											) : (
												<button className="dashboard-card-button" onClick={cancel} disabled={busy==='cancel'} style={{ backgroundColor: 'var(--soft-coral)', color: 'white' }}>
													{busy==='cancel' ? 'Processing…' : 'Cancel at period end'}
												</button>
											)}
										</div>
									) : (
										<p className="muted">Billing actions are unavailable for this account in the current environment.</p>
									)}

									<p className="muted" style={{ marginTop: 8 }}>Want to change plan? Re‑purchase Basic below.</p>
									<button className="pricing-cta" onClick={openCheckout} disabled={busy==='checkout'}>
										{busy==='checkout' ? 'Redirecting…' : 'Change plan (Basic $5)'}
									</button>
								</>
							) : (
								<>
									<p className="muted">You don't have an active membership.</p>
									<button className="pricing-cta" onClick={openCheckout} disabled={busy==='checkout'}>
										{busy==='checkout' ? 'Redirecting…' : 'Buy membership ($5)'}
									</button>
								</>
							)}
						</div>
					</div>

					<div className="comparison">
						<h3 className="section-heading">Compare plans</h3>
						<div className="pricing-grid">
							<div className="pricing-card">
								<h3>Free</h3>
								<div className="price">$0<span>/mo</span></div>
								<ul>
									<li>View saved plans</li>
									<li>Browse recipe ideas</li>
									<li>Basic access</li>
								</ul>
								<button className="pricing-cta" disabled>Current</button>
							</div>
							<div className="pricing-card featured">
								<h3>Basic</h3>
								<div className="price">$5<span>/mo</span></div>
								<ul>
									<li>Generate weekly meal plans</li>
									<li>Personalization & presets</li>
									<li>Full recipe book access</li>
								</ul>
								<button className="pricing-cta featured" onClick={openCheckout} disabled={busy==='checkout'}>
									{busy==='checkout' ? 'Redirecting…' : (hasActive ? 'Switch to Basic' : 'Get Basic')}
								</button>
							</div>
						</div>
					</div>

					<style jsx>{`
						.page-subtitle { color: var(--dark-grey); text-align: center; margin: -60px 0 40px; }
						.membership-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 30px; }
						@media (max-width: 900px) { .membership-layout { grid-template-columns: 1fr; } .page-subtitle { margin: -40px 0 30px; } }
						.card { background: var(--white); border: 1px solid var(--border-grey); border-radius: 12px; padding: 20px; }
						.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
						.plan-title { display: flex; align-items: center; gap: 12px; }
						.status-badge { display: inline-flex; align-items: center; justify-content: center; padding: 4px 10px; border-radius: 999px; font-weight: 700; font-size: 0.8rem; }
						.current-plan-label { color: var(--dark-grey); font-weight: 600; }
						.plan-name { font-size: 1.4rem; font-weight: 700; color: var(--navy-blue); }
						.section-heading { font-size: 1.1rem; color: var(--navy-blue); margin: 8px 0 10px; font-weight: 700; }
						.info-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 16px; }
						.info-list li { position: relative; padding-left: 18px; color: var(--dark-grey); }
						.info-list li:before { content: '✓'; position: absolute; left: 0; top: 0; color: var(--pastel-green); font-weight: 700; }
						.card-section { margin-top: 12px; }
						.actions { display: flex; gap: 12px; flex-wrap: wrap; }
						.muted { color: var(--dark-grey); opacity: 0.85; }
						.comparison { margin-top: 10px; }
					`}</style>
				</div>
			</div>
		</>
	)
} 
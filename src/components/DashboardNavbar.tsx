import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

interface DashboardNavbarProps {
  user: any
  membership: string
  showBackButton?: boolean
  backUrl?: string
  backText?: string
}

export default function DashboardNavbar({ 
  user, 
  membership, 
  showBackButton = false, 
  backUrl = '/dashboard', 
  backText = '← Back to Dashboard' 
}: DashboardNavbarProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleUpgrade = async () => {
    setUpgradeLoading(true)
    try {
      const res = await fetch('/api/create-checkout-session', { method: 'POST' })
      
      const data = await res.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(`Error creating checkout session: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`Error creating checkout session: ${err.message}`)
    } finally {
      setUpgradeLoading(false)
    }
  }

  // Capitalize membership for display
  const displayMembership = membership.charAt(0).toUpperCase() + membership.slice(1)

  return (
    <>
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-logo">LazyLunch</div>
          <div className="dashboard-nav">
            {showBackButton && (
              <Link href={backUrl} className="dashboard-link">
                {backText}
              </Link>
            )}
            <span className="dashboard-user">
              Welcome, {user.email} 
              <span style={{color:'#2C3E50', fontWeight:600, marginLeft:8}}>
                [{displayMembership} Member]
              </span>
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="dashboard-settings-btn"
              style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}
              title="Account Settings"
            >
              ⚙️
            </button>
            {membership !== 'premium' && (
              <button
                onClick={handleUpgrade}
                className="dashboard-signout"
                style={{ backgroundColor: '#A8D5BA', color: '#2C3E50', marginLeft: 8 }}
                disabled={upgradeLoading}
              >
                Upgrade Membership
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="dashboard-signout"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 400, margin: '80px auto', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <h2 style={{ marginBottom: 16 }}>Account Settings</h2>
            <div style={{ marginBottom: 12 }}><strong>Account UUID:</strong><br /><span style={{ fontFamily: 'monospace', color: '#2C3E50' }}>{user.id}</span></div>
            <div style={{ marginBottom: 12 }}><strong>Subscription Level:</strong><br /><span style={{ color: '#2C3E50' }}>{displayMembership}</span></div>
            <button onClick={() => setShowSettings(false)} style={{ marginTop: 16, background: '#A8D5BA', color: '#2C3E50', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </>
  )
} 
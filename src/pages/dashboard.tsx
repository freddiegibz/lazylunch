import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { MealPlanService } from '../lib/meal-plan-service'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [membership, setMembership] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [recentMealPlans, setRecentMealPlans] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalPlans: 0,
    thisWeek: 0,
    totalRecipes: 0,
    savedMoney: 0
  })
  const router = useRouter()

  // Add this effect to force a reload if returning from Stripe with ?success=true
  useEffect(() => {
    if (router.query.success) {
      // Remove the query param and reload the page to fetch fresh data
      window.location.replace('/dashboard');
    }
  }, [router.query.success]);

  // Function to create profile for new users (including Google OAuth users)
  const createUserProfile = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          membership: 'free' 
        })
      
      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error creating profile:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error creating profile:', error)
      return false
    }
  }

  // Load user stats and recent meal plans
  const loadUserData = async () => {
    try {
      const plans = await MealPlanService.getAllMealPlans()
      const thisWeek = plans.filter(plan => {
        if (!plan.created_at) return false
        const planDate = new Date(plan.created_at)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return planDate > weekAgo
      })
      
      setRecentMealPlans(plans.slice(0, 3)) // Get 3 most recent
      setStats({
        totalPlans: plans.length,
        thisWeek: thisWeek.length,
        totalRecipes: plans.reduce((acc, plan) => acc + (plan.week_data?.length || 0), 0),
        savedMoney: Math.round(plans.length * 25) // Estimate £25 saved per plan
      })
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  useEffect(() => {
    // Get current user session
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        // Fetch membership from profiles table
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('membership')
            .eq('id', user.id)
            .single()
          
          if (error) {
            console.error('Error fetching profile:', error)
            // If profile doesn't exist, create one with default membership
            await createUserProfile(user.id)
            setMembership('free')
          } else {
            setMembership(profile?.membership || 'free')
          }
        } catch (error) {
          console.error('Error in profile fetch:', error)
          // Try to create profile for new users
          await createUserProfile(user.id)
          setMembership('free')
        }
        
        // Load user data after user is set
        await loadUserData()
      } else {
        // No user found, redirect to signin
        router.push('/signin')
      }
      setLoading(false)
    }

    getCurrentUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/signin')
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        // For new users (including Google OAuth), ensure profile exists
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('membership')
            .eq('id', session.user.id)
            .single()
          
          if (error) {
            // Profile doesn't exist, create it
            await createUserProfile(session.user.id)
            setMembership('free')
          } else {
            setMembership(profile?.membership || 'free')
          }
        } catch (error) {
          console.error('Error handling new user profile:', error)
          await createUserProfile(session.user.id)
          setMembership('free')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleUpgrade = async () => {
    console.log('=== UPGRADE BUTTON CLICKED ===')
    console.log('Starting upgrade process...')
    
    setUpgradeLoading(true)
    try {
      console.log('🔄 Making API request to /api/create-checkout-session...')
      console.log('Request method: POST')
      console.log('Current URL:', window.location.href)
      
      const res = await fetch('/api/create-checkout-session', { method: 'POST' })
      console.log('✅ API response received')
      console.log('Response status:', res.status)
      console.log('Response status text:', res.statusText)
      console.log('Response headers:', Object.fromEntries(res.headers.entries()))
      
      const data = await res.json()
      console.log('📄 Response data:', data)
      
      if (data.url) {
        console.log('✅ Checkout URL received:', data.url)
        console.log('🔄 Redirecting to Stripe checkout...')
        window.location.href = data.url
      } else {
        console.error('❌ No checkout URL in response')
        console.error('Response data:', data)
        alert(`Error creating checkout session: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      console.error('❌ Fetch error occurred:')
      console.error('Error type:', typeof err)
      console.error('Error message:', err.message)
      console.error('Full error:', err)
      alert(`Error creating checkout session: ${err.message}`)
    } finally {
      console.log('🏁 Upgrade process finished')
      setUpgradeLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to signin
  }

  // Capitalize membership for display
  const displayMembership = membership.charAt(0).toUpperCase() + membership.slice(1)

  return (
    <>
      <Head>
        <title>Dashboard - LazyLunch</title>
        <meta name="description" content="Your LazyLunch dashboard" />
      </Head>
      
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-logo">LazyLunch</div>
            <div className="dashboard-nav">
              <span className="dashboard-user">Welcome, {user.email} <span style={{color:'#2C3E50', fontWeight:600, marginLeft:8}}>[{displayMembership} Member]</span></span>
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
                  onClick={() => router.push('/upgrade-membership')}
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

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            {/* Welcome Section */}
            <div className="welcome-section">
              <h2 className="dashboard-title">
                Welcome back! 👋
              </h2>
              <p className="dashboard-subtitle">
                Ready to plan your next delicious week?
              </p>
            </div>

            {/* Quick Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.totalPlans}</div>
                  <div className="stat-label">Total Meal Plans</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.thisWeek}</div>
                  <div className="stat-label">This Week</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🍽️</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.totalRecipes}</div>
                  <div className="stat-label">Recipes Tried</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <div className="stat-number">£{stats.savedMoney}</div>
                  <div className="stat-label">Money Saved</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
              <h3 className="section-title">Quick Actions</h3>
              <div className="quick-actions-grid">
                <Link href="/generate-meal-plan" className="quick-action-card primary">
                  <div className="quick-action-icon">✨</div>
                  <div className="quick-action-content">
                    <h4>Generate New Plan</h4>
                    <p>Create a personalized meal plan</p>
                  </div>
                  <div className="quick-action-arrow">→</div>
                </Link>
                
                <Link href="/my-meal-plans" className="quick-action-card">
                  <div className="quick-action-icon">📋</div>
                  <div className="quick-action-content">
                    <h4>View My Plans</h4>
                    <p>See your saved meal plans</p>
                  </div>
                  <div className="quick-action-arrow">→</div>
                </Link>
                
                <Link href="/recipe-categories" className="quick-action-card">
                  <div className="quick-action-icon">🍳</div>
                  <div className="quick-action-content">
                    <h4>Browse Recipes</h4>
                    <p>Explore recipe categories</p>
                  </div>
                  <div className="quick-action-arrow">→</div>
                </Link>
                
                <div className="quick-action-card">
                  <div className="quick-action-icon">🛒</div>
                  <div className="quick-action-content">
                    <h4>Shopping Lists</h4>
                    <p>Coming soon!</p>
                  </div>
                  <div className="quick-action-arrow">🔒</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {recentMealPlans.length > 0 && (
              <div className="recent-activity-section">
                <h3 className="section-title">Recent Meal Plans</h3>
                <div className="recent-plans-grid">
                  {recentMealPlans.map((plan, index) => (
                    <div key={plan.id} className="recent-plan-card">
                      <div className="recent-plan-header">
                        <div className="recent-plan-date">{formatDate(plan.created_at)}</div>
                        <div className="recent-plan-days">{plan.week_data?.length || 0} days</div>
                      </div>
                      <div className="recent-plan-content">
                        <div className="recent-plan-stats">
                          <span>🍽️ {plan.week_data?.length || 0} meals</span>
                          <span>🛒 {plan.shopping_list?.length || 0} items</span>
                        </div>
                        <button 
                          onClick={() => router.push(`/meal-plan/${plan.id}`)}
                          className="recent-plan-button"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {stats.totalPlans > 3 && (
                  <div className="view-all-section">
                    <Link href="/my-meal-plans" className="view-all-button">
                      View All Meal Plans ({stats.totalPlans})
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Getting Started (for new users) */}
            {stats.totalPlans === 0 && (
              <div className="getting-started-section">
                <h3 className="section-title">Getting Started</h3>
                <div className="getting-started-card">
                  <div className="getting-started-icon">🎯</div>
                  <div className="getting-started-content">
                    <h4>Create Your First Meal Plan</h4>
                    <p>Start by generating a personalized meal plan based on your preferences, dietary restrictions, and budget.</p>
                    <Link href="/generate-meal-plan" className="getting-started-button">
                      Generate My First Plan
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Membership Benefits */}
            {membership === 'free' && (
              <div className="membership-section">
                <h3 className="section-title">Upgrade Your Experience</h3>
                <div className="membership-card">
                  <div className="membership-content">
                    <h4>Unlock Premium Features</h4>
                    <ul className="membership-benefits">
                      <li>✨ Unlimited meal plans</li>
                      <li>🎯 Advanced dietary filters</li>
                      <li>👥 Share plans with family</li>
                      <li>📱 Priority support</li>
                    </ul>
                    <button 
                      onClick={() => router.push('/upgrade-membership')}
                      className="membership-upgrade-button"
                    >
                      Upgrade Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
} 
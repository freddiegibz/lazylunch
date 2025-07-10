import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [membership, setMembership] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const router = useRouter()

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
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({ id: user.id, membership: 'free' })
            
            if (insertError) {
              console.error('Error creating profile:', insertError)
            }
            setMembership('free')
          } else {
            setMembership(profile?.membership || 'free')
          }
        } catch (error) {
          console.error('Error in profile fetch:', error)
          setMembership('free')
        }
      } else {
        // No user found, redirect to signin
        router.push('/signin')
      }
      setLoading(false)
    }

    getCurrentUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/signin')
      } else if (session?.user) {
        setUser(session.user)
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

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            <h2 className="dashboard-title">
              Welcome to your LazyLunch Dashboard!
            </h2>
            <p className="dashboard-subtitle">
              Your AI-powered meal planning journey starts here.
            </p>
            
            {/* Placeholder for meal planning features */}
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>Generate Meal Plan</h3>
                <p>Create a personalized weekly meal plan based on your preferences.</p>
                <Link href="/generate-meal-plan" className="dashboard-card-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Get Started
                </Link>
              </div>
              
              <div className="dashboard-card">
                <h3>My Meal Plans</h3>
                <p>View and manage your saved meal plans.</p>
                <Link href="/my-meal-plans" className="dashboard-card-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  View Plans
                </Link>
              </div>
              
              <div className="dashboard-card">
                <h3>Shopping Lists</h3>
                <p>Generate and manage your grocery shopping lists.</p>
                <button className="dashboard-card-button">
                  Create List
                </button>
              </div>
              
              <div className="dashboard-card">
                <h3>Recipe Categories</h3>
                <p>View recipes organized by meal type (breakfast, lunch, dinner, snack).</p>
                <Link href="/recipe-categories" className="dashboard-card-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  View Categories
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
} 
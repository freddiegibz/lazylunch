import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { MealPlanService } from '../lib/meal-plan-service'
import DashboardNavbar from '../components/DashboardNavbar'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [membership, setMembership] = useState<string>('')
  const [loading, setLoading] = useState(true)
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
        return false
      }
      return true
    } catch (error) {
      return false
    }
  }

  // Load user stats and recent meal plans
  const loadUserData = async () => {
    try {
      console.log('🔍 DEBUG: dashboard.tsx - loadUserData - Starting...');
      const plans = await MealPlanService.getAllMealPlans()
      console.log('🔍 DEBUG: dashboard.tsx - loadUserData - Got plans, processing...');
      
      const thisWeek = plans.filter(plan => {
        if (!plan.created_at) return false
        const planDate = new Date(plan.created_at)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return planDate > weekAgo
      })
      
      console.log('🔍 DEBUG: dashboard.tsx - loadUserData - Setting state...');
      setRecentMealPlans(plans.slice(0, 3)) // Get 3 most recent
      setStats({
        totalPlans: plans.length,
        thisWeek: thisWeek.length,
        totalRecipes: plans.reduce((acc, plan) => acc + (plan.week_data?.length || 0), 0),
        savedMoney: Math.round(plans.length * 25) // Estimate £25 saved per plan
      })
      console.log('🔍 DEBUG: dashboard.tsx - loadUserData - Completed successfully');
    } catch (error) {
      console.log('🔍 DEBUG: dashboard.tsx - loadUserData - Error:', error);
      console.error('Error loading user data:', error)
    }
  }

  useEffect(() => {
    console.log('🔍 DEBUG: dashboard.tsx - useEffect started');
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('🔍 DEBUG: dashboard.tsx - TIMEOUT: Loading taking too long, forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout
    
    // Get current user session
    const getCurrentUser = async () => {
      try {
        console.log('🔍 DEBUG: dashboard.tsx - Getting user...');
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          console.log('🔍 DEBUG: dashboard.tsx - User found, setting user state');
          setUser(user)
          
          // Skip profile fetching for now to isolate the issue
          console.log('🔍 DEBUG: dashboard.tsx - SKIPPING profile fetch for debugging');
          setMembership('free')
          
          // Skip meal plan loading for now
          console.log('🔍 DEBUG: dashboard.tsx - SKIPPING meal plan loading for debugging');
          
        } else {
          console.log('🔍 DEBUG: dashboard.tsx - No user found, redirecting to signin');
          // No user found, redirect to signin
          router.push('/signin')
        }
      } catch (error) {
        console.log('🔍 DEBUG: dashboard.tsx - Error in getCurrentUser:', error);
        // Ensure loading is set to false even on error
        router.push('/signin')
      } finally {
        console.log('🔍 DEBUG: dashboard.tsx - Setting loading to false');
        setLoading(false)
        clearTimeout(timeoutId); // Clear timeout since we completed
      }
    }

    getCurrentUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔍 DEBUG: dashboard.tsx - Auth state change:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/signin')
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        // Skip profile creation for now
        setMembership('free')
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId); // Clean up timeout
    }
  }, [router])

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

  return (
    <>
      <Head>
        <title>Dashboard - LazyLunch</title>
        <meta name="description" content="Your LazyLunch dashboard" />
      </Head>
      
      <div className="dashboard-container">
        <DashboardNavbar 
          user={user} 
          membership={membership} 
        />

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
                    <div className="recent-plan-header" style={{display: 'flex', alignItems: 'center', gap: 12}}>
                      {/* Thumbnail image: use breakfast image from first day, fallback to placeholder */}
                      {plan.week_data && plan.week_data[0] && plan.week_data[0].meals && plan.week_data[0].meals.breakfast && (
                        <div className="recent-plan-thumbnail" style={{width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--light-grey)', marginRight: 8, flexShrink: 0}}>
                          <img
                            src={plan.week_data[0].meals.breakfast.image}
                            alt={plan.week_data[0].meals.breakfast.name || 'Meal Plan'}
                            style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}}
                          />
                        </div>
                      )}
                      <div style={{flex: 1}}>
                        <div className="recent-plan-date">{formatDate(plan.created_at)}</div>
                        <div className="recent-plan-days">{plan.week_data?.length || 0} days</div>
                      </div>
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
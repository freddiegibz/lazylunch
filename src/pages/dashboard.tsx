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
    recipesTried: 0,
    likes: 0,
    dislikes: 0,
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

      // Fetch recipe feedback from current user to populate "Recipes Tried"
      let likes = 0
      let dislikes = 0
      let recipesTried = 0
      if (user?.id) {
        const { data: feedbackRows, error: feedbackError } = await supabase
          .from('recipe_feedback')
          .select('feedback')
          .eq('user_id', user.id)

        if (!feedbackError && feedbackRows) {
          recipesTried = feedbackRows.length
          likes = feedbackRows.filter(r => r.feedback === 'like').length
          dislikes = feedbackRows.filter(r => r.feedback === 'dislike').length
        }
      }
      
      console.log('🔍 DEBUG: dashboard.tsx - loadUserData - Setting state...');
      setRecentMealPlans(plans.slice(0, 3)) // Get 3 most recent
      setStats({
        totalPlans: plans.length,
        recipesTried,
        likes,
        dislikes,
      })
      console.log('🔍 DEBUG: dashboard.tsx - loadUserData - Completed successfully');
    } catch (error) {
      console.log('🔍 DEBUG: dashboard.tsx - loadUserData - Error:', error);
      console.error('Error loading user data:', error)
    }
  }

  useEffect(() => {
    console.log('🔍 DEBUG: dashboard.tsx - useEffect started');
    const startTime = Date.now();
    
    // Add timeout to prevent infinite loading - increased to 30 seconds
    const timeoutId = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      console.log('🔍 DEBUG: dashboard.tsx - TIMEOUT: Loading taking too long, forcing loading to false. Elapsed:', elapsed, 'ms');
      setLoading(false);
    }, 30000); // 30 second timeout
    
    let authStateHandled = false;
    
    // Listen for auth changes first - this is faster than getUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔍 DEBUG: dashboard.tsx - Auth state change:', event);
      
      if (authStateHandled) return; // Prevent multiple calls
      
      if (event === 'SIGNED_OUT') {
        authStateHandled = true;
        setUser(null)
        router.push('/signin')
        clearTimeout(timeoutId);
        clearTimeout(fallbackTimeout);
      } else if (event === 'SIGNED_IN' && session?.user) {
        authStateHandled = true;
        console.log('🔍 DEBUG: dashboard.tsx - User signed in via auth state change');
        setUser(session.user)
        // Fetch membership from profiles table
        try {
          console.log('🔍 DEBUG: Fetching user profile...');
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('membership')
            .eq('id', session.user.id)
            .single()
          
          if (error) {
            console.log('🔍 DEBUG: Profile fetch error, setting membership to free');
            setMembership('free')
          } else {
            console.log('🔍 DEBUG: Profile fetched successfully');
            setMembership(profile?.membership || 'free')
          }
        } catch (error) {
          console.log('🔍 DEBUG: Profile fetch exception, setting membership to free');
          setMembership('free')
        }
        setLoading(false)
        clearTimeout(timeoutId);
        clearTimeout(fallbackTimeout);
      } else if (event === 'INITIAL_SESSION' && session?.user) {
        authStateHandled = true;
        console.log('🔍 DEBUG: dashboard.tsx - Initial session found');
        setUser(session.user)
        // Fetch membership from profiles table
        try {
          console.log('🔍 DEBUG: Fetching user profile...');
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('membership')
            .eq('id', session.user.id)
            .single()
          
          if (error) {
            console.log('🔍 DEBUG: Profile fetch error, setting membership to free');
            setMembership('free')
          } else {
            console.log('🔍 DEBUG: Profile fetched successfully');
            setMembership(profile?.membership || 'free')
          }
        } catch (error) {
          console.log('🔍 DEBUG: Profile fetch exception, setting membership to free');
          setMembership('free')
        }
        setLoading(false)
        clearTimeout(timeoutId);
        clearTimeout(fallbackTimeout);
      }
    })

    // Fallback: Get current user session if auth state change doesn't fire quickly
    const getCurrentUser = async () => {
      if (authStateHandled) return; // Don't run if auth state already handled
      
      console.log('🔍 DEBUG: dashboard.tsx - getCurrentUser function started');
      try {
        console.log('🔍 DEBUG: dashboard.tsx - Getting user...');
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          console.log('🔍 DEBUG: dashboard.tsx - User found, setting user state');
          setUser(user)
          // Fetch membership from profiles table
          try {
            console.log('🔍 DEBUG: Fetching user profile...');
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('membership')
              .eq('id', user.id)
              .single()
            
            if (error) {
              console.log('🔍 DEBUG: Profile fetch error, setting membership to free');
              setMembership('free')
            } else {
              console.log('🔍 DEBUG: Profile fetched successfully');
              setMembership(profile?.membership || 'free')
            }
          } catch (error) {
            console.log('🔍 DEBUG: Profile fetch exception, setting membership to free');
            setMembership('free')
          }
        } else {
          console.log('🔍 DEBUG: dashboard.tsx - No user found, redirecting to signin');
          router.push('/signin')
        }
      } catch (error) {
        console.log('🔍 DEBUG: dashboard.tsx - Error in getCurrentUser:', error);
        router.push('/signin')
      } finally {
        const elapsed = Date.now() - startTime;
        console.log('🔍 DEBUG: dashboard.tsx - Setting loading to false. Total time:', elapsed, 'ms');
        setLoading(false)
        clearTimeout(timeoutId);
      }
    }

    // Run the fallback function with a shorter timeout
    const fallbackTimeout = setTimeout(() => {
      if (!authStateHandled) {
        console.log('🔍 DEBUG: dashboard.tsx - Auth state change taking too long, using fallback');
        getCurrentUser().catch(error => {
          console.log('🔍 DEBUG: dashboard.tsx - Unhandled error in getCurrentUser:', error);
          setLoading(false);
          clearTimeout(timeoutId);
        });
      }
    }, 2000); // 2 second timeout for auth state change

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId);
      clearTimeout(fallbackTimeout);
    }
  }, [router])

  // Load user data when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      console.log('🔍 DEBUG: dashboard.tsx - User authenticated, loading user data...');
      loadUserData();
    }
  }, [user, loading]);

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
            <div className="stat-card" onClick={() => router.push('/recipes-tried')} style={{cursor:'pointer'}}>
              <div className="stat-icon">🍽️</div>
              <div className="stat-content">
                <div className="stat-number">{stats.recipesTried}</div>
                <div className="stat-label">Recipes Tried</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--dark-grey)' }}>{stats.likes} likes • {stats.dislikes} dislikes</div>
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
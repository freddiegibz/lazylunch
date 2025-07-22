import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { MealPlanService, MealPlan } from '../lib/meal-plan-service'
import { MealType } from '../lib/recipe-categories'
import breakfastRecipes from '../lib/breakfast.json'
import lunchRecipes from '../lib/lunch.json'
import dinnerRecipes from '../lib/dinner.json'
import { GetServerSideProps } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { Session } from '@supabase/auth-helpers-nextjs'
import DashboardNavbar from '../components/DashboardNavbar'
import { supabase } from '../lib/supabase'

// Build lookup maps outside the function for O(1) access
const breakfastMap = Object.fromEntries(breakfastRecipes.map((r: any) => [r.id, r]))
const lunchMap = Object.fromEntries(lunchRecipes.map((r: any) => [r.id, r]))
const dinnerMap = Object.fromEntries(dinnerRecipes.map((r: any) => [r.id, r]))

function getRecipeById(id: string, mealType: string) {
  if (mealType === 'breakfast') return breakfastMap[id] || null
  if (mealType === 'lunch') return lunchMap[id] || null
  if (mealType === 'dinner') return dinnerMap[id] || null
  return null
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  console.log('🔍 DEBUG: getServerSideProps started');
  const start = Date.now();
  
  console.log('🔍 DEBUG: Creating Supabase client...');
  const supabase = createPagesServerClient(ctx)
  const clientStart = Date.now();
  
  console.log('🔍 DEBUG: Getting session...');
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const sessionEnd = Date.now();
  console.log('🔍 DEBUG: Session fetch took:', sessionEnd - clientStart, 'ms');

  if (!session) {
    console.log('🔍 DEBUG: No session, redirecting to signin');
    return {
      redirect: {
        destination: '/signin',
        permanent: false,
      },
    }
  }
  
  console.log('🔍 DEBUG: User authenticated, fetching meal plans...');
  const mealPlansStart = Date.now();
  
  // Fetch meal plans for the logged-in user, only needed fields
  const { data: mealPlansRaw, error } = await supabase
    .from('meal_plans')
    .select('id, week_data, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  const mealPlansEnd = Date.now();
  console.log('🔍 DEBUG: Supabase meal plans query took:', mealPlansEnd - mealPlansStart, 'ms');
  console.log('🔍 DEBUG: Found', mealPlansRaw?.length || 0, 'meal plans');
  
  if (error) {
    console.log('🔍 DEBUG: Supabase error:', error);
  }

  const afterSupabase = Date.now();

  console.log('🔍 DEBUG: Starting recipe mapping...');
  const mappingStart = Date.now();

  const populateRecipeObjects = (weekData: any[]) => {
    console.log('🔍 DEBUG: Processing week data with', weekData.length, 'days');
    return weekData.map((day: any, dayIndex: number) => {
      console.log(`🔍 DEBUG: Processing day ${dayIndex + 1}`);
      return {
        ...day,
        meals: {
          breakfast: typeof day.meals?.breakfast === 'string'
            ? (getRecipeById(day.meals.breakfast, 'breakfast') || null)
            : (day.meals?.breakfast || null),
          lunch: typeof day.meals?.lunch === 'string'
            ? (getRecipeById(day.meals.lunch, 'lunch') || null)
            : (day.meals?.lunch || null),
          dinner: typeof day.meals?.dinner === 'string'
            ? (getRecipeById(day.meals.dinner, 'dinner') || null)
            : (day.meals?.dinner || null),
        }
      };
    });
  }

  const generateShoppingList = (weekData: any[]) => {
    console.log('🔍 DEBUG: Generating shopping list for', weekData.length, 'days');
    const allIngredients = new Set<string>()
    weekData.forEach((day: any, dayIndex: number) => {
      console.log(`🔍 DEBUG: Processing ingredients for day ${dayIndex + 1}`);
      Object.values(day.meals).forEach((meal: any) => {
        if (meal && typeof meal === 'object' && meal.ingredients) {
          meal.ingredients.forEach((ingredient: any) => {
            allIngredients.add(ingredient.item)
          })
        }
      })
    })
    const shoppingList = Array.from(allIngredients).sort()
    console.log('🔍 DEBUG: Shopping list has', shoppingList.length, 'items');
    return shoppingList
  }

  let mealPlans: any[] = []
  if (mealPlansRaw && Array.isArray(mealPlansRaw)) {
    console.log('🔍 DEBUG: Processing', mealPlansRaw.length, 'meal plans');
    mealPlans = mealPlansRaw.map((plan: any, planIndex: number) => {
      console.log(`🔍 DEBUG: Processing meal plan ${planIndex + 1}/${mealPlansRaw.length}`);
      // Ensure week_data exists and is an array
      const weekData = Array.isArray(plan.week_data) ? plan.week_data : []
      console.log(`🔍 DEBUG: Plan ${planIndex + 1} has`, weekData.length, 'days');
      const populatedWeekData = populateRecipeObjects(weekData)
      const generatedShoppingList = generateShoppingList(populatedWeekData)
      return {
        ...plan,
        week_data: populatedWeekData,
        shopping_list: generatedShoppingList
      }
    })
  }

  const afterMapping = Date.now();
  console.log('🔍 DEBUG: Supabase fetch:', afterSupabase - start, 'ms');
  console.log('🔍 DEBUG: Mapping:', afterMapping - afterSupabase, 'ms');
  console.log('🔍 DEBUG: Total getServerSideProps time:', afterMapping - start, 'ms');
  console.log('🔍 DEBUG: getServerSideProps completed successfully');

  return {
    props: {
      mealPlans,
      session,
    },
  }
}

function MyMealPlans({ mealPlans = [] }: { mealPlans: any[] }) {
  console.log('🔍 DEBUG: MyMealPlans component rendered with', mealPlans.length, 'meal plans');
  
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [membership, setMembership] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load user data
  useEffect(() => {
    console.log('🔍 DEBUG: MyMealPlans useEffect started');
    const loadUser = async () => {
      try {
        console.log('🔍 DEBUG: Getting user from Supabase...');
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          console.log('🔍 DEBUG: User found, setting user state');
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
          console.log('🔍 DEBUG: No user found, redirecting to signin');
          router.push('/signin')
        }
      } catch (error) {
        console.log('🔍 DEBUG: User fetch exception, redirecting to signin');
        router.push('/signin')
      } finally {
        console.log('🔍 DEBUG: Setting loading to false');
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const deleteMealPlan = async (mealPlanId: string) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) {
      return
    }

    try {
      await MealPlanService.deleteMealPlan(mealPlanId)
      // Reload the list
      // await loadMealPlans() // This line is removed as per the new_code, as mealPlans are now passed as props.
    } catch (error) {
      setError('Failed to delete meal plan')
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

  return (
    <>
      <Head>
        <title>My Meal Plans - LazyLunch</title>
        <meta name="description" content="View and manage your saved meal plans" />
      </Head>
      
      <div className="dashboard-container">
        <DashboardNavbar 
          user={user} 
          membership={membership}
          showBackButton={true}
        />

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            <h2 className="dashboard-title">
              My Meal Plans
            </h2>
            <p className="dashboard-subtitle">
              View and manage your saved meal plans
            </p>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {mealPlans.length === 0 ? (
              <div className="empty-state">
                <h3>No meal plans yet</h3>
                <p>You haven't generated any meal plans yet. Create your first one!</p>
                <Link href="/generate-meal-plan" className="auth-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Generate Meal Plan
                </Link>
              </div>
            ) : (
              <div className="meal-plans-grid">
                {mealPlans.map((plan) => (
                  <div key={plan.id} className="meal-plan-card">
                    <div className="meal-plan-card-header">
                      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                        {/* Thumbnail image: use breakfast image from first day if available */}
                        {plan.week_data && plan.week_data[0] && plan.week_data[0].meals && plan.week_data[0].meals.breakfast && plan.week_data[0].meals.breakfast.image && (
                          <div className="meal-plan-thumbnail" style={{width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: 'var(--light-grey)', marginRight: 8, flexShrink: 0}}>
                            <img
                              src={plan.week_data[0].meals.breakfast.image}
                              alt={plan.week_data[0].meals.breakfast.name || 'Meal Plan'}
                              style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}}
                            />
                          </div>
                        )}
                        <div>
                          <h3>Meal Plan</h3>
                          <span className="meal-plan-date">
                            {plan.created_at ? formatDate(plan.created_at) : 'Unknown date'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="meal-plan-preview">
                      <p><strong>Days:</strong> {plan.week_data?.length || 0} days</p>
                      <p><strong>Shopping Items:</strong> {plan.shopping_list?.length || 0} items</p>
                    </div>
                    <div className="meal-plan-actions">
                      <button
                        onClick={() => router.push(`/meal-plan/${plan.id}`)}
                        className="dashboard-card-button"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => deleteMealPlan(plan.id!)}
                        className="dashboard-card-button"
                        style={{ backgroundColor: '#DC2626', color: 'white' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="create-new-section">
              <Link href="/generate-meal-plan" className="auth-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Generate New Meal Plan
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

export default MyMealPlans 
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { MealPlanService } from '../lib/meal-plan-service'
import { MealType } from '../lib/recipe-categories'
import breakfastRecipes from '../lib/breakfast.json'
import lunchRecipes from '../lib/lunch.json'
import dinnerRecipes from '../lib/dinner.json'
import { supabase } from '../lib/supabase'
import DashboardNavbar from '../components/DashboardNavbar'

// Preference options
const ALLERGEN_OPTIONS = [
  'gluten', 'dairy', 'nuts', 'eggs', 'fish', 'shellfish', 'soy', 'wheat'
]

const WEEKLY_BUDGET_OPTIONS = [
  { value: 'under30', label: 'Under £30' },
  { value: '30-50', label: '£30-50' },
  { value: '50-80', label: '£50-80' },
  { value: 'none', label: 'No budget limit' },
  { value: 'custom', label: 'Custom' },
];

const CUISINE_OPTIONS = [
  'italian', 'mexican', 'asian', 'indian', 'mediterranean', 'british', 'french', 'thai', 'japanese', 'chinese', 'greek', 'moroccan', 'american', 'caribbean', 'middle-eastern'
];




export default function GenerateMealPlan() {
  const [loading, setLoading] = useState(false)
  const [mealPlan, setMealPlan] = useState<any>(null)
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [savedMealPlans, setSavedMealPlans] = useState<any[]>([])
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(true)
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState({
    servings: 1,
    allergens: [] as string[],
    weeklyBudget: 'none',
    customWeeklyBudget: '',
    cuisinePreferences: [] as string[],
  })
  const [user, setUser] = useState<any>(null)
  const [membership, setMembership] = useState<string>('')
  const [loadingUser, setLoadingUser] = useState(true)
  const [planCount, setPlanCount] = useState<number>(0)
  const [planLimit, setPlanLimit] = useState<number>(0)
  const router = useRouter()

  // Check user authentication and membership
  useEffect(() => {
    const checkUser = async () => {
      try {
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
            
            const userMembership = profile?.membership || 'free'
            setMembership(userMembership)
            
            // Set plan limits based on membership
            const membershipLimits = {
              'free': 0,
              'basic': 2,
              'standard': 5,
              'premium': 10
            };
            setPlanLimit(membershipLimits[userMembership as keyof typeof membershipLimits] || 0)
            
            // Fetch current plan count for the week
            if (userMembership !== 'free') {
              const { data: plans, error: plansError } = await supabase
                .from('meal_plans')
                .select('created_at')
                .eq('user_id', user.id)
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
              
              if (!plansError) {
                setPlanCount(plans?.length || 0)
              }
            }
          } catch (error) {
            setMembership('free')
            setPlanLimit(0)
          }
        } else {
          // No user found, redirect to signin
          router.push('/signin')
        }
      } catch (error) {
        router.push('/signin')
      } finally {
        setLoadingUser(false)
      }
    }

    checkUser()
  }, [router])

  // Function to find recipe by name and meal type
  const findRecipeByName = (mealName: string, mealType: MealType) => {
    let recipes: any[] = [];
    if (mealType === 'breakfast') {
      recipes = breakfastRecipes;
    } else if (mealType === 'lunch') {
      recipes = lunchRecipes;
    } else if (mealType === 'dinner') {
      recipes = dinnerRecipes;
    }
    return recipes.find(recipe => 
      recipe.name.toLowerCase().includes(mealName.toLowerCase()) ||
      mealName.toLowerCase().includes(recipe.name.toLowerCase())
    )
  }



  // Function to populate recipe objects from IDs
  const populateRecipeObjects = (weekData: any[]) => {
    const getRecipeById = (id: string, mealType: MealType) => {
      if (mealType === 'breakfast') return breakfastRecipes.find((r: any) => r.id === id);
      if (mealType === 'lunch') return lunchRecipes.find((r: any) => r.id === id);
      if (mealType === 'dinner') return dinnerRecipes.find((r: any) => r.id === id);
      return null;
    };

    return weekData.map((day: any) => ({
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
    }))
  }

  // Function to generate shopping list from recipe objects
  const generateShoppingList = (weekData: any[]) => {
    const ingredientCounts: { [key: string]: number } = {};
    
    weekData.forEach((day: any) => {
      Object.values(day.meals).forEach((meal: any) => {
        if (meal && typeof meal === 'object' && meal.ingredients) {
          meal.ingredients.forEach((ingredient: any) => {
            const item = ingredient.item;
            ingredientCounts[item] = (ingredientCounts[item] || 0) + 1;
          });
        }
      });
    });
    
    // Convert to array format for backward compatibility
    return Object.keys(ingredientCounts).sort();
  };

  const generateMealPlan = async () => {
    setLoading(true)
    try {
      // Get the current Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        alert('Authentication error. Please sign in again.');
        setLoading(false);
        return;
      }
      // POST preferences to the API route
      const res = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ preferences })
      });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 403) {
          alert('Meal plan generation requires a paid membership. Please upgrade to continue.');
          router.push('/upgrade-membership');
        } else if (res.status === 429) {
          const hoursLeft = Math.ceil((errorData.msLeft || 0) / (1000 * 60 * 60));
          const daysLeft = Math.ceil((errorData.msLeft || 0) / (1000 * 60 * 60 * 24));
          const timeMessage = daysLeft > 1 ? `${daysLeft} days` : `${hoursLeft} hours`;
          alert(`Meal plan limit reached (${errorData.currentPlans}/${errorData.planLimit} this week). You can generate a new plan in ${timeMessage}.`);
        } else if (res.status === 402) {
          alert('OpenAI quota exceeded. Please check your API billing.');
        } else if (res.status === 401) {
          alert('Authentication error. Please sign in again.');
        } else {
          alert(errorData.error || 'Failed to generate meal plan.');
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      // Parse the plan from OpenAI (assume it's JSON or parse as needed)
      let plan;
      try {
        plan = typeof data.plan === 'string' ? JSON.parse(data.plan) : data.plan;
      } catch (e) {
        plan = data.plan;
      }

      // Create a version with only recipe IDs for saving to Supabase
      const planWithIds = {
        ...plan,
        week: plan.week.map((day: any) => ({
          ...day,
          meals: {
            breakfast: day.meals.breakfast.recipeId || day.meals.breakfast,
            lunch: day.meals.lunch.recipeId || day.meals.lunch,
            dinner: day.meals.dinner.recipeId || day.meals.dinner,
          }
        }))
      };

      // Generate shopping list from the populated recipe objects
      const populatedWeek = populateRecipeObjects(planWithIds.week);
      const generatedShoppingList = generateShoppingList(populatedWeek);

      // Save the meal plan to Supabase (with IDs only)
      const savedMealPlan = await MealPlanService.saveMealPlan(
        planWithIds.week,
        generatedShoppingList
      );
          if (savedMealPlan) {
        router.push(`/meal-plan/${savedMealPlan.id}`);
      } else {
        alert('Failed to save meal plan.');
        setLoading(false);
          }
        } catch (error) {
      alert('Error generating meal plan.');
      setLoading(false);
    }
  }

  // Load saved meal plans on component mount
  useEffect(() => {
    loadSavedMealPlans()
  }, [])

  const loadSavedMealPlans = async () => {
    try {
      setLoadingSavedPlans(true)
      const plans = await MealPlanService.getAllMealPlans()
      // Populate recipe objects for each plan
      const populatedPlans = plans.map(plan => ({
        ...plan,
        week_data: populateRecipeObjects(plan.week_data)
      }));
      setSavedMealPlans(populatedPlans)
    } catch (error) {
      console.error('Error loading saved meal plans:', error)
    } finally {
      setLoadingSavedPlans(false)
    }
  }

  const loadSavedMealPlan = async (planId: string) => {
    try {
      setLoading(true)
      const plan = savedMealPlans.find(p => p.id === planId)
      if (plan) {
        setMealPlan({
          week: plan.week_data,
          shoppingList: plan.shopping_list,
          id: plan.id,
          created_at: plan.created_at
        })
      }
    } catch (error) {
      console.error('Error loading saved meal plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadMealPlan = () => {
    if (!mealPlan) return
    
    // Create a simple text version for download
    let content = 'LazyLunch Weekly Meal Plan\n\n'
    
    mealPlan.week.forEach((day: any) => {
      content += `${day.day}:\n`
      content += `  Breakfast: ${typeof day.meals.breakfast === 'string' ? day.meals.breakfast : day.meals.breakfast?.name || 'No breakfast recipe available'}\n`
      content += `  Lunch: ${typeof day.meals.lunch === 'string' ? day.meals.lunch : day.meals.lunch?.name || 'No lunch recipe available'}\n`
      content += `  Dinner: ${typeof day.meals.dinner === 'string' ? day.meals.dinner : day.meals.dinner?.name || 'No dinner recipe available'}\n\n`
    })
    
    content += 'Shopping List:\n'
    mealPlan.shoppingList.forEach((item: string) => {
      content += `- ${item}\n`
    })
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'meal-plan.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // When submitting preferences, pass the correct weekly budget value
  const getWeeklyBudgetValue = () => {
    if (preferences.weeklyBudget === 'custom') {
      return preferences.customWeeklyBudget ? Number(preferences.customWeeklyBudget) : null;
    }
    if (preferences.weeklyBudget === 'under30') return 30;
    if (preferences.weeklyBudget === '30-50') return 50;
    if (preferences.weeklyBudget === '50-80') return 80;
    if (preferences.weeklyBudget === 'none') return null;
    return null;
  };


  // Show paywall for free users
  if (loadingUser) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading...</p>
      </div>
    )
  }

  if (membership === 'free') {
    return (
      <>
        <Head>
          <title>Upgrade Required - LazyLunch</title>
          <meta name="description" content="Upgrade your membership to generate meal plans" />
        </Head>
        
        <DashboardNavbar 
          user={user} 
          membership={membership}
          showBackButton={true}
        />

        <div className="dashboard-container">
          {/* Main Content */}
          <main className="dashboard-main">
            <div className="dashboard-content">
              <div className="paywall-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <h1 style={{ fontSize: '2.5rem', color: '#2C3E50', marginBottom: '1rem' }}>
                  🔒 Generate Meal Plans
                </h1>
                <p style={{ fontSize: '1.2rem', color: '#7F8C8D', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                  Upgrade your membership to unlock AI-powered meal plan generation. 
                  Get personalized weekly meal plans tailored to your preferences.
                </p>
                
                <div className="paywall-features" style={{ marginBottom: '3rem' }}>
                  <h3 style={{ color: '#2C3E50', marginBottom: '1rem' }}>What you'll get:</h3>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
                    <li style={{ padding: '1rem', background: '#F8F9FA', borderRadius: '8px', border: '1px solid #E9ECEF' }}>
                      <strong>🎯 Personalized Plans</strong><br />
                      AI-generated meal plans based on your preferences
                    </li>
                    <li style={{ padding: '1rem', background: '#F8F9FA', borderRadius: '8px', border: '1px solid #E9ECEF' }}>
                      <strong>🛒 Shopping Lists</strong><br />
                      Automatic grocery lists for your meal plans
                    </li>
                    <li style={{ padding: '1rem', background: '#F8F9FA', borderRadius: '8px', border: '1px solid #E9ECEF' }}>
                      <strong>💰 Save Money</strong><br />
                      Reduce food waste and optimize your grocery budget
                    </li>
                    <li style={{ padding: '1rem', background: '#F8F9FA', borderRadius: '8px', border: '1px solid #E9ECEF' }}>
                      <strong>⏰ Save Time</strong><br />
                      No more daily "what's for dinner" decisions
                    </li>
                  </ul>
                </div>

                <div className="paywall-actions">
                  <Link href="/upgrade-membership" style={{ 
                    display: 'inline-block', 
                    background: '#A8D5BA', 
                    color: '#2C3E50', 
                    padding: '1rem 2rem', 
                    borderRadius: '8px', 
                    textDecoration: 'none', 
                    fontSize: '1.1rem', 
                    fontWeight: '600',
                    marginRight: '1rem'
                  }}>
                    Upgrade Now
                  </Link>
                  <Link href="/dashboard" style={{ 
                    display: 'inline-block', 
                    background: 'transparent', 
                    color: '#7F8C8D', 
                    padding: '1rem 2rem', 
                    borderRadius: '8px', 
                    textDecoration: 'none', 
                    fontSize: '1.1rem',
                    border: '1px solid #BDC3C7'
                  }}>
                    Back to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Generate Meal Plan - LazyLunch</title>
        <meta name="description" content="Generate your personalized weekly meal plan" />
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
              Generate Your Weekly Meal Plan
            </h2>
            <p className="dashboard-subtitle">
              Get a personalized meal plan tailored to your preferences and dietary needs.
            </p>
            
            {membership !== 'free' && (
              <div style={{ 
                background: '#F8F9FA', 
                border: '1px solid #E9ECEF', 
                borderRadius: '8px', 
                padding: '12px 16px', 
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <span style={{ color: '#2C3E50', fontWeight: '600' }}>
                  📊 Plan Usage: {planCount}/{planLimit} this week
                </span>
                {planCount >= planLimit && (
                  <div style={{ color: '#E74C3C', fontSize: '0.9rem', marginTop: '4px' }}>
                    You've reached your weekly limit. New plans will be available in 7 days.
                  </div>
                )}
              </div>
            )}

            {!mealPlan && (
              <div className="meal-plan-generator">
                <div className="generator-card">
                  <h3>Personalize Your Meal Plan</h3>
                  <p>Tell us your preferences to get a perfectly tailored meal plan.</p>
                  
                  {/* Preferences Form */}
                  <div className="preferences-form">
                    {/* Servings */}
                    <div className="preference-section">
                      <label className="preference-label">How many people are you cooking for?</label>
                      <select 
                        value={preferences.servings}
                        onChange={(e) => setPreferences({...preferences, servings: parseInt(e.target.value)})}
                        className="preference-select"
                      >
                        <option value={1}>1 person</option>
                        <option value={2}>2 people</option>
                        <option value={3}>3 people</option>
                        <option value={4}>4 people</option>
                        <option value={5}>5 people</option>
                        <option value={6}>6 people</option>
                        <option value={7}>7 people</option>
                        <option value={8}>8 people</option>
                      </select>
                    </div>

                    {/* Weekly Budget */}
                    <div className="preference-section">
                      <label className="preference-label">What's your weekly food budget?</label>
                      <div className="preference-options">
                        {WEEKLY_BUDGET_OPTIONS.map(option => (
                          <label key={option.value} className="preference-option">
                            <input
                              type="radio"
                              name="weeklyBudget"
                              value={option.value}
                              checked={preferences.weeklyBudget === option.value}
                              onChange={(e) => setPreferences({ ...preferences, weeklyBudget: e.target.value })}
                            />
                            <span className="option-label">{option.label}</span>
                          </label>
                        ))}
                      </div>
                      {preferences.weeklyBudget === 'custom' && (
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="preference-input"
                          placeholder="Enter your weekly budget (£)"
                          value={preferences.customWeeklyBudget}
                          onChange={e => setPreferences({ ...preferences, customWeeklyBudget: e.target.value })}
                          style={{ marginTop: 8, width: '60%' }}
                        />
                      )}
                    </div>

                    {/* Allergens */}
                    <div className="preference-section">
                      <label className="preference-label">Any food allergies or intolerances?</label>
                      <div className="preference-checkboxes">
                        {ALLERGEN_OPTIONS.map(allergen => (
                          <label key={allergen} className="preference-checkbox">
                            <input
                              type="checkbox"
                              checked={preferences.allergens.includes(allergen)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPreferences({
                                    ...preferences, 
                                    allergens: [...preferences.allergens, allergen]
                                  })
                                } else {
                                  setPreferences({
                                    ...preferences, 
                                    allergens: preferences.allergens.filter(a => a !== allergen)
                                  })
                                }
                              }}
                            />
                            <span className="checkbox-label">{allergen.charAt(0).toUpperCase() + allergen.slice(1)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Cuisine Preferences */}
                    <div className="preference-section">
                      <label className="preference-label">What cuisines do you enjoy? (Optional)</label>
                      <div className="preference-checkboxes">
                        {CUISINE_OPTIONS.map(cuisine => (
                          <label key={cuisine} className="preference-checkbox">
                            <input
                              type="checkbox"
                              checked={preferences.cuisinePreferences.includes(cuisine)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPreferences({
                                    ...preferences, 
                                    cuisinePreferences: [...preferences.cuisinePreferences, cuisine]
                                  })
                                } else {
                                  setPreferences({
                                    ...preferences, 
                                    cuisinePreferences: preferences.cuisinePreferences.filter(c => c !== cuisine)
                                  })
                                }
                              }}
                            />
                            <span className="checkbox-label">{cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={generateMealPlan}
                    disabled={loading || (membership !== 'free' && planCount >= planLimit)}
                    className="auth-button"
                    style={{ 
                      marginTop: '20px',
                      opacity: (membership !== 'free' && planCount >= planLimit) ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Generating Meal Plan...' : 
                     (membership !== 'free' && planCount >= planLimit) ? 'Weekly Limit Reached' : 
                     'Generate Personalized Meal Plan'}
                  </button>

                  {/* Load Saved Plans Section */}
                  {!loadingSavedPlans && savedMealPlans.length > 0 && (
                    <div className="load-saved-plans">
                      <div className="divider">
                        <span>or</span>
                      </div>
                      
                      <h4>Load a Saved Meal Plan</h4>
                      <div className="saved-plans-list">
                        {savedMealPlans.slice(0, 3).map((plan) => (
                          <button
                            key={plan.id}
                            onClick={() => loadSavedMealPlan(plan.id)}
                            disabled={loading}
                            className="load-plan-button"
                          >
                            <span className="plan-date">
                              {new Date(plan.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="plan-details">
                              {plan.week_data?.length || 0} days • {plan.shopping_list?.length || 0} items
                            </span>
                          </button>
                        ))}
                      </div>
                      
                      {savedMealPlans.length > 3 && (
                        <Link href="/my-meal-plans" className="view-all-plans">
                          View all {savedMealPlans.length} meal plans →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {loading && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text">Creating your personalized meal plan...</p>
              </div>
            )}

            {mealPlan && (
              <div className="meal-plan-results">
                <div className="meal-plan-header">
                  <h3>Your Weekly Meal Plan</h3>
                  <div className="meal-plan-actions">
                    <button
                      onClick={() => setShowShoppingList(!showShoppingList)}
                      className="dashboard-card-button"
                    >
                      {showShoppingList ? 'Hide' : 'Show'} Shopping List
                    </button>
                    <button
                      onClick={downloadMealPlan}
                      className="dashboard-card-button"
                    >
                      Download Plan
                    </button>
                    <button
                      onClick={() => {
                        setMealPlan(null)
                        setShowShoppingList(false)
                      }}
                      className="dashboard-card-button"
                      style={{ backgroundColor: 'var(--pastel-green)' }}
                    >
                      Generate New Plan
                    </button>
                  </div>
                </div>

                {/* Day Navigation */}
                <div className="day-navigation">
                  {mealPlan.week.map((day: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => setCurrentDayIndex(index)}
                      className={`day-tab ${currentDayIndex === index ? 'active' : ''}`}
                    >
                      {day.day}
                    </button>
                  ))}
                </div>

                {/* Current Day Meals */}
                <div className="current-day-meals">
                  <h3 className="current-day-title">
                    {mealPlan.week[currentDayIndex].day}
                  </h3>
                  
                  <div className="meals-container">
                    {(() => {
                      const breakfastRecipe = mealPlan.week[currentDayIndex].meals.breakfast
                      return (
                        <div className="meal-card">
                          <div className="meal-content">
                            <div className="meal-image">
                              <img
                                src={breakfastRecipe?.image}
                                alt={breakfastRecipe?.name || 'Breakfast'}
                                style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}}
                              />
                            </div>
                            <div className="meal-info">
                              <h4 className="meal-type">Breakfast</h4>
                              <p className="meal-name">{breakfastRecipe?.name || mealPlan.week[currentDayIndex].meals.breakfast}</p>
                              {breakfastRecipe && (
                                <div className="meal-tags">
                                  <span className="cost-tag">£{breakfastRecipe.estTotalCost.toFixed(2)}</span>
                                  <span className="servings-tag">{breakfastRecipe.baseServings} servings</span>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      )
                    })()}

                    {(() => {
                      const lunchRecipe = mealPlan.week[currentDayIndex].meals.lunch
                      return (
                        <div className="meal-card">
                          <div className="meal-content">
                            <div className="meal-image">
                              <img 
                                src={lunchRecipe?.image}
                                alt={lunchRecipe?.name || 'Lunch'}
                                style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}}
                              />
                            </div>
                            <div className="meal-info">
                              <h4 className="meal-type">Lunch</h4>
                              <p className="meal-name">{lunchRecipe?.name || mealPlan.week[currentDayIndex].meals.lunch}</p>
                              {lunchRecipe && (
                                <div className="meal-tags">
                                  <span className="cost-tag">£{lunchRecipe.estTotalCost.toFixed(2)}</span>
                                  <span className="servings-tag">{lunchRecipe.baseServings} servings</span>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      )
                    })()}

                    {(() => {
                      const dinnerRecipe = mealPlan.week[currentDayIndex].meals.dinner
                      return (
                        <div className="meal-card">
                          <div className="meal-content">
                            <div className="meal-image">
                              <img 
                                src={dinnerRecipe?.image} 
                                alt={dinnerRecipe?.name || 'Dinner'}
                                style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}}
                              />
                            </div>
                            <div className="meal-info">
                              <h4 className="meal-type">Dinner</h4>
                              <p className="meal-name">{dinnerRecipe?.name || mealPlan.week[currentDayIndex].meals.dinner}</p>
                              {dinnerRecipe && (
                                <div className="meal-tags">
                                  <span className="cost-tag">£{dinnerRecipe.estTotalCost.toFixed(2)}</span>
                                  <span className="servings-tag">{dinnerRecipe.baseServings} servings</span>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      )
                    })()}
                  </div>
                </div>

                {showShoppingList && (
                  <div className="shopping-list-section">
                    <h3>Shopping List</h3>
                    <div className="shopping-list">
                      {typeof mealPlan.shoppingList === 'object' && mealPlan.shoppingList !== null ? (
                        // Handle structured shopping list (categorized)
                        Object.entries(mealPlan.shoppingList).map(([category, items]: [string, any]) => (
                          <div key={category} className="shopping-category">
                            <h4 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                            <div className="category-items">
                              {Array.isArray(items) && items.map((item: string, index: number) => (
                                <div key={`${category}-${index}`} className="shopping-item">
                                  <input type="checkbox" id={`item-${category}-${index}`} />
                                  <label htmlFor={`item-${category}-${index}`}>{item}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        // Handle flat shopping list (backward compatibility)
                        Array.isArray(mealPlan.shoppingList) && mealPlan.shoppingList.map((item: string, index: number) => (
                          <div key={index} className="shopping-item">
                            <input type="checkbox" id={`item-${index}`} />
                            <label htmlFor={`item-${index}`}>{item}</label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>
        </main>
      </div>
    </>
  )
} 
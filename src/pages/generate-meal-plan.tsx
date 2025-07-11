import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { MealPlanService } from '../lib/meal-plan-service'
import { getRandomRecipe, MealType, getRecipesByMealTypeWithOverrides } from '../lib/recipe-categories'
import recipes from '../lib/dinner.json'
import { supabase } from '../lib/supabase'

// Preference options
const FOCUS_OPTIONS = [
  { value: 'variety', label: 'Variety - Mix of different cuisines and flavors' },
  { value: 'taste', label: 'Taste - Focus on delicious, flavorful meals' },
  { value: 'budget', label: 'Save Money - Budget-friendly recipes' },
  { value: 'healthy', label: 'Healthy - Nutritious and balanced meals' },
  { value: 'quick', label: 'Quick & Easy - Fast preparation meals' }
]

const ALLERGEN_OPTIONS = [
  'gluten', 'dairy', 'nuts', 'eggs', 'fish', 'shellfish', 'soy', 'wheat'
]

const BUDGET_OPTIONS = [
  { value: 'low', label: 'Budget-Friendly (£2-4 per meal)' },
  { value: 'medium', label: 'Moderate (£4-7 per meal)' },
  { value: 'high', label: 'Premium (£7+ per meal)' }
]

const CUISINE_OPTIONS = [
  'italian', 'mexican', 'indian', 'chinese', 'thai', 'mediterranean', 
  'british', 'american', 'french', 'japanese', 'greek', 'spanish',
  'caribbean', 'middle eastern', 'african', 'vietnamese'
]

const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'low-carb',
  'high-protein', 'low-sodium', 'diabetic-friendly'
]

const WEEKLY_BUDGET_OPTIONS = [
  { value: 'under30', label: 'Under £30' },
  { value: '30-50', label: '£30-50' },
  { value: '50-80', label: '£50-80' },
  { value: 'none', label: 'No budget limit' },
  { value: 'custom', label: 'Custom' },
];


// Function to generate a meal plan using real recipes
const generateMealPlanWithRecipes = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  // Track used recipes to avoid duplicates
  const usedRecipes = new Set<string>()
  const usedRecipesList: any[] = []
  
  const week = days.map(day => {
    // Get recipes for this day, avoiding duplicates
    let breakfastRecipe = getRandomRecipe('breakfast')
    let lunchRecipe = getRandomRecipe('lunch')
    let dinnerRecipe = getRandomRecipe('dinner')
    
    // Try to avoid duplicates by getting different recipes if already used
    // Limit attempts to prevent infinite loops if we don't have enough recipes
    let attempts = 0
    while (breakfastRecipe && usedRecipes.has(breakfastRecipe.id) && attempts < 5) {
      breakfastRecipe = getRandomRecipe('breakfast')
      attempts++
    }
    
    attempts = 0
    while (lunchRecipe && usedRecipes.has(lunchRecipe.id) && attempts < 5) {
      lunchRecipe = getRandomRecipe('lunch')
      attempts++
    }
    
    attempts = 0
    while (dinnerRecipe && usedRecipes.has(dinnerRecipe.id) && attempts < 5) {
      dinnerRecipe = getRandomRecipe('dinner')
      attempts++
    }
    
    // Add to used recipes and tracking list
    if (breakfastRecipe) {
      usedRecipes.add(breakfastRecipe.id)
      usedRecipesList.push(breakfastRecipe)
    }
    if (lunchRecipe) {
      usedRecipes.add(lunchRecipe.id)
      usedRecipesList.push(lunchRecipe)
    }
    if (dinnerRecipe) {
      usedRecipes.add(dinnerRecipe.id)
      usedRecipesList.push(dinnerRecipe)
    }
    
    return {
      day,
      meals: {
        breakfast: breakfastRecipe?.name || 'No breakfast recipe available',
        lunch: lunchRecipe?.name || 'No lunch recipe available',
        dinner: dinnerRecipe?.name || 'No dinner recipe available'
      }
    }
  })

  // Extract unique ingredients from all recipes used
  const allIngredients = new Set<string>()
  usedRecipesList.forEach(recipe => {
    recipe.ingredients.forEach((ingredient: any) => {
      allIngredients.add(ingredient.item)
    })
  })

  const shoppingList = Array.from(allIngredients)

  return { week, shoppingList }
}

export default function GenerateMealPlan() {
  const [loading, setLoading] = useState(false)
  const [mealPlan, setMealPlan] = useState<any>(null)
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [savedMealPlans, setSavedMealPlans] = useState<any[]>([])
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(true)
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState({
    servings: 4,
    focus: 'variety',
    allergens: [] as string[],
    budget: 'medium',
    cuisine: [] as string[],
    dietaryRestrictions: [] as string[],
    weeklyBudget: 'none',
    customWeeklyBudget: '',
  })
  const [user, setUser] = useState<any>(null)
  const [membership, setMembership] = useState<string>('')
  const [loadingUser, setLoadingUser] = useState(true)
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
            
            if (error) {
              console.error('Error fetching profile:', error)
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
      } catch (error) {
        console.error('Error checking user:', error)
        router.push('/signin')
      } finally {
        setLoadingUser(false)
      }
    }

    checkUser()
  }, [router])

  // Function to find recipe by name and meal type
  const findRecipeByName = (mealName: string, mealType: MealType) => {
    const categorizedRecipes = getRecipesByMealTypeWithOverrides(mealType)
    return categorizedRecipes.find(recipe => 
      recipe.name.toLowerCase().includes(mealName.toLowerCase()) ||
      mealName.toLowerCase().includes(recipe.name.toLowerCase())
    )
  }



  const generateMealPlan = async () => {
    setLoading(true)
    
    // Log preferences for OpenAI integration (frontend only)
    console.log('User Preferences for OpenAI:', preferences)
    
    try {
      // Simulate API call delay
      setTimeout(async () => {
        try {
          // Generate meal plan using real recipes (simplified for frontend)
          const generatedMealPlan = generateMealPlanWithRecipes()
          
          // Save the meal plan to Supabase
          const savedMealPlan = await MealPlanService.saveMealPlan(
            generatedMealPlan.week,
            generatedMealPlan.shoppingList
          )
          
          if (savedMealPlan) {
            // Redirect to the meal plan detail page
            router.push(`/meal-plan/${savedMealPlan.id}`)
          } else {
            console.error('Failed to save meal plan')
            setLoading(false)
          }
        } catch (error) {
          console.error('Error saving meal plan:', error)
          setLoading(false)
        }
      }, 2000)
    } catch (error) {
      console.error('Error generating meal plan:', error)
      setLoading(false)
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
      setSavedMealPlans(plans)
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
      content += `  Breakfast: ${day.meals.breakfast}\n`
      content += `  Lunch: ${day.meals.lunch}\n`
      content += `  Dinner: ${day.meals.dinner}\n\n`
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
        
        <div className="dashboard-container">
          {/* Header */}
          <header className="dashboard-header">
            <div className="dashboard-header-content">
              <div className="dashboard-logo">LazyLunch</div>
              <div className="dashboard-nav">
                <Link href="/dashboard" className="dashboard-link">
                  ← Back to Dashboard
                </Link>
              </div>
            </div>
          </header>

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
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-logo">LazyLunch</div>
            <div className="dashboard-nav">
              <Link href="/dashboard" className="dashboard-link">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            <h2 className="dashboard-title">
              Generate Your Weekly Meal Plan
            </h2>
            <p className="dashboard-subtitle">
              Get a personalized meal plan tailored to your preferences and dietary needs.
            </p>

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

                    {/* Focus */}
                    <div className="preference-section">
                      <label className="preference-label">What's your main focus?</label>
                      <div className="preference-options">
                        {FOCUS_OPTIONS.map(option => (
                          <label key={option.value} className="preference-option">
                            <input
                              type="radio"
                              name="focus"
                              value={option.value}
                              checked={preferences.focus === option.value}
                              onChange={(e) => setPreferences({...preferences, focus: e.target.value})}
                            />
                            <span className="option-label">{option.label}</span>
                          </label>
                        ))}
                      </div>
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
                      <label className="preference-label">What cuisines do you enjoy? (Select multiple)</label>
                      <div className="preference-checkboxes">
                        {CUISINE_OPTIONS.map(cuisine => (
                          <label key={cuisine} className="preference-checkbox">
                            <input
                              type="checkbox"
                              checked={preferences.cuisine.includes(cuisine)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPreferences({
                                    ...preferences, 
                                    cuisine: [...preferences.cuisine, cuisine]
                                  })
                                } else {
                                  setPreferences({
                                    ...preferences, 
                                    cuisine: preferences.cuisine.filter(c => c !== cuisine)
                                  })
                                }
                              }}
                            />
                            <span className="checkbox-label">{cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Dietary Restrictions */}
                    <div className="preference-section">
                      <label className="preference-label">Any dietary preferences?</label>
                      <div className="preference-checkboxes">
                        {DIETARY_OPTIONS.map(diet => (
                          <label key={diet} className="preference-checkbox">
                            <input
                              type="checkbox"
                              checked={preferences.dietaryRestrictions.includes(diet)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPreferences({
                                    ...preferences, 
                                    dietaryRestrictions: [...preferences.dietaryRestrictions, diet]
                                  })
                                } else {
                                  setPreferences({
                                    ...preferences, 
                                    dietaryRestrictions: preferences.dietaryRestrictions.filter(d => d !== diet)
                                  })
                                }
                              }}
                            />
                            <span className="checkbox-label">{diet.charAt(0).toUpperCase() + diet.slice(1)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={generateMealPlan}
                    disabled={loading}
                    className="auth-button"
                    style={{ marginTop: '20px' }}
                  >
                    {loading ? 'Generating Meal Plan...' : 'Generate Personalized Meal Plan'}
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
                      const breakfastRecipe = findRecipeByName(mealPlan.week[currentDayIndex].meals.breakfast, 'breakfast')
                      return (
                        <div className="meal-card">
                          <div className="meal-content">
                            <div className="meal-image">
                              <img 
                                src={breakfastRecipe?.image || '/images/placeholder.png'} 
                                alt={breakfastRecipe?.name || 'Breakfast'}
                                onError={(e) => {
                                  e.currentTarget.src = '/images/placeholder.png'
                                }}
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
                      const lunchRecipe = findRecipeByName(mealPlan.week[currentDayIndex].meals.lunch, 'lunch')
                      return (
                        <div className="meal-card">
                          <div className="meal-content">
                            <div className="meal-image">
                              <img 
                                src={lunchRecipe?.image || '/images/placeholder.png'} 
                                alt={lunchRecipe?.name || 'Lunch'}
                                onError={(e) => {
                                  e.currentTarget.src = '/images/placeholder.png'
                                }}
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
                      const dinnerRecipe = findRecipeByName(mealPlan.week[currentDayIndex].meals.dinner, 'dinner')
                      return (
                        <div className="meal-card">
                          <div className="meal-content">
                            <div className="meal-image">
                              <img 
                                src={dinnerRecipe?.image || '/images/placeholder.png'} 
                                alt={dinnerRecipe?.name || 'Dinner'}
                                onError={(e) => {
                                  e.currentTarget.src = '/images/placeholder.png'
                                }}
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
                      {mealPlan.shoppingList.map((item: string, index: number) => (
                        <div key={index} className="shopping-item">
                          <input type="checkbox" id={`item-${index}`} />
                          <label htmlFor={`item-${index}`}>{item}</label>
                        </div>
                      ))}
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
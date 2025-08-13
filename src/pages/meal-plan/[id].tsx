import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { MealPlanService } from '../../lib/meal-plan-service'
import { getRandomRecipe, MealType } from '../../lib/recipe-categories'
import breakfastRecipes from '../../lib/breakfast.json'
import lunchRecipes from '../../lib/lunch.json'
import dinnerRecipes from '../../lib/dinner.json'
import { supabase } from '../../lib/supabase';

export default function MealPlanDetail() {
  const [mealPlan, setMealPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [selectedMeal, setSelectedMeal] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(0) // Changed from string to number
  const [currentInstructionStep, setCurrentInstructionStep] = useState(0)
  const router = useRouter()
  const { id } = router.query
  const [isMobile, setIsMobile] = useState(false);
  const [currentMobilePage, setCurrentMobilePage] = useState(0); // for mobile single-page view
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [fadeClass, setFadeClass] = useState('');
  const [imageLoading, setImageLoading] = useState(true);
  const [showShareMsg, setShowShareMsg] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{[key: string]: string}>({});

  // Function to find recipe by name and meal type
  const findRecipeByName = (mealData: any, mealType: MealType) => {
    let recipes: any[] = [];
    if (mealType === 'breakfast') {
      recipes = breakfastRecipes;
    } else if (mealType === 'lunch') {
      recipes = lunchRecipes;
    } else if (mealType === 'dinner') {
      recipes = dinnerRecipes;
    }

    // Handle new format where mealData is an object with recipeId
    if (mealData && typeof mealData === 'object' && mealData.recipeId) {
      const found = recipes.find(recipe => recipe.id === mealData.recipeId);
      return found;
    }

    // Handle old format where mealData is a string (recipe name)
    if (typeof mealData === 'string') {
      return recipes.find(recipe =>
        recipe.name.toLowerCase().includes(mealData.toLowerCase()) ||
        mealData.toLowerCase().includes(recipe.name.toLowerCase())
      );
    }

    return null;
  };

  const recipeKey = (r: any): string => {
    const raw = typeof r === 'object' && r?.id
      ? String(r.id)
      : (typeof r === 'string' ? r : String(r?.name || ''))
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  async function handleRecipeFeedback(recipeId: string, feedback: 'like' | 'dislike') {
    setFeedbackStatus((prev) => ({ ...prev, [recipeId]: 'loading' }));
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const res = await fetch('/api/recipe-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ recipe_id: recipeId, feedback })
      });
      if (res.ok) {
        setFeedbackStatus((prev) => ({ ...prev, [recipeId]: feedback }));
        setTimeout(() => setFeedbackStatus((prev) => ({ ...prev, [recipeId]: '' })), 1200);
      } else {
        setFeedbackStatus((prev) => ({ ...prev, [recipeId]: 'error' }));
      }
    } catch {
      setFeedbackStatus((prev) => ({ ...prev, [recipeId]: 'error' }));
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setShowShareMsg(true);
    setTimeout(() => setShowShareMsg(false), 2000);
  }

  function getMaxMobilePage() {
    if (!selectedMeal) return 0;
    // 0: cover, 1: ingredients, 2+ steps
    return 1 + (selectedMeal.steps?.length || 0);
  }

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Swipe gesture for mobile
  useEffect(() => {
    if (!isMobile || !modalContentRef.current) return;
    const el = modalContentRef.current;
    let startX = 0;
    let endX = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      endX = e.changedTouches[0].clientX;
      if (endX - startX > 50) {
        // swipe right
        setCurrentMobilePage((prev) => Math.max(0, prev - 1));
      } else if (startX - endX > 50) {
        // swipe left
        setCurrentMobilePage((prev) => Math.min(getMaxMobilePage(), prev + 1));
      }
    };
    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile, selectedMeal]);

  // Keyboard navigation for modal
  useEffect(() => {
    if (!selectedMeal) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedMeal(null);
      } else if (isMobile) {
        if (e.key === 'ArrowLeft') {
          setCurrentMobilePage((prev) => Math.max(0, prev - 1));
        } else if (e.key === 'ArrowRight') {
          setCurrentMobilePage((prev) => Math.min(getMaxMobilePage(), prev + 1));
        }
      } else {
        if (e.key === 'ArrowLeft') {
          setCurrentPage((prev) => Math.max(0, prev - 1));
        } else if (e.key === 'ArrowRight') {
          setCurrentPage((prev) => Math.min(Math.ceil(selectedMeal.steps.length / 2), prev + 1));
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMeal, isMobile, currentMobilePage, currentPage]);

  // Animate page transitions
  useEffect(() => {
    setFadeClass('fade-exit');
    const timeout = setTimeout(() => setFadeClass('fade-enter'), 10);
    return () => clearTimeout(timeout);
  }, [isMobile ? currentMobilePage : currentPage]);

  useEffect(() => {
    if (id) {
      loadMealPlan(id as string)
    }
  }, [id])

  // Function to populate recipe objects from IDs
  const populateRecipeObjects = (weekData: any[]) => {
    const getRecipeById = (id: string, mealType: MealType) => {
      if (mealType === 'breakfast') return breakfastRecipes.find(r => r.id === id);
      if (mealType === 'lunch') return lunchRecipes.find(r => r.id === id);
      if (mealType === 'dinner') return dinnerRecipes.find(r => r.id === id);
      return null;
    };

    return weekData.map((day: any) => ({
      ...day,
      meals: {
        breakfast: typeof day.meals.breakfast === 'string' 
          ? getRecipeById(day.meals.breakfast, 'breakfast') 
          : day.meals.breakfast,
        lunch: typeof day.meals.lunch === 'string' 
          ? getRecipeById(day.meals.lunch, 'lunch') 
          : day.meals.lunch,
        dinner: typeof day.meals.dinner === 'string' 
          ? getRecipeById(day.meals.dinner, 'dinner') 
          : day.meals.dinner,
      }
    }));
  };

  // Function to generate shopping list from recipe objects
  const generateShoppingList = (weekData: any[]) => {
    const allIngredients = new Set<string>();
    
    weekData.forEach((day: any) => {
      Object.values(day.meals).forEach((meal: any) => {
        if (meal && typeof meal === 'object' && meal.ingredients) {
          meal.ingredients.forEach((ingredient: any) => {
            allIngredients.add(ingredient.item);
          });
        }
      });
    });
    
    return Array.from(allIngredients).sort();
  };

  const loadMealPlan = async (planId: string) => {
    try {
      setLoading(true)
      const plans = await MealPlanService.getAllMealPlans()
      const plan = plans.find(p => p.id === planId)
      
      if (plan) {
        // Populate recipe objects from IDs
        const populatedWeekData = populateRecipeObjects(plan.week_data);
        
        // Generate shopping list from populated recipe objects
        const generatedShoppingList = generateShoppingList(populatedWeekData);
        
        setMealPlan({
          week: populatedWeekData,
          shoppingList: generatedShoppingList,
          id: plan.id,
          created_at: plan.created_at
        })
      } else {
        setError('Meal plan not found')
      }
    } catch (error) {
      setError('Failed to load meal plan')
    } finally {
      setLoading(false)
    }
  }

  const downloadMealPlan = () => {
    if (!mealPlan) return

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

  const deleteMealPlan = async () => {
    if (!mealPlan?.id || !confirm('Are you sure you want to delete this meal plan?')) {
      return
    }

    try {
      await MealPlanService.deleteMealPlan(mealPlan.id)
      router.push('/my-meal-plans')
    } catch (error) {
      setError('Failed to delete meal plan')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading meal plan...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-logo">LazyLunch</div>
            <div className="dashboard-nav">
              <Link href="/my-meal-plans" className="dashboard-link">
                ← Back to My Meal Plans
              </Link>
            </div>
          </div>
        </header>
        <main className="dashboard-main">
          <div className="dashboard-content">
            <div className="error-message">{error}</div>
          </div>
        </main>
      </div>
    )
  }

  if (!mealPlan) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-logo">LazyLunch</div>
            <div className="dashboard-nav">
              <Link href="/my-meal-plans" className="dashboard-link">
                ← Back to My Meal Plans
              </Link>
            </div>
          </div>
        </header>
        <main className="dashboard-main">
          <div className="dashboard-content">
            <div className="error-message">Meal plan not found</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Meal Plan - LazyLunch</title>
        <meta name="description" content="View your saved meal plan" />
      </Head>
      
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-logo">LazyLunch</div>
            <div className="dashboard-nav">
              <Link href="/my-meal-plans" className="dashboard-link">
                ← Back to My Meal Plans
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            <div className="meal-plan-header">
              <div>
                <h2 className="dashboard-title">
                  Your Meal Plan
                </h2>
                <p className="dashboard-subtitle">
                  Created on {formatDate(mealPlan.created_at)}
                </p>
              </div>
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
                  onClick={deleteMealPlan}
                  className="dashboard-card-button"
                  style={{ backgroundColor: '#DC2626', color: 'white' }}
                >
                  Delete Plan
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
                    <span className="day-name">{day.day}</span>
                  </button>
                ))}
              </div>

            {/* Current Day Content */}
              <div className="current-day-content">
                <div className="day-header">
                  <h3 className="current-day-title">
                    {mealPlan.week[currentDayIndex].day}
                  </h3>
                  <div className="day-navigation-arrows">
                    <button
                    className="nav-arrow"
                      onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
                      disabled={currentDayIndex === 0}
                    >
                      ←
                    </button>
                    <span className="day-counter">
                      {currentDayIndex + 1} of {mealPlan.week.length}
                    </span>
                    <button
                    className="nav-arrow"
                      onClick={() => setCurrentDayIndex(Math.min(mealPlan.week.length - 1, currentDayIndex + 1))}
                      disabled={currentDayIndex === mealPlan.week.length - 1}
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="meals-container">
                  {(() => {
                    const breakfastRecipe = mealPlan.week[currentDayIndex].meals.breakfast
                    const breakfastName = typeof breakfastRecipe === 'string' 
                      ? breakfastRecipe 
                      : breakfastRecipe?.name || 'Breakfast'
                    const breakfastId = typeof breakfastRecipe === 'string' 
                      ? breakfastRecipe 
                      : breakfastRecipe?.id || ''
                    return (
                    <div className="meal-card">
                      <div className="meal-content" onClick={() => {
                        setSelectedMeal(breakfastRecipe)
                          setCurrentPage(0)
                        setCurrentInstructionStep(0)
                        setCurrentMobilePage(0)
                      }}>
                        <div className="meal-image">
                          <img
                            src={breakfastRecipe?.image}
                            alt={breakfastRecipe?.name || 'Breakfast'}
                            style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}}
                          />
                        </div>
                        <div className="meal-info">
                          <h4 className="meal-type">Breakfast</h4>
                          <p className="meal-name">{breakfastName}</p>
                          {breakfastRecipe && typeof breakfastRecipe === 'object' && (
                            <div className="meal-tags">
                              <span className="cost-tag">£{breakfastRecipe.estTotalCost.toFixed(2)}</span>
                              <span className="servings-tag">{breakfastRecipe.baseServings} servings</span>
                            </div>
                          )}
                        </div>
                              </div>
                      <div className="meal-feedback">
                        <button className="feedback-button thumbs-up" onClick={e => {
                          e.stopPropagation();
                          handleRecipeFeedback(breakfastId, 'like');
                        }} aria-label="Thumbs up">
                          👍
                          {feedbackStatus[breakfastId] === 'like' && <span className="feedback-confirm">Saved!</span>}
                        </button>
                        <button className="feedback-button thumbs-down" onClick={e => {
                          e.stopPropagation();
                          handleRecipeFeedback(breakfastId, 'dislike');
                        }} aria-label="Thumbs down">
                          👎
                          {feedbackStatus[breakfastId] === 'dislike' && <span className="feedback-confirm">Saved!</span>}
                        </button>
                            </div>
                                  </div>
                  )
                })()}
                {(() => {
                  const lunchRecipe = mealPlan.week[currentDayIndex].meals.lunch
                  const lunchName = typeof lunchRecipe === 'string' 
                    ? lunchRecipe 
                    : lunchRecipe?.name || 'Lunch'
                  const lunchId = typeof lunchRecipe === 'string' 
                    ? lunchRecipe 
                    : lunchRecipe?.id || ''
                  return (
                    <div className="meal-card">
                      <div className="meal-content" onClick={() => {
                        setSelectedMeal(lunchRecipe)
                        setCurrentPage(0)
                        setCurrentInstructionStep(0)
                        setCurrentMobilePage(0)
                      }}>
                        <div className="meal-image">
                          <img 
                            src={lunchRecipe?.image} 
                            alt={lunchRecipe?.name || 'Lunch'}
                          />
                                </div>
                        <div className="meal-info">
                          <h4 className="meal-type">Lunch</h4>
                          <p className="meal-name">{lunchName}</p>
                          {lunchRecipe && typeof lunchRecipe === 'object' && (
                            <div className="meal-tags">
                              <span className="cost-tag">£{lunchRecipe.estTotalCost.toFixed(2)}</span>
                              <span className="servings-tag">{lunchRecipe.baseServings} servings</span>
                              </div>
                          )}
                              </div>
                            </div>
                      <div className="meal-feedback">
                        <button className="feedback-button thumbs-up" onClick={e => {
                          e.stopPropagation();
                          handleRecipeFeedback(lunchId, 'like');
                        }} aria-label="Thumbs up">
                          👍
                          {feedbackStatus[lunchId] === 'like' && <span className="feedback-confirm">Saved!</span>}
                              </button>
                        <button className="feedback-button thumbs-down" onClick={e => {
                          e.stopPropagation();
                          handleRecipeFeedback(lunchId, 'dislike');
                        }} aria-label="Thumbs down">
                          👎
                          {feedbackStatus[lunchId] === 'dislike' && <span className="feedback-confirm">Saved!</span>}
                              </button>
                            </div>
                      </div>
                    )
                  })()}
                  {(() => {
                  const dinnerRecipe = mealPlan.week[currentDayIndex].meals.dinner
                  const dinnerName = typeof dinnerRecipe === 'string' 
                    ? dinnerRecipe 
                    : dinnerRecipe?.name || 'Dinner'
                  const dinnerId = typeof dinnerRecipe === 'string' 
                    ? dinnerRecipe 
                    : dinnerRecipe?.id || ''
                    return (
                    <div className="meal-card">
                      <div className="meal-content" onClick={() => {
                        setSelectedMeal(dinnerRecipe)
                          setCurrentPage(0)
                        setCurrentInstructionStep(0)
                        setCurrentMobilePage(0)
                      }}>
                        <div className="meal-image">
                          <img 
                            src={dinnerRecipe?.image} 
                            alt={dinnerRecipe?.name || 'Dinner'}
                          />
                        </div>
                        <div className="meal-info">
                          <h4 className="meal-type">Dinner</h4>
                          <p className="meal-name">{dinnerName}</p>
                          {dinnerRecipe && typeof dinnerRecipe === 'object' && (
                            <div className="meal-tags">
                              <span className="cost-tag">£{dinnerRecipe.estTotalCost.toFixed(2)}</span>
                              <span className="servings-tag">{dinnerRecipe.baseServings} servings</span>
                            </div>
                          )}
                        </div>
                              </div>
                      <div className="meal-feedback">
                        <button className="feedback-button thumbs-up" onClick={e => {
                          e.stopPropagation();
                          handleRecipeFeedback(dinnerId, 'like');
                        }} aria-label="Thumbs up">
                          👍
                          {feedbackStatus[dinnerId] === 'like' && <span className="feedback-confirm">Saved!</span>}
                        </button>
                        <button className="feedback-button thumbs-down" onClick={e => {
                          e.stopPropagation();
                          handleRecipeFeedback(dinnerId, 'dislike');
                        }} aria-label="Thumbs down">
                          👎
                          {feedbackStatus[dinnerId] === 'dislike' && <span className="feedback-confirm">Saved!</span>}
                        </button>
                            </div>
                                  </div>
                  )
                })()}
                                </div>
                              </div>

            {/* Shopping List Section */}
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

            {/* Recipe Book Modal */}
            {selectedMeal && (
              <div className="recipe-modal-overlay" onClick={() => setSelectedMeal(null)}>
                {isMobile ? (
                  <div className="mobile-recipe-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="mobile-recipe-header">
                      <button className="mobile-close-button" onClick={() => setSelectedMeal(null)}>×</button>
                      <div className="mobile-recipe-title">{selectedMeal.name}</div>
                    </div>

                    <div className="mobile-single-page" ref={modalContentRef}>
                      {currentMobilePage === 0 && (
                        <div className="mobile-cover">
                          <div className="mobile-cover-image">
                            <img src={selectedMeal.image} alt={selectedMeal.name} />
                          </div>
                          <h1 className="mobile-cover-title">{selectedMeal.name}</h1>
                          <div className="mobile-cover-meta">
                            <span>£{selectedMeal.estTotalCost.toFixed(2)}</span>
                            <span>{selectedMeal.baseServings} servings</span>
                          </div>
                          {selectedMeal.allergens && selectedMeal.allergens.length > 0 && (
                            <div className="mobile-allergen-badges">
                              {selectedMeal.allergens.map((a: string, i: number) => (
                                <span key={i} className="mobile-allergen-badge">{a}</span>
                              ))}
                            </div>
                          )}
                          <div className="mobile-recipe-tags">
                            {selectedMeal.tags.map((tag: string, index: number) => (
                              <span key={index} className="mobile-recipe-tag">{tag}</span>
                            ))}
                          </div>
                          <div className="mobile-feedback">
                            <button className="mobile-feedback-button thumbs-up" onClick={() => handleRecipeFeedback(recipeKey(selectedMeal), 'like')} aria-label="Thumbs up">👍{feedbackStatus[recipeKey(selectedMeal)] === 'like' && <span className="mobile-feedback-confirm">Saved!</span>}</button>
                            <button className="mobile-feedback-button thumbs-down" onClick={() => handleRecipeFeedback(recipeKey(selectedMeal), 'dislike')} aria-label="Thumbs down">👎{feedbackStatus[recipeKey(selectedMeal)] === 'dislike' && <span className="mobile-feedback-confirm">Saved!</span>}</button>
                          </div>
                        </div>
                      )}

                      {currentMobilePage === 1 && (
                        <div className="mobile-ingredients-page">
                          <div className="mobile-page-title">Ingredients</div>
                          <div className="mobile-ingredients-list">
                            {selectedMeal.ingredients.map((ingredient: any, index: number) => (
                              <div key={index} className="mobile-ingredient-item">
                                <div className="mobile-ingredient-main">
                                  <span className="mobile-ingredient-name">{ingredient.item}</span>
                                  <span className="mobile-ingredient-qty">{ingredient.qty}{ingredient.note ? ` (${ingredient.note})` : ''}</span>
                                </div>
                                <span className="mobile-ingredient-cost">£{ingredient.estCost.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mobile-total-cost"><strong>Total Cost: £{selectedMeal.estTotalCost.toFixed(2)}</strong></div>
                        </div>
                      )}

                      {currentMobilePage > 1 && (
                        <div className="mobile-instruction-page">
                          {(() => {
                            const stepIndex = currentMobilePage - 2;
                            return (
                              <>
                                <div className="mobile-step-header">
                                  <h2 className="mobile-step-title">Step {stepIndex + 1}</h2>
                                  <div className="mobile-step-progress">{stepIndex + 1} of {selectedMeal.steps.length}</div>
                                </div>
                                <p className="mobile-step-text">{selectedMeal.steps[stepIndex]}</p>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <div className="mobile-navigation">
                      <button className="mobile-nav-button" onClick={() => setCurrentMobilePage(Math.max(0, currentMobilePage - 1))} disabled={currentMobilePage === 0}>← Previous</button>
                      <div className="mobile-page-indicator">{currentMobilePage + 1} of {getMaxMobilePage() + 1}</div>
                      <button className="mobile-nav-button" onClick={() => setCurrentMobilePage(Math.min(getMaxMobilePage(), currentMobilePage + 1))} disabled={currentMobilePage >= getMaxMobilePage()}>Next →</button>
                    </div>
                  </div>
                ) : (
                  <div className="recipe-book-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="recipe-modal-header">
                      <button
                        className="close-button"
                        onClick={() => setSelectedMeal(null)}
                      >
                        ×
                      </button>
                    </div>

                    <button
                      className="book-arrow book-arrow-left"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      aria-label="Previous page"
                    >
                      &#8592;
                    </button>
                    <button
                      className="book-arrow book-arrow-right"
                      onClick={() => setCurrentPage(Math.min(Math.ceil(selectedMeal.steps.length / 2), currentPage + 1))}
                      disabled={currentPage >= Math.ceil(selectedMeal.steps.length / 2)}
                      aria-label="Next page"
                    >
                      &#8594;
                    </button>

                    <div className="recipe-book-container">
                      <div className="book-spread">
                        <div className="book-page left-page">
                          <div className="page-content">
                            {currentPage === 0 ? (
                              <div className="page-cover">
                                <div className="cover-image">
                                  <img src={selectedMeal.image} alt={selectedMeal.name} />
                                </div>
                                <div className="cover-content">
                                  <h1 className="recipe-title">{selectedMeal.name}</h1>
                                  <div className="recipe-meta">
                                    <span className="recipe-cost">£{selectedMeal.estTotalCost.toFixed(2)}</span>
                                    <span className="recipe-servings">{selectedMeal.baseServings} servings</span>
                                    {selectedMeal.allergens && selectedMeal.allergens.length > 0 && (
                                      <div className="allergen-badges">
                                        {selectedMeal.allergens.map((a: string, i: number) => (
                                          <span key={i} className="allergen-badge">{a}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="recipe-tags">
                                    {selectedMeal.tags.map((tag: string, index: number) => (
                                      <span key={index} className="recipe-tag">{tag}</span>
                                    ))}
                                  </div>
                                  <div className="modal-feedback">
                                    <button className="feedback-button thumbs-up" onClick={() => handleRecipeFeedback(recipeKey(selectedMeal), 'like')} aria-label="Thumbs up">
                                      👍
                                      {feedbackStatus[recipeKey(selectedMeal)] === 'like' && <span className="feedback-confirm">Saved!</span>}
                                    </button>
                                    <button className="feedback-button thumbs-down" onClick={() => handleRecipeFeedback(recipeKey(selectedMeal), 'dislike')} aria-label="Thumbs down">
                                      👎
                                      {feedbackStatus[recipeKey(selectedMeal)] === 'dislike' && <span className="feedback-confirm">Saved!</span>}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              (() => {
                                const stepIndex = (currentPage - 1) * 2;
                                if (selectedMeal.steps[stepIndex]) {
                                  return (
                                    <div className="page-instruction">
                                      <div className="step-header">
                                        <h2>Step {stepIndex + 1}</h2>
                                        <div className="step-progress">{stepIndex + 1} of {selectedMeal.steps.length}</div>
                                      </div>
                                      <div className="step-content">
                                        <p className="step-text">{selectedMeal.steps[stepIndex]}</p>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return null;
                                }
                              })()
                            )}
                          </div>
                        </div>

                        <div className="book-spine"></div>

                        <div className="book-page right-page">
                          <div className="page-content">
                            {currentPage === 0 ? (
                              <div className="page-ingredients">
                                <div className="ingredients-header-sticky">Ingredients</div>
                                <div className="ingredients-list">
                                  {selectedMeal.ingredients.map((ingredient: any, index: number) => (
                                    <div key={index} className="ingredient-row">
                                      <span className="ingredient-name">{ingredient.item}</span>
                                      <span className="ingredient-qty">{ingredient.qty}{ingredient.note ? ` (${ingredient.note})` : ''}</span>
                                      <span className="ingredient-cost">£{ingredient.estCost.toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="total-cost">
                                  <strong>Total Cost: £{selectedMeal.estTotalCost.toFixed(2)}</strong>
                                </div>
                              </div>
                            ) : (
                              (() => {
                                const stepIndex = (currentPage - 1) * 2 + 1;
                                if (selectedMeal.steps[stepIndex]) {
                                  return (
                                    <div className="page-instruction">
                                      <div className="step-header">
                                        <h2>Step {stepIndex + 1}</h2>
                                        <div className="step-progress">{stepIndex + 1} of {selectedMeal.steps.length}</div>
                                      </div>
                                      <div className="step-content">
                                        <p className="step-text">{selectedMeal.steps[stepIndex]}</p>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return null;
                                }
                              })()
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '8px', fontWeight: 600, color: 'var(--navy-blue)' }}>
                      Page {currentPage + 1} of {Math.ceil(selectedMeal.steps.length / 2) + 1}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </main>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, var(--light-grey) 0%, var(--white) 100%);
          font-family: 'Inter', sans-serif;
        }

        .dashboard-header {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-grey);
          padding: 1rem 0;
        }

        .dashboard-header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dashboard-logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--navy-blue);
        }

        .dashboard-nav {
          display: flex;
          gap: 1rem;
        }

        .dashboard-link {
          color: var(--navy-blue);
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          transition: background-color 0.3s;
        }

        .dashboard-link:hover {
          background: rgba(44, 62, 80, 0.1);
        }

        .dashboard-main {
          padding: 2rem 0;
        }

        .dashboard-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .dashboard-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--navy-blue);
          margin-bottom: 0.5rem;
        }

        .dashboard-subtitle {
          font-size: 1.1rem;
          color: var(--dark-grey);
          margin-bottom: 2rem;
        }

        .meal-plan-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .meal-plan-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .dashboard-card-button {
          background-color: var(--pastel-green);
          color: var(--navy-blue);
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s;
        }

        .dashboard-card-button:hover {
          background-color: #9BC8AB;
          transform: translateY(-2px);
        }

        .weekly-meal-plan {
          background: var(--white);
          border: 1px solid var(--border-grey);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .day-navigation {
          display: flex;
          background: var(--light-grey);
          border-bottom: 1px solid var(--border-grey);
        }

        .day-tab {
          flex: 1;
          background: none;
          border: none;
          color: var(--dark-grey);
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .day-tab:hover {
          background: rgba(168, 213, 186, 0.2);
          color: var(--navy-blue);
        }

        .day-tab.active {
          background: var(--pastel-green);
          color: var(--navy-blue);
          border-bottom: 3px solid var(--navy-blue);
        }

        .day-name {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .current-day-content {
          padding: 2rem;
        }

        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .current-day-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--navy-blue);
          margin: 0;
        }

        .day-navigation-arrows {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-arrow {
          background: var(--pastel-green);
          border: none;
          color: var(--navy-blue);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-arrow:hover:not(:disabled) {
          background: #9BC8AB;
          transform: scale(1.1);
        }

        .nav-arrow:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .day-counter {
          color: var(--dark-grey);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .meals-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .meal-card {
          background: var(--white);
          border: 1px solid var(--border-grey);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .meal-card:hover {
          background: var(--light-grey);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .meal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .meal-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .meal-icon {
          font-size: 1.5rem;
        }

        .meal-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--navy-blue);
          margin: 0;
        }

        .meal-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .meal-description {
          color: var(--dark-grey);
          line-height: 1.6;
          margin: 0;
        }

        .recipe-image {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .shopping-list-section {
          background: var(--white);
          border: 1px solid var(--border-grey);
          border-radius: 12px;
          padding: 1.5rem;
          margin-top: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .shopping-list-section h3 {
          color: var(--navy-blue);
          margin-bottom: 1rem;
          font-size: 1.3rem;
        }

        .shopping-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .shopping-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--light-grey);
          border-radius: 8px;
          color: var(--dark-grey);
        }

        .shopping-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--navy-blue);
        }

        .shopping-item label {
          cursor: pointer;
          flex: 1;
        }

        .loading-container {
          min-height: 100vh;
          background: linear-gradient(135deg, var(--light-grey) 0%, var(--white) 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: var(--navy-blue);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border-grey);
          border-top: 4px solid var(--navy-blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 1.1rem;
          color: var(--dark-grey);
          }

        .error-message {
          background: rgba(242, 140, 140, 0.1);
          border: 1px solid var(--soft-coral);
          color: var(--navy-blue);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .recipe-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .recipe-book-modal {
          background: var(--white);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          width: 90%;
          max-width: 1000px;
          height: 90%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        .recipe-modal-header {
          display: flex;
          justify-content: flex-end;
          padding: 1rem;
          border-bottom: 1px solid var(--border-grey);
        }

        .close-button {
          background: none;
          border: none;
          font-size: 2rem;
          color: var(--dark-grey);
          cursor: pointer;
          transition: color 0.3s;
        }

        .close-button:hover {
          color: var(--navy-blue);
        }

        .recipe-book-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding: 2rem;
        }

        .recipe-book {
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
        }

        .book-spine {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 100%;
          background: var(--navy-blue);
          border-radius: 10px;
          z-index: 1;
        }

        .book-page {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 2rem;
          position: relative;
          background: var(--white);
          border: 1px solid var(--border-grey);
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow-y: auto;
        }

        .left-page {
          align-items: flex-start;
        }

        .right-page {
          align-items: flex-end;
        }

        .page-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem;
        }

        .page-cover {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem;
        }

        .cover-image {
          width: 200px;
          height: 200px;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .cover-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .recipe-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--navy-blue);
          margin-bottom: 0.5rem;
        }

        .recipe-meta {
          display: flex;
          gap: 1rem;
          font-size: 1.1rem;
          color: var(--dark-grey);
          margin-bottom: 1rem;
        }

        .recipe-tags {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .recipe-tag {
          background: var(--light-grey);
          color: var(--navy-blue);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .modal-feedback {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .feedback-button {
          background: var(--light-grey);
          border: 1px solid var(--border-grey);
          border-radius: 20px;
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .feedback-button:hover {
          background: var(--pastel-green);
          border-color: var(--pastel-green);
          transform: translateY(-2px);
        }

        .feedback-button.thumbs-up {
          color: var(--green);
        }

        .feedback-button.thumbs-down {
          color: var(--red);
        }

        .feedback-confirm {
          font-size: 0.8rem;
          color: var(--dark-grey);
          margin-left: 0.5rem;
        }

        .page-ingredients {
          padding: 2rem;
        }

        .page-ingredients h2 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--navy-blue);
          margin-bottom: 1.5rem;
        }

        .ingredients-list-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .ingredients-list-flex {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .ingredient-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--light-grey);
          border: 1px solid var(--border-grey);
          border-radius: 10px;
          padding: 1.25rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .ingredient-main {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .ingredient-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--navy-blue);
        }

        .ingredient-qty {
          font-size: 0.9rem;
          color: var(--dark-grey);
          font-weight: 600;
        }

        .ingredient-note {
          font-size: 0.9rem;
          color: var(--dark-grey);
        }

        .ingredient-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        .ingredient-cost {
          font-size: 0.9rem;
          color: var(--navy-blue);
          font-weight: 600;
        }

        .allergen-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .allergen-badge {
          background: var(--light-grey);
          color: var(--navy-blue);
          padding: 0.3rem 0.7rem;
          border-radius: 15px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .total-cost {
          text-align: right;
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--navy-blue);
          margin-top: 1rem;
        }

        .page-instruction {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-bottom: 1.5rem;
        }

        .step-header h2 {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--navy-blue);
          margin: 0;
        }

        .step-progress {
          font-size: 0.9rem;
          color: var(--dark-grey);
          font-weight: 500;
        }

        .step-content {
          font-size: 1.1rem;
          color: var(--dark-grey);
          line-height: 1.8;
          margin-bottom: 1.5rem;
        }

        .step-number-large {
          font-size: 4rem;
          font-weight: 800;
          color: var(--navy-blue);
          opacity: 0.3;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: -1;
        }

        .book-spread {
          display: flex;
          width: 100%;
          height: 100%;
          position: relative;
        }

        .book-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          border-top: 1px solid var(--border-grey);
          background: var(--light-grey);
        }

        .page-nav-button {
          background: var(--pastel-green);
          color: var(--navy-blue);
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .page-nav-button:hover {
          background: #9BC8AB;
          transform: translateY(-2px);
        }

        .page-nav-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--border-grey);
          color: var(--dark-grey);
        }

        .page-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--dark-grey);
          font-weight: 500;
        }

        .page-counter {
          font-weight: 600;
          color: var(--navy-blue);
        }

        .page-dots {
          display: flex;
          gap: 0.5rem;
        }

        .page-dot {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--border-grey);
          color: var(--dark-grey);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .page-dot:hover:not(.active) {
          background: var(--light-grey);
          transform: scale(1.1);
        }

        .page-dot.active {
          background: var(--pastel-green);
          color: var(--navy-blue);
          border: 2px solid var(--navy-blue);
        }

        .ingredients-header-sticky {
          position: sticky;
          top: 0;
          background: var(--white);
          padding: 1rem 2rem;
          border-bottom: 1px solid var(--border-grey);
          z-index: 10;
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--navy-blue);
          text-align: left;
          width: 100%;
          box-sizing: border-box;
        }

        .ingredient-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px dashed var(--border-grey);
        }

        .ingredient-row:last-child {
          border-bottom: none;
        }

        .ingredient-row .ingredient-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--navy-blue);
          flex: 1;
        }

        .ingredient-row .ingredient-qty {
          font-size: 0.9rem;
          color: var(--dark-grey);
          font-weight: 600;
          flex: 0.5;
        }

        .ingredient-row .ingredient-note {
          font-size: 0.9rem;
          color: var(--dark-grey);
        }

        .ingredient-row .ingredient-cost {
          font-size: 0.9rem;
          color: var(--navy-blue);
          font-weight: 600;
          flex: 0.3;
        }

        .ingredient-row .allergen-badge {
          background: var(--light-grey);
          color: var(--navy-blue);
          padding: 0.3rem 0.7rem;
          border-radius: 15px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .book-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: var(--pastel-green);
          border: none;
          color: var(--navy-blue);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .book-arrow-left {
          left: 1rem;
        }

        .book-arrow-right {
          right: 1rem;
        }

        .book-arrow:hover:not(:disabled) {
          background: #9BC8AB;
          transform: translateY(-50%) scale(1.1);
        }

        .book-arrow:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Mobile Recipe Book Modal Styles */
        .mobile-recipe-modal {
          /* single stacked panel */
          width: 92vw;
          max-width: 560px;
          height: min(96vh, calc(100dvh - 8px));
          background: var(--white);
          border-radius: 16px;
          display: grid;
          grid-template-rows: auto 1fr auto; /* header, content, footer */
          overflow: hidden;
        }
        
        .mobile-recipe-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.9rem 1rem;
          border-bottom: 1px solid var(--border-grey);
          background: var(--white);
        }
        
        .mobile-single-page {
          width: 100%;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          min-height: 0; /* allow grid child to shrink and scroll */
          padding: 1rem;
        }
        
        .mobile-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid var(--border-grey);
          background: var(--white);
        }
        
        .mobile-recipe-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--navy-blue);
        }
        
        .mobile-recipe-content {
          background: var(--white);
          border-radius: 0 0 16px 16px;
          width: 100%;
          max-width: 560px;
          max-height: none;
          overflow: visible;
          padding: 1.25rem 1rem 1.5rem 1rem;
        }
        
        .mobile-recipe-content.vertical {
          overflow-y: auto;
        }
        
        .mobile-steps { padding: 2rem; }
        .mobile-steps-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1.25rem; }
        .mobile-step-item { background: var(--white); border: 1px solid var(--border-grey); border-radius: 10px; padding: 1.25rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        
        .mobile-cover, .mobile-ingredients-page, .mobile-instruction-page {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .mobile-cover { align-items: center; text-align: center; }
        
        .mobile-cover-image {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 0.75rem;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .mobile-cover-title { font-size: 1.6rem; color: var(--navy-blue); font-weight: 800; }
        .mobile-cover-meta { display: flex; gap: 0.75rem; justify-content: center; color: var(--dark-grey); font-weight: 600; margin-bottom: 0.25rem; }
        
        .mobile-recipe-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .mobile-recipe-meta {
          display: flex;
          gap: 1rem;
          font-size: 1.1rem;
          color: var(--dark-grey);
        }

        .mobile-allergen-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .mobile-allergen-badge {
          background: var(--light-grey);
          color: var(--navy-blue);
          padding: 0.3rem 0.7rem;
          border-radius: 15px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .mobile-recipe-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .mobile-recipe-tag {
          background: var(--light-grey);
          color: var(--navy-blue);
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .mobile-feedback { display: flex; gap: 0.75rem; justify-content: center; margin-top: 0.5rem; }

        .mobile-ingredients-page { padding-top: 0.5rem; }
        .mobile-page-title { font-size: 1.4rem; font-weight: 800; color: var(--navy-blue); margin: 0.25rem 0 0.5rem; text-align: center; }
        .mobile-ingredients-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .mobile-ingredient-item { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px dashed var(--border-grey); }
        .mobile-ingredient-item:last-child { border-bottom: none; }

        .mobile-total-cost { text-align: right; font-size: 1rem; font-weight: 700; color: var(--navy-blue); margin-top: 0.5rem; }

        .mobile-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .mobile-step-title { font-size: 1.3rem; font-weight: 800; color: var(--navy-blue); }
        .mobile-step-progress { font-size: 0.85rem; color: var(--dark-grey); font-weight: 600; }
        .mobile-step-text { font-size: 1rem; line-height: 1.6; color: var(--dark-grey); }

        .mobile-nav-button { background: var(--pastel-green); color: var(--navy-blue); border: none; padding: 0.6rem 1rem; border-radius: 8px; font-weight: 700; }
        .mobile-page-indicator { font-size: 0.9rem; color: var(--dark-grey); font-weight: 600; }

        @media (max-width: 768px) {
          .dashboard-header-content {
            padding: 0 1rem;
          }

          .dashboard-content {
            padding: 0 1rem;
          }

          .dashboard-title {
            font-size: 2rem;
          }

          .meal-plan-header {
            flex-direction: column;
            align-items: stretch;
          }

          .meal-plan-actions {
            justify-content: center;
          }

          .day-navigation {
            flex-wrap: wrap;
          }

          .day-tab {
            min-width: 80px;
            padding: 0.75rem 0.5rem;
          }

          .day-name {
            font-size: 0.8rem;
          }

          .current-day-content {
            padding: 1rem;
          }

          .current-day-title {
            font-size: 1.5rem;
          }

          .day-header {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }

          .meals-container {
            grid-template-columns: 1fr;
          }

          .shopping-list {
            grid-template-columns: 1fr;
          }

          .recipe-book-modal {
            width: 95%;
            height: 95%;
          }

          .recipe-book-container {
            padding: 1rem;
          }

          .book-page {
            padding: 1.5rem;
          }

          .page-content {
            padding: 1.5rem;
          }

          .page-cover {
            padding: 1.5rem;
          }

          .cover-image {
            width: 150px;
            height: 150px;
            margin-bottom: 1rem;
          }

          .recipe-title {
            font-size: 2rem;
          }

          .recipe-meta {
            font-size: 1rem;
            gap: 0.5rem;
          }

          .recipe-tags {
            gap: 0.5rem;
          }

          .recipe-tag {
            padding: 0.3rem 0.7rem;
            font-size: 0.7rem;
          }

          .modal-feedback {
            flex-direction: column;
            gap: 0.5rem;
            align-items: center;
          }

          .feedback-button {
            width: 100%;
            justify-content: center;
            padding: 0.75rem 1.5rem;
            font-size: 1.1rem;
          }

          .feedback-confirm {
            font-size: 0.7rem;
            margin-left: 0;
          }

          .page-ingredients {
            padding: 1.5rem;
          }

          .page-ingredients h2 {
            font-size: 1.8rem;
            margin-bottom: 1rem;
          }

          .ingredients-list-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .ingredient-card {
            padding: 1rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .ingredient-main {
            width: 100%;
            text-align: left;
          }

          .ingredient-meta {
            width: 100%;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .ingredient-name {
            font-size: 1rem;
          }

          .ingredient-qty {
            font-size: 0.8rem;
          }

          .ingredient-note {
            font-size: 0.8rem;
          }

          .ingredient-cost {
            font-size: 0.8rem;
          }

          .allergen-tags {
            justify-content: flex-start;
          }

          .allergen-badge {
            padding: 0.2rem 0.6rem;
            font-size: 0.6rem;
          }

          .total-cost {
            font-size: 1rem;
            text-align: left;
          }

          .page-instruction {
            padding: 1.5rem;
          }

          .step-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .step-header h2 {
            font-size: 1.5rem;
          }

          .step-progress {
            font-size: 0.8rem;
          }

          .step-content {
            font-size: 1rem;
            line-height: 1.6;
          }

          .step-number-large {
            font-size: 3rem;
            top: 40%;
          }

          .book-navigation {
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
          }

          .page-nav-button {
            width: 100%;
            justify-content: center;
          }

          .page-indicator {
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.8rem;
          }

          .page-dots {
            flex-wrap: wrap;
            justify-content: center;
          }

          .page-dot {
            width: 25px;
            height: 25px;
            font-size: 0.7rem;
          }

          .book-arrow {
            width: 30px;
            height: 30px;
            font-size: 1rem;
          }

          .book-arrow-left {
            left: 0.5rem;
          }

          .book-arrow-right {
            right: 0.5rem;
          }

          /* Mobile Recipe Book Modal Media Queries */
          .mobile-recipe-modal {
            padding: 0; /* Remove padding on mobile */
          }

          .mobile-recipe-header {
            padding: 0.75rem 1rem;
            border-radius: 16px 16px 0 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .mobile-close-button {
            font-size: 1.8rem;
          }

          .mobile-recipe-title {
            font-size: 1.5rem;
          }

          .mobile-recipe-content {
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: 600px;
            height: 90%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
          }

          .mobile-cover-page,
          .mobile-ingredients-page,
          .mobile-instruction-page {
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: 600px;
            height: 90%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
          }

          .mobile-cover-page {
            align-items: center;
            text-align: center;
          }

          .mobile-cover-image {
            width: 150px;
            height: 150px;
            margin-bottom: 1rem;
          }

          .mobile-recipe-info {
            margin-bottom: 1.5rem;
          }

          .mobile-recipe-meta {
            font-size: 1rem;
            gap: 0.5rem;
          }

          .mobile-allergen-badges {
            gap: 0.5rem;
          }

          .mobile-allergen-badge {
            padding: 0.3rem 0.7rem;
            font-size: 0.75rem;
          }

          .mobile-recipe-tags {
            gap: 0.5rem;
          }

          .mobile-recipe-tag {
            padding: 0.3rem 0.7rem;
            font-size: 0.7rem;
          }

          .mobile-feedback {
            flex-direction: column;
            gap: 0.5rem;
            align-items: center;
          }

          .mobile-feedback-button {
            width: 100%;
            justify-content: center;
            padding: 0.75rem 1.5rem;
            font-size: 1.1rem;
          }

          .mobile-feedback-confirm {
            font-size: 0.7rem;
            margin-left: 0;
          }

          .mobile-ingredients-page {
            padding: 2rem;
          }

          .mobile-page-title {
            font-size: 1.8rem;
            margin-bottom: 1rem;
          }

          .mobile-ingredients-list {
            gap: 1rem;
            margin-bottom: 2rem;
          }

          .mobile-ingredient-item {
            padding: 0.75rem 0;
            border-bottom: 1px dashed var(--border-grey);
          }

          .mobile-ingredient-item:last-child {
            border-bottom: none;
          }

          .mobile-ingredient-main {
            width: 100%;
            text-align: left;
          }

          .mobile-ingredient-name {
            font-size: 1rem;
          }

          .mobile-ingredient-qty {
            font-size: 0.8rem;
          }

          .mobile-ingredient-cost {
            font-size: 0.8rem;
          }

          .mobile-total-cost {
            font-size: 1rem;
            text-align: left;
          }

          .mobile-instruction-page {
            padding: 2rem;
          }

          .mobile-step-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .mobile-step-title {
            font-size: 1.5rem;
          }

          .mobile-step-progress {
            font-size: 0.8rem;
          }

          .mobile-step-content {
            font-size: 1rem;
            line-height: 1.6;
          }

          .mobile-step-text {
            font-size: 1rem;
            line-height: 1.6;
          }

          .mobile-navigation {
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
          }

          .mobile-nav-button {
            width: 100%;
            justify-content: center;
          }

          .mobile-page-indicator {
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.8rem;
          }

          .mobile-page-dots {
            flex-wrap: wrap;
            justify-content: center;
          }

          .mobile-page-dot {
            width: 25px;
            height: 25px;
            font-size: 0.7rem;
          }

          .book-arrow {
            width: 30px;
            height: 30px;
            font-size: 1rem;
          }

          .book-arrow-left {
            left: 0.5rem;
          }

          .book-arrow-right {
            right: 0.5rem;
          }
        }
      `}</style>
    </div>
  )
} 
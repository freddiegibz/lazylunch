import dinnerRecipes from './dinner.json'
// @ts-ignore
import breakfastRecipes from './breakfast.json'
// @ts-ignore
import lunchRecipes from './lunch.json'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface CategorizedRecipe {
  id: string
  name: string
  mealType: MealType
  baseServings: number
  ingredients: Array<{
    item: string
    qty: string
    estCost: number
    allergens: string[]
  }>
  steps: string[]
  image: string
  tags: string[]
  estTotalCost: number
}

// Keywords to help categorize recipes (keeping for reference but not using for categorization)
const BREAKFAST_KEYWORDS = [
  'omelette', 'eggs', 'pancake', 'waffle', 'toast', 'cereal', 'porridge', 'oatmeal',
  'bacon', 'sausage', 'ham', 'yogurt', 'smoothie', 'muffin', 'croissant', 'bagel'
]

const LUNCH_KEYWORDS = [
  'sandwich', 'wrap', 'salad', 'soup', 'quesadilla', 'taco', 'burrito', 'pasta',
  'rice', 'noodle', 'stir-fry', 'curry', 'stew', 'chili', 'burger', 'pizza'
]

const SNACK_KEYWORDS = [
  'snack', 'nibble', 'bite', 'finger food', 'dip', 'spread', 'cracker', 'chip',
  'popcorn', 'nuts', 'trail mix', 'energy bar', 'smoothie', 'juice'
]

// Manual overrides for specific recipes that might be miscategorized
const MANUAL_CATEGORIES: Record<string, MealType> = {
  'omelette-salad': 'breakfast', // Ham & Cheese Omelette
  'overnight-oats': 'breakfast', // Overnight Oats should always be breakfast
  'lentil-soup': 'lunch', // Lentil & Carrot Soup
  'veg-quesadillas': 'lunch', // Veggie Quesadillas
  'tacos-veggie': 'lunch', // Vegetable Bean Tacos
  'chicken-tacos': 'lunch', // Chicken Tacos
  'chicken-fajitas': 'lunch', // Chicken Fajitas
  'gyros': 'lunch', // Greek-Style Chicken Gyros
  'pulled-pork': 'lunch', // Pulled-Pork Sandwiches
  'egg-fried-rice': 'lunch', // Egg Fried Rice should always be lunch
  'beef-burgers': 'dinner', // Beef Burgers & Oven Fries
  'roast-chicken': 'dinner', // Whole Roast Chicken & Veg
  'baked-salmon': 'dinner', // Baked Salmon & Lemon Rice
  'fish-chips': 'dinner', // Oven-Baked Fish & Chips
  'sausage-mash': 'dinner', // Sausage & Mash with Onion Gravy
  'beef-stew': 'dinner', // Beef & Vegetable Stew
  'chili': 'dinner', // Chili con Carne
  'shepherds-pie': 'dinner', // Shepherd's Pie
  'spag-bolo': 'dinner', // Spaghetti Bolognese
  'mac-cheese-bake': 'dinner', // Oven-Baked Mac & Cheese
  'pesto-pasta': 'dinner', // Pesto Pasta with Cherry Tomatoes
  'meatballs': 'dinner', // Beef Meatballs in Tomato Sauce
  'tuna-pasta-bake': 'dinner', // Tuna Pasta Bake
  'bbq-drumsticks': 'dinner', // BBQ Chicken Drumsticks & Corn
  'turkey-meatloaf': 'dinner', // Turkey Meatloaf & Roast Potatoes
  'sheet-pan-sausage': 'dinner', // Sheet-Pan Sausage & Veg
  'veg-chickpea-curry': 'dinner', // Vegetable Chickpea Curry
}

export function getCategorizedRecipesWithOverrides(): Record<MealType, CategorizedRecipe[]> {
  const categorized: Record<MealType, CategorizedRecipe[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  }

  // Add breakfast recipes with their source category
  breakfastRecipes.forEach(recipe => {
    const manualCategory = MANUAL_CATEGORIES[recipe.id]
    const mealType = manualCategory || 'breakfast'
    
    categorized[mealType].push({
      ...recipe,
      mealType
    })
  })

  // Add lunch recipes with their source category
  lunchRecipes.forEach(recipe => {
    const manualCategory = MANUAL_CATEGORIES[recipe.id]
    const mealType = manualCategory || 'lunch'
    
    categorized[mealType].push({
      ...recipe,
      mealType
    })
  })

  // Add dinner recipes with their source category
  dinnerRecipes.forEach(recipe => {
    const manualCategory = MANUAL_CATEGORIES[recipe.id]
    const mealType = manualCategory || 'dinner'
    
    categorized[mealType].push({
      ...recipe,
      mealType
    })
  })

  return categorized
}

export function getRecipesByMealTypeWithOverrides(mealType: MealType): CategorizedRecipe[] {
  return getCategorizedRecipesWithOverrides()[mealType]
}

// Function to get all available recipe names for a meal type
export function getAvailableRecipeNames(mealType: MealType): string[] {
  const recipes = getRecipesByMealTypeWithOverrides(mealType)
  return recipes.map(recipe => recipe.name)
}

// Function to get a random recipe for a meal type
export function getRandomRecipe(mealType: MealType): CategorizedRecipe | null {
  const recipes = getRecipesByMealTypeWithOverrides(mealType)
  if (recipes.length === 0) return null
  return recipes[Math.floor(Math.random() * recipes.length)]
}

// Legacy functions (keeping for backward compatibility but not using keyword-based categorization)
export function categorizeRecipe(recipe: any): MealType {
  const name = recipe.name.toLowerCase()
  const ingredients = recipe.ingredients.map((ing: any) => ing.item.toLowerCase()).join(' ')
  const tags = recipe.tags.map((tag: string) => tag.toLowerCase()).join(' ')
  const allText = `${name} ${ingredients} ${tags}`

  // Check for breakfast keywords
  if (BREAKFAST_KEYWORDS.some(keyword => allText.includes(keyword))) {
    return 'breakfast'
  }

  // Check for snack keywords
  if (SNACK_KEYWORDS.some(keyword => allText.includes(keyword))) {
    return 'snack'
  }

  // Check for lunch keywords
  if (LUNCH_KEYWORDS.some(keyword => allText.includes(keyword))) {
    return 'lunch'
  }

  // Default to dinner for main meals
  return 'dinner'
}

export function getCategorizedRecipes(): Record<MealType, CategorizedRecipe[]> {
  return getCategorizedRecipesWithOverrides()
}

export function getRecipesByMealType(mealType: MealType): CategorizedRecipe[] {
  return getRecipesByMealTypeWithOverrides(mealType)
} 
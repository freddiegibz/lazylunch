import { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Hard-coded SKU mapping for demo purposes
const groceryMapping = {
  // Common ingredients mapped to demo SKUs
  'chicken breast': { sku: 'MEAT001', name: 'Fresh Chicken Breast (1kg)', price: 8.99 },
  'salmon fillet': { sku: 'FISH001', name: 'Atlantic Salmon Fillet (500g)', price: 12.99 },
  'ground beef': { sku: 'MEAT002', name: 'Lean Ground Beef (500g)', price: 6.99 },
  'rice': { sku: 'GRAIN001', name: 'Basmati Rice (1kg)', price: 3.49 },
  'pasta': { sku: 'GRAIN002', name: 'Whole Wheat Pasta (500g)', price: 2.99 },
  'broccoli': { sku: 'VEG001', name: 'Fresh Broccoli (500g)', price: 2.49 },
  'carrots': { sku: 'VEG002', name: 'Organic Carrots (1kg)', price: 1.99 },
  'onions': { sku: 'VEG003', name: 'Yellow Onions (1kg)', price: 1.49 },
  'garlic': { sku: 'VEG004', name: 'Fresh Garlic Bulbs (3 pack)', price: 1.99 },
  'tomatoes': { sku: 'VEG005', name: 'Roma Tomatoes (500g)', price: 2.99 },
  'olive oil': { sku: 'OIL001', name: 'Extra Virgin Olive Oil (500ml)', price: 7.99 },
  'eggs': { sku: 'DAIRY001', name: 'Free Range Eggs (12 pack)', price: 4.99 },
  'milk': { sku: 'DAIRY002', name: 'Whole Milk (1L)', price: 1.89 },
  'cheese': { sku: 'DAIRY003', name: 'Cheddar Cheese (200g)', price: 4.49 },
  'bell peppers': { sku: 'VEG006', name: 'Mixed Bell Peppers (3 pack)', price: 3.99 },
  'spinach': { sku: 'VEG007', name: 'Baby Spinach (150g)', price: 2.49 },
}

type MealPlanRequest = {
  dietaryPreferences?: string
  budgetLevel?: string
  servings?: number
}

type Meal = {
  day: string
  meal: string
  ingredients: string[]
  instructions: string[]
}

type GroceryItem = {
  ingredient: string
  sku: string
  name: string
  price: number
  quantity: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { dietaryPreferences, budgetLevel, servings = 2 }: MealPlanRequest = req.body

    // Create the prompt for OpenAI
    const prompt = `Generate a 7-day dinner meal plan with the following requirements:
- Dietary preferences: ${dietaryPreferences || 'No restrictions'}
- Budget level: ${budgetLevel || 'Moderate'}
- Servings per meal: ${servings}
- Focus on realistic, achievable recipes
- Include variety across the week
- Provide clear ingredient lists and cooking instructions

Return the response in this exact JSON format:
{
  "meals": [
    {
      "day": "Monday",
      "meal": "Grilled Chicken with Rice and Broccoli",
      "ingredients": ["chicken breast", "rice", "broccoli", "olive oil", "garlic"],
      "instructions": ["Cook rice according to package directions", "Season and grill chicken", "Steam broccoli", "Serve together"]
    }
  ]
}

Make sure all ingredient names are simple and common (like "chicken breast", "rice", "broccoli", etc.).`

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using mini for cost efficiency
      messages: [
        {
          role: "system",
          content: "You are a helpful meal planning assistant. Always respond with valid JSON only, no additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    let mealPlan
    try {
      mealPlan = JSON.parse(response)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', response)
      throw new Error('Invalid response format from AI')
    }

    // Generate grocery list from ingredients
    const groceryList: GroceryItem[] = []
    const ingredientCounts: { [key: string]: number } = {}

    // Count ingredient occurrences
    mealPlan.meals.forEach((meal: Meal) => {
      meal.ingredients.forEach((ingredient: string) => {
        const normalizedIngredient = ingredient.toLowerCase().trim()
        ingredientCounts[normalizedIngredient] = (ingredientCounts[normalizedIngredient] || 0) + 1
      })
    })

    // Map ingredients to grocery items
    Object.entries(ingredientCounts).forEach(([ingredient, count]) => {
      const groceryItem = groceryMapping[ingredient as keyof typeof groceryMapping]
      if (groceryItem) {
        groceryList.push({
          ingredient,
          ...groceryItem,
          quantity: count
        })
      } else {
        // Fallback for unmapped ingredients
        groceryList.push({
          ingredient,
          sku: 'MISC001',
          name: ingredient.charAt(0).toUpperCase() + ingredient.slice(1),
          price: 2.99,
          quantity: count
        })
      }
    })

    // Calculate total cost
    const totalCost = groceryList.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    res.status(200).json({
      success: true,
      mealPlan: mealPlan.meals,
      groceryList,
      totalCost: parseFloat(totalCost.toFixed(2)),
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating meal plan:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate meal plan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
} 
import { supabase } from './supabase'

export interface MealPlan {
  id?: string
  user_id?: string
  week_data: any
  shopping_list: string[]
  created_at?: string
  updated_at?: string
}

export class MealPlanService {
  // Save a new meal plan
  static async saveMealPlan(weekData: any, shoppingList: string[]): Promise<MealPlan | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: user.id,
          week_data: weekData,
          shopping_list: shoppingList
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      throw error
    }
  }

  // Get the latest meal plan for the current user
  static async getLatestMealPlan(): Promise<MealPlan | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error
      }

      return data
    } catch (error) {
      throw error
    }
  }

  // Get all meal plans for the current user
  static async getAllMealPlans(): Promise<MealPlan[]> {
    try {
      console.log('🔍 DEBUG: MealPlanService.getAllMealPlans - Starting...');
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('🔍 DEBUG: MealPlanService.getAllMealPlans - No user found');
        throw new Error('User not authenticated')
      }

      console.log('🔍 DEBUG: MealPlanService.getAllMealPlans - Fetching meal plans for user:', user.id);
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.log('🔍 DEBUG: MealPlanService.getAllMealPlans - Error:', error);
        throw error
      }

      console.log('🔍 DEBUG: MealPlanService.getAllMealPlans - Found', data?.length || 0, 'meal plans');
      return data || []
    } catch (error) {
      console.log('🔍 DEBUG: MealPlanService.getAllMealPlans - Exception:', error);
      throw error
    }
  }

  // Update an existing meal plan
  static async updateMealPlan(mealPlanId: string, weekData: any, shoppingList: string[]): Promise<MealPlan | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('meal_plans')
        .update({
          week_data: weekData,
          shopping_list: shoppingList,
          updated_at: new Date().toISOString()
        })
        .eq('id', mealPlanId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      throw error
    }
  }

  // Delete a meal plan
  static async deleteMealPlan(mealPlanId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', mealPlanId)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }
    } catch (error) {
      throw error
    }
  }
} 
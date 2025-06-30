const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// PUBLIC_INTERFACE
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get Supabase client instance
 * @returns {Object} Configured Supabase client
 */
const getSupabaseClient = () => {
  return supabase;
};

/**
 * Test Supabase connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('polls')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Supabase connection error:', err);
    return false;
  }
};

module.exports = {
  supabase,
  getSupabaseClient,
  testConnection
};

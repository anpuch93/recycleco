// Configuration Supabase
const SUPABASE_URL = "https://nugndywafgtwdkcynwyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_07xoN3JFsO93ixR9EDHNPg_yuTQTzui";

// Initialisation du client Supabase
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/init/db
 * Initialize the Supabase database schema and seed initial data
 * WARNING: Only call this once during initial setup
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a development environment or the request has proper auth
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.INIT_SECRET || 'dev-init-secret';

    // Allow initialization in development or with proper secret
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if stores table already exists
    const { data: existingStores } = await supabase
      .from('stores')
      .select('id')
      .limit(1);

    if (existingStores && existingStores.length > 0) {
      return NextResponse.json(
        { message: 'Database already initialized', status: 'already_initialized' },
        { status: 200 }
      );
    }

    // Create initial store record
    const storeData = {
      name: 'cookie-kmt-kumamoto',
      display_name: 'cookie-kmt 熊本',
      address: '熊本市中央区',
      phone: null,
    };

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert([storeData])
      .select()
      .single();

    if (storeError) {
      console.error('Store creation error:', storeError);
      return NextResponse.json(
        { error: 'Failed to create store', details: storeError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Database initialized successfully',
        status: 'initialized',
        store: store,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Initialization error:', error);
    return NextResponse.json(
      { error: 'Initialization failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Add GET endpoint to check initialization status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: stores, error } = await supabase
      .from('stores')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json(
        { status: 'not_initialized', message: 'Database schema not yet created' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { status: 'initialized', message: 'Database is ready' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'unknown', message: String(error) },
      { status: 200 }
    );
  }
}

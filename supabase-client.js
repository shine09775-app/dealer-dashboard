(function () {
  const SUPABASE_URL = 'https://qadvwiyyoyfttczlpjcu.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_MF9y-NhbAS8hG5nqetiLHQ_X5bhnDle';
  const DEALER_CODE = 'nawachai-material-trading';
  const DEALER_COMPANY_NAME = 'บ.นวชัย แมททีเรียล เทรดดิ้ง จก.';

  const hasSupabaseLib = Boolean(window.supabase && typeof window.supabase.createClient === 'function');
  const client = hasSupabaseLib
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

  let dealerCache = null;
  let dealerLoaded = false;

  async function resolveDealer() {
    if (!client) return null;
    if (dealerLoaded) return dealerCache;

    const { data, error } = await client
      .from('dealers')
      .select('id, code, company_name, app_title, portal_subtitle')
      .eq('code', DEALER_CODE)
      .maybeSingle();

    dealerLoaded = true;
    if (error) throw error;
    dealerCache = data || null;
    return dealerCache;
  }

  async function ensureDealer(settings) {
    const found = await resolveDealer();
    if (found?.id) {
      const updatePayload = {};
      if (settings?.appTitle) updatePayload.app_title = settings.appTitle;
      if (settings?.appSubtitle) updatePayload.portal_subtitle = settings.appSubtitle;

      if (Object.keys(updatePayload).length > 0) {
        const { error } = await client
          .from('dealers')
          .update(updatePayload)
          .eq('id', found.id);
        if (error) throw error;
      }
      return found;
    }

    const payload = {
      code: DEALER_CODE,
      company_name: DEALER_COMPANY_NAME,
      app_title: settings?.appTitle || 'Dealer Daily Activity Dashboard',
      portal_subtitle: settings?.appSubtitle || 'Activity Dashboard "ร้านผู้แทนจำหน่าย"',
    };
    const { data, error } = await client
      .from('dealers')
      .upsert(payload, { onConflict: 'code' })
      .select('id, code, company_name, app_title, portal_subtitle')
      .single();
    if (error) throw error;
    dealerCache = data;
    dealerLoaded = true;
    return dealerCache;
  }

  async function fetchDashboardSettings() {
    if (!client) return { ok: false, data: null, error: new Error('Supabase client unavailable') };
    try {
      const dealer = await resolveDealer();
      if (!dealer?.id) return { ok: true, data: null };

      const { data, error } = await client
        .from('dealer_settings')
        .select('*')
        .eq('dealer_id', dealer.id)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        return {
          ok: true,
          data: {
            appTitle: dealer.app_title,
            appSubtitle: dealer.portal_subtitle,
          },
        };
      }

      return {
        ok: true,
        data: {
          appTitle: dealer.app_title,
          appSubtitle: dealer.portal_subtitle,
          loginUsername: data.login_username,
          loginPassword: data.login_password_hash,
          pageSize: data.page_size,
          initialEventCount: data.initial_event_count,
          refreshNewEventMin: data.refresh_new_event_min,
          refreshNewEventMax: data.refresh_new_event_max,
          defaultAutoRefreshSeconds: data.default_auto_refresh_seconds,
          autoRefreshOptions: Array.isArray(data.auto_refresh_options) ? data.auto_refresh_options : null,
          showChangedOnlyDefault: data.show_changed_only_default,
          enabledEventTypes: Array.isArray(data.enabled_event_types) ? data.enabled_event_types : null,
          provinces: Array.isArray(data.provinces) ? data.provinces : null,
          customers: Array.isArray(data.customers) ? data.customers : null,
          products: Array.isArray(data.products) ? data.products : null,
          plants: Array.isArray(data.plants) ? data.plants : null,
        },
      };
    } catch (error) {
      return { ok: false, data: null, error };
    }
  }

  async function saveDashboardSettings(settings) {
    if (!client) return { ok: false, error: new Error('Supabase client unavailable') };
    try {
      const dealer = await ensureDealer(settings);
      const payload = {
        dealer_id: dealer.id,
        login_username: settings.loginUsername,
        login_password_hash: settings.loginPassword,
        page_size: settings.pageSize,
        initial_event_count: settings.initialEventCount,
        refresh_new_event_min: settings.refreshNewEventMin,
        refresh_new_event_max: settings.refreshNewEventMax,
        default_auto_refresh_seconds: settings.defaultAutoRefreshSeconds,
        auto_refresh_options: settings.autoRefreshOptions,
        show_changed_only_default: settings.showChangedOnlyDefault,
        enabled_event_types: settings.enabledEventTypes,
        provinces: settings.provinces,
        customers: settings.customers,
        products: settings.products,
        plants: settings.plants,
      };

      const { error } = await client
        .from('dealer_settings')
        .upsert(payload, { onConflict: 'dealer_id' });
      if (error) throw error;

      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async function fetchDailyPourJobs(limitCount) {
    if (!client) return { ok: false, data: [], error: new Error('Supabase client unavailable') };
    try {
      const dealer = await resolveDealer();
      if (!dealer?.id) return { ok: true, data: [] };

      let query = client
        .from('daily_pour_jobs')
        .select(
          'booking_no, po_status, agency, contractor, product_code, booked_qty, confirmed_qty, poured_qty, pending_qty, pump, booking_status, pour_date, pour_start_time, tracking_order_no, tracking_url'
        )
        .eq('dealer_id', dealer.id)
        .order('pour_date', { ascending: false });

      if (Number.isFinite(limitCount) && limitCount > 0) {
        query = query.limit(limitCount);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      return { ok: false, data: [], error };
    }
  }

  window.DEALER_SUPABASE = {
    url: SUPABASE_URL,
    key: SUPABASE_PUBLISHABLE_KEY,
    dealerCode: DEALER_CODE,
    isReady() {
      return Boolean(client);
    },
    fetchDashboardSettings,
    saveDashboardSettings,
    fetchDailyPourJobs,
  };
})();

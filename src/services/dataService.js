import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { seedData } from '../data/seedData'

const STORAGE_KEY = 'madar_store_v10'
const LEGACY_STORAGE_KEYS = ['madar_store_v9', 'madar_store_v8', 'madar_store_v7', 'madar_store_v6', 'madar_store_v5', 'madar_store_v4', 'madar_store_v3']
const CUSTOMERS_KEY = 'madar_customers_v1'
const CURRENT_CUSTOMER_KEY = 'madar_current_customer_v1'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function mergeSettings(settings) {
  const merged = { ...seedData.settings, ...(settings || {}) }
  Object.entries(seedData.settings).forEach(([key, defaultValue]) => {
    if (merged[key] == null) merged[key] = defaultValue
  })
  merged.splash_mode = 'vector'
  if (/^\.?YOUR SCENT\. YOUR GRAVITY\.?$/i.test(String(merged.hero_subtitle_en || '').trim())) {
    merged.hero_subtitle_en = 'YOUR SCENT. YOUR GRAVITY.'
  }
  return merged
}

function readLocalData() {
  try {
    const raw = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS].map((key) => localStorage.getItem(key)).find(Boolean)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  if ('BroadcastChannel' in globalThis) {
    const channel = new BroadcastChannel('madar_live_sync')
    channel.postMessage({ type: 'store-update', state: data })
    channel.close()
  }
}

export function getDefaultState() {
  return {
    categories: seedData.categories,
    products: seedData.products,
    quiz_questions: seedData.quiz_questions,
    coupons: seedData.coupons,
    settings: seedData.settings,
    orders: seedData.orders,
    customers: seedData.customers,
  }
}

export function ensureLocalSeed() {
  const saved = readLocalData()
  if (saved) {
    const products = (saved.products || seedData.products).map((product, index) => {
      const seedProduct = seedData.products.find((item) => item.id === product.id)
      return {
        ...product,
        gallery_images: Array.isArray(product.gallery_images) ? product.gallery_images : seedProduct?.gallery_images || [],
        is_top_seller: product.is_top_seller ?? seedProduct?.is_top_seller ?? index === 0,
        longevity_label_ar: product.longevity_label_ar ?? seedProduct?.longevity_label_ar ?? `${product.longevity ?? seedProduct?.longevity ?? 10} ساعات`,
        longevity_label_en: product.longevity_label_en ?? seedProduct?.longevity_label_en ?? `${product.longevity ?? seedProduct?.longevity ?? 10}h`,
        longevity_percent: product.longevity_percent ?? seedProduct?.longevity_percent ?? Math.min(100, Number(product.longevity ?? seedProduct?.longevity ?? 10) * 8),
        sillage_percent: product.sillage_percent ?? seedProduct?.sillage_percent ?? product.sillage ?? seedProduct?.sillage ?? 80,
      }
    })
    const productIds = new Set(products.map((product) => product.id))
    const migrated = {
      ...getDefaultState(),
      ...saved,
      products,
      quiz_questions: (Array.isArray(saved.quiz_questions) ? saved.quiz_questions : seedData.quiz_questions).map((question, questionIndex) => ({
        ...question,
        options: (question.options || []).map((option, optionIndex) => {
          const validIds = (option.recommended_product_ids || []).filter((id) => productIds.has(id))
          const fallback = products.find((product) => product.featured) || products[(questionIndex + optionIndex) % Math.max(products.length, 1)]
          return {
            ...option,
            recommended_product_ids: validIds.length ? validIds : fallback ? [fallback.id] : [],
            weight: Number(option.weight) > 0 ? Number(option.weight) : 1,
          }
        }),
      })),
      settings: mergeSettings(saved.settings),
      orders: saved.orders?.length ? saved.orders : seedData.orders,
      customers: saved.customers || seedData.customers,
    }
    writeLocalData(migrated)
    return migrated
  }

  const seeded = getDefaultState()
  writeLocalData(seeded)
  return seeded
}

export function normalizeEgyptianPhone(value) {
  let digits = String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/\D/g, '')
  if (digits.startsWith('0020')) digits = digits.slice(4)
  else if (digits.startsWith('20')) digits = digits.slice(2)
  if (!digits.startsWith('0')) digits = `0${digits}`
  if (!/^01[0125]\d{8}$/.test(digits)) throw new Error('أدخل رقم موبايل مصري صحيحاً من 11 رقماً.')
  return digits
}

async function hashPassword(password) {
  if (!password || String(password).length < 4) throw new Error('كلمة المرور يجب ألا تقل عن 4 أحرف.')
  if (!globalThis.crypto?.subtle) throw new Error('تعذر تأمين كلمة المرور في هذا المتصفح.')
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const key = await globalThis.crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits'])
  const derived = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256)
  const saltText = btoa(String.fromCharCode(...salt))
  const digest = [...new Uint8Array(derived)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `pbkdf2$120000$${saltText}$${digest}`
}

async function verifyPassword(password, encodedHash) {
  if (String(encodedHash || '').startsWith('pbkdf2$')) {
    const [, iterations, saltText, expected] = encodedHash.split('$')
    const salt = Uint8Array.from(atob(saltText), (character) => character.charCodeAt(0))
    const key = await globalThis.crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits'])
    const derived = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: Number(iterations), hash: 'SHA-256' }, key, 256)
    const actual = [...new Uint8Array(derived)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    return actual === expected
  }
  const bytes = new TextEncoder().encode(String(password))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  const actual = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return actual === encodedHash
}

function stripCustomerSecrets(customer) {
  if (!customer) return null
  const { password_hash: _passwordHash, ...profile } = customer
  return profile
}

function readCustomers() {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY)
    if (!raw) {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(seedData.customers))
      return [...seedData.customers]
    }
    const saved = JSON.parse(raw)
    const demo = seedData.customers.find((customer) => customer.phone === '01012345678')
    return Array.isArray(saved)
      ? (saved.some((customer) => customer.phone === demo.phone) ? saved : [demo, ...saved])
      : [...seedData.customers]
  } catch {
    return [...seedData.customers]
  }
}

function writeCustomers(customers) {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers))
}

export function getCurrentCustomer() {
  try {
    const customer = JSON.parse(localStorage.getItem(CURRENT_CUSTOMER_KEY) || 'null')
    return stripCustomerSecrets(customer)
  } catch {
    return null
  }
}

export async function listCustomers() {
  const localCustomers = readCustomers()
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('Unable to load customers from Supabase:', error.message)
      return localCustomers.map(stripCustomerSecrets)
    }
    const merged = [...(data || [])]
    localCustomers.forEach((customer) => {
      if (!merged.some((item) => item.phone === customer.phone)) merged.push(customer)
    })
    writeCustomers(merged)
    return merged.map(stripCustomerSecrets)
  }
  return localCustomers.map(stripCustomerSecrets)
}

export async function registerCustomer(values) {
  const phone = normalizeEgyptianPhone(values.phone)
  const password_hash = await hashPassword(values.password)
  const localCustomers = readCustomers()
  let existing = localCustomers.find((customer) => customer.phone === phone)
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle()
    if (error) throw new Error(`تعذر التحقق من رقم الهاتف: ${error.message}`)
    if (data) existing = data
  }
  if (existing) throw new Error('يوجد حساب بهذا الرقم بالفعل. سجل الدخول بدلاً من ذلك.')
  const now = new Date().toISOString()
  const customer = {
    id: globalThis.crypto?.randomUUID?.() || `customer-${Date.now()}`,
    phone,
    password_hash,
    full_name: String(values.full_name || '').trim(),
    alt_phone: String(values.alt_phone || '').trim(),
    governorate: values.governorate || 'القاهرة',
    city: String(values.city || '').trim(),
    address_details: String(values.address_details || '').trim(),
    notes: String(values.notes || '').trim(),
    wishlist: Array.isArray(values.wishlist) ? values.wishlist : [],
    created_at: now,
    updated_at: now,
  }
  if (!customer.full_name) throw new Error('يرجى إدخال الاسم بالكامل.')
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('customers').insert(customer).select('*').single()
    if (error) throw new Error(`تعذر إنشاء الحساب: ${error.message}`)
    Object.assign(customer, data)
  }
  writeCustomers([customer, ...localCustomers.filter((item) => item.phone !== phone)])
  localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(stripCustomerSecrets(customer)))
  return stripCustomerSecrets(customer)
}

export async function loginCustomer(phoneValue, password) {
  const phone = normalizeEgyptianPhone(phoneValue)
  const localCustomers = readCustomers()
  let customer = localCustomers.find((item) => item.phone === phone)
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle()
    if (error) throw new Error(`تعذر تسجيل الدخول: ${error.message}`)
    if (data) customer = data
  }
  if (!customer || !(await verifyPassword(password, customer.password_hash))) throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة.')
  if (!String(customer.password_hash).startsWith('pbkdf2$')) {
    const upgradedHash = await hashPassword(password)
    customer = { ...customer, password_hash: upgradedHash }
    if (hasSupabaseConfig && supabase) {
      const { error } = await supabase.from('customers').update({ password_hash: upgradedHash }).eq('id', customer.id)
      if (error) console.error('Unable to upgrade customer password hash:', error.message)
    }
    writeCustomers(localCustomers.map((item) => item.id === customer.id ? customer : item))
  }
  localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(stripCustomerSecrets(customer)))
  return stripCustomerSecrets(customer)
}

export async function updateCustomerProfile(id, updates) {
  const currentCustomer = getCurrentCustomer()
  if (!currentCustomer || currentCustomer.id !== id) throw new Error('سجل الدخول لتعديل بيانات الحساب.')
  const nextFields = {
    ...updates,
    phone: normalizeEgyptianPhone(updates.phone ?? currentCustomer.phone),
    full_name: String(updates.full_name ?? currentCustomer.full_name).trim(),
    alt_phone: String(updates.alt_phone ?? currentCustomer.alt_phone ?? '').trim(),
    governorate: updates.governorate ?? currentCustomer.governorate,
    city: String(updates.city ?? currentCustomer.city ?? '').trim(),
    address_details: String(updates.address_details ?? currentCustomer.address_details ?? '').trim(),
    notes: String(updates.notes ?? currentCustomer.notes ?? '').trim(),
    wishlist: updates.wishlist ?? currentCustomer.wishlist ?? [],
    updated_at: new Date().toISOString(),
  }
  if (!nextFields.full_name) throw new Error('يرجى إدخال الاسم بالكامل.')
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('customers').update(nextFields).eq('id', id).select('*').single()
    if (error) throw new Error(`تعذر حفظ بيانات الحساب: ${error.message}`)
    Object.assign(nextFields, data)
  }
  const customers = readCustomers().map((customer) => customer.id === id ? { ...customer, ...nextFields } : customer)
  writeCustomers(customers)
  const safeCustomer = stripCustomerSecrets({ ...currentCustomer, ...nextFields })
  localStorage.setItem(CURRENT_CUSTOMER_KEY, JSON.stringify(safeCustomer))
  return safeCustomer
}

export function logoutCustomer() {
  localStorage.removeItem(CURRENT_CUSTOMER_KEY)
}

export async function loadStoreState() {
  if (hasSupabaseConfig && supabase) {
    const results = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('*').eq('active', true),
      supabase.from('coupons').select('*'),
      supabase.from('store_settings').select('*').limit(1).maybeSingle(),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('quiz_questions').select('questions').eq('id', 'default').maybeSingle(),
    ])
    const failedQuery = results.find(({ error }) => error)
    if (failedQuery?.error) {
      throw new Error(`تعذر تحميل بيانات المتجر من Supabase: ${failedQuery.error.message}`)
    }

    const [categoryResult, productResult, couponResult, settingsResult, orderResult, quizResult] = results
    const fallback = getDefaultState()
    const categories = categoryResult.data || []
    const products = productResult.data || []
    const state = {
      categories: categories.map((category) => ({
        ...category,
        is_custom: !seedData.categories.some((seedCategory) => seedCategory.slug === category.slug),
      })),
      products: products.map((product, index) => {
        const seedProduct = seedData.products.find((item) => item.id === product.id)
        return {
          ...product,
          gallery_images: Array.isArray(product.gallery_images) ? product.gallery_images : seedProduct?.gallery_images || [],
          is_top_seller: product.is_top_seller ?? seedProduct?.is_top_seller ?? index === 0,
          longevity_label_ar: product.longevity_label_ar ?? seedProduct?.longevity_label_ar ?? `${product.longevity ?? seedProduct?.longevity ?? 10} ساعات`,
          longevity_label_en: product.longevity_label_en ?? seedProduct?.longevity_label_en ?? `${product.longevity ?? seedProduct?.longevity ?? 10}h`,
          longevity_percent: product.longevity_percent ?? seedProduct?.longevity_percent ?? Math.min(100, Number(product.longevity ?? seedProduct?.longevity ?? 10) * 8),
          sillage_percent: product.sillage_percent ?? seedProduct?.sillage_percent ?? product.sillage ?? seedProduct?.sillage ?? 80,
        }
      }),
      coupons: couponResult.data || [],
      quiz_questions: Array.isArray(quizResult.data?.questions) ? quizResult.data.questions : fallback.quiz_questions,
      settings: mergeSettings(settingsResult.data || fallback.settings),
      orders: orderResult.data || [],
      customers: await listCustomers(),
    }
    writeLocalData(state)
    return state
  }

  return ensureLocalSeed()
}

export function updateLocalState(nextState) {
  writeLocalData(nextState)
  if (Array.isArray(nextState.customers)) writeCustomers(nextState.customers)
  return nextState
}

export function getStoredState() {
  return readLocalData() || ensureLocalSeed()
}

export async function saveOrder(order) {
  const state = getStoredState()
  let savedOrder = order
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('orders').insert(order).select('*').single()
    if (error) throw new Error(`تعذر حفظ الطلب في قاعدة البيانات: ${error.message}`)
    savedOrder = data
  }
  state.orders = [savedOrder, ...state.orders]
  writeLocalData(state)
  return { state, order: savedOrder }
}

export async function saveOrderStatus(orderId, status) {
  const state = getStoredState()
  state.orders = state.orders.map((order) => order.id === orderId ? { ...order, status } : order)
  writeLocalData(state)
  if (hasSupabaseConfig && supabase && UUID_PATTERN.test(orderId)) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    if (error) throw new Error(`تعذر تحديث حالة الطلب: ${error.message}`)
  }
  return state
}

export async function saveProductList(products) {
  const state = getStoredState()
  const removedDatabaseIds = state.products
    .filter((product) => UUID_PATTERN.test(product.id) && !products.some((item) => item.id === product.id))
    .map((product) => product.id)
  state.products = products
  writeLocalData(state)
  if (hasSupabaseConfig && supabase) {
    const databaseProducts = products.filter((product) => UUID_PATTERN.test(product.id))
    if (databaseProducts.length) {
      const { error } = await supabase.from('products').upsert(databaseProducts, { onConflict: 'id' })
      if (error) throw new Error(`تعذر حفظ المنتجات: ${error.message}`)
    }
    if (removedDatabaseIds.length) {
      const { error } = await supabase.from('products').update({ active: false }).in('id', removedDatabaseIds)
      if (error) throw new Error(`تعذر حذف المنتجات من المتجر: ${error.message}`)
    }
  }
  return state
}

export async function saveQuizQuestions(questions) {
  const state = getStoredState()
  state.quiz_questions = questions
  writeLocalData(state)
  if (hasSupabaseConfig && supabase) {
    const { error } = await supabase.from('quiz_questions').upsert({ id: 'default', questions }, { onConflict: 'id' })
    if (error) throw new Error(`تعذر حفظ اختبار العطر: ${error.message}`)
  }
  return state
}

export async function saveCategoryList(categories) {
  const state = getStoredState()
  const removedDatabaseIds = state.categories
    .filter((category) => UUID_PATTERN.test(category.id) && !categories.some((item) => item.id === category.id))
    .map((category) => category.id)
  state.categories = categories
  writeLocalData(state)
  if (hasSupabaseConfig && supabase) {
    const databaseCategories = categories
      .filter((category) => UUID_PATTERN.test(category.id))
      .map((category) => {
        const databaseCategory = { ...category }
        delete databaseCategory.is_custom
        return databaseCategory
      })
    if (databaseCategories.length) {
      const { error } = await supabase.from('categories').upsert(databaseCategories, { onConflict: 'id' })
      if (error) throw new Error(`تعذر حفظ الأقسام: ${error.message}`)
    }
    if (removedDatabaseIds.length) {
      const { error } = await supabase.from('categories').delete().in('id', removedDatabaseIds)
      if (error) throw new Error(`تعذر حذف الأقسام: ${error.message}`)
    }
  }
  return state
}

export async function saveCouponList(coupons) {
  const state = getStoredState()
  const removedDatabaseIds = state.coupons
    .filter((coupon) => UUID_PATTERN.test(coupon.id) && !coupons.some((item) => item.id === coupon.id))
    .map((coupon) => coupon.id)
  state.coupons = coupons
  writeLocalData(state)
  if (hasSupabaseConfig && supabase) {
    const databaseCoupons = coupons.filter((coupon) => UUID_PATTERN.test(coupon.id))
    if (databaseCoupons.length) {
      const { error } = await supabase.from('coupons').upsert(databaseCoupons, { onConflict: 'id' })
      if (error) throw new Error(`تعذر حفظ الكوبونات: ${error.message}`)
    }
    if (removedDatabaseIds.length) {
      const { error } = await supabase.from('coupons').delete().in('id', removedDatabaseIds)
      if (error) throw new Error(`تعذر حذف الكوبونات: ${error.message}`)
    }
  }
  return state
}

export async function saveSettings(settings) {
  const state = getStoredState()
  state.settings = mergeSettings(settings)
  writeLocalData(state)
  if (hasSupabaseConfig && supabase) {
    const { error } = await supabase.from('store_settings').upsert({ id: 1, ...state.settings }, { onConflict: 'id' })
    if (error) throw new Error(`تعذر حفظ إعدادات المتجر: ${error.message}`)
  }
  return state
}

export function resetDemoData() {
  const seeded = getDefaultState()
  writeLocalData(seeded)
  writeCustomers(seedData.customers)
  localStorage.removeItem(CURRENT_CUSTOMER_KEY)
  return seeded
}

export default {
  loadStoreState,
  getDefaultState,
  getStoredState,
  updateLocalState,
  saveOrder,
  saveOrderStatus,
  saveProductList,
  saveQuizQuestions,
  saveCategoryList,
  saveCouponList,
  saveSettings,
  resetDemoData,
  normalizeEgyptianPhone,
  getCurrentCustomer,
  listCustomers,
  registerCustomer,
  loginCustomer,
  updateCustomerProfile,
  logoutCustomer,
}

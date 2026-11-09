import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { seedData } from '../src/data/seedData.js'

if (existsSync('.env')) {
  if (typeof process.loadEnvFile !== 'function') {
    throw new Error('Loading .env files requires Node.js 20.12 or newer.')
  }
  process.loadEnvFile('.env')
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Set VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY in .env before seeding.')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

const categoryIds = {
  all: '55555555-5555-4555-8555-555555555555',
  men: '22222222-2222-4222-8222-222222222222',
  women: '33333333-3333-4333-8333-333333333333',
  unisex: '44444444-4444-4444-8444-444444444444',
  'oud-oriental': '11111111-1111-4111-8111-111111111111',
}

const productIds = {
  'prod-cosmic-oud': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'prod-velvet-night': 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'prod-solar-breeze': 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'prod-rose-eclipse': 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
}

const couponIds = {
  MADAR15: '77777777-7777-4777-8777-777777777777',
  ORBIT150: '88888888-8888-4888-8888-888888888888',
}

function mapRequiredId(id, idMap, kind) {
  const mappedId = idMap[id]
  if (!mappedId) throw new Error(`Missing stable Supabase ID mapping for ${kind}: ${id}`)
  return mappedId
}

const categories = seedData.categories.map((category) => ({
  ...category,
  id: mapRequiredId(category.slug, categoryIds, 'category'),
}))

const products = seedData.products.map((product) => ({
  ...product,
  id: mapRequiredId(product.id, productIds, 'product'),
  category_id: mapRequiredId(
    seedData.categories.find((category) => category.id === product.category_id)?.slug,
    categoryIds,
    'product category',
  ),
}))

const coupons = seedData.coupons.map((coupon) => ({
  ...coupon,
  id: mapRequiredId(coupon.code, couponIds, 'coupon'),
}))

const quizQuestions = seedData.quiz_questions.map((question) => ({
  ...question,
  options: question.options.map((option) => ({
    ...option,
    recommended_product_ids: option.recommended_product_ids.map((id) =>
      mapRequiredId(id, productIds, 'quiz product'),
    ),
  })),
}))

const customers = seedData.customers
const orders = seedData.orders.map((order) => ({
  ...order,
  items: order.items.map((item) => ({
    ...item,
    product_id: mapRequiredId(item.product_id, productIds, 'order product'),
  })),
}))

const settings = { id: 1, ...seedData.settings }
settings.quiz_questions = quizQuestions
delete settings.splash_mode

const datasets = [
  ['categories', categories],
  ['products', products],
  ['coupons', coupons],
  ['customers', customers],
  ['orders', orders],
  ['quiz_questions', [{ id: 'default', questions: quizQuestions }]],
  ['store_settings', [settings]],
]

for (const [table, rows] of datasets) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`Failed to seed ${table}: ${error.message}`)
  console.log(`Seeded ${rows.length} ${table}.`)
}

console.log('Supabase seed completed.')

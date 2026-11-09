import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight, ClipboardList, Copy, Download, ExternalLink, LayoutDashboard,
  LockKeyhole, MessageCircle, Package, Pencil, Plus, Printer, RotateCcw, Save,
  Search, Settings, Sparkles, Tags, TicketPercent, Trash2, Upload, Users, X,
} from 'lucide-react'
import { AppProvider } from './context/AppContext'
import { useAppContext } from './context/useAppContext'
import dataService from './services/dataService'
import { AdminStorefrontEditor } from './App'

const SESSION_KEY = 'madar_admin_session'
const FAILURES_KEY = 'madar_admin_failures'
const LOCK_UNTIL_KEY = 'madar_admin_lock_until'
const fieldClass = 'w-full rounded-xl border border-[#F2E9DF]/10 bg-[#0b0306] px-3 py-2.5 text-sm text-[#F2E9DF] outline-none focus:border-[#D5BFA8]/60'
const panelClass = 'rounded-2xl border border-[#F2E9DF]/10 bg-[#17070d] p-4 sm:p-5'

const TABS = [
  ['overview', 'نظرة عامة', 'Overview', LayoutDashboard],
  ['orders', 'الطلبات والشحن', 'Orders & Shipping', ClipboardList],
  ['products', 'العطور والمقاسات', 'Products', Package],
  ['quiz', 'اختبار العطر', 'Scent Quiz', Sparkles],
  ['categories', 'التصنيفات', 'Categories', Tags],
  ['coupons', 'كوبونات الخصم', 'Coupons', TicketPercent],
  ['customers', 'العملاء', 'Customers', Users],
  ['settings', 'إعدادات المتجر', 'Settings', Settings],
]

const STATUS_LABELS = {
  pending: ['قيد المراجعة', 'Pending'],
  confirmed: ['تم التأكيد', 'Confirmed'],
  shipped: ['خرج للشحن', 'Shipped'],
  delivered: ['تم التسليم', 'Delivered'],
  cancelled: ['ملغي', 'Cancelled'],
}

const text = (language, ar, en) => language === 'ar' ? ar : en
const formatMoney = (value) => `${Number(value || 0).toLocaleString('en-US')} ج.م`
const createId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`
const hashPin = async (pin) => {
  if (!globalThis.crypto?.subtle) throw new Error('هذا المتصفح لا يدعم التحقق الآمن.')
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(pin)))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function compressImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('اختر ملف صورة صالحاً.')
  if (file.size > 12_000_000) throw new Error('حجم الصورة يتجاوز 12 ميجابايت.')
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('تعذرت قراءة الصورة.'))
    reader.onerror = () => reject(new Error('تعذرت قراءة الصورة.'))
    reader.readAsDataURL(file)
  })
  const image = await new Promise((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('تعذر فتح الصورة.'))
    element.src = source
  })
  const scale = Math.min(1, 1500 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('تعذر تجهيز الصورة في هذا المتصفح.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.84)
}

function AdminAppContent() {
  const {
    language, setLanguage, store, customers, updateProducts, updateQuizQuestions,
    updateCategories, updateCoupons, updateSettings, updateOrderStatus, resetDemo,
    replaceStoreState, storeSyncError, clearStoreSyncError,
  } = useAppContext()
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'active')
  const [pin, setPin] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(() => Number(sessionStorage.getItem(FAILURES_KEY) || 0))
  const [lockUntil, setLockUntil] = useState(() => Number(sessionStorage.getItem(LOCK_UNTIL_KEY) || 0))
  const [remainingLock, setRemainingLock] = useState(0)
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState('overview')
  const [visualEditorOpen, setVisualEditorOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [orderFilter, setOrderFilter] = useState('all')
  const [customerSearch, setCustomerSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)
  const [settingsChanges, setSettingsChanges] = useState({})
  const [newPin, setNewPin] = useState('')
  const [printOrder, setPrintOrder] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [importError, setImportError] = useState('')

  const isArabic = language === 'ar'
  const t = (ar, en) => text(language, ar, en)
  const updateSettingsDraft = (key, value) => {
    setSettingsChanges((current) => ({ ...current, [key]: value }))
  }
  const notify = (message = t('تم الحفظ بنجاح ✓', 'Saved successfully ✓')) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  const settingsDraft = { ...store.settings, ...settingsChanges }

  useEffect(() => {
    if (!lockUntil) return undefined
    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000))
      setRemainingLock(seconds)
      if (!seconds) {
        setLockUntil(0)
        sessionStorage.removeItem(LOCK_UNTIL_KEY)
        sessionStorage.setItem(FAILURES_KEY, '0')
        setFailedAttempts(0)
      }
    }
    updateCountdown()
    const timer = window.setInterval(updateCountdown, 250)
    return () => window.clearInterval(timer)
  }, [lockUntil])

  useEffect(() => {
    if (!printOrder) return undefined
    const timer = window.setTimeout(() => window.print(), 150)
    const afterPrint = () => setPrintOrder(null)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [printOrder])

  const orderTotals = useMemo(() => {
    const totals = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 }
    store.orders.forEach((order) => { totals[order.status] = (totals[order.status] || 0) + 1 })
    return totals
  }, [store.orders])
  const paidOrders = store.orders.filter((order) => ['confirmed', 'shipped', 'delivered'].includes(order.status))
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const bestProduct = useMemo(() => {
    const sold = new Map()
    store.orders.filter((order) => !['cancelled', 'pending'].includes(order.status)).forEach((order) => {
      ;(order.items || []).forEach((item) => sold.set(item.product_id, (sold.get(item.product_id) || 0) + Number(item.quantity || 0)))
    })
    const ranked = [...sold.entries()].sort((a, b) => b[1] - a[1])[0]
    return store.products.find((product) => product.id === ranked?.[0])
      || store.products.find((product) => product.is_top_seller)
      || store.products[0]
  }, [store.orders, store.products])
  const filteredOrders = store.orders.filter((order) => {
    const textMatch = `${order.order_number} ${order.customer_name} ${order.customer_phone} ${order.governorate}`.toLowerCase().includes(search.toLowerCase())
    return textMatch && (orderFilter === 'all' || order.status === orderFilter)
  })
  const filteredCustomers = customers.filter((customer) => `${customer.full_name} ${customer.phone} ${customer.alt_phone} ${customer.governorate} ${customer.address_details}`.toLowerCase().includes((customerSearch || search).toLowerCase()))

  const authenticate = async (event) => {
    event.preventDefault()
    if (lockUntil > Date.now()) return
    setLoginError('')
    try {
      const submittedHash = await hashPin(pin)
      const expectedHash = store.settings.admin_pin_hash || await hashPin(store.settings.admin_pin || '2026')
      const demoHash = !store.settings.admin_pin_hash ? await hashPin('2026') : ''
      if (submittedHash === expectedHash || submittedHash === demoHash) {
        sessionStorage.setItem(SESSION_KEY, 'active')
        sessionStorage.removeItem(FAILURES_KEY)
        setFailedAttempts(0)
        setAuthenticated(true)
        setPin('')
        return
      }
      const nextAttempts = failedAttempts + 1
      sessionStorage.setItem(FAILURES_KEY, String(nextAttempts))
      setFailedAttempts(nextAttempts)
      setPin('')
      if (nextAttempts >= 5) {
        const until = Date.now() + 60_000
        sessionStorage.setItem(LOCK_UNTIL_KEY, String(until))
        setLockUntil(until)
        setLoginError(t('تم قفل الدخول لمدة 60 ثانية بعد 5 محاولات خاطئة.', 'Login locked for 60 seconds after 5 failed attempts.'))
      } else {
        setLoginError(t(`رقم PIN غير صحيح. المحاولة ${nextAttempts} من 5.`, `Incorrect PIN. Attempt ${nextAttempts} of 5.`))
      }
    } catch (error) {
      setLoginError(error.message || t('تعذر التحقق من PIN.', 'Unable to verify PIN.'))
    }
  }

  const lockAdmin = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthenticated(false)
    setTab('overview')
  }

  const saveProduct = () => {
    if (!editingProduct?.name_ar?.trim() || !editingProduct?.name_en?.trim()) {
      notify(t('يرجى إدخال اسم العطر باللغتين.', 'Enter the perfume name in both languages.'))
      return
    }
    const exists = store.products.some((product) => product.id === editingProduct.id)
    const next = exists
      ? store.products.map((product) => product.id === editingProduct.id ? editingProduct : { ...product, is_top_seller: editingProduct.is_top_seller ? false : product.is_top_seller })
      : [...store.products, editingProduct]
    updateProducts(next)
    setEditingProduct(null)
    notify()
  }

  const updateProductImage = async (index, file) => {
    try {
      const image = await compressImage(file)
      setEditingProduct((current) => {
        const gallery = [...(current.gallery_images || ['', '', ''])]
        gallery[index] = image
        return { ...current, gallery_images: gallery, ...(index === 0 ? { image_url: image } : {}) }
      })
    } catch (error) {
      notify(error.message)
    }
  }

  const exportOrders = () => {
    const columns = ['Order #', 'Date', 'Status', 'Customer Name', 'Phone', 'Alt Phone', 'Governorate', 'City', 'Address', 'Items', 'Total COD', 'Notes']
    const rows = store.orders.map((order) => [
      order.order_number, order.created_at, order.status, order.customer_name, order.customer_phone,
      order.customer_alt_phone, order.governorate, order.city, order.address_details,
      (order.items || []).map((item) => `${item.name_ar || item.name} ${item.size} x${item.quantity}`).join(' | '),
      order.total, order.notes,
    ])
    const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'madar-orders.csv'
    link.click()
    URL.revokeObjectURL(url)
    notify(t('تم تصدير الطلبات', 'Orders exported'))
  }

  const exportBackup = () => {
    const snapshot = dataService.getStoredState()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }))
    link.download = 'madar-store-backup.json'
    link.click()
    URL.revokeObjectURL(link.href)
    notify(t('تم تنزيل النسخة الاحتياطية', 'Backup downloaded'))
  }

  const importBackup = async (file) => {
    setImportError('')
    try {
      const raw = await file.text()
      const backup = JSON.parse(raw)
      for (const key of ['products', 'categories', 'orders', 'coupons', 'quiz_questions', 'settings']) {
        if (backup[key] == null) backup[key] = dataService.getDefaultState()[key]
      }
      if (!Array.isArray(backup.products) || !Array.isArray(backup.categories)) throw new Error('الملف لا يحتوي على بيانات متجر صالحة.')
      replaceStoreState(backup)
      notify(t('تمت استعادة النسخة الاحتياطية', 'Backup restored'))
    } catch (error) {
      setImportError(error.message || t('تعذرت استعادة النسخة.', 'Unable to restore the backup.'))
    }
  }

  const changeAdminPin = async () => {
    if (newPin.trim().length < 4) {
      notify(t('يجب أن يتكون PIN من 4 أرقام أو أحرف على الأقل.', 'PIN must contain at least 4 characters.'))
      return
    }
    try {
      const admin_pin_hash = await hashPin(newPin)
      updateSettings({ ...store.settings, admin_pin_hash, admin_pin: '' })
      setNewPin('')
      notify()
    } catch (error) {
      notify(error.message)
    }
  }

  const deleteCategory = (categoryId) => {
    const categories = store.categories.filter((category) => category.id !== categoryId)
    const fallbackCategory = categories.find((category) => category.slug !== 'all')
    updateCategories(categories)
    updateProducts(store.products.map((product) => product.category_id === categoryId ? { ...product, category_id: fallbackCategory?.id || '' } : product))
    notify()
  }

  const sendOrderWhatsApp = (order) => {
    const items = (order.items || []).map((item) => `• ${item.name_ar || item.name} — ${item.size} × ${item.quantity}`).join('\n')
    const address = [order.governorate, order.city, order.address_details].filter(Boolean).join('، ')
    const message = `أهلاً ${order.customer_name}، تم استلام طلبك من مدار.\nرقم الطلب: ${order.order_number}\n${items}\nالإجمالي عند الاستلام: ${formatMoney(order.total)}\nالعنوان: ${address}`
    const phone = String(order.customer_phone || '').replace(/\D/g, '').replace(/^0/, '20')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const addQuestion = () => updateQuizQuestions([...store.quiz_questions, {
    id: createId('question'), question_ar: '', question_en: '', options: [],
  }])
  const updateQuestion = (questionId, patch) => updateQuizQuestions(store.quiz_questions.map((question) => question.id === questionId ? { ...question, ...patch } : question))
  const updateOption = (questionId, optionId, patch) => updateQuizQuestions(store.quiz_questions.map((question) => question.id !== questionId ? question : {
    ...question,
    options: question.options.map((option) => option.id === optionId ? { ...option, ...patch } : option),
  }))
  const quizWinner = () => {
    const scores = new Map()
    store.quiz_questions.forEach((question) => {
      const selectedId = quizAnswers[question.id]
      const option = question.options?.find((item) => item.id === selectedId)
      if (!option) return
      ;(option.recommended_product_ids || []).forEach((id) => scores.set(id, (scores.get(id) || 0) + Number(option.weight || 1)))
    })
    return [...scores].sort((a, b) => b[1] - a[1]).map(([id]) => store.products.find((product) => product.id === id)).filter(Boolean)[0]
      || store.products.find((product) => product.is_top_seller)
      || store.products[0]
  }

  const openNewProduct = () => setEditingProduct({
    id: globalThis.crypto?.randomUUID?.() || createId('product'),
    name_ar: '', name_en: '', subtitle_ar: '', subtitle_en: '', description_ar: '', description_en: '',
    category_id: store.categories[0]?.id || '', concentration: 'Extrait de Parfum',
    gender: 'Unisex', season: 'All Year', time_of_day: 'Any Time', scent_vibe: '',
    image_url: '', gallery_images: ['', '', ''],
    longevity_label_ar: '10 ساعات', longevity_label_en: '10h', longevity_percent: 80, sillage_percent: 80,
    sizes: [{ size: '50ml', price: 0, compare_price: 0, in_stock: true }], active: true, is_top_seller: false,
  })
  const duplicateProduct = (product) => {
    const duplicate = structuredClone(product)
    duplicate.id = createId('product')
    duplicate.name_ar = `${duplicate.name_ar} (نسخة)`
    duplicate.name_en = `${duplicate.name_en} (Copy)`
    duplicate.is_top_seller = false
    updateProducts([...store.products, duplicate])
    notify(t('تم نسخ العطر', 'Perfume duplicated'))
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090204] px-4 py-10 text-[#F2E9DF]" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md rounded-3xl border border-[#D5BFA8]/20 bg-[#17070d] p-7 shadow-[0_30px_90px_rgba(0,0,0,.5)]">
          <p className="text-center font-['Amiri'] text-5xl text-[#F2E9DF]">مدار</p>
          <p className="mt-1 text-center text-xs tracking-[0.3em] text-[#D5BFA8]">MADAR ADMIN</p>
          <h1 className="mt-8 text-center font-['Readex_Pro'] text-2xl">{t('لوحة تحكم مدار', 'Madar Control Center')}</h1>
          <p className="mt-2 text-center text-sm text-[#A8958B]">{t('يرجى إدخال الرقم السري للمتابعة', 'Enter your admin PIN to continue')}</p>
          <form onSubmit={authenticate} className="mt-6 space-y-3">
            <label htmlFor="admin-pin" className="text-sm text-[#D5BFA8]">{t('الرقم السري', 'Admin PIN')}</label>
            <input id="admin-pin" type="password" autoComplete="current-password" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} className={fieldClass} disabled={remainingLock > 0} />
            {loginError && <p role="alert" className="text-sm text-rose-200">{loginError}</p>}
            {remainingLock > 0 && <p role="timer" className="text-center text-sm text-[#D5BFA8]">{t('إعادة المحاولة خلال', 'Try again in')} {remainingLock}{t(' ثانية', 's')}</p>}
            <button type="submit" disabled={!pin || remainingLock > 0} className="w-full rounded-xl bg-[#F2E9DF] px-4 py-3 font-semibold text-[#140409] disabled:opacity-40">{t('دخول آمن', 'Secure Sign In')}</button>
          </form>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs">
            <button type="button" onClick={() => setLanguage(isArabic ? 'en' : 'ar')} className="text-[#D5BFA8]">{isArabic ? 'English' : 'العربية'}</button>
            <span className="text-[#A8958B]/50">·</span>
            <a href="/" className="inline-flex items-center gap-1 text-[#A8958B]">{t('معاينة المتجر', 'Open Storefront')} <ExternalLink size={12} /></a>
          </div>
          <p className="mt-5 text-center text-[10px] text-[#A8958B]/70">{t('الرقم الافتراضي للتجربة: 2026', 'Demo PIN: 2026')}</p>
        </div>
      </main>
    )
  }

  if (visualEditorOpen) {
    return <AdminStorefrontEditor
      onExit={() => setVisualEditorOpen(false)}
      onLock={lockAdmin}
      onOpenOperations={(nextTab) => {
        setTab(nextTab)
        if (nextTab === 'orders') setOrderFilter('pending')
        setVisualEditorOpen(false)
      }}
    />
  }

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#090204] text-[#F2E9DF]">
      <style>{`@media print { body * { visibility: hidden !important; } .admin-print-sheet, .admin-print-sheet * { visibility: visible !important; } .admin-print-sheet { position: absolute; inset: 0; width: 100%; color: #111 !important; background: #fff !important; padding: 18mm !important; } }`}</style>
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#F2E9DF]/10 bg-[#090204]/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D5BFA8]/40 bg-[#581528]/30 font-['Amiri'] text-2xl">مدار</div>
          <div><p className="text-[9px] tracking-[0.25em] text-[#D5BFA8]">MADAR PERFUMES</p><h1 className="text-sm font-semibold sm:text-base">{t('مركز إدارة مدار', 'MADAR Control Center')}</h1></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setVisualEditorOpen(true)} className="rounded-lg border border-[#D5BFA8]/30 px-3 py-2 text-xs">✎ المحرر البصري</button>
          <button type="button" onClick={() => { setTab('orders'); setOrderFilter('pending') }} className="rounded-lg border border-[#F2E9DF]/15 px-3 py-2 text-xs">📦 الطلبات والشحن ({orderTotals.pending || 0})</button>
          <button type="button" onClick={() => setTab('coupons')} className="rounded-lg border border-[#F2E9DF]/15 px-3 py-2 text-xs">🎟 كوبونات الخصم</button>
          <button type="button" onClick={() => setTab('customers')} className="rounded-lg border border-[#F2E9DF]/15 px-3 py-2 text-xs">👥 العملاء ({customers.length})</button>
          <button type="button" onClick={() => setTab('settings')} className="rounded-lg border border-[#F2E9DF]/15 px-3 py-2 text-xs">⚙ الإعدادات</button>
          <button type="button" onClick={() => setLanguage(isArabic ? 'en' : 'ar')} className="rounded-lg border border-[#F2E9DF]/15 px-3 py-2 text-xs">{isArabic ? 'EN' : 'عربي'}</button>
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#F2E9DF]/15 px-3 py-2 text-xs"><ExternalLink size={14} />{t('معاينة المتجر', 'Open Storefront')}</a>
          <button type="button" onClick={lockAdmin} className="inline-flex items-center gap-2 rounded-lg bg-[#581528] px-3 py-2 text-xs"><LockKeyhole size={14} />{t('قفل لوحة التحكم', 'Lock Admin')}</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1680px] gap-5 p-3 sm:p-5 lg:grid-cols-[245px_1fr] lg:p-8">
        <aside className="h-fit rounded-2xl border border-[#F2E9DF]/10 bg-[#12050a] p-2 lg:sticky lg:top-24">
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
            {TABS.map(([key, ar, en, Icon]) => (
              <button key={key} type="button" onClick={() => setTab(key)} className={`flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-start text-xs transition ${tab === key ? 'bg-[#581528] text-[#F2E9DF]' : 'text-[#A8958B] hover:bg-[#F2E9DF]/5 hover:text-[#F2E9DF]'}`}>
                <Icon size={16} />{t(ar, en)}
              </button>
            ))}
          </nav>
          <div className="mt-3 hidden border-t border-[#F2E9DF]/10 pt-3 lg:block">
            <div className="relative">
              <Search size={15} className="absolute start-3 top-3 text-[#A8958B]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('بحث سريع في اللوحة', 'Search dashboard')} className={`${fieldClass} ps-9 text-xs`} />
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[10px] uppercase tracking-[0.25em] text-[#D5BFA8]">MADAR · ADMIN ERP</p><h2 className="mt-1 font-['Readex_Pro'] text-2xl">{t(TABS.find(([key]) => key === tab)?.[1], TABS.find(([key]) => key === tab)?.[2])}</h2></div>
            <div className="relative w-full sm:max-w-xs lg:hidden"><Search size={15} className="absolute start-3 top-3 text-[#A8958B]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('بحث', 'Search')} className={`${fieldClass} ps-9 text-xs`} /></div>
          </div>

          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <KpiCard title={t('إجمالي المبيعات', 'Total Revenue')} value={formatMoney(revenue)} note={t('الطلبات المؤكدة والمسلّمة', 'Confirmed, shipped & delivered')} />
                <button type="button" onClick={() => { setTab('orders'); setOrderFilter('pending') }} className={`${panelClass} text-start ring-1 ring-rose-300/10`}><p className="text-xs text-[#D5BFA8]">{t('طلبات بانتظار التأكيد', 'Pending Orders')}</p><p className="mt-3 text-3xl font-semibold text-rose-100">{orderTotals.pending || 0}</p><p className="mt-1 text-xs text-[#A8958B]">{t('اضغط لفتح الطلبات', 'Open pending orders')}</p></button>
                <KpiCard title={t('إجمالي الطلبات', 'Total Orders')} value={store.orders.length} note={Object.entries(STATUS_LABELS).map(([status, labels]) => `${t(labels[0], labels[1])} ${orderTotals[status] || 0}`).join(' · ')} />
                <KpiCard title={t('الأكثر مبيعاً', 'Top Selling Perfume')} value={bestProduct ? t(bestProduct.name_ar, bestProduct.name_en) : '—'} note={t('حسب الطلبات، ثم اختيار الإدارة', 'Based on orders or admin selection')} />
                <KpiCard title={t('العطور المتاحة / الأقسام', 'Active Perfumes / Categories')} value={`${store.products.filter((item) => item.active !== false).length} / ${store.categories.length}`} note={t('عطر / قسم', 'perfumes / categories')} />
                <KpiCard title={t('العملاء المسجلون', 'Registered Customers')} value={customers.length} note={t('ملفات العملاء', 'customer profiles')} />
              </div>
              <section className={panelClass}>
                <h3 className="mb-3 text-sm font-semibold text-[#D5BFA8]">{t('اختصارات سريعة', 'Quick Actions')}</h3>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { openNewProduct(); setTab('products') }} className="action-button"><Plus size={15} />{t('إضافة عطر جديد', 'Add perfume')}</button>
                  <button type="button" onClick={() => setTab('coupons')} className="action-button"><Plus size={15} />{t('إنشاء كوبون خصم', 'Create coupon')}</button>
                  <button type="button" onClick={exportOrders} className="action-button"><Download size={15} />{t('تصدير الطلبات CSV', 'Export orders CSV')}</button>
                  <button type="button" onClick={() => setTab('settings')} className="action-button"><Settings size={15} />{t('إعدادات الشحن واللوجو', 'Shipping & logos')}</button>
                </div>
              </section>
              <section className={panelClass}>
                <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-[#D5BFA8]">{t('توزيع حالات الطلبات', 'Order Status Breakdown')}</h3><button type="button" onClick={() => setTab('orders')} className="text-xs text-[#A8958B]">{t('عرض الطلبات', 'View orders')} <ArrowUpRight size={13} className="inline" /></button></div>
                <div className="flex h-3 overflow-hidden rounded-full bg-[#F2E9DF]/10">{Object.entries(STATUS_LABELS).map(([status]) => <div key={status} title={`${status}: ${orderTotals[status] || 0}`} style={{ width: `${store.orders.length ? (orderTotals[status] / store.orders.length) * 100 : 0}%` }} className={status === 'delivered' ? 'bg-emerald-500' : status === 'cancelled' ? 'bg-rose-900' : status === 'pending' ? 'bg-amber-400' : 'bg-[#7A1C37]'} />)}</div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-[#A8958B]">{Object.entries(STATUS_LABELS).map(([status, labels]) => <span key={status}>{t(labels[0], labels[1])}: {orderTotals[status] || 0}</span>)}</div>
              </section>
            </div>
          )}

          {tab === 'orders' && (
            <section className={panelClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{t('الطلبات والشحن', 'Orders & Courier Fulfillment')}</h3><button type="button" onClick={exportOrders} className="action-button"><Download size={15} />CSV</button></div>
              <div className="mb-4 flex flex-wrap gap-2">
                {['all', ...Object.keys(STATUS_LABELS)].map((status) => <button key={status} type="button" onClick={() => setOrderFilter(status)} className={`rounded-full border px-3 py-1.5 text-xs ${orderFilter === status ? 'border-[#D5BFA8]/50 bg-[#581528] text-[#F2E9DF]' : 'border-[#F2E9DF]/10 text-[#A8958B]'}`}>{status === 'all' ? t('الكل', 'All') : t(STATUS_LABELS[status][0], STATUS_LABELS[status][1])} · {status === 'all' ? store.orders.length : orderTotals[status] || 0}</button>)}
              </div>
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <article key={order.id} className="rounded-xl border border-[#F2E9DF]/10 bg-[#100408] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="font-semibold text-[#F2E9DF]">{order.order_number}</p><p className="mt-1 text-xs text-[#A8958B]">{order.customer_name} · {order.customer_phone}</p></div>
                      <select aria-label={t('حالة الطلب', 'Order status')} value={order.status} onChange={(event) => { updateOrderStatus(order.id, event.target.value); notify() }} className="rounded-lg border border-[#F2E9DF]/15 bg-[#17070d] px-3 py-2 text-xs">{Object.entries(STATUS_LABELS).map(([status, labels]) => <option key={status} value={status}>{t(labels[0], labels[1])}</option>)}</select>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-[#A8958B] sm:grid-cols-2"><p>{[order.governorate, order.city, order.address_details].filter(Boolean).join('، ')}</p><p>{(order.items || []).map((item) => `${item.name_ar || item.name} · ${item.size} × ${item.quantity}`).join(' / ')}</p></div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#F2E9DF]/10 pt-3"><strong>{t('تحصيل عند الاستلام', 'COD')}: {formatMoney(order.total)}</strong><div className="flex flex-wrap gap-2"><button type="button" onClick={() => sendOrderWhatsApp(order)} className="action-button"><MessageCircle size={14} />{t('تأكيد واتساب', 'WhatsApp')}</button><button type="button" onClick={() => setPrintOrder(order)} className="action-button"><Printer size={14} />{t('طباعة بوليصة', 'Print waybill')}</button></div></div>
                  </article>
                ))}
                {!filteredOrders.length && <p className="py-8 text-center text-sm text-[#A8958B]">{t('لا توجد طلبات مطابقة.', 'No matching orders.')}</p>}
              </div>
            </section>
          )}

          {tab === 'products' && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-[#A8958B]">{t('إدارة الصور والأداء والأحجام والأسعار من نموذج موحّد.', 'Manage gallery, performance, sizes and pricing in one guided editor.')}</p><button type="button" onClick={openNewProduct} className="action-button bg-[#F2E9DF] text-[#140409]"><Plus size={15} />{t('إضافة عطر', 'Add perfume')}</button></div>
              {store.products.filter((product) => `${product.name_ar} ${product.name_en}`.toLowerCase().includes(search.toLowerCase())).map((product) => (
                <article key={product.id} className={panelClass}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3"><div className="h-14 w-14 rounded-lg bg-[#0b0306] p-1">{product.image_url && <img src={product.image_url} alt="" className="h-full w-full object-contain" />}</div><div><h3 className="font-medium">{t(product.name_ar, product.name_en)}</h3><p className="mt-1 text-[10px] text-[#A8958B]">{product.sizes?.map((size) => size.size).join(' · ')}</p></div></div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { const available = !product.sizes?.some((size) => size.in_stock !== false); updateProducts(store.products.map((item) => item.id === product.id ? { ...item, sizes: item.sizes.map((size) => ({ ...size, in_stock: available })) } : item)); notify() }} className="action-button">{product.sizes?.some((size) => size.in_stock !== false) ? t('متوفر', 'In Stock') : t('غير متوفر', 'Out of Stock')}</button>
                      <button type="button" onClick={() => { updateProducts(store.products.map((item) => ({ ...item, is_top_seller: item.id === product.id }))); notify() }} className={`action-button ${product.is_top_seller ? 'text-[#D5BFA8]' : ''}`}><Sparkles size={14} />{t('الأكثر مبيعاً', 'Top Seller')}</button>
                      <button type="button" aria-label={t('تعديل', 'Edit')} onClick={() => setEditingProduct(structuredClone(product))} className="action-button"><Pencil size={14} />{t('تعديل', 'Edit')}</button>
                      <button type="button" aria-label={t('نسخ العطر', 'Duplicate')} onClick={() => duplicateProduct(product)} className="action-button"><Copy size={14} />{t('نسخ', 'Duplicate')}</button>
                      <button type="button" aria-label={t('حذف العطر', 'Delete perfume')} onClick={() => { if (window.confirm(t('هل تريد حذف هذا العطر؟', 'Delete this perfume?'))) { updateProducts(store.products.filter((item) => item.id !== product.id)); notify() } }} className="action-button text-rose-200"><Trash2 size={14} />{t('حذف', 'Delete')}</button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}

          {tab === 'quiz' && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between gap-2"><p className="text-xs text-[#A8958B]">{t('رتّب الأسئلة وعدّل الأوزان والمنتجات التي توصي بها كل إجابة.', 'Reorder questions and configure answer weights and recommended products.')}</p><button type="button" onClick={() => { addQuestion(); notify() }} className="action-button"><Plus size={14} />{t('إضافة سؤال', 'Add question')}</button></div>
              {store.quiz_questions.map((question, questionIndex) => (
                <section key={question.id} className={`${panelClass} space-y-3`}>
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-[#D5BFA8]">{t('السؤال', 'Question')} {questionIndex + 1}</h3><div className="flex gap-1"><button type="button" disabled={!questionIndex} onClick={() => { const next = [...store.quiz_questions]; [next[questionIndex - 1], next[questionIndex]] = [next[questionIndex], next[questionIndex - 1]]; updateQuizQuestions(next); notify() }} className="action-button">↑</button><button type="button" disabled={questionIndex === store.quiz_questions.length - 1} onClick={() => { const next = [...store.quiz_questions]; [next[questionIndex + 1], next[questionIndex]] = [next[questionIndex], next[questionIndex + 1]]; updateQuizQuestions(next); notify() }} className="action-button">↓</button><button type="button" onClick={() => { updateQuizQuestions(store.quiz_questions.filter((item) => item.id !== question.id)); notify() }} className="action-button text-rose-200"><Trash2 size={14} /></button></div></div>
                  <div className="grid gap-2 md:grid-cols-2"><input aria-label="Question Arabic" value={question.question_ar} onChange={(event) => updateQuestion(question.id, { question_ar: event.target.value })} placeholder="السؤال بالعربية" className={fieldClass} /><input aria-label="Question English" value={question.question_en} onChange={(event) => updateQuestion(question.id, { question_en: event.target.value })} placeholder="Question in English" className={fieldClass} /></div>
                  {(question.options || []).map((option, optionIndex) => (
                    <div key={option.id} className="space-y-2 rounded-xl border border-[#F2E9DF]/10 bg-[#100408] p-3">
                      <div className="flex justify-between text-xs text-[#A8958B]"><span>{t('إجابة', 'Answer')} {optionIndex + 1}</span><button type="button" onClick={() => { updateQuestion(question.id, { options: question.options.filter((item) => item.id !== option.id) }); notify() }}><Trash2 size={14} /></button></div>
                      <div className="grid gap-2 md:grid-cols-2">{[['label_ar', 'نص الإجابة بالعربية'], ['label_en', 'Answer label (English)'], ['desc_ar', 'وصف قصير (اختياري)'], ['desc_en', 'Optional subtitle']].map(([key, label]) => <input key={key} value={option[key] || ''} onChange={(event) => updateOption(question.id, option.id, { [key]: event.target.value })} placeholder={label} className={fieldClass} />)}</div>
                      <label className="flex items-center gap-2 text-xs text-[#A8958B]">{t('وزن الإجابة', 'Answer weight')}<input type="number" min="0.1" step="0.1" value={option.weight ?? 1} onChange={(event) => updateOption(question.id, option.id, { weight: Math.max(0.1, Number(event.target.value) || 1) })} className={`${fieldClass} max-w-24`} /></label>
                      <div className="flex flex-wrap gap-2">{store.products.map((product) => {
                        const selected = (option.recommended_product_ids || []).includes(product.id)
                        return <button key={product.id} type="button" aria-pressed={selected} onClick={() => updateOption(question.id, option.id, { recommended_product_ids: selected ? option.recommended_product_ids.filter((id) => id !== product.id) : [...(option.recommended_product_ids || []), product.id] })} className={`flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] ${selected ? 'border-[#D5BFA8]/50 bg-[#581528]/50 text-[#F2E9DF]' : 'border-[#F2E9DF]/10 text-[#A8958B]'}`}><span className="h-6 w-6 overflow-hidden rounded-full bg-[#0b0306]">{product.image_url && <img src={product.image_url} alt="" className="h-full w-full object-cover" />}</span>{t(product.name_ar, product.name_en)}</button>
                      })}</div>
                    </div>
                  ))}
                  <button type="button" onClick={() => { updateQuestion(question.id, { options: [...(question.options || []), { id: createId('option'), label_ar: '', label_en: '', desc_ar: '', desc_en: '', weight: 1, recommended_product_ids: [] }] }); notify() }} className="action-button"><Plus size={14} />{t('إضافة إجابة', 'Add answer')}</button>
                </section>
              ))}
              <section className={panelClass}>
                <h3 className="font-semibold">{t('تجربة الاختبار الآن', 'Test Quiz Logic')}</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">{store.quiz_questions.map((question) => <label key={question.id} className="grid gap-1 text-xs text-[#A8958B]">{t(question.question_ar, question.question_en)}<select value={quizAnswers[question.id] || ''} onChange={(event) => setQuizAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className={fieldClass}><option value="">{t('اختر إجابة', 'Choose answer')}</option>{question.options?.map((option) => <option key={option.id} value={option.id}>{t(option.label_ar, option.label_en)}</option>)}</select></label>)}</div>
                <p className="mt-4 text-sm text-[#D5BFA8]">{t('العطر الفائز:', 'Winning perfume:')} {quizWinner() ? t(quizWinner().name_ar, quizWinner().name_en) : t('لا توجد عطور بعد', 'No perfumes yet')}</p>
              </section>
            </div>
          )}

          {tab === 'categories' && (
            <div className="space-y-3">
              <button type="button" onClick={() => setEditingCategory({ id: globalThis.crypto?.randomUUID?.() || createId('category'), slug: '', name_ar: '', name_en: '', sort_order: store.categories.length, is_custom: true })} className="action-button"><Plus size={14} />{t('إضافة تصنيف', 'Add category')}</button>
              {store.categories.map((category) => <article key={category.id} className={`${panelClass} flex flex-wrap items-center justify-between gap-3`}><div><h3>{t(category.name_ar, category.name_en)}</h3><p className="mt-1 text-xs text-[#A8958B]">{category.slug} · {store.products.filter((item) => item.category_id === category.id).length} {t('عطور', 'perfumes')}</p></div><div className="flex gap-2"><button type="button" onClick={() => setEditingCategory({ ...category })} className="action-button"><Pencil size={14} />{t('تعديل', 'Edit')}</button>{(category.is_custom || category.id.startsWith('category-')) && <button type="button" onClick={() => { if (window.confirm(t('حذف التصنيف؟', 'Delete category?'))) deleteCategory(category.id) }} className="action-button text-rose-200"><Trash2 size={14} /></button>}</div></article>)}
            </div>
          )}

          {tab === 'coupons' && <CouponsManager coupons={store.coupons} updateCoupons={updateCoupons} notify={notify} language={language} />}

          {tab === 'customers' && (
            <section className={panelClass}>
              <div className="mb-3 flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{t('قاعدة بيانات العملاء', 'Customer CRM')}</h3><input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder={t('بحث بالاسم أو الهاتف أو المحافظة', 'Search name, phone or governorate')} className={`${fieldClass} max-w-sm`} /></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-start text-xs"><thead className="text-[#D5BFA8]"><tr>{['العميل', 'الهاتف', 'العنوان', 'الطلبات', 'الإنفاق', 'الأمنيات', 'WhatsApp'].map((heading) => <th key={heading} className="border-b border-[#F2E9DF]/10 p-3 text-start">{t(heading, heading === 'العميل' ? 'Customer' : heading === 'الهاتف' ? 'Phone' : heading === 'العنوان' ? 'Address' : heading === 'الطلبات' ? 'Orders' : heading === 'الإنفاق' ? 'Spent' : heading === 'الأمنيات' ? 'Wishlist' : heading)}</th>)}</tr></thead><tbody>{filteredCustomers.map((customer) => {
                const customerOrders = store.orders.filter((order) => order.customer_id === customer.id || String(order.customer_phone || '').replace(/\D/g, '').endsWith(String(customer.phone || '').replace(/\D/g, '').slice(-10)))
                const spent = customerOrders.filter((order) => order.status !== 'cancelled').reduce((sum, order) => sum + Number(order.total || 0), 0)
                const phone = `20${String(customer.phone || '').replace(/\D/g, '').replace(/^0/, '')}`
                return <tr key={customer.id} className="border-b border-[#F2E9DF]/5"><td className="p-3">{customer.full_name}</td><td className="p-3">{customer.phone}<br /><span className="text-[#A8958B]">{customer.alt_phone}</span></td><td className="max-w-56 p-3 text-[#A8958B]">{[customer.governorate, customer.city, customer.address_details].filter(Boolean).join('، ')}</td><td className="p-3">{customerOrders.length}</td><td className="p-3">{formatMoney(spent)}</td><td className="p-3">{customer.wishlist?.length || 0}</td><td className="p-3"><a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="text-[#D5BFA8]"><MessageCircle size={16} /></a></td></tr>
              })}</tbody></table></div>
            </section>
          )}

          {tab === 'settings' && (
            <div className="space-y-4">
              <section className={`${panelClass} space-y-3`}>
                <h3 className="font-semibold text-[#D5BFA8]">{t('الشعارات وكلمات العلامة', 'Brand & Wordmarks')}</h3>
                <div className="grid gap-3 md:grid-cols-2">{[['logo_ar_url', 'اللوجو العربي مدار', 'Arabic wordmark'], ['logo_en_url', 'كلمة MADAR الإنجليزية', 'English MADAR wordmark']].map(([key, ar, en]) => <label key={key} className="space-y-2 text-xs text-[#A8958B]">{t(ar, en)}<input value={settingsDraft[key] || ''} onChange={(event) => updateSettingsDraft(key, event.target.value)} placeholder="Image URL or DataURL" className={fieldClass} /><input type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const image = await compressImage(file); updateSettingsDraft(key, image) } catch (error) { notify(error.message) } }} className="block w-full text-xs text-[#A8958B]" />{settingsDraft[key] && <img src={settingsDraft[key]} alt={en} className="h-16 max-w-48 object-contain" />}</label>)}</div>
                <div className="flex items-center gap-3 rounded-xl bg-[#0b0306] p-3"><span className="font-['Amiri'] text-3xl">مدار</span>{settingsDraft.logo_ar_url && <img src={settingsDraft.logo_ar_url} alt="مدار" className="h-8 max-w-24 object-contain" />}<span className="font-bold tracking-widest">{settingsDraft.logo_en_url ? <img src={settingsDraft.logo_en_url} alt="MADAR" className="h-8 max-w-24 object-contain" /> : 'MADAR'}</span></div>
                <h4 className="pt-2 text-sm text-[#D5BFA8]">{t('الشحن والتواصل', 'Shipping & Contact')}</h4>
                <div className="grid gap-2 md:grid-cols-2">{[['shipping_fee', 'رسوم الشحن', 'Shipping fee'], ['free_shipping_threshold', 'حد الشحن المجاني (0 للتعطيل)', 'Free shipping threshold (0 disables)'], ['whatsapp_number', 'رقم واتساب', 'WhatsApp number'], ['instagram_url', 'Instagram URL', 'Instagram URL'], ['facebook_url', 'Facebook URL', 'Facebook URL'], ['tiktok_url', 'TikTok URL', 'TikTok URL']].map(([key, ar, en]) => <label key={key} className="grid gap-1 text-[10px] text-[#A8958B]">{t(ar, en)}<input type={key.includes('fee') || key.includes('threshold') ? 'number' : 'text'} value={settingsDraft[key] ?? ''} onChange={(event) => updateSettingsDraft(key, key.includes('fee') || key.includes('threshold') ? Number(event.target.value) : event.target.value)} className={fieldClass} /></label>)}</div>
                <p className="border-t border-[#F2E9DF]/10 pt-3 text-xs text-[#A8958B]">{t('شعارات العلامة التجارية والعناوين الرسمية ثابتة للحفاظ على الهوية والتصميم.', 'Official brand slogans and section structure are locked to protect the storefront identity.')}</p>
                <button type="button" onClick={() => { updateSettings(settingsDraft); setSettingsChanges({}); notify() }} className="action-button bg-[#F2E9DF] text-[#140409]"><Save size={14} />{t('حفظ إعدادات المتجر', 'Save Store Settings')}</button>
              </section>
              <section className={`${panelClass} space-y-3`}>
                <h3 className="font-semibold text-[#D5BFA8]">{t('الأمان والنسخ الاحتياطي', 'Security & Backup')}</h3>
                <div className="flex flex-wrap gap-2"><input type="password" value={newPin} onChange={(event) => setNewPin(event.target.value)} placeholder={t('PIN جديد (4 أحرف على الأقل)', 'New PIN (4+ characters)')} className={`${fieldClass} max-w-sm`} /><button type="button" onClick={changeAdminPin} className="action-button"><LockKeyhole size={14} />{t('تغيير PIN', 'Change PIN')}</button></div>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={exportBackup} className="action-button"><Download size={14} />{t('تحميل نسخة احتياطية', 'Export Backup JSON')}</button><label className="action-button cursor-pointer"><Upload size={14} />{t('استعادة نسخة احتياطية', 'Import Backup JSON')}<input type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importBackup(file) }} /></label><button type="button" onClick={() => { if (window.confirm(t('سيتم استبدال بيانات المتجر ببيانات البداية. متابعة؟', 'Replace store data with seed data?'))) { resetDemo(); notify(t('تمت إعادة البيانات الافتراضية', 'Default seed restored')) } }} className="action-button text-rose-200"><RotateCcw size={14} />{t('إعادة البيانات الافتراضية', 'Reset Demo Data')}</button></div>
                {importError && <p role="alert" className="text-sm text-rose-200">{importError}</p>}
              </section>
            </div>
          )}
        </main>
      </div>

      {editingProduct && <ProductEditor product={editingProduct} categories={store.categories} onChange={setEditingProduct} onSave={saveProduct} onClose={() => setEditingProduct(null)} language={language} onImage={updateProductImage} />}
      {editingCategory && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><form onSubmit={(event) => { event.preventDefault(); const exists = store.categories.some((item) => item.id === editingCategory.id); updateCategories(exists ? store.categories.map((item) => item.id === editingCategory.id ? editingCategory : item) : [...store.categories, editingCategory]); setEditingCategory(null); notify() }} className={`${panelClass} w-full max-w-md space-y-3`}><div className="flex justify-between"><h3>{t('تحرير التصنيف', 'Edit Category')}</h3><button type="button" onClick={() => setEditingCategory(null)}><X size={18} /></button></div><input required value={editingCategory.slug} onChange={(event) => setEditingCategory((current) => ({ ...current, slug: event.target.value }))} placeholder="slug" className={fieldClass} /><input required value={editingCategory.name_ar} onChange={(event) => setEditingCategory((current) => ({ ...current, name_ar: event.target.value }))} placeholder="اسم التصنيف" className={fieldClass} /><input required value={editingCategory.name_en} onChange={(event) => setEditingCategory((current) => ({ ...current, name_en: event.target.value }))} placeholder="Category name" className={fieldClass} /><button type="submit" className="action-button"><Save size={14} />{t('حفظ', 'Save')}</button></form></div>}
      {toast && <div role="status" className="fixed bottom-5 start-1/2 z-[80] -translate-x-1/2 rounded-full border border-[#D5BFA8]/30 bg-[#581528] px-5 py-3 text-sm shadow-lg">{toast}</div>}
      {storeSyncError && <div role="alert" className="fixed bottom-20 start-1/2 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-rose-200/30 bg-[#3b101d] px-5 py-3 text-sm text-rose-100 shadow-lg">{storeSyncError}<button type="button" onClick={clearStoreSyncError} aria-label="إغلاق">×</button></div>}
      {printOrder && <OrderPrintSheet order={printOrder} />}
    </div>
  )
}

function KpiCard({ title, value, note }) {
  return <article className={panelClass}><p className="text-xs text-[#D5BFA8]">{title}</p><p className="mt-3 truncate text-2xl font-semibold">{value}</p><p className="mt-2 line-clamp-2 text-[10px] text-[#A8958B]">{note}</p></article>
}

function OrderPrintSheet({ order }) {
  const orderNumber = String(order.order_number || order.id || 'MADAR')
  const bars = Array.from({ length: 64 }, (_, index) => ((orderNumber.charCodeAt(index % orderNumber.length) + index * 13) % 4) + 1)
  return (
    <article className="admin-print-sheet hidden print:block">
      <header className="mb-6 flex items-start justify-between border-b-2 border-black pb-4">
        <div><p className="font-['Amiri'] text-4xl">مدار</p><p className="tracking-[0.3em]">MADAR PERFUMES</p></div>
        <div className="text-end"><h1 className="text-2xl font-bold">بوليصة شحن / فاتورة</h1><p className="mt-2 text-xl font-bold">{orderNumber}</p><p>{new Date(order.created_at).toLocaleString('ar-EG')}</p></div>
      </header>
      <div className="mb-5 flex h-12 items-stretch justify-center gap-[2px]" aria-label={`Barcode ${orderNumber}`}>
        {bars.map((width, index) => <span key={index} style={{ width: `${width}px`, backgroundColor: '#111' }} />)}
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 border p-4">
        <p><b>اسم العميل:</b> {order.customer_name}</p><p><b>الهاتف:</b> {order.customer_phone}</p>
        <p><b>هاتف بديل:</b> {order.customer_alt_phone || '—'}</p><p><b>المحافظة:</b> {order.governorate || '—'}</p>
        <p className="col-span-2"><b>العنوان:</b> {[order.city, order.address_details].filter(Boolean).join('، ')}</p>
        <p className="col-span-2"><b>ملاحظات:</b> {order.notes || '—'}</p>
      </div>
      <table className="w-full border-collapse text-start">
        <thead><tr>{['المنتج', 'الحجم', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map((cell) => <th key={cell} className="border p-2 text-start">{cell}</th>)}</tr></thead>
        <tbody>{order.items?.map((item, index) => <tr key={`${item.name}-${index}`}>{[item.name_ar || item.name, item.size, item.quantity, formatMoney(item.price), formatMoney(item.price * item.quantity)].map((cell, cellIndex) => <td key={cellIndex} className="border p-2">{cell}</td>)}</tr>)}</tbody>
      </table>
      <div className="mt-6 border-2 border-black p-5 text-end text-2xl font-bold">المبلغ المطلوب تحصيله عند الاستلام: {formatMoney(order.total)}</div>
    </article>
  )
}

function CouponsManager({ coupons, updateCoupons, notify, language }) {
  const t = (ar, en) => text(language, ar, en)
  const [draft, setDraft] = useState({ id: '', code: '', title_ar: '', title_en: '', discount_type: 'percentage', discount_value: 10, min_order_amount: 0, active: true })
  const save = () => {
    if (!draft.code.trim()) return notify(t('أدخل كود الكوبون.', 'Enter a coupon code.'))
    const existing = coupons.some((coupon) => coupon.id === draft.id)
    updateCoupons(existing ? coupons.map((coupon) => coupon.id === draft.id ? draft : coupon) : [...coupons, { ...draft, id: globalThis.crypto?.randomUUID?.() || createId('coupon') }])
    setDraft({ id: '', code: '', title_ar: '', title_en: '', discount_type: 'percentage', discount_value: 10, min_order_amount: 0, active: true })
    notify()
  }
  return (
    <div className="space-y-4">
      <section className={`${panelClass} grid gap-2 md:grid-cols-3`}>
        <input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="Coupon code" className={fieldClass} />
        <input value={draft.title_ar} onChange={(event) => setDraft((current) => ({ ...current, title_ar: event.target.value }))} placeholder="وصف بالعربية" className={fieldClass} />
        <input value={draft.title_en} onChange={(event) => setDraft((current) => ({ ...current, title_en: event.target.value }))} placeholder="Description in English" className={fieldClass} />
        <select value={draft.discount_type} onChange={(event) => setDraft((current) => ({ ...current, discount_type: event.target.value }))} className={fieldClass}><option value="percentage">{t('نسبة مئوية', 'Percent')}</option><option value="fixed">{t('مبلغ ثابت', 'Fixed amount')}</option></select>
        <input type="number" min="0" value={draft.discount_value} onChange={(event) => setDraft((current) => ({ ...current, discount_value: Number(event.target.value) }))} placeholder={t('قيمة الخصم', 'Discount value')} className={fieldClass} />
        <input type="number" min="0" value={draft.min_order_amount} onChange={(event) => setDraft((current) => ({ ...current, min_order_amount: Number(event.target.value) }))} placeholder={t('الحد الأدنى للطلب', 'Minimum order')} className={fieldClass} />
        <button type="button" onClick={save} className="action-button md:col-span-3"><Save size={14} />{draft.id ? t('حفظ التعديل', 'Save edit') : t('إضافة كوبون', 'Add coupon')}</button>
      </section>
      {coupons.map((coupon) => <article key={coupon.id} className={`${panelClass} flex flex-wrap items-center justify-between gap-3`}><div><h3 className="font-mono font-semibold">{coupon.code}</h3><p className="mt-1 text-xs text-[#A8958B]">{coupon.title_ar || coupon.title_en} · {coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : ' ج.م'} · حد أدنى {formatMoney(coupon.min_order_amount)}</p></div><div className="flex gap-2"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(coupon.code); notify(t('تم نسخ الكود', 'Code copied')) } catch (error) { notify(error.message || t('تعذر نسخ الكود.', 'Could not copy coupon code.')) } }} className="action-button"><Copy size={14} /></button><button type="button" onClick={() => { setDraft({ ...coupon }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="action-button"><Pencil size={14} /></button><button type="button" onClick={() => { updateCoupons(coupons.map((item) => item.id === coupon.id ? { ...item, active: !item.active } : item)); notify() }} className="action-button">{coupon.active ? t('مفعّل', 'Active') : t('معطّل', 'Inactive')}</button><button type="button" onClick={() => { if (window.confirm(t('حذف الكوبون؟', 'Delete coupon?'))) { updateCoupons(coupons.filter((item) => item.id !== coupon.id)); notify() } }} className="action-button text-rose-200"><Trash2 size={14} /></button></div></article>)}
    </div>
  )
}

function ProductEditor({ product, categories, onChange, onSave, onClose, language, onImage }) {
  const t = (ar, en) => text(language, ar, en)
  const update = (patch) => onChange((current) => ({ ...current, ...patch }))
  const updateSize = (index, patch) => update({ sizes: product.sizes.map((size, sizeIndex) => sizeIndex === index ? { ...size, ...patch } : size) })
  const addSize = () => update({ sizes: [...product.sizes, { size: '30ml', price: 0, compare_price: 0, in_stock: true }] })
  const calc = (index, percent) => {
    const size = product.sizes[index]
    const real = Number(size.price || 0)
    updateSize(index, { compare_price: Math.ceil((real / (1 - percent / 100)) / 5) * 5 })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-5">
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#D5BFA8]/20 bg-[#140409]">
        <header className="flex items-center justify-between border-b border-[#F2E9DF]/10 px-4 py-3"><div><h2 className="font-semibold">{t('محرر العطر', 'Perfume Editor')}</h2><p className="text-[10px] text-[#A8958B]">{t('أربعة أقسام واضحة لإدارة بيانات المنتج', 'Four guided product setup sections')}</p></div><button type="button" onClick={onClose} aria-label="Close editor"><X size={20} /></button></header>
        <div className="overflow-y-auto p-3 sm:p-5">
          <section className={`${panelClass} mb-4 space-y-3`}>
            <h3 className="text-sm font-semibold text-[#D5BFA8]">01 · {t('البيانات الأساسية', 'Basic Info')}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-xs text-[#A8958B]">{t('اسم العطر بالعربية', 'Perfume name (Arabic)')}<input value={product.name_ar || ''} onChange={(event) => update({ name_ar: event.target.value })} className={fieldClass} /></label>
              <label className="grid gap-1 text-xs text-[#A8958B]">{t('اسم العطر بالإنجليزية', 'Perfume name (English)')}<input value={product.name_en || ''} onChange={(event) => update({ name_en: event.target.value })} className={fieldClass} /></label>
              <label className="grid gap-1 text-xs text-[#A8958B]">{t('وصف العطر بالعربية', 'Description (Arabic)')}<textarea value={product.description_ar || ''} onChange={(event) => update({ description_ar: event.target.value })} className={`${fieldClass} min-h-24`} /></label>
              <label className="grid gap-1 text-xs text-[#A8958B]">{t('وصف العطر بالإنجليزية', 'Description (English)')}<textarea value={product.description_en || ''} onChange={(event) => update({ description_en: event.target.value })} className={`${fieldClass} min-h-24`} /></label>
              <label className="grid gap-1 text-xs text-[#A8958B]">{t('التصنيف', 'Category')}<select value={product.category_id || ''} onChange={(event) => update({ category_id: event.target.value })} className={fieldClass}>{categories.map((category) => <option key={category.id} value={category.id}>{t(category.name_ar, category.name_en)}</option>)}</select></label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={product.active !== false} onChange={(event) => update({ active: event.target.checked })} />{t('إظهار العطر في المتجر', 'Active on storefront')}</label>
            </div>
          </section>
          <section className={`${panelClass} mb-4 space-y-3`}>
            <h3 className="text-sm font-semibold text-[#D5BFA8]">02 · {t('صور المنتج من 3 زوايا', 'Three-Angle Gallery')}</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['01 · Front', 'الزاوية الأمامية'],
                ['02 · Side', 'الزاوية الجانبية'],
                ['03 · Box & Detail', 'العبوة والتفاصيل'],
              ].map(([label, ar], index) => (
                <div key={label} className="space-y-2 rounded-xl border border-[#F2E9DF]/10 bg-[#100408] p-3">
                  <p className="text-xs text-[#D5BFA8]">{ar} · {label}</p>
                  <input
                    aria-label={`${label} image URL`}
                    value={product.gallery_images?.[index] || ''}
                    onChange={(event) => {
                      const gallery = [...(product.gallery_images || ['', '', ''])]
                      gallery[index] = event.target.value
                      update({ gallery_images: gallery, ...(index === 0 ? { image_url: gallery[0] } : {}) })
                    }}
                    placeholder="Image URL"
                    className={fieldClass}
                  />
                  <label className="action-button w-full cursor-pointer justify-center">
                    <Upload size={14} />{t('رفع صورة', 'Upload image')}
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void onImage(index, file) }} />
                  </label>
                  <div className="flex h-28 items-center justify-center rounded-lg bg-[#090204]">
                    {product.gallery_images?.[index] ? <img src={product.gallery_images[index]} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-[#A8958B]">{t('معاينة الصورة', 'Image preview')}</span>}
                  </div>
                  <button type="button" onClick={() => { const gallery = [...(product.gallery_images || ['', '', ''])]; gallery[index] = ''; update({ gallery_images: gallery, ...(index === 0 ? { image_url: '' } : {}) }) }} className="text-[10px] text-[#A8958B]">{t('مسح الصورة', 'Clear image')}</button>
                </div>
              ))}
            </div>
          </section>
          <section className={`${panelClass} mb-4 space-y-3`}>
            <h3 className="text-sm font-semibold text-[#D5BFA8]">03 · {t('قوة الأداء والثبات', 'Longevity & Sillage')}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-xs text-[#A8958B]">longevity_label_ar<input value={product.longevity_label_ar || ''} onChange={(event) => update({ longevity_label_ar: event.target.value })} className={fieldClass} /></label>
              <label className="grid gap-1 text-xs text-[#A8958B]">longevity_label_en<input value={product.longevity_label_en || ''} onChange={(event) => update({ longevity_label_en: event.target.value })} className={fieldClass} /></label>
              {[
                ['longevity_percent', 'الثبات / Longevity'],
                ['sillage_percent', 'الفوحان / Sillage'],
              ].map(([key, label]) => (
                <label key={key} className="grid gap-2 text-xs text-[#A8958B]">{label}<div className="flex items-center gap-3"><input type="range" min="0" max="100" value={product[key] ?? product.sillage ?? 80} onChange={(event) => update({ [key]: Number(event.target.value) })} className="w-full accent-[#D5BFA8]" /><span>{product[key] ?? 80}%</span></div></label>
              ))}
            </div>
          </section>
          <section className={`${panelClass} space-y-3`}>
            <h3 className="text-sm font-semibold text-[#D5BFA8]">04 · {t('الأحجام وحاسبة الخصم', 'Sizes & Smart Discount Calculator')}</h3>
            {product.sizes.map((size, index) => {
              const price = Number(size.price || 0)
              const compare = Number(size.compare_price || 0)
              const discount = compare > price ? Math.round((compare - price) / compare * 100) : 0
              return (
                <div key={`${size.size}-${index}`} className="space-y-2 rounded-xl border border-[#F2E9DF]/10 bg-[#100408] p-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input aria-label="Size name" value={size.size} onChange={(event) => updateSize(index, { size: event.target.value })} placeholder="50ml" className={fieldClass} />
                    <label className="grid gap-1 text-[10px] text-[#A8958B]">السعر الحقيقي للبيع<input type="number" min="0" value={size.price} onChange={(event) => updateSize(index, { price: Number(event.target.value) })} className={fieldClass} /></label>
                    <label className="grid gap-1 text-[10px] text-[#A8958B]">السعر قبل الخصم<input type="number" min="0" value={size.compare_price} onChange={(event) => updateSize(index, { compare_price: Number(event.target.value) })} className={fieldClass} /></label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[15, 25, 35].map((percent) => <button key={percent} type="button" onClick={() => calc(index, percent)} className="action-button">+{percent}% {t('خصم وهمي', 'markup')}</button>)}
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={size.in_stock !== false} onChange={(event) => updateSize(index, { in_stock: event.target.checked })} />{t('متوفر', 'In Stock')}</label>
                    <button type="button" onClick={() => update({ sizes: product.sizes.filter((_, sizeIndex) => sizeIndex !== index) })} className="action-button text-rose-200"><Trash2 size={13} />{t('حذف الحجم', 'Remove size')}</button>
                  </div>
                  <p className="text-xs text-[#D5BFA8]">{discount ? `سيظهر للعميل: ${formatMoney(compare)} (مشطوب) ← ${formatMoney(price)} (خصم ${discount}%)` : `${t('السعر الحالي', 'Current price')}: ${formatMoney(price)}`}</p>
                </div>
              )
            })}
            <button type="button" onClick={addSize} className="action-button"><Plus size={14} />{t('إضافة حجم', 'Add size')}</button>
          </section>
        </div>
        <footer className="flex justify-end gap-2 border-t border-[#F2E9DF]/10 p-3"><button type="button" onClick={onClose} className="action-button">{t('إلغاء', 'Cancel')}</button><button type="button" onClick={onSave} className="action-button bg-[#F2E9DF] text-[#140409]"><Save size={14} />{t('حفظ العطر', 'Save Perfume')}</button></footer>
      </div>
    </div>
  )
}

export default function AdminApp() {
  return <AppProvider><AdminAppContent /></AppProvider>
}

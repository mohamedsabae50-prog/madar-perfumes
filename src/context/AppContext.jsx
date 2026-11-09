import { useCallback, useEffect, useMemo, useState } from 'react'
import dataService from '../services/dataService'
import { AppContext } from './AppContextBase'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

const STORAGE_KEYS = {
  language: 'madar_language',
  cart: 'madar_cart',
  coupon: 'madar_coupon',
}

const defaultCart = []

export function AppProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'ar'
    return localStorage.getItem(STORAGE_KEYS.language) || 'ar'
  })
  const [store, setStore] = useState({
    categories: [],
    products: [],
    quiz_questions: [],
    coupons: [],
    settings: { ...dataService.getDefaultState().settings },
    orders: [],
  })
  const [storeSyncError, setStoreSyncError] = useState('')
  const [cart, setCart] = useState(() => {
    if (typeof window === 'undefined') return defaultCart
    const saved = localStorage.getItem(STORAGE_KEYS.cart)
    try {
      const restored = saved ? JSON.parse(saved) : defaultCart
      return Array.isArray(restored)
        ? restored.map((item) => {
            if (typeof item.size !== 'object' || item.size === null) return item
            return {
              ...item,
              id: `${item.product_id}-${item.size.size}`,
              size: item.size.size,
              price: Number(item.price ?? item.size.price ?? 0),
            }
          })
        : defaultCart
    } catch {
      return defaultCart
    }
  })
  const [selectedCoupon, setSelectedCoupon] = useState(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem(STORAGE_KEYS.coupon)
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [customers, setCustomers] = useState([])
  const [currentCustomer, setCurrentCustomer] = useState(() => dataService.getCurrentCustomer())
  const [wishlist, setWishlist] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = JSON.parse(localStorage.getItem('madar_wishlist_v1') || '[]')
      return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []
    } catch {
      return []
    }
  })

  const refreshFromSupabase = useCallback(async () => {
    try {
      const nextState = await dataService.loadStoreState()
      setStore(nextState)
      setCustomers(nextState.customers || [])
      return nextState
    } catch (error) {
      console.error('Unable to refresh store data:', error)
      setStoreSyncError(error.message || 'تعذر تحديث بيانات المتجر.')
      return null
    }
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      await refreshFromSupabase()
      const savedCustomer = dataService.getCurrentCustomer()
      setCurrentCustomer(savedCustomer)
      if (savedCustomer) setWishlist(savedCustomer.wishlist || [])
    }

    void bootstrap()
  }, [refreshFromSupabase])

  useEffect(() => {
    const applyStorePayload = (raw) => {
      try {
        const nextState = JSON.parse(raw)
        if (!nextState || typeof nextState !== 'object') throw new Error('Stored store state is not an object.')
        setStore({ ...dataService.getDefaultState(), ...nextState })
        setCustomers(Array.isArray(nextState.customers) ? nextState.customers : [])
      } catch (error) {
        console.error('Unable to sync store changes:', error)
      }
    }
    const syncStore = (event) => {
      if (event.key !== 'madar_store_v10' || !event.newValue) return
      applyStorePayload(event.newValue)
    }
    const refreshVisibleStore = () => {
      if (document.visibilityState === 'visible') void refreshFromSupabase()
    }
    let channel
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('madar_live_sync')
      channel.addEventListener('message', (event) => {
        if (event.data?.type === 'store-update' && event.data.state) {
          setStore({ ...dataService.getDefaultState(), ...event.data.state })
          setCustomers(Array.isArray(event.data.state.customers) ? event.data.state.customers : [])
        }
      })
    }
    let realtimeChannel = null
    if (hasSupabaseConfig && supabase) {
      realtimeChannel = supabase
        .channel('madar-live-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          void refreshFromSupabase()
        })
        .subscribe((status, error) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const message = error?.message || `Supabase Realtime subscription ${status.toLowerCase()}.`
            console.error('Unable to subscribe to Supabase Realtime:', message)
            setStoreSyncError(message)
          }
        })
    }
    window.addEventListener('storage', syncStore)
    window.addEventListener('focus', refreshVisibleStore)
    document.addEventListener('visibilitychange', refreshVisibleStore)
    return () => {
      window.removeEventListener('storage', syncStore)
      window.removeEventListener('focus', refreshVisibleStore)
      document.removeEventListener('visibilitychange', refreshVisibleStore)
      channel?.close()
      if (realtimeChannel) void supabase?.removeChannel(realtimeChannel)
    }
  }, [refreshFromSupabase])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem(STORAGE_KEYS.language, language)
  }, [language])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('madar_wishlist_v1', JSON.stringify(wishlist))
  }, [wishlist])

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * (item.quantity || 1), 0),
    [cart],
  )

  const activeCoupon = selectedCoupon && Number(selectedCoupon.min_order_amount) <= subtotal
    ? selectedCoupon
    : null

  useEffect(() => {
    if (activeCoupon) {
      localStorage.setItem(STORAGE_KEYS.coupon, JSON.stringify(activeCoupon))
    } else {
      localStorage.removeItem(STORAGE_KEYS.coupon)
    }
  }, [activeCoupon])

  const discountAmount = useMemo(() => {
    if (!activeCoupon) return 0
    if (activeCoupon.discount_type === 'percentage') {
      return (subtotal * Number(activeCoupon.discount_value)) / 100
    }
    return Math.min(Number(activeCoupon.discount_value), subtotal)
  }, [activeCoupon, subtotal])

  const freeShippingThreshold = Number(store.settings?.free_shipping_threshold || 0)
  const shippingFee = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold
    ? 0
    : Number(store.settings?.shipping_fee ?? 50)
  const total = Math.max(0, subtotal + shippingFee - discountAmount)

  const addToCart = (product, selectedSize) => {
    if (!product || !selectedSize) return
    if (selectedSize.in_stock === false) return

    const sizeName = typeof selectedSize === 'string' ? selectedSize : selectedSize.size
    const sizeDetails = typeof selectedSize === 'string'
      ? product.sizes?.find((size) => size.size === selectedSize)
      : selectedSize
    if (!sizeName || !sizeDetails) return

    setCart((current) => {
      const next = [...current]
      const itemIndex = next.findIndex(
        (item) => item.product_id === product.id && item.size === sizeName,
      )

      if (itemIndex >= 0) {
        next[itemIndex].quantity += 1
        return next
      }

      return [
        ...next,
        {
          id: `${product.id}-${sizeName}`,
          product_id: product.id,
          name: product.name_en,
          name_ar: product.name_ar,
          size: sizeName,
          price: Number(sizeDetails.price ?? product.sizes[0]?.price ?? 0),
          image: product.image_url,
          quantity: 1,
        },
      ]
    })
  }

  const updateCartQuantity = (id, delta) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const removeFromCart = (id) => {
    setCart((current) => current.filter((item) => item.id !== id))
  }

  const clearCart = () => {
    setCart(defaultCart)
    setSelectedCoupon(null)
  }

  const toggleWishlist = (productId) => {
    setWishlist((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId])
  }

  const persistCustomerWishlist = async (ids) => {
    if (!currentCustomer) return
    try {
      const updatedCustomer = await dataService.updateCustomerProfile(currentCustomer.id, { wishlist: ids })
      setCurrentCustomer(updatedCustomer)
    } catch (error) {
      console.error('Unable to sync customer wishlist:', error)
    }
  }

  const toggleCustomerWishlist = (productId) => {
    setWishlist((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
      void persistCustomerWishlist(next)
      return next
    })
  }

  const removeFromWishlist = (productId) => {
    setWishlist((current) => {
      const next = current.filter((id) => id !== productId)
      void persistCustomerWishlist(next)
      return next
    })
  }

  const applyCouponCode = (code) => {
    const match = store.coupons.find(
      (coupon) => coupon.code.toUpperCase() === String(code).toUpperCase() && coupon.active,
    )

    if (!match) return 'invalid'
    if (Number(match.min_order_amount) > subtotal) return 'minimum'

    setSelectedCoupon(match)
    return 'applied'
  }

  const clearCoupon = () => setSelectedCoupon(null)

  const placeOrder = async (formValues) => {
    const order = {
      id: globalThis.crypto?.randomUUID?.() || `order-${Date.now()}`,
      order_number: `MDR-${Math.floor(Math.random() * 9000 + 1000)}`,
      customer_id: formValues.customer_id || currentCustomer?.id || null,
      customer_name: formValues.customer_name,
      customer_phone: formValues.customer_phone,
      customer_alt_phone: formValues.customer_alt_phone || '',
      governorate: formValues.governorate,
      city: formValues.city,
      address_details: formValues.address_details,
      notes: formValues.notes || '',
      items: cart.map((item) => ({
        product_id: item.product_id,
        name: item.name,
        name_ar: item.name_ar,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      coupon_code: activeCoupon?.code || '',
      discount_amount: discountAmount,
      shipping_fee: shippingFee,
      total,
      payment_method: 'COD',
      status: 'pending',
      created_at: new Date().toISOString(),
    }

    const saved = await dataService.saveOrder(order)
    setStore(saved.state)
    clearCart()
    return saved.order
  }

  const registerCustomer = async (values) => {
    const customer = await dataService.registerCustomer(values)
    setCurrentCustomer(customer)
    setWishlist(customer.wishlist || [])
    const nextCustomers = await dataService.listCustomers()
    setCustomers(nextCustomers)
    return customer
  }

  const loginCustomer = async (phone, password) => {
    const customer = await dataService.loginCustomer(phone, password)
    setCurrentCustomer(customer)
    setWishlist(customer.wishlist || [])
    const nextCustomers = await dataService.listCustomers()
    setCustomers(nextCustomers)
    return customer
  }

  const updateCustomerProfile = async (updates) => {
    if (!currentCustomer) throw new Error('سجل الدخول لتعديل بيانات الحساب.')
    const customer = await dataService.updateCustomerProfile(currentCustomer.id, updates)
    setCurrentCustomer(customer)
    setCustomers((items) => items.map((item) => item.id === customer.id ? customer : item))
    if (updates.wishlist) setWishlist(updates.wishlist)
    return customer
  }

  const logoutCustomer = () => {
    dataService.logoutCustomer()
    setCurrentCustomer(null)
  }

  const updateOrderStatus = (orderId, status) => {
    const next = { ...store }
    next.orders = next.orders.map((order) =>
      order.id === orderId ? { ...order, status } : order,
    )
    setStore(next)
    void dataService.saveOrderStatus(orderId, status).catch((error) => {
      console.error('Unable to update order status:', error)
      setStoreSyncError(error.message || 'تعذر تحديث حالة الطلب.')
    })
  }

  const updateSettings = (nextSettings) => {
    const next = { ...store, settings: nextSettings }
    setStore(next)
    dataService.updateLocalState(next)
    void dataService.saveSettings(nextSettings).catch((error) => {
      console.error('Unable to save store settings:', error)
      setStoreSyncError(error.message || 'تعذر حفظ إعدادات المتجر.')
    })
  }

  const updateProducts = (nextProducts) => {
    const next = { ...store, products: nextProducts }
    setStore(next)
    void dataService.saveProductList(nextProducts).catch((error) => {
      console.error('Unable to save products:', error)
      setStoreSyncError(error.message || 'تعذر حفظ العطور.')
    })
  }

  const updateQuizQuestions = (nextQuestions) => {
    const next = { ...store, quiz_questions: nextQuestions }
    setStore(next)
    void dataService.saveQuizQuestions(nextQuestions).catch((error) => {
      console.error('Unable to save scent quiz questions:', error)
      setStoreSyncError(error.message || 'تعذر حفظ أسئلة الاختبار.')
    })
  }

  const updateCategories = (nextCategories) => {
    const next = { ...store, categories: nextCategories }
    setStore(next)
    void dataService.saveCategoryList(nextCategories).catch((error) => {
      console.error('Unable to save categories:', error)
      setStoreSyncError(error.message || 'تعذر حفظ الأقسام.')
    })
  }

  const updateCoupons = (nextCoupons) => {
    const next = { ...store, coupons: nextCoupons }
    setStore(next)
    void dataService.saveCouponList(nextCoupons).catch((error) => {
      console.error('Unable to save coupons:', error)
      setStoreSyncError(error.message || 'تعذر حفظ الكوبونات.')
    })
  }

  const resetDemo = () => {
    const next = dataService.resetDemoData()
    setStore(next)
    setCustomers(next.customers || [])
    setCurrentCustomer(null)
    setWishlist([])
    setCart(defaultCart)
    setSelectedCoupon(null)
  }

  const replaceStoreState = (nextState) => {
    const normalized = { ...dataService.getDefaultState(), ...nextState }
    dataService.updateLocalState(normalized)
    setStore(normalized)
    setCustomers(normalized.customers || [])
  }

  const value = {
    language,
    setLanguage,
    cart,
    wishlist,
    currentCustomer,
    customers,
    subtotal,
    discountAmount,
    shippingFee,
    total,
    activeCoupon,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleWishlist,
    toggleCustomerWishlist,
    removeFromWishlist,
    applyCouponCode,
    clearCoupon,
    placeOrder,
    registerCustomer,
    loginCustomer,
    updateCustomerProfile,
    logoutCustomer,
    store,
    storeSyncError,
    clearStoreSyncError: () => setStoreSyncError(''),
    updateProducts,
    updateQuizQuestions,
    updateCategories,
    updateCoupons,
    updateSettings,
    updateOrderStatus,
    resetDemo,
    replaceStoreState,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

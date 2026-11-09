import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Banknote,
  CheckCircle2,
  Clock,
  Globe,
  Heart,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Moon,
  Plus,
  Package,
  RefreshCw,
  Search,
  Save,
  ShoppingBag,
  Sun,
  Trash2,
  Truck,
  User,
  UserPlus,
  Wind,
  X,
} from 'lucide-react'
import { AppProvider } from './context/AppContext'
import { useAppContext } from './context/useAppContext'

const navItems = [
  { key: 'home', ar: 'الرئيسية', en: 'Home' },
  { key: 'iconic', ar: 'العطر الأيقوني', en: 'The Icon' },
  { key: 'collection', ar: 'مجموعة العطور', en: 'Collection' },
  { key: 'quiz', ar: 'اعرف عطرك المناسب', en: 'Find Your Scent' },
]

const governorates = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'المنيا', 'الشرقية',
  'الغربية', 'الفيوم', 'المنوفية', 'القليوبية', 'دمياط', 'بورسعيد', 'الإسماعيلية',
  'السويس', 'أسوان', 'الأقصر', 'الوادي الجديد', 'بني سويف', 'سوهاج', 'قنا', 'مطروح',
  'شمال سيناء', 'جنوب سيناء', 'كفر الشيخ', 'أسيوط', 'البحيرة',
]

function formatMoney(value, lang) {
  const amount = Number(value || 0)
  return `${amount.toLocaleString('en-US')} ${lang === 'ar' ? 'ج.م' : 'EGP'}`
}

function DiscountPrice({ size, language, className = '' }) {
  const price = Number(size?.price || 0)
  const comparePrice = Number(size?.compare_price || 0)
  const discount = comparePrice > price && comparePrice > 0
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : 0

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {discount > 0 && (
        <span className="border border-[#D5BFA8]/40 bg-[#581528] px-2 py-1 text-[10px] font-semibold text-[#F2E9DF]">
          {language === 'ar' ? `خصم ${discount}%` : `SAVE ${discount}%`}
        </span>
      )}
      {discount > 0 && <span className="text-sm text-[#B8AAA0]/70 line-through">{formatMoney(comparePrice, language)}</span>}
      <span className="font-['Cormorant_Garamond'] text-3xl font-bold text-[#F2E9DF]">{formatMoney(price, language)}</span>
    </div>
  )
}

function getQuizRecommendations(questions, answers, products) {
  const scores = new Map()
  questions.forEach((question) => {
    const option = question.options?.find((item) => item.id === answers[question.id])
    if (!option) return
    const weight = Number(option.weight) > 0 ? Number(option.weight) : 1
    ;(option.recommended_product_ids || []).forEach((productId) => {
      scores.set(productId, (scores.get(productId) || 0) + weight)
    })
  })

  const activeProducts = products.filter((product) => product.active !== false)
  const highestScore = Math.max(0, ...activeProducts.map((product) => scores.get(product.id) || 0))
  if (highestScore) return activeProducts.filter((product) => (scores.get(product.id) || 0) === highestScore)

  const selectedOptions = questions
    .map((question) => question.options?.find((option) => option.id === answers[question.id]))
    .filter(Boolean)
  const preferences = selectedOptions
    .flatMap((option) => [option.label_ar, option.label_en, option.desc_ar, option.desc_en])
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const keywords = [
    { terms: ['عود', 'oud', 'خشب', 'wood', 'amber', 'عنبر'], productTerms: ['عود', 'oud', 'amber', 'عنبر', 'wood', 'خشب'] },
    { terms: ['fresh', 'انتعاش', 'حمضيات', 'citrus', 'مسك', 'musk'], productTerms: ['fresh', 'انتعاش', 'حمضيات', 'citrus', 'مسك', 'musk'] },
    { terms: ['vanilla', 'فانيليا', 'warm', 'دافئ', 'spice', 'توابل'], productTerms: ['vanilla', 'فانيليا', 'warm', 'دافئ', 'spice', 'توابل'] },
    { terms: ['rose', 'ورد', 'floral', 'زهور'], productTerms: ['rose', 'ورد', 'floral', 'زهور'] },
  ]
  const keywordScores = new Map()
  keywords.filter(({ terms }) => terms.some((term) => preferences.includes(term))).forEach(({ productTerms }) => {
    activeProducts.forEach((product) => {
      const description = [
        product.name_ar, product.name_en, product.subtitle_ar, product.subtitle_en, product.scent_vibe,
        ...(product.top_notes_ar || []), ...(product.top_notes_en || []),
        ...(product.heart_notes_ar || []), ...(product.heart_notes_en || []),
        ...(product.base_notes_ar || []), ...(product.base_notes_en || []),
      ].join(' ').toLowerCase()
      const matches = productTerms.filter((term) => description.includes(term)).length
      if (matches) keywordScores.set(product.id, (keywordScores.get(product.id) || 0) + matches)
    })
  })
  const bestKeywordScore = Math.max(0, ...keywordScores.values())
  if (bestKeywordScore) return activeProducts.filter((product) => keywordScores.get(product.id) === bestKeywordScore)
  return [activeProducts.find((product) => product.is_top_seller || product.featured) || activeProducts[0]].filter(Boolean)
}

function renderText(lang, ar, en) {
  return lang === 'ar' ? ar : en
}

function checkoutValuesFromCustomer(customer) {
  return {
    customer_name: customer?.full_name || '',
    customer_phone: customer?.phone || '',
    customer_alt_phone: customer?.alt_phone || '',
    governorate: customer?.governorate || 'القاهرة',
    city: customer?.city || '',
    address_details: customer?.address_details || '',
    notes: customer?.notes || '',
  }
}

function handleSectionNavigation(event, sectionId) {
  const section = document.getElementById(sectionId)
  if (!section) return

  event.preventDefault()
  const url = new URL(window.location.href)
  url.hash = sectionId === 'home' ? '' : sectionId
  window.history.replaceState(null, '', url.toString())
  const stickyHeader = document.querySelector('.sticky.top-0')
  const topOffset = (stickyHeader?.getBoundingClientRect().height || 0) + 16
  const top = Math.max(0, section.getBoundingClientRect().top + window.scrollY - topOffset)
  window.scrollTo({ top, behavior: 'smooth' })
}

function formatGender(language, gender) {
  if (gender === 'Men') return renderText(language, 'عطور رجالية', 'For Men')
  if (gender === 'Women') return renderText(language, 'عطور نسائية', 'For Women')
  return renderText(language, 'للجنسين (Unisex)', 'Unisex')
}

function formatSeason(language, season) {
  const seasons = {
    Winter: ['الشتاء', 'Winter'],
    Autumn: ['الخريف', 'Autumn'],
    Spring: ['الربيع', 'Spring'],
    Summer: ['الصيف', 'Summer'],
    'All Year': ['طوال العام', 'All Year'],
  }
  const labels = seasons[season]
  return labels ? renderText(language, labels[0], labels[1]) : season
}

function MadarFlacon({ product, language, className = '' }) {
  const gradientId = useId().replaceAll(':', '')
  const name = renderText(language, product?.name_ar, product?.name_en)
  const plaqueName = product?.name_en || 'MADAR'

  return (
    <svg
      viewBox="0 0 400 600"
      role="img"
      aria-label={name}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${gradientId}-glass`} x1=".85" x2=".15" y1=".1" y2=".9">
          <stop offset="0" stopColor="#581528" stopOpacity=".85" />
          <stop offset=".6" stopColor="#140409" stopOpacity=".95" />
          <stop offset="1" stopColor="#7A1C37" stopOpacity=".7" />
        </linearGradient>
        <linearGradient id={`${gradientId}-elixir`} x1="0" x2="0.8" y1="0" y2="1">
          <stop offset="0" stopColor="#581528" stopOpacity=".78" />
          <stop offset=".55" stopColor="#3A0B19" stopOpacity=".88" />
          <stop offset="1" stopColor="#581528" stopOpacity=".95" />
        </linearGradient>
        <linearGradient id={`${gradientId}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F2E9DF" />
          <stop offset=".5" stopColor="#B8A394" />
          <stop offset="1" stopColor="#581528" />
        </linearGradient>
        <radialGradient id={`${gradientId}-glow`}>
          <stop stopColor="#581528" stopOpacity=".38" />
          <stop offset="1" stopColor="#3A0B19" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="320" rx="182" ry="118" fill="none" stroke="#F2E9DF" strokeOpacity=".12" transform="rotate(-24 200 320)" />
      <ellipse cx="200" cy="320" rx="145" ry="188" fill="none" stroke="#F2E9DF" strokeOpacity=".18" transform="rotate(32 200 320)" />
      <circle cx="331" cy="208" r="5" fill="#F2E9DF" />
      <circle cx="62" cy="423" r="4" fill="#F2E9DF" />
      <ellipse cx="200" cy="476" rx="142" ry="74" fill={`url(#${gradientId}-glow)`} />
      <ellipse cx="200" cy="505" rx="88" ry="16" fill="#090204" opacity=".8" />
      <rect x="163" y="106" width="74" height="68" fill={`url(#${gradientId}-metal)`} stroke="#F2E9DF" strokeOpacity=".45" />
      <path d="M170 115h60M170 127h60M170 139h60M170 151h60M170 163h60" stroke="#F2E9DF" strokeOpacity=".4" />
      <rect x="176" y="174" width="48" height="61" fill={`url(#${gradientId}-glass)`} stroke="#F2E9DF" strokeOpacity=".75" />
      <rect x="157" y="218" width="86" height="18" fill={`url(#${gradientId}-metal)`} stroke="#F2E9DF" strokeOpacity=".55" />
      <path d="M93 242Q93 228 108 228h184q15 0 15 14v232q0 27-27 32l-80 14-80-14q-27-5-27-32V242Z" fill={`url(#${gradientId}-glass)`} stroke={`url(#${gradientId}-metal)`} strokeWidth="4" />
      <path d="M103 340h194v127q0 20-21 25l-76 13-76-13q-21-5-21-25V340Z" fill={`url(#${gradientId}-elixir)`} opacity=".82" />
      <path d="M110 245v188q0 22 12 32M290 245v177" fill="none" stroke="#F2E9DF" strokeOpacity=".4" strokeWidth="5" />
      <path d="M122 248h30" stroke="#F2E9DF" strokeOpacity=".58" strokeWidth="3" />
      <path d="M116 260v62M284 260v42" fill="none" stroke="#F2E9DF" strokeOpacity=".16" strokeWidth="2" />
      <rect x="123" y="292" width="154" height="96" fill="#140409" fillOpacity=".9" stroke="#F2E9DF" strokeOpacity=".35" />
      <path d="M133 302h134v76H133z" fill="none" stroke="#F2E9DF" strokeOpacity=".28" />
      <text x="200" y="332" textAnchor="middle" fill="#F2E9DF" fontFamily="Amiri, serif" fontSize="27" fontWeight="700">مدار</text>
      <text x="200" y="350" textAnchor="middle" fill="#D5BFA8" fontFamily="Cormorant Garamond, serif" fontSize="8" letterSpacing="2">MADAR</text>
      <text x="200" y="370" textAnchor="middle" fill="#F2E9DF" fontFamily="Readex Pro, sans-serif" fontSize="9">{plaqueName}</text>
      <text x="200" y="382" textAnchor="middle" fill="#A8958B" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="6" letterSpacing="2">EXTRAIT DE PARFUM</text>
    </svg>
  )
}

function ProductArtwork({ product, language, className = '' }) {
  const imageUrl = product?.image_url || product?.gallery_images?.[0]
  const isSeedPhotography = imageUrl?.includes('images.unsplash.com/photo-')

  if (imageUrl && !isSeedPhotography) {
    return (
      <img
        src={imageUrl}
        alt={renderText(language, product.name_ar, product.name_en)}
        className={`object-contain ${className}`}
      />
    )
  }

  return <MadarFlacon product={product} language={language} className={className} />
}

function ProductAngleGallery({ product, language, compact = false, modal = false, activeAngle: controlledAngle, onAngleChange }) {
  const [internalAngle, setInternalAngle] = useState(0)
  const activeAngle = controlledAngle ?? internalAngle
  const angleNames = [
    ['الزاوية الأمامية', 'Front View'],
    ['الزاوية الجانبية', 'Side Angle'],
    ['تفاصيل الزجاجة والعبوة', 'Box & Detail'],
  ]
  const galleryImages = Array.isArray(product.gallery_images) ? product.gallery_images : []
  const image = galleryImages[activeAngle]

  return (
    <div className="flex h-full flex-col">
      <div className={`group relative flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,rgba(213,191,168,.14),transparent_24%),radial-gradient(ellipse_at_50%_58%,rgba(88,21,40,.6),transparent_62%),#090204] ${modal ? 'h-[230px] min-h-0 sm:h-[280px] lg:h-[310px]' : compact ? 'min-h-[350px]' : 'min-h-[320px]'}`}>
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#F2E9DF_0.7px,transparent_0.7px)] [background-size:27px_27px]" />
        {activeAngle === 2 && (
          <div className="absolute left-[12%] top-[22%] hidden h-[54%] w-[30%] -rotate-6 border border-[#F2E9DF]/40 bg-gradient-to-br from-[#F2E9DF]/20 via-[#541624] to-[#43040D] p-3 shadow-[0_20px_60px_rgba(0,0,0,.5)] sm:block">
            <div className="flex h-full items-center justify-center border border-[#F2E9DF]/25">
              <span className="font-['Amiri'] text-2xl text-[#F2E9DF]">مدار<br /><small className="font-['Readex_Pro'] text-xs tracking-[0.2em]">MADAR</small></span>
            </div>
          </div>
        )}
        {image ? (
          <img
            src={image}
            alt={`${renderText(language, product.name_ar, product.name_en)} — ${renderText(language, angleNames[activeAngle][0], angleNames[activeAngle][1])}`}
            className={`relative z-10 h-full max-h-[390px] w-full object-contain p-8 transition-transform duration-500 group-hover:scale-110 ${modal ? 'max-h-full p-5' : ''} ${activeAngle === 1 ? 'scale-90 -rotate-6' : ''} ${activeAngle === 2 ? 'max-w-[72%] translate-x-6 scale-90' : ''}`}
          />
        ) : (
          <div className={`relative z-10 h-[85%] w-[78%] transition-transform duration-500 group-hover:scale-105 ${activeAngle === 1 ? '[transform:perspective(900px)_rotateY(-34deg)_scale(.82)]' : ''} ${activeAngle === 2 ? 'translate-x-[15%] scale-[.78]' : ''}`}>
            {activeAngle === 2 && <div className="absolute inset-y-[12%] left-[-28%] z-0 w-[38%] -rotate-6 border border-[#F2E9DF]/40 bg-gradient-to-br from-[#F2E9DF]/20 via-[#541624] to-[#43040D] shadow-xl"><div className="flex h-full items-center justify-center font-['Amiri'] text-lg text-[#F2E9DF]">مدار<br />MADAR</div></div>}
            <ProductArtwork product={product} language={language} className={`relative z-10 h-full w-full object-contain ${modal ? 'p-4' : ''}`} />
          </div>
        )}
        {activeAngle === 2 && <span className="absolute bottom-[12%] right-[12%] rounded-full border border-[#F2E9DF]/30 bg-[#1A060C]/80 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[#D5BFA8]">MADAR · EXTRAIT</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-[#F2E9DF]/10 bg-[#090204] p-3">
        {angleNames.map(([ar, en], index) => (
          <button key={en} type="button" aria-pressed={activeAngle === index} onClick={() => (onAngleChange || setInternalAngle)(index)} className={`min-h-12 border px-2 py-2 text-[9px] leading-4 transition ${activeAngle === index ? 'border-[#D5BFA8]/70 bg-[#581528]/35 text-[#F2E9DF]' : 'border-[#F2E9DF]/10 text-[#A8958B]'}`}>
            <span className="block text-[#D5BFA8]">0{index + 1}</span>{renderText(language, ar, en)}
          </button>
        ))}
      </div>
    </div>
  )
}

function HeroPouringFlacon({ active }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const progressRef = useRef(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const id = useId().replaceAll(':', '')

  useEffect(() => {
    let frame = 0
    const hero = document.getElementById('home')
    const getProgress = () => {
      const scrollDistance = Math.max(1, (hero?.offsetHeight || window.innerHeight) * 0.65)
      return Math.max(0, Math.min(1, window.scrollY / scrollDistance))
    }
    let targetProgress = getProgress()
    let currentProgress = targetProgress
    const updateTarget = () => {
      targetProgress = getProgress()
      if (document.visibilityState === 'hidden') {
        currentProgress = targetProgress
        progressRef.current = targetProgress
        setScrollProgress(targetProgress)
        return
      }
      if (!frame) frame = window.requestAnimationFrame(animate)
    }
    const resetAnchor = () => {
      updateTarget()
    }
    const animate = () => {
      currentProgress += (targetProgress - currentProgress) * 0.18
      if (Math.abs(targetProgress - currentProgress) < 0.001) currentProgress = targetProgress
      progressRef.current = currentProgress
      setScrollProgress(currentProgress)
      if (currentProgress !== targetProgress) {
        frame = window.requestAnimationFrame(animate)
      } else {
        frame = 0
      }
    }

    window.addEventListener('scroll', updateTarget, { passive: true })
    window.addEventListener('resize', resetAnchor)
    document.addEventListener('visibilitychange', updateTarget)
    updateTarget()
    return () => {
      window.removeEventListener('scroll', updateTarget)
      window.removeEventListener('resize', resetAnchor)
      document.removeEventListener('visibilitychange', updateTarget)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined

    let frame = 0
    let width = 0
    let height = 0
    const particles = Array.from({ length: 44 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.18 + Math.random() * 0.48,
      speed: 0.001 + Math.random() * 0.003,
      size: 0.7 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    }))
    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = bounds.width
      height = bounds.height
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    const draw = (time) => {
      context.clearRect(0, 0, width, height)
      const progress = progressRef.current
      const centerX = width * 0.5
      const centerY = height * 0.52
      const spread = Math.min(width, height) * (0.25 + progress * 0.12)
      particles.forEach((particle) => {
        const angle = particle.angle + time * particle.speed
        const orbit = spread * particle.radius
        const x = centerX + Math.cos(angle) * orbit
        const y = centerY + Math.sin(angle) * orbit * 0.74
        const twinkle = 0.18 + (Math.sin(time * 0.002 + particle.phase) + 1) * 0.18
        context.beginPath()
        context.fillStyle = `rgba(242, 233, 223, ${active ? twinkle * (0.35 + progress * 0.65) : 0})`
        context.shadowBlur = 7 + progress * 8
        context.shadowColor = '#7A1C37'
        context.arc(x, y, particle.size, 0, Math.PI * 2)
        context.fill()
      })
      context.shadowBlur = 0
      frame = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    frame = window.requestAnimationFrame(draw)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [active])

  const fillProgress = scrollProgress
  const fillRatio = 0.18 + fillProgress * 0.6
  const surfaceY = 316 - fillProgress * 98
  const capProgress = Math.max(0, Math.min(1, (scrollProgress - 0.02) / 0.22))
  const capEase = capProgress * capProgress * (3 - 2 * capProgress)
  const streamProgress = Math.max(0, Math.min(1, (scrollProgress - 0.02) / 0.16))
  const streamOpacity = active ? streamProgress * streamProgress * (3 - 2 * streamProgress) : 0
  const liquidAnimationActive = active && scrollProgress >= 0.02

  return (
    <div ref={stageRef} data-scroll-progress={scrollProgress.toFixed(3)} data-fill-ratio={fillRatio.toFixed(3)} data-surface-y={surfaceY.toFixed(1)} className="relative z-10 mx-auto h-[430px] w-full max-w-[310px] sm:h-[480px] sm:max-w-[360px] lg:h-[600px] lg:max-w-[440px]">
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      <svg viewBox="0 0 400 600" role="img" aria-label="Madar signature extrait flacon" className="relative z-10 h-full w-full overflow-visible drop-shadow-[0_30px_55px_rgba(0,0,0,.75)]">
        <defs>
          <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#7A1C37" stopOpacity=".82" />
            <stop offset=".52" stopColor="#140409" stopOpacity=".97" />
            <stop offset="1" stopColor="#581528" stopOpacity=".92" />
          </linearGradient>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#F2E9DF" />
            <stop offset=".48" stopColor="#B8A394" />
            <stop offset="1" stopColor="#581528" />
          </linearGradient>
          <linearGradient id={`${id}-elixir`} x1="0" y1="0" x2=".8" y2="1">
            <stop stopColor="#7A1C37" stopOpacity=".88" />
            <stop offset=".55" stopColor="#581528" stopOpacity=".96" />
            <stop offset="1" stopColor="#3A0B19" />
          </linearGradient>
          <radialGradient id={`${id}-node`}>
            <stop stopColor="#F2E9DF" />
            <stop offset=".24" stopColor="#F2E9DF" stopOpacity=".85" />
            <stop offset="1" stopColor="#581528" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-liquid-clip`}>
            <path d="M155 242 155 211Q155 199 170 199H230Q245 199 245 211V242Q304 250 305 270V493Q305 518 279 524L200 541 121 524Q95 518 95 493V270Q96 250 155 242Z" />
          </clipPath>
        </defs>

        <g fill="none" stroke="#F2E9DF">
          <ellipse cx="200" cy="320" rx="182" ry="118" strokeOpacity=".14" transform="rotate(-24 200 320)" />
          <ellipse cx="200" cy="320" rx="145" ry="188" strokeOpacity=".2" transform="rotate(32 200 320)" />
          <ellipse cx="200" cy="320" rx="116" ry="228" strokeOpacity=".1" transform="rotate(-8 200 320)" />
        </g>

        <g className={active ? 'pour-source-active' : ''}>
          <circle cx="200" cy="76" r="46" fill={`url(#${id}-node)`} />
          <g className="accretion-disk">
            <ellipse cx="200" cy="76" rx="29" ry="10" fill="none" stroke="#7A1C37" strokeWidth="8" opacity=".8" transform="rotate(-22 200 76)" />
            <ellipse cx="200" cy="76" rx="27" ry="7" fill="none" stroke="#F2E9DF" strokeWidth="2" opacity=".9" transform="rotate(-22 200 76)" />
            <ellipse cx="200" cy="76" rx="38" ry="13" fill="none" stroke="#D5BFA8" strokeWidth="1" opacity=".55" transform="rotate(-22 200 76)" />
          </g>
          <circle cx="200" cy="76" r="17" fill="#050103" stroke="#F2E9DF" strokeOpacity=".55" strokeWidth="2" />
          <circle cx="200" cy="76" r="22" fill="none" stroke="#7A1C37" strokeWidth="3" strokeOpacity=".8" className="photon-halo" />
        </g>
        <g className={`pouring-stream-active ${active && streamOpacity > 0 ? 'is-pouring' : ''}`} opacity={streamOpacity} data-stream-opacity={streamOpacity.toFixed(3)}>
          <path d="M198 92C198 126 202 154 200 196L200 220" fill="none" stroke="#581528" strokeWidth="13" strokeLinecap="round" opacity=".8" />
          <path d="M200 94C200 128 200 162 200 220" fill="none" stroke="#F2E9DF" strokeWidth="3" strokeLinecap="round" />
          <path d="M200 97C200 133 200 169 200 220" fill="none" stroke="#F2E9DF" strokeWidth="1" strokeLinecap="round" className="pouring-stream-glint" />
        </g>

        <g clipPath={`url(#${id}-liquid-clip)`}>
          <path d="M155 242 155 211Q155 199 170 199H230Q245 199 245 211V242Q304 250 305 270V493Q305 518 279 524L200 541 121 524Q95 518 95 493V270Q96 250 155 242Z" fill="#090204" fillOpacity=".88" />
          <rect x="95" y={surfaceY} width="210" height={541 - surfaceY} fill={`url(#${id}-elixir)`} />
          <path d={`M92 ${surfaceY} C130 ${surfaceY - 12} 164 ${surfaceY + 10} 200 ${surfaceY} S270 ${surfaceY - 10} 308 ${surfaceY}`} fill="none" stroke="#7A1C37" strokeWidth="15" opacity=".7" className={`liquid-wave liquid-wave-back ${liquidAnimationActive ? 'liquid-wave-active' : ''}`} />
          <path d={`M92 ${surfaceY + 7} C132 ${surfaceY - 3} 165 ${surfaceY + 15} 202 ${surfaceY + 6} S271 ${surfaceY - 1} 308 ${surfaceY + 8} L308 545H92Z`} fill="#581528" opacity=".82" className={`liquid-wave liquid-wave-front ${liquidAnimationActive ? 'liquid-wave-active' : ''}`} />
          <path d={`M100 ${surfaceY + 1} C136 ${surfaceY - 7} 168 ${surfaceY + 8} 200 ${surfaceY + 1} S268 ${surfaceY - 6} 300 ${surfaceY + 2}`} fill="none" stroke="#F2E9DF" strokeWidth="2.5" opacity=".92" className={`liquid-wave liquid-wave-highlight ${liquidAnimationActive ? 'liquid-wave-active' : ''}`} />
          {[0, 1, 2, 3, 4].map((bubble) => (
            <circle key={bubble} cx={192 + (bubble % 2) * 14} cy={surfaceY + 22 + bubble * 18} r={2 + (bubble % 2)} fill="#D5BFA8" opacity={liquidAnimationActive ? 0.62 : 0} className={liquidAnimationActive ? `elixir-bubble elixir-bubble-${bubble % 3}` : ''} />
          ))}
        </g>

        <path d="M155 242 155 211Q155 199 170 199H230Q245 199 245 211V242Q304 250 305 270V493Q305 518 279 524L200 541 121 524Q95 518 95 493V270Q96 250 155 242Z" fill={`url(#${id}-glass)`} fillOpacity=".18" stroke={`url(#${id}-metal)`} strokeWidth="3" />
        <path d="M107 271V466Q107 497 129 504M293 273V452" fill="none" stroke="#F2E9DF" strokeWidth="4" strokeOpacity=".3" />
        <path d="M112 275h24" stroke="#F2E9DF" strokeWidth="2" strokeOpacity=".6" />
        <path d="M177 199V180Q177 170 188 170H212Q223 170 223 180V199" fill="#140409" stroke="#F2E9DF" strokeWidth="2" />
        <ellipse cx="200" cy="199" rx="23" ry="4" fill="#090204" stroke="#F2E9DF" strokeWidth="1.5" />

        <g className="flacon-engraving">
          <rect x="124" y="318" width="152" height="112" rx="2" fill="#140409" fillOpacity=".88" stroke="#F2E9DF" strokeOpacity=".4" />
          <text x="200" y="365" textAnchor="middle" fill="#F2E9DF" fontFamily="Amiri, serif" fontSize="27" fontWeight="700">مدار</text>
          <text x="200" y="385" textAnchor="middle" fill="#F2E9DF" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="8" letterSpacing="1.1">MADAR</text>
          <text x="200" y="400" textAnchor="middle" fill="#A8958B" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="6" letterSpacing="1.1">EXTRAIT DE PARFUM</text>
        </g>

        <g className="flacon-cap" transform={`translate(${44 * capEase} ${-34 * capEase}) rotate(${20 * capEase} 200 171)`}>
          <rect x="164" y="151" width="72" height="48" rx="3" fill={`url(#${id}-metal)`} stroke="#F2E9DF" strokeOpacity=".8" />
          <path d="M170 159h60M170 167h60M170 175h60M170 183h60M170 191h60" stroke="#F2E9DF" strokeOpacity=".48" />
          <path d="M169 154v41" stroke="#F2E9DF" strokeWidth="2" strokeOpacity=".72" />
        </g>
      </svg>
    </div>
  )
}

function IconicHero({ language, isRevealing, pouringActive, settings }) {
  const title = renderText(language, 'كل عطر وليه جاذبيته.', 'Every Scent Has Its Gravity.')
  return (
    <section id="home" className={`relative flex min-h-[calc(100vh-4rem)] scroll-mt-24 items-center overflow-hidden border-b border-[#D5BFA8]/20 bg-[#090204] py-12 transition-transform duration-[900ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] lg:py-16 ${isRevealing ? 'scale-100' : 'scale-[1.03]'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_68%_48%,rgba(242,233,223,0.12),transparent_24%),radial-gradient(ellipse_at_66%_52%,rgba(88,21,40,0.72),transparent_42%),linear-gradient(112deg,#090204_12%,#140409_58%,#1D070E_100%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(242,233,223,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(242,233,223,.035)_1px,transparent_1px)] [background-size:84px_84px]" />

      <div className="relative mx-auto grid w-full max-w-[1600px] items-center gap-4 px-4 sm:gap-8 sm:px-5 md:px-12 lg:grid-cols-[0.88fr_1.12fr] lg:px-20">
        <div className="relative z-10 order-2 max-w-xl lg:order-1">
          <MadarBrandLockup settings={settings} compact />
          <div className="mb-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-[#D5BFA8] sm:mb-7 sm:gap-4 md:text-xs">
            <span className="h-px w-12 bg-[#D5BFA8]/60" />
            <span dir="rtl">مدار | MADAR PERFUMES</span>
          </div>
          <h1 dir={language === 'en' ? 'ltr' : 'rtl'} className="mt-3 max-w-2xl font-['Amiri'] text-3xl leading-[1.35] text-[#F2E9DF] sm:mt-5 sm:text-4xl lg:text-6xl">
            {title}
          </h1>
          <p dir="rtl" className="text-base sm:text-lg text-[#D5BFA8]">كل <span dir="ltr" className="inline-block mx-1 font-serif text-[#F2E9DF]">Scent</span> وليه جاذبيته.</p>

          <div className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
            <a href="#collection" onClick={(event) => handleSectionNavigation(event, 'collection')} className="border border-[#F2E9DF] bg-[#F2E9DF] px-5 py-3 text-sm font-semibold text-[#1A050B] transition-colors hover:border-[#F2E9DF]/40 hover:bg-[#581528] hover:text-[#F2E9DF]">
              {renderText(language, 'تصفح جميع العطور', 'Shop Collection')}
            </a>
            <a href="#quiz" onClick={(event) => handleSectionNavigation(event, 'quiz')} className="border border-[#F2E9DF]/25 bg-[#581528]/20 px-5 py-3 text-sm text-[#F2E9DF] backdrop-blur-md transition-shadow hover:shadow-[0_0_24px_rgba(242,233,223,.15)]">
              {renderText(language, 'اعرف عطرك المناسب', 'Find Your Scent')}
            </a>
          </div>

          <div className="mt-6 border-t border-[#F2E9DF]/15 pt-4 sm:mt-9 sm:pt-5">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#A8958B]">
              <span>{renderText(language, 'الدفع عند الاستلام', 'Cash on Delivery')}</span>
              <span>{language === 'ar' ? `شحن ${formatMoney(settings.shipping_fee ?? 50, language)} لجميع مصر` : `${formatMoney(settings.shipping_fee ?? 50, language)} Flat Shipping`}</span>
              <span>{renderText(language, 'ثبات وفوحان ممتاز', 'High Longevity & Sillage')}</span>
            </div>
            <p dir="ltr" className="text-xs uppercase tracking-[0.25em] text-[#D5BFA8]">YOUR SCENT. YOUR GRAVITY.</p>
          </div>
        </div>

        <div className="relative order-1 flex min-h-[430px] items-center justify-center sm:min-h-[480px] lg:order-2 lg:min-h-[680px]">
          <div className="eclipse-breathe absolute h-[72vw] max-h-[690px] w-[72vw] max-w-[690px] rounded-full bg-[radial-gradient(circle,rgba(242,233,223,.12)_0%,rgba(58,11,25,.2)_18%,rgba(88,21,40,.44)_38%,transparent_69%)]" />
          <div className="orbit-drift absolute h-[min(74vw,660px)] w-[min(74vw,660px)] rounded-full border border-[#F2E9DF]/20" />
          <div className="orbit-drift-reverse absolute h-[min(62vw,560px)] w-[min(62vw,560px)] rotate-[58deg] rounded-full border border-[#F2E9DF]/35" />
          <div className="orbit-drift absolute h-[min(50vw,460px)] w-[min(50vw,460px)] -rotate-[28deg] rounded-full border border-[#F2E9DF]/15" />
          <svg aria-hidden="true" viewBox="0 0 100 100" className="celestial-body celestial-black-hole absolute left-[15%] top-[43%] h-12 w-12 md:h-16 md:w-16">
            <defs>
              <radialGradient id="outer-singularity-glow"><stop offset=".35" stopColor="#050103" /><stop offset=".58" stopColor="#581528" /><stop offset=".76" stopColor="#F2E9DF" stopOpacity=".8" /><stop offset="1" stopColor="#7A1C37" stopOpacity="0" /></radialGradient>
            </defs>
            <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="#F2E9DF" strokeOpacity=".72" strokeWidth="3" transform="rotate(-28 50 50)" />
            <ellipse cx="50" cy="50" rx="38" ry="12" fill="none" stroke="#7A1C37" strokeOpacity=".9" strokeWidth="5" transform="rotate(-28 50 50)" />
            <circle cx="50" cy="50" r="29" fill="url(#outer-singularity-glow)" />
            <circle cx="50" cy="50" r="15" fill="#050103" />
            <circle cx="33" cy="31" r="2" fill="#D5BFA8" className="celestial-dust" />
            <circle cx="68" cy="67" r="1.5" fill="#F2E9DF" className="celestial-dust celestial-dust-delay" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 120 90" className="celestial-body celestial-saturn absolute right-[10%] top-[38%] h-14 w-[4.5rem] md:h-20 md:w-28">
            <defs>
              <radialGradient id="saturn-surface" cx="30%" cy="28%"><stop stopColor="#D5BFA8" /><stop offset=".38" stopColor="#7A1C37" /><stop offset="1" stopColor="#050103" /></radialGradient>
            </defs>
            <ellipse cx="60" cy="45" rx="54" ry="17" fill="none" stroke="#F2E9DF" strokeOpacity=".7" strokeWidth="3" transform="rotate(-20 60 45)" />
            <ellipse cx="60" cy="45" rx="49" ry="13" fill="none" stroke="#D5BFA8" strokeOpacity=".42" strokeWidth="2" transform="rotate(-20 60 45)" />
            <circle cx="60" cy="45" r="23" fill="url(#saturn-surface)" />
            <path d="M43 32a23 23 0 0 0 24 34 23 23 0 0 1-24-34Z" fill="#F2E9DF" opacity=".55" />
            <circle cx="83" cy="29" r="4" fill="#F2E9DF" className="celestial-moon" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 100 100" className="celestial-body absolute bottom-[13%] left-[28%] h-9 w-9 md:h-12 md:w-12">
            <defs><radialGradient id="eclipsed-world" cx="25%" cy="22%"><stop stopColor="#F2E9DF" /><stop offset=".16" stopColor="#7A1C37" /><stop offset=".7" stopColor="#581528" /><stop offset="1" stopColor="#050103" /></radialGradient></defs>
            <circle cx="50" cy="50" r="34" fill="url(#eclipsed-world)" />
            <path d="M23 33a34 34 0 0 0 31 51" fill="none" stroke="#F2E9DF" strokeOpacity=".65" strokeWidth="2" />
            <circle cx="80" cy="25" r="7" fill="#D5BFA8" className="celestial-moon" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 100 100" className="celestial-body absolute right-[24%] top-[15%] h-8 w-8 md:h-11 md:w-11">
            <defs><radialGradient id="crimson-moon" cx="28%" cy="25%"><stop stopColor="#F2E9DF" /><stop offset=".2" stopColor="#7A1C37" /><stop offset="1" stopColor="#050103" /></radialGradient></defs>
            <circle cx="50" cy="50" r="34" fill="url(#crimson-moon)" />
            <circle cx="80" cy="25" r="6" fill="#D5BFA8" className="celestial-moon" />
          </svg>
          <HeroPouringFlacon active={pouringActive} />
        </div>
      </div>
    </section>
  )
}

function IconicEditorial({ product, products, language, addToCart, adminMode = false, onSelectTopSeller, onEditProduct }) {
  const [selectedSizeName, setSelectedSizeName] = useState('')
  if (!product) return null

  const activeSize = product.sizes?.find((size) => size.size === selectedSizeName) || product.sizes?.[0]

  return (
    <section id="iconic" className="relative scroll-mt-24 border-b border-[#F2E9DF]/10 bg-[#090204]">
      <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-12 md:py-24">
        <div className="relative mb-10 border-b border-[#D5BFA8]/25 pb-5">
          {adminMode && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D5BFA8]/30 bg-[#140409] p-3 shadow-lg">
              <label className="flex flex-wrap items-center gap-2 text-xs text-[#D5BFA8]">
                ★ العطر المعروض في الأكثر مبيعاً:
                <select
                  aria-label="العطر المعروض في الأكثر مبيعاً"
                  value={product?.id || ''}
                  onChange={(event) => onSelectTopSeller(event.target.value)}
                  className="max-w-full border border-[#D5BFA8]/30 bg-[#090204] px-3 py-2 text-xs text-[#F2E9DF]"
                >
                  {products.filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{renderText(language, item.name_ar, item.name_en)}</option>)}
                </select>
              </label>
              {product && <button type="button" onClick={() => onEditProduct(product)} className="border border-[#D5BFA8]/30 px-3 py-2 text-xs text-[#D5BFA8]">✎ تعديل بيانات وأسعار هذا العطر</button>}
            </div>
          )}
          <p className="inline-flex border border-[#D5BFA8]/35 bg-[#581528]/30 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#D5BFA8]">TOP SELLING | العطر الأكثر مبيعاً</p>
          <h2 className="mt-4 font-['Amiri'] text-4xl text-[#F2E9DF] md:text-6xl">{renderText(language, 'العطر الأكثر مبيعاً وطلباً', 'Top Selling Signature Fragrance')}</h2>
        </div>

        <article className="grid overflow-hidden border border-[#F2E9DF]/15 lg:grid-cols-2">
          <figure className="flex min-h-[470px] flex-col border-b border-[#F2E9DF]/15 lg:border-b-0 lg:border-e">
            <ProductAngleGallery product={product} language={language} compact />
          </figure>
          <div className="flex flex-col justify-center p-6 sm:p-10 md:p-14">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#D5BFA8]">{renderText(language, 'الأكثر مبيعاً', 'TOP SELLING')}</p>
            <h3 className="mt-3 font-['Readex_Pro'] text-3xl leading-relaxed text-[#F2E9DF] md:text-4xl">{renderText(language, product.name_ar, product.name_en)}</h3>
            <p className="mt-3 text-sm leading-7 text-[#A8958B]">{renderText(language, product.subtitle_ar, product.subtitle_en)}</p>
            <span className="mt-5 w-fit border border-[#F2E9DF]/15 px-3 py-2 text-xs text-[#F2E9DF]">Extrait de Parfum • 30% Oil</span>
            <div className="mt-7 flex flex-wrap gap-2">
              {product.sizes?.map((size) => (
                <button key={size.size} type="button" disabled={size.in_stock === false} onClick={() => setSelectedSizeName(size.size)} className={`min-h-11 border px-4 py-2 text-xs uppercase tracking-[0.15em] ${activeSize?.size === size.size ? 'border-[#D5BFA8] bg-[#581528]/50 text-[#F2E9DF]' : 'border-[#F2E9DF]/15 text-[#A8958B]'} disabled:opacity-40`}>
                  {size.size}
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#F2E9DF]/15 pt-5">
              <DiscountPrice size={activeSize} language={language} />
              <button type="button" disabled={!activeSize || activeSize.in_stock === false} onClick={() => addToCart(product, activeSize)} className="min-h-12 bg-[#F2E9DF] px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#1A050B] disabled:opacity-40">{renderText(language, 'أضف إلى السلة', 'ADD TO BAG')}</button>
            </div>
          </div>
        </article>

        <BrandGravityIdentitySection language={language} />
      </div>
    </section>
  )
}

function BrandGravityIdentitySection({ language }) {
  const pillars = [
    {
      number: '01',
      titleAr: 'نقطة الجذب الأولى',
      titleEn: 'PERSONAL GRAVITY',
      bodyAr: 'حضور يفرض مداره — صُممت هوية مدار لتجعل من عطرك مركزاً للجاذبية يلفت الانتباه بهدوء وفخامة منذ اللحظة الأولى.',
      bodyEn: 'A Presence That Commands Its Orbit — Designed to make your signature scent a center of quiet, magnetic luxury.',
    },
    {
      number: '02',
      titleAr: 'نقاء الإكسير الملكي',
      titleEn: 'PURE EXTRAIT ELIXIR',
      bodyAr: 'تركيز يتخطى المألوف — نعتمد تركيز Extrait de Parfum بنسبة زيوت نقية تصل إلى 30% لثبات يدوم في الذاكرة والمكان.',
      bodyEn: 'Beyond Ordinary Concentration — Crafted at 30% pure Extrait de Parfum concentration for an enduring, unmistakable aura.',
    },
    {
      number: '03',
      titleAr: 'أثر لا ينتهي',
      titleEn: 'ETERNAL TRAIL',
      bodyAr: 'كل Scent وليه جاذبيته — توازن هندسي دقيق بين الفخامة الشرقية والحداثة ليمنحك بصمة خاصة لا تشبه أحداً.',
      bodyEn: 'Your Scent. Your Gravity. — A precise architectural balance of deep royal warmth and modern refinement.',
    },
  ]
  return (
    <section id="icon" className="brand-gravity-section mt-14 overflow-hidden border border-[#D5BFA8]/20 bg-[#060103]">
      <header className="border-b border-[#D5BFA8]/15 px-6 py-8 text-center sm:px-10 sm:py-12">
        <p dir="ltr" className="mx-auto w-fit border border-[#D5BFA8]/35 bg-[#581528]/30 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[#D5BFA8]">
          MADAR IDENTITY • الهوية الفلكية لمدار
        </p>
        <h2 dir={language === 'ar' ? 'rtl' : 'ltr'} className="mt-5 font-['Amiri'] text-3xl leading-relaxed text-[#F2E9DF] sm:text-5xl">
          {renderText(language, 'كل عطر وليه جاذبيته.', 'Every Scent Has Its Gravity.')}
        </h2>
        <p dir={language === 'ar' ? 'ltr' : 'rtl'} className="mt-2 font-['Cormorant_Garamond'] text-xl text-[#D5BFA8] sm:text-2xl">
          {renderText(language, 'Every Scent Has Its Gravity.', 'كل عطر وليه جاذبيته.')}
        </p>
        <p dir={language === 'ar' ? 'rtl' : 'ltr'} className="mx-auto mt-4 max-w-3xl text-sm leading-8 text-[#A8958B] sm:text-base">
          {renderText(
            language,
            'في مدار، لا نصنع مجرد عطر؛ بل نصمم مجالاً من الجاذبية الخاصة التي تدور حول حضورك وتترك أثراً لا يُنسى.',
            'At MADAR, we do not merely craft perfume; we architect a personal field of gravity that orbits your presence.',
          )}
        </p>
      </header>

      <div className="grid lg:grid-cols-2">
        <div className="space-y-0 border-b border-[#D5BFA8]/15 lg:border-b-0 lg:border-e">
          {pillars.map((pillar, index) => (
            <article key={pillar.number} className={`brand-gravity-pillar px-6 py-7 sm:px-10 sm:py-9 ${index < pillars.length - 1 ? 'border-b border-[#F2E9DF]/10' : ''}`}>
              <p dir="ltr" className="text-[10px] uppercase tracking-[0.18em] text-[#D5BFA8]">
                {pillar.number} · {pillar.titleEn}
              </p>
              <h3 dir={language === 'ar' ? 'rtl' : 'ltr'} className="mt-3 font-['Readex_Pro'] text-lg leading-8 text-[#F2E9DF] sm:text-xl">
                {language === 'ar' && pillar.number === '03'
                  ? <>كل <bdi dir="ltr" className="mx-1 inline-block font-serif">Scent</bdi> وليه جاذبيته — توازن هندسي دقيق بين الفخامة الشرقية والحداثة ليمنحك بصمة خاصة لا تشبه أحداً.</>
                  : renderText(language, pillar.bodyAr, pillar.bodyEn)}
              </h3>
            </article>
          ))}
        </div>

        <div className="brand-gravity-monument relative flex min-h-[460px] flex-col items-center justify-center overflow-hidden px-5 py-12 sm:min-h-[560px]">
          <div className="brand-gravity-stars absolute inset-0" aria-hidden="true" />
          <div className="brand-gravity-ring brand-gravity-ring-one" aria-hidden="true" />
          <div className="brand-gravity-ring brand-gravity-ring-two" aria-hidden="true" />
          <div className="brand-gravity-ring brand-gravity-ring-three" aria-hidden="true" />
          <div className="brand-gravity-blackhole" aria-hidden="true">
            <span />
          </div>
          <div className="brand-gravity-monolith relative z-10 flex min-h-44 w-52 flex-col items-center justify-center border border-[#D5BFA8]/75 bg-gradient-to-br from-[#791D38]/95 via-[#430B1B]/95 to-[#100308] px-5 text-center shadow-[0_30px_90px_rgba(0,0,0,.8)] sm:min-h-52 sm:w-60">
            <span className="font-['Amiri'] text-5xl text-[#F2E9DF] sm:text-6xl">مدار</span>
            <span dir="ltr" className="mt-1 border-t border-[#D5BFA8]/50 pt-2 font-['Cormorant_Garamond'] text-2xl font-semibold tracking-[0.2em] text-[#F2E9DF]">MADAR</span>
            <span dir="ltr" className="mt-3 text-[8px] uppercase tracking-[0.3em] text-[#D5BFA8]">A FIELD OF GRAVITY</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function CosmicSplashScreen({ language, settings, onWarp, onFinish }) {
  const canvasRef = useRef(null)
  const parallaxRef = useRef({ targetX: 0, targetY: 0, x: 0, y: 0 })
  const warpingRef = useRef(false)
  const [isWarping, setIsWarping] = useState(false)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      throw new Error('Unable to initialize the cosmic splash canvas')
    }

    let animationFrame = 0
    let width = 0
    let height = 0
    let previousTime = 0
    const startedAt = performance.now()
    let finishTimer
    const stars = Array.from({ length: 380 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random(),
      radius: Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.6 + 0.25,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.003 + 0.001,
    }))
    const dust = Array.from({ length: 260 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 2.2 + 0.5,
      alpha: Math.random() * 0.14 + 0.03,
      hue: Math.random() > 0.78 ? '213, 191, 168' : '122, 28, 55',
    }))
    const comets = []
    let lastCometAt = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const draw = (time) => {
      const frameScale = previousTime ? Math.min((time - previousTime) / 16.67, 2) : 1
      previousTime = time
      const elapsed = time - startedAt
      const warpProgress = warpingRef.current ? Math.min(1, (elapsed - 2600) / 700) : 0
      const pointer = parallaxRef.current
      pointer.x += (pointer.targetX - pointer.x) * 0.045
      pointer.y += (pointer.targetY - pointer.y) * 0.045
      context.clearRect(0, 0, width, height)

      const nebulaGlow = context.createRadialGradient(width * 0.48, height * 0.48, 0, width * 0.48, height * 0.48, Math.max(width, height) * 0.72)
      nebulaGlow.addColorStop(0, 'rgba(122, 28, 55, 0.12)')
      nebulaGlow.addColorStop(0.42, 'rgba(74, 16, 37, 0.1)')
      nebulaGlow.addColorStop(1, 'rgba(4, 1, 2, 0)')
      context.fillStyle = nebulaGlow
      context.fillRect(0, 0, width, height)

      for (const particle of dust) {
        const x = particle.x * width + pointer.x * 22
        const y = particle.y * height + pointer.y * 22
        context.beginPath()
        context.fillStyle = `rgba(${particle.hue}, ${particle.alpha})`
        context.shadowBlur = particle.radius * 5
        context.shadowColor = `rgba(${particle.hue}, 0.35)`
        context.arc(x, y, particle.radius, 0, Math.PI * 2)
        context.fill()
      }

      for (const star of stars) {
        star.z -= (warpingRef.current ? 0.036 + warpProgress * 0.12 : 0.00065) * frameScale
        if (star.z <= 0.025) {
          star.x = Math.random() * 2 - 1
          star.y = Math.random() * 2 - 1
          star.z = 1
        }

        const x = width / 2 + ((star.x + pointer.x * 0.16) / star.z) * width * 0.42
        const y = height / 2 + ((star.y + pointer.y * 0.16) / star.z) * height * 0.42
        const radius = Math.max(0.35, (1 - star.z) * star.radius * 1.8)
        const twinkleAlpha = star.alpha * (0.65 + (Math.sin(time * star.twinkleSpeed + star.twinkle) + 1) * 0.175)
        if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue

        if (warpingRef.current && star.z < 0.92) {
          const streak = (1 - star.z) * (110 + warpProgress * 620)
          context.beginPath()
          context.strokeStyle = `rgba(242, 233, 223, ${Math.min(twinkleAlpha * (0.25 + warpProgress * 0.75), 0.9)})`
          context.lineWidth = Math.max(0.5, radius * (0.7 + warpProgress))
          context.moveTo(x, y)
          context.lineTo(x - ((x - width / 2) / Math.max(width, 1)) * streak, y - ((y - height / 2) / Math.max(height, 1)) * streak)
          context.stroke()
        }

        context.beginPath()
        context.fillStyle = `rgba(242, 233, 223, ${twinkleAlpha})`
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      }
      context.shadowBlur = 0

      if (time - lastCometAt > 850 + Math.random() * 900) {
        comets.push({ x: Math.random() * width * 0.78, y: Math.random() * height * 0.55, vx: 7 + Math.random() * 5, vy: 4 + Math.random() * 3, life: 0, maxLife: 36 + Math.random() * 24 })
        lastCometAt = time
      }
      for (let index = comets.length - 1; index >= 0; index -= 1) {
        const comet = comets[index]
        comet.x += comet.vx * frameScale
        comet.y += comet.vy * frameScale
        comet.life += frameScale
        const alpha = Math.max(0, 1 - comet.life / comet.maxLife)
        const tailX = comet.x - comet.vx * 9
        const tailY = comet.y - comet.vy * 9
        const tail = context.createLinearGradient(tailX, tailY, comet.x, comet.y)
        tail.addColorStop(0, 'rgba(122, 28, 55, 0)')
        tail.addColorStop(0.72, `rgba(213, 191, 168, ${alpha * 0.55})`)
        tail.addColorStop(1, `rgba(242, 233, 223, ${alpha})`)
        context.beginPath()
        context.strokeStyle = tail
        context.lineWidth = 2.2
        context.moveTo(tailX, tailY)
        context.lineTo(comet.x, comet.y)
        context.stroke()
        if (comet.life >= comet.maxLife) comets.splice(index, 1)
      }
      animationFrame = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    animationFrame = window.requestAnimationFrame(draw)
    const progressInterval = window.setInterval(() => {
      const elapsed = Math.min(performance.now() - startedAt, 2600)
      setProgress(Math.round((elapsed / 2600) * 100))
    }, 20)
    const warpTimer = window.setTimeout(() => {
      window.clearInterval(progressInterval)
      setProgress(100)

      warpingRef.current = true
      setIsWarping(true)
      onWarp()
      finishTimer = window.setTimeout(onFinish, 700)
    }, 2600)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
      window.clearInterval(progressInterval)
      window.clearTimeout(warpTimer)
      window.clearTimeout(finishTimer)
    }
  }, [onFinish, onWarp])

  const updateParallax = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    parallaxRef.current.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    parallaxRef.current.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
  }

  return (
    <div
      onPointerMove={updateParallax}
      className={`cosmic-splash cosmic-splash-vector fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-[#060103] text-center text-[#F2E9DF] ${isWarping ? 'cosmic-splash-warping' : ''}`}
      aria-label={renderText(language, 'مقدمة مدار الفضائية', 'Madar cosmic introduction')}
    >
      <div className="cosmic-nebula cosmic-nebula-one" aria-hidden="true" />
      <div className="cosmic-nebula cosmic-nebula-two" aria-hidden="true" />
      <div className="cosmic-nebula cosmic-nebula-three" aria-hidden="true" />
      <div className="cosmic-galaxy-image" aria-hidden="true" />
      <div className="cosmic-eclipse" aria-hidden="true">
        <span className="cosmic-eclipse-core" />
        <span className="cosmic-eclipse-photon" />
        <span className="cosmic-eclipse-disk" />
      </div>
      <div className="cosmic-planet cosmic-planet-left" aria-hidden="true"><span /></div>
      <div className="cosmic-planet cosmic-planet-right" aria-hidden="true"><span /></div>
      <div className="cosmic-planet cosmic-planet-moon" aria-hidden="true" />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="cosmic-splash-content relative z-10 flex w-full max-w-4xl flex-col items-center px-6 py-10">
        <div className="mb-8 flex min-h-24 items-center justify-center rounded-2xl bg-[#43040D]/70 px-8 py-5">
          <MadarBrandLockup settings={settings} />
        </div>
        <p dir="ltr" className="font-['Cormorant_Garamond'] text-sm uppercase tracking-[0.3em] text-[#D5BFA8]">MADAR PERFUMES</p>
        <h1 dir={language === 'ar' ? 'rtl' : 'ltr'} className="mt-4 font-['Amiri'] text-4xl leading-relaxed text-[#F2E9DF] md:text-6xl">
          {renderText(language, 'كل عطر وليه جاذبيته.', 'Every Scent Has Its Gravity.')}
        </h1>
        <p dir="rtl" className="mt-3 text-base text-[#F2E9DF]/85 md:text-xl">
          كل <bdi dir="ltr" className="mx-1 inline-block font-serif">Scent</bdi> وليه جاذبيته.
        </p>
        <p dir="ltr" className="mt-2 text-sm uppercase tracking-[0.18em] text-[#D5BFA8]">YOUR SCENT. YOUR GRAVITY.</p>
        <p dir={language === 'ar' ? 'ltr' : 'rtl'} className="mt-2 text-sm text-[#A8958B]">{renderText(language, 'Every Scent Has Its Gravity.', 'كل عطر وليه جاذبيته.')}</p>
        <div className="mt-8 flex items-center gap-3 text-xs text-[#A8958B] md:text-sm" role="status">
          <span className="cosmic-loading-dot" />
          {renderText(language, 'جاري تجهيز تجربة العطور الخاصة بك...', 'Preparing your luxury fragrance experience...')}
        </div>
        <div className="mt-8 w-56" role="progressbar" aria-label={renderText(language, 'تحميل المقدمة', 'Loading introduction')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-px bg-[#F2E9DF]/20">
            <div className="h-full bg-[#F2E9DF] transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-[10px] tracking-[0.2em] text-[#A8958B]">{progress}%</p>
        </div>
      </div>
    </div>
  )
}

function OrbitConsultation({ products, questions, language, addToCart, adminMode = false, onSaveQuestions }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selectedSizes, setSelectedSizes] = useState({})
  const [quizEditMode, setQuizEditMode] = useState(adminMode)
  const question = questions[step]
  const recommendations = useMemo(() => getQuizRecommendations(questions, answers, products), [answers, products, questions])
  const updateQuestion = (questionId, patch) => onSaveQuestions(questions.map((item) => item.id === questionId ? { ...item, ...patch } : item))
  const addQuestion = () => onSaveQuestions([...questions, { id: `question-${globalThis.crypto?.randomUUID?.() || Date.now()}`, question_ar: '', question_en: '', options: [] }])
  const updateOption = (questionId, optionId, patch) => onSaveQuestions(questions.map((item) => item.id !== questionId ? item : {
    ...item,
    options: (item.options || []).map((option) => option.id === optionId ? { ...option, ...patch } : option),
  }))
  const addOption = (question) => updateQuestion(question.id, {
    options: [...(question.options || []), {
      id: `option-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
      label_ar: '', label_en: '', desc_ar: '', desc_en: '', recommended_product_ids: [],
    }],
  })

  return (
    <section id="quiz" className="scroll-mt-24 border-y border-[#F2E9DF]/10 bg-[#140409]">
      <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-12 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#D5BFA8]">{renderText(language, 'اختبار العطر', 'SCENT QUIZ')}</p>
            <h2 className="mt-4 font-['Amiri'] text-5xl text-[#F2E9DF]">{renderText(language, 'اعرف عطرك المناسب', 'Find Your Scent')}</h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-[#A8958B]">{renderText(language, 'أجب عن الأسئلة لنحسب العطر الأقرب إليك.', 'Answer the questions to discover your closest scent match.')}</p>
            {questions.length > 0 && <p className="mt-6 text-sm text-[#D5BFA8]">{renderText(language, `السؤال ${Math.min(step + 1, questions.length)} من ${questions.length}`, `Question ${Math.min(step + 1, questions.length)} of ${questions.length}`)}</p>}
          </div>
          <div className="min-h-[330px] border border-[#F2E9DF]/15 bg-[#140409] p-6 md:p-10">
            {adminMode && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#F2E9DF]/15 pb-4">
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#D5BFA8]">MADAR · SCENT QUIZ</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setQuizEditMode(false)} aria-pressed={!quizEditMode} className={`border px-3 py-2 text-xs ${!quizEditMode ? 'border-[#D5BFA8]/60 bg-[#581528]/40 text-[#F2E9DF]' : 'border-[#F2E9DF]/15 text-[#A8958B]'}`}>👁 تجربة الاختبار</button>
                  <button type="button" onClick={() => setQuizEditMode(true)} aria-pressed={quizEditMode} className={`border px-3 py-2 text-xs ${quizEditMode ? 'border-[#D5BFA8]/60 bg-[#581528]/40 text-[#F2E9DF]' : 'border-[#F2E9DF]/15 text-[#A8958B]'}`}>✎ تعديل أسئلة ونتائج الاختبار</button>
                </div>
              </div>
            )}
            {adminMode && quizEditMode ? (
              <div className="space-y-4">
                {questions.map((item, questionIndex) => (
                  <section key={item.id} className="space-y-3 border border-[#F2E9DF]/10 bg-[#100408] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-[#D5BFA8]">{renderText(language, 'السؤال', 'Question')} {questionIndex + 1}</h3>
                      <button type="button" onClick={() => onSaveQuestions(questions.filter((entry) => entry.id !== item.id))} className="border border-rose-200/20 px-3 py-2 text-xs text-rose-200">حذف السؤال</button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <input aria-label="Question Arabic" value={item.question_ar || ''} onChange={(event) => updateQuestion(item.id, { question_ar: event.target.value })} placeholder="السؤال بالعربية" className="w-full border border-[#F2E9DF]/15 bg-[#090204] p-3 text-sm text-[#F2E9DF]" />
                      <input aria-label="Question English" value={item.question_en || ''} onChange={(event) => updateQuestion(item.id, { question_en: event.target.value })} placeholder="Question in English" className="w-full border border-[#F2E9DF]/15 bg-[#090204] p-3 text-sm text-[#F2E9DF]" />
                    </div>
                    {(item.options || []).map((option, optionIndex) => (
                      <div key={option.id} className="space-y-3 border border-[#F2E9DF]/10 p-3">
                        <div className="flex items-center justify-between text-xs text-[#A8958B]">
                          <span>{renderText(language, 'إجابة', 'Answer')} {optionIndex + 1}</span>
                          <button type="button" onClick={() => updateQuestion(item.id, { options: item.options.filter((entry) => entry.id !== option.id) })} className="text-rose-200">حذف الإجابة ×</button>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {[
                            ['label_ar', 'نص الإجابة بالعربية'],
                            ['label_en', 'Answer label (English)'],
                            ['desc_ar', 'وصف قصير بالعربية'],
                            ['desc_en', 'Optional subtitle in English'],
                          ].map(([key, placeholder]) => <input key={key} aria-label={placeholder} value={option[key] || ''} onChange={(event) => updateOption(item.id, option.id, { [key]: event.target.value })} placeholder={placeholder} className="w-full border border-[#F2E9DF]/15 bg-[#090204] p-3 text-sm text-[#F2E9DF]" />)}
                        </div>
                        <p className="text-[10px] text-[#A8958B]">اختر العطور التي تظهر كنتيجة لهذه الإجابة</p>
                        <div className="flex flex-wrap gap-2">
                          {products.map((product) => {
                            const selected = (option.recommended_product_ids || []).includes(product.id)
                            return <button key={product.id} type="button" aria-pressed={selected} onClick={() => updateOption(item.id, option.id, { recommended_product_ids: selected ? option.recommended_product_ids.filter((id) => id !== product.id) : [...(option.recommended_product_ids || []), product.id] })} className={`rounded-full border px-3 py-2 text-[10px] ${selected ? 'border-[#D5BFA8]/60 bg-[#581528]/50 text-[#F2E9DF]' : 'border-[#F2E9DF]/10 text-[#A8958B]'}`}>{renderText(language, product.name_ar, product.name_en)}</button>
                          })}
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(item)} className="border border-dashed border-[#D5BFA8]/40 px-3 py-2 text-xs text-[#D5BFA8]">+ إضافة إجابة</button>
                  </section>
                ))}
                <button type="button" onClick={addQuestion} className="border border-dashed border-[#D5BFA8]/50 px-4 py-3 text-sm text-[#D5BFA8]">+ إضافة سؤال</button>
              </div>
            ) : questions.length > 0 && step < questions.length ? (
              <>
                <div className="mb-8 flex items-center justify-between border-b border-[#F2E9DF]/15 pb-5">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-[#D5BFA8]">{language === 'ar' ? `السؤال ${step + 1}` : `QUESTION ${String(step + 1).padStart(2, '0')}`}</span>
                  <span className="font-['Cormorant_Garamond'] text-2xl text-[#D5BFA8]">{String(step + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}</span>
                </div>
                <h3 className="mb-6 font-['Readex_Pro'] text-2xl leading-relaxed text-[#F2E9DF]">{renderText(language, question.question_ar, question.question_en)}</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {(question.options || []).map((option, index) => (
                    <button key={option.id} type="button" aria-pressed={answers[question.id] === option.id} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} className={`group flex min-h-16 items-center justify-between border px-4 py-3 text-start text-sm transition hover:border-[#D5BFA8]/60 hover:bg-[#581528]/20 hover:text-[#F2E9DF] ${answers[question.id] === option.id ? 'border-[#D5BFA8]/60 bg-[#581528]/30 text-[#F2E9DF]' : 'border-[#F2E9DF]/15 text-[#A8958B]'}`}>
                      <span>{renderText(language, option.label_ar, option.label_en)}{(option.desc_ar || option.desc_en) && <span className="mt-1 block text-xs text-[#A8958B]">{renderText(language, option.desc_ar, option.desc_en)}</span>}</span><span className="font-['Cormorant_Garamond'] text-lg text-[#D5BFA8]">{String(index + 1).padStart(2, '0')}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-between">
                  <button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className="border border-[#F2E9DF]/20 px-5 py-3 text-sm text-[#F2E9DF] disabled:opacity-40">
                    {renderText(language, 'السابق', 'Previous')}
                  </button>
                  <button type="button" disabled={!answers[question.id]} onClick={() => setStep((current) => current + 1)} className="bg-[#F2E9DF] px-5 py-3 text-sm font-medium text-[#1A050B] disabled:opacity-40">
                    {renderText(language, step === questions.length - 1 ? 'اعرف عطرك' : 'التالي', step === questions.length - 1 ? 'See your match' : 'Next')}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#D5BFA8]">{renderText(language, 'عطور تناسبك', 'YOUR SCENT MATCH')}</span>
                <div className="mt-5 space-y-4">
                  {recommendations.map((recommendation) => {
                    const selectedSize = recommendation.sizes?.find((size) => size.size === selectedSizes[recommendation.id]) || recommendation.sizes?.[0]
                    return (
                      <article key={recommendation.id} className="grid overflow-hidden border border-[#F2E9DF]/10 bg-[#090204] md:grid-cols-[.8fr_1.2fr]">
                        <div className="min-h-[270px]"><ProductAngleGallery product={recommendation} language={language} /></div>
                        <div className="p-4">
                          <span className="inline-flex border border-[#D5BFA8]/40 bg-[#581528]/30 px-3 py-2 text-[10px] text-[#F2E9DF]">{renderText(language, 'تطابق مثالي مع شخصيتك • 98%', '98% Match for Your Personality')}</span>
                          <h3 className="mt-3 font-['Readex_Pro'] text-xl text-[#F2E9DF]">{renderText(language, recommendation.name_ar, recommendation.name_en)}</h3>
                          <p className="mt-2 text-sm text-[#A8958B]">{renderText(language, recommendation.subtitle_ar, recommendation.subtitle_en)}</p>
                          <div className="mt-3 space-y-2">
                            {[
                              [renderText(language, 'النفحات العليا', 'TOP NOTES'), language === 'ar' ? recommendation.top_notes_ar : recommendation.top_notes_en],
                              [renderText(language, 'قلب العطر', 'HEART NOTES'), language === 'ar' ? recommendation.heart_notes_ar : recommendation.heart_notes_en],
                              [renderText(language, 'النفحات الأساسية', 'BASE NOTES'), language === 'ar' ? recommendation.base_notes_ar : recommendation.base_notes_en],
                            ].map(([label, notes]) => <p key={label} className="text-xs leading-5 text-[#D5BFA8]"><span className="me-2 text-[#A8958B]">{label}</span>{(notes || []).join(' · ')}</p>)}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                          {recommendation.sizes?.map((size) => (
                            <button key={size.size} type="button" disabled={size.in_stock === false} onClick={() => setSelectedSizes((current) => ({ ...current, [recommendation.id]: size.size }))} className={`border px-3 py-2 text-xs ${selectedSize?.size === size.size ? 'border-[#D5BFA8] bg-[#581528] text-[#F2E9DF]' : 'border-[#F2E9DF]/15 text-[#A8958B]'} disabled:opacity-40`}>
                              {size.size}
                            </button>
                          ))}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <DiscountPrice size={selectedSize} language={language} />
                            <button type="button" disabled={!selectedSize || selectedSize.in_stock === false} onClick={() => addToCart(recommendation, selectedSize)} className="bg-[#F2E9DF] px-4 py-3 text-sm font-semibold text-[#1A050B] disabled:opacity-40">{renderText(language, 'أضف إلى السلة', 'Add to Bag')}</button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={() => setStep(questions.length - 1)} className="border border-[#F2E9DF]/20 px-4 py-3 text-sm text-[#F2E9DF]">{renderText(language, 'السابق', 'Previous')}</button>
                  <button type="button" onClick={() => { setAnswers({}); setSelectedSizes({}); setStep(0) }} className="flex items-center gap-2 px-4 py-3 text-sm text-[#A8958B] hover:text-[#D5BFA8]"><RefreshCw className="h-3 w-3" /> {renderText(language, 'ابدأ من جديد', 'RESTART')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function MadarLogo({ compact = false, settings = {} }) {
  const imageUrl = settings.logo_ar_url || '/logo-ar.png'
  const [failedImageUrl, setFailedImageUrl] = useState('')

  if (failedImageUrl !== imageUrl) {
    return <img src={imageUrl} alt="مدار" onError={() => setFailedImageUrl(imageUrl)} className={compact ? 'h-9 max-w-20 object-contain' : 'h-16 max-w-36 object-contain'} />
  }

  return (
    <svg viewBox="0 0 180 72" role="img" aria-label="مدار" className={compact ? 'h-9 w-20' : 'h-16 w-36'}>
      <text x="90" y="52" textAnchor="middle" fill="#F2E9DF" fontFamily="Amiri, serif" fontSize="56" fontWeight="700">مدار</text>
    </svg>
  )
}

function MadarBrandLockup({ settings, compact = false }) {
  const [failedEnglishImageUrl, setFailedEnglishImageUrl] = useState('')
  const englishImageUrl = settings.logo_en_url

  return (
    <div className="flex items-center gap-2 sm:gap-3" aria-label="مدار MADAR">
      <MadarLogo compact={compact} settings={settings} />
      {englishImageUrl && failedEnglishImageUrl !== englishImageUrl
        ? <img src={englishImageUrl} alt="MADAR" onError={() => setFailedEnglishImageUrl(englishImageUrl)} className={compact ? 'h-7 max-w-24 object-contain' : 'h-12 max-w-40 object-contain'} />
        : <span className={`font-['Readex_Pro'] font-extrabold tracking-[0.12em] text-[#F2E9DF] ${compact ? 'text-sm sm:text-base' : 'text-2xl sm:text-3xl'}`}>MADAR</span>}
    </div>
  )
}

function ProductOrbitModal({ product, onClose, language, addToCart, isWishlisted, onToggleWishlist, adminEditMode = false, categories = [], onSaveProduct }) {
  const [selectedSizeName, setSelectedSizeName] = useState('')
  const [activeAngle, setActiveAngle] = useState(0)
  const [draft, setDraft] = useState(() => structuredClone(product))
  const [imageError, setImageError] = useState('')

  if (!product) return null
  const currentProduct = adminEditMode ? draft : product
  const sizes = currentProduct.sizes || []
  const activeSize = sizes.find((size) => size.size === selectedSizeName) || sizes[0]
  const longevityPercent = Math.min(100, Math.max(0, Number(currentProduct.longevity_percent ?? Number(currentProduct.longevity) * 8)))
  const sillagePercent = Math.min(100, Math.max(0, Number(currentProduct.sillage_percent ?? currentProduct.sillage ?? 0)))
  const updateDraft = (patch) => setDraft((current) => ({ ...current, ...patch }))
  const updateSize = (index, patch) => updateDraft({ sizes: sizes.map((size, sizeIndex) => sizeIndex === index ? { ...size, ...patch } : size) })
  const updateAngleImage = (image) => {
    const gallery_images = [...(currentProduct.gallery_images || ['', '', ''])]
    gallery_images[activeAngle] = image
    updateDraft({ gallery_images, ...(activeAngle === 0 ? { image_url: image } : {}) })
  }
  const uploadAngleImage = async (file) => {
    setImageError('')
    try {
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
      updateAngleImage(canvas.toDataURL('image/jpeg', 0.84))
    } catch (error) {
      setImageError(error.message || 'تعذر تحميل الصورة.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#140409]/75 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[88vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[#F2E9DF]/15 bg-[#1D070E] shadow-glow">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#F2E9DF]/10 bg-[#1D070E]/95 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#D5BFA8]">{renderText(language, 'مدار عطري', 'Fragrance Orbit')}</p>
            <h3 className="mt-1 font-['Readex_Pro'] text-xl leading-relaxed text-[#F2E9DF]">{renderText(language, currentProduct.name_ar, currentProduct.name_en)}</h3>
          </div>
          <div className="flex items-center gap-2">
            {!adminEditMode && <button type="button" aria-pressed={isWishlisted} aria-label={renderText(language, 'إضافة إلى قائمة الأمنيات', 'Toggle wishlist')} onClick={() => onToggleWishlist(product.id)} className={`rounded-full border p-2 ${isWishlisted ? 'border-[#D5BFA8] bg-[#581528] text-[#F2E9DF]' : 'border-[#F2E9DF]/15 text-[#A8958B]'}`}><Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} /></button>}
            <button type="button" aria-label={renderText(language, 'إغلاق التفاصيل', 'Close details')} onClick={onClose} className="rounded-full border border-[#F2E9DF]/15 p-2 text-[#F2E9DF]">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-fit overflow-hidden rounded-[20px] border border-[#F2E9DF]/10 bg-[#140409]">
              <div className="flex items-center justify-between border-b border-[#F2E9DF]/10 px-4 py-2">
                <p className="text-xs uppercase tracking-[0.18em] text-[#D5BFA8]">{renderText(language, 'عرض المنتج من 3 زوايا', '3-Angle Product Gallery')}</p>
              </div>
              <ProductAngleGallery product={currentProduct} language={language} modal activeAngle={activeAngle} onAngleChange={setActiveAngle} />
              {adminEditMode && (
                <div className="space-y-2 border-t border-[#F2E9DF]/10 p-4">
                  <label className="grid gap-1 text-xs text-[#D5BFA8]">صورة الزاوية 0{activeAngle + 1} · رابط الصورة
                    <input value={currentProduct.gallery_images?.[activeAngle] || ''} onChange={(event) => updateAngleImage(event.target.value)} placeholder="Image URL" className="border border-[#F2E9DF]/15 bg-[#090204] p-3 text-sm text-[#F2E9DF]" />
                  </label>
                  <label className="inline-flex cursor-pointer border border-[#D5BFA8]/30 px-3 py-2 text-xs text-[#D5BFA8]">رفع صورة من الجهاز
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadAngleImage(file) }} />
                  </label>
                  {imageError && <p role="alert" className="text-xs text-rose-200">{imageError}</p>}
                </div>
              )}
            </div>

            <div className="space-y-4">
            <div className="rounded-[24px] border border-[#F2E9DF]/10 bg-[#140409]/50 p-4">
              <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#D5BFA8]">{renderText(language, 'عن العطر', 'About the Fragrance')}</p>
              <p dir={language === 'ar' ? 'rtl' : 'ltr'} className="text-sm leading-7 text-[#F2E9DF]/85">
                {renderText(language, currentProduct.description_ar || currentProduct.subtitle_ar, currentProduct.description_en || currentProduct.subtitle_en)}
              </p>
            </div>
            <div className="rounded-[24px] border border-[#F2E9DF]/10 bg-[#140409]/50 p-4">
              <div className="mb-3 flex items-center justify-between text-sm text-[#A8958B]">
                <span>{renderText(language, 'درجة الثبات', 'Longevity')}</span>
                <span>{renderText(language, currentProduct.longevity_label_ar || `${currentProduct.longevity || 10} ساعات`, currentProduct.longevity_label_en || `${currentProduct.longevity || 10}h`)} · {longevityPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#F2E9DF]/10">
                <div className="h-full rounded-full bg-[#D5BFA8]" style={{ width: `${longevityPercent}%` }} />
              </div>
              {adminEditMode && <input aria-label="Longevity percentage" type="range" min="0" max="100" value={longevityPercent} onChange={(event) => updateDraft({ longevity_percent: Number(event.target.value) })} className="mt-3 w-full accent-[#D5BFA8]" />}
            </div>

            <div className="rounded-[24px] border border-[#F2E9DF]/10 bg-[#140409]/50 p-4">
              <div className="mb-3 flex items-center justify-between text-sm text-[#A8958B]">
                <span>{renderText(language, 'قوة الفوحان', 'Sillage & Projection')}</span>
                <span>{sillagePercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#F2E9DF]/10">
                <div className="h-full rounded-full bg-[#D5BFA8]" style={{ width: `${sillagePercent}%` }} />
              </div>
              {adminEditMode && <input aria-label="Sillage percentage" type="range" min="0" max="100" value={sillagePercent} onChange={(event) => updateDraft({ sillage_percent: Number(event.target.value) })} className="mt-3 w-full accent-[#D5BFA8]" />}
            </div>

            <div className="rounded-[24px] border border-[#F2E9DF]/10 bg-[#140409]/50 p-4">
              <p className="mb-3 text-sm uppercase tracking-[0.2em] text-[#D5BFA8]">{renderText(language, 'اختر الحجم:', 'Select Size:')}</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button key={size.size} type="button" onClick={() => setSelectedSizeName(size.size)} className={`min-h-11 border px-3 py-2 text-sm text-[#F2E9DF] ${activeSize?.size === size.size ? 'border-[#D5BFA8]' : 'border-[#F2E9DF]/15'}`}>
                    {size.size}
                  </button>
                ))}
              </div>
              <DiscountPrice size={activeSize} language={language} className="mt-4" />
              {adminEditMode && sizes.map((size, index) => {
                const discount = size.compare_price > size.price && size.compare_price > 0 ? Math.round((size.compare_price - size.price) / size.compare_price * 100) : 0
                return <div key={`${size.size}-controls`} className="mt-4 space-y-3 border-t border-[#F2E9DF]/10 pt-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="grid gap-1 text-[10px] text-[#A8958B]">الحجم<input value={size.size} onChange={(event) => updateSize(index, { size: event.target.value })} className="border border-[#F2E9DF]/15 bg-[#090204] p-2 text-sm text-[#F2E9DF]" /></label>
                    <label className="grid gap-1 text-[10px] text-[#A8958B]">السعر الحقيقي للبيع (price)<input type="number" min="0" value={size.price} onChange={(event) => updateSize(index, { price: Number(event.target.value) })} className="border border-[#F2E9DF]/15 bg-[#090204] p-2 text-sm text-[#F2E9DF]" /></label>
                    <label className="grid gap-1 text-[10px] text-[#A8958B]">السعر قبل الخصم (compare_price)<input type="number" min="0" value={size.compare_price} onChange={(event) => updateSize(index, { compare_price: Number(event.target.value) })} className="border border-[#F2E9DF]/15 bg-[#090204] p-2 text-sm text-[#F2E9DF]" /></label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">{[15, 25, 35].map((percent) => <button key={percent} type="button" onClick={() => updateSize(index, { compare_price: Math.ceil((Number(size.price || 0) / (1 - percent / 100)) / 5) * 5 })} className="border border-[#D5BFA8]/25 px-2 py-1 text-[10px] text-[#D5BFA8]">+{percent}% خصم</button>)}<label className="ms-auto flex items-center gap-2 text-[10px] text-[#A8958B]"><input type="checkbox" checked={size.in_stock !== false} onChange={(event) => updateSize(index, { in_stock: event.target.checked })} />متوفر</label><button type="button" onClick={() => { updateDraft({ sizes: sizes.filter((_, sizeIndex) => sizeIndex !== index) }); if (selectedSizeName === size.size) setSelectedSizeName('') }} className="text-xs text-rose-200">حذف الحجم ×</button></div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#D5BFA8]"><span>{discount ? `SAVE ${discount}%` : 'لا يوجد خصم'}</span><DiscountPrice size={size} language={language} /></div>
                </div>
              })}
              {adminEditMode && <button type="button" onClick={() => updateDraft({ sizes: [...sizes, { size: '30ml', price: 0, compare_price: 0, in_stock: true }] })} className="mt-3 border border-dashed border-[#D5BFA8]/35 px-3 py-2 text-xs text-[#D5BFA8]">+ حجم جديد</button>}
            </div>

            {!adminEditMode && <button type="button" disabled={!activeSize || activeSize.in_stock === false} onClick={() => addToCart(product, activeSize)} className="w-full border border-[#F2E9DF] bg-[#F2E9DF] px-5 py-3 font-medium text-[#1A050B] transition-colors hover:border-[#F2E9DF]/40 hover:bg-[#581528] hover:text-[#F2E9DF] disabled:opacity-40">{renderText(language, 'أضف إلى السلة', 'Add to Bag')}</button>}

            </div>
          </div>
          {adminEditMode && (
            <section className="grid gap-3 rounded-[20px] border border-[#F2E9DF]/10 bg-[#140409]/60 p-4 md:grid-cols-2">
              <h4 className="md:col-span-2 text-sm text-[#D5BFA8]">بيانات العطر / Product Details</h4>
              {[
                ['name_ar', 'اسم العطر بالعربية'],
                ['name_en', 'Product name (English)'],
                ['subtitle_ar', 'العنوان الفرعي بالعربية'],
                ['subtitle_en', 'Subtitle (English)'],
                ['description_ar', 'وصف العطر بالعربية'],
                ['description_en', 'Description in English'],
              ].map(([key, label]) => (
                <label key={key} className="grid gap-1 text-xs text-[#D5BFA8]">{label}
                  {key.startsWith('description')
                    ? <textarea value={currentProduct[key] || ''} onChange={(event) => updateDraft({ [key]: event.target.value })} className="min-h-20 border border-[#F2E9DF]/15 bg-[#090204] p-3 text-sm text-[#F2E9DF]" />
                    : <input value={currentProduct[key] || ''} onChange={(event) => updateDraft({ [key]: event.target.value })} className="border border-[#F2E9DF]/15 bg-[#090204] p-3 text-sm text-[#F2E9DF]" />}
                </label>
              ))}
              <label className="grid gap-1 text-xs text-[#D5BFA8]">القسم / Category
                <select value={currentProduct.category_id || ''} onChange={(event) => updateDraft({ category_id: event.target.value })} className="border border-[#F2E9DF]/15 bg-[#090204] p-3 text-sm text-[#F2E9DF]">
                  {categories.filter((category) => category.slug !== 'all').map((category) => <option key={category.id} value={category.id}>{renderText(language, category.name_ar, category.name_en)}</option>)}
                </select>
              </label>
            </section>
          )}
          {adminEditMode && (
            <div className="flex justify-end gap-2 border-t border-[#F2E9DF]/10 pt-4">
              <button type="button" onClick={onClose} className="border border-[#F2E9DF]/20 px-4 py-3 text-sm">إلغاء</button>
              <button type="button" onClick={() => onSaveProduct(draft)} className="bg-[#F2E9DF] px-5 py-3 text-sm font-semibold text-[#140409]">حفظ التعديلات ✓</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CustomerProfileModal({
  open,
  language,
  currentCustomer,
  orders,
  products,
  onClose,
  onLogin,
  onRegister,
  onUpdate,
  onLogout,
  addToCart,
}) {
  const [guestTab, setGuestTab] = useState('login')
  const [profileTab, setProfileTab] = useState('orders')
  const [quickTrackOpen, setQuickTrackOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [signIn, setSignIn] = useState({ phone: '', password: '' })
  const [registration, setRegistration] = useState({
    full_name: '', phone: '', password: '', alt_phone: '', governorate: 'القاهرة',
    city: currentCustomer?.city || '',
    address_details: currentCustomer?.address_details || '',
    notes: currentCustomer?.notes || '',
  })
  const [profile, setProfile] = useState(() => ({
    full_name: currentCustomer?.full_name || '',
    phone: currentCustomer?.phone || '',
    alt_phone: currentCustomer?.alt_phone || '',
    governorate: currentCustomer?.governorate || 'القاهرة',
    city: '', address_details: '', notes: '',
  }))
  const isArabic = language === 'ar'
  const t = (ar, en) => renderText(language, ar, en)
  const matchingOrders = orders.filter((order) => {
    const belongsToCustomer = currentCustomer
      ? order.customer_id === currentCustomer.id || String(order.customer_phone || '').replace(/\D/g, '').endsWith(String(currentCustomer.phone || '').replace(/\D/g, '').slice(-10))
      : false
    if (!belongsToCustomer) return false
    return !query.trim() || String(order.order_number || '').toLowerCase().includes(query.trim().toLowerCase())
  })
  const quickOrder = !currentCustomer && query.trim()
    ? orders.find((order) => String(order.order_number || '').toLowerCase() === query.trim().toLowerCase())
    : null
  const statuses = [
    { key: 'pending', ar: 'قيد المراجعة', en: 'Under review', Icon: Clock },
    { key: 'confirmed', ar: 'تم تأكيد الطلب', en: 'Confirmed', Icon: Package },
    { key: 'shipped', ar: 'خرج مع المندوب', en: 'Out for delivery', Icon: Truck },
    { key: 'delivered', ar: 'تم التسليم', en: 'Delivered', Icon: CheckCircle2 },
  ]

  const handleLogin = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const customer = await onLogin(signIn.phone, signIn.password)
      setProfile({
        full_name: customer.full_name || '', phone: customer.phone || '', alt_phone: customer.alt_phone || '',
        governorate: customer.governorate || 'القاهرة', city: customer.city || '',
        address_details: customer.address_details || '', notes: customer.notes || '',
      })
      setProfileTab('orders')
      setSignIn({ phone: '', password: '' })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const customer = await onRegister(registration)
      setProfile({
        full_name: customer.full_name || '', phone: customer.phone || '', alt_phone: customer.alt_phone || '',
        governorate: customer.governorate || 'القاهرة', city: customer.city || '',
        address_details: customer.address_details || '', notes: customer.notes || '',
      })
      setProfileTab('orders')
    } catch (registerError) {
      setError(registerError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const customer = await onUpdate(profile)
      setProfile({
        full_name: customer.full_name || '', phone: customer.phone || '', alt_phone: customer.alt_phone || '',
        governorate: customer.governorate || 'القاهرة', city: customer.city || '',
        address_details: customer.address_details || '', notes: customer.notes || '',
      })
      setSuccess(t('تم حفظ بياناتك بنجاح.', 'Your profile has been saved.'))
    } catch (profileError) {
      setError(profileError.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[75] flex justify-end bg-[#090204]/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="customer-profile-title">
      <button type="button" aria-label={t('إغلاق الحساب', 'Close profile')} onClick={onClose} className="absolute inset-0 h-full w-full cursor-default" />
      <section className="relative z-10 flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-s border-[#F2E9DF]/15 bg-[#140409] p-4 shadow-2xl sm:p-6">
        <header className="mb-5 flex items-center justify-between border-b border-[#F2E9DF]/10 pb-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#D5BFA8]">MADAR • CUSTOMER ORBIT</p>
            <h2 id="customer-profile-title" className="mt-1 font-['Readex_Pro'] text-2xl text-[#F2E9DF]">{t('حسابي', 'My Profile')}</h2>
          </div>
          <button type="button" aria-label={t('إغلاق الحساب', 'Close profile')} onClick={onClose} className="rounded-full border border-[#F2E9DF]/15 p-2 text-[#F2E9DF]"><X className="h-5 w-5" /></button>
        </header>

        {currentCustomer ? (
          <>
            <div className="mb-4 rounded-2xl border border-[#D5BFA8]/30 bg-[#581528]/25 p-4">
              <p className="text-lg text-[#F2E9DF]">{currentCustomer.full_name}</p>
              <p className="mt-1 text-sm text-[#A8958B]">{currentCustomer.phone}</p>
            </div>
            <nav className="mb-4 grid grid-cols-3 gap-2">
              {[
                ['orders', t('طلباتي وتتبع الشحنات', 'My Orders & Tracking')],
                ['profile', t('بياناتي وعنوان التوصيل', 'Saved Delivery Profile')],
                ['logout', t('تسجيل الخروج', 'Logout')],
              ].map(([key, label]) => (
                <button key={key} type="button" onClick={() => key === 'logout' ? onLogout() : setProfileTab(key)} className={`min-h-11 border px-2 py-2 text-xs ${profileTab === key ? 'border-[#D5BFA8]/60 bg-[#581528]/40 text-[#F2E9DF]' : 'border-[#F2E9DF]/10 text-[#A8958B]'}`}>
                  {key === 'logout' && <LogOut className="mx-auto mb-1 h-4 w-4" />}
                  {label}
                </button>
              ))}
            </nav>
            {profileTab === 'orders' && (
              <div className="min-h-0 flex-1 space-y-3">
                <label className="relative block">
                  <Search className={`absolute top-3 h-4 w-4 text-[#A8958B] ${isArabic ? 'right-3' : 'left-3'}`} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('ابحث برقم الطلب MDR-XXXX', 'Search order number MDR-XXXX')} className={`min-h-11 w-full rounded-full border border-[#F2E9DF]/15 bg-[#1D070E] py-2 text-sm text-[#F2E9DF] ${isArabic ? 'pr-10 pl-4' : 'pl-10 pr-4'}`} />
                </label>
                {!matchingOrders.length && <p className="rounded-2xl border border-dashed border-[#F2E9DF]/15 p-5 text-center text-sm text-[#A8958B]">{t('لا توجد طلبات مرتبطة بحسابك بعد.', 'No orders are linked to your account yet.')}</p>}
                {matchingOrders.map((order) => {
                  const stageIndex = statuses.findIndex((status) => status.key === order.status)
                  return (
                    <article key={order.id} className="rounded-2xl border border-[#F2E9DF]/10 bg-[#1D070E] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div><h3 className="font-semibold text-[#F2E9DF]">#{order.order_number}</h3><p className="mt-1 text-xs text-[#A8958B]">{new Date(order.created_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-GB')}</p></div>
                        <strong className="text-sm text-[#D5BFA8]">{formatMoney(order.total, language)}</strong>
                      </div>
                      <p className="mt-2 flex items-start gap-2 text-xs text-[#A8958B]"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{[order.governorate, order.city, order.address_details].filter(Boolean).join(' - ')}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#F2E9DF]">
                        {(order.items || []).map((item, index) => <span key={`${order.id}-${index}`} className="rounded-full border border-[#F2E9DF]/10 px-2 py-1">{item.name_ar || item.name} · {item.size} × {item.quantity}</span>)}
                      </div>
                      {order.status === 'cancelled' ? (
                        <p className="mt-4 border border-[#7A1C37] bg-[#581528]/30 p-2 text-sm text-[#F2E9DF]">{t('تم إلغاء الطلب', 'Order cancelled')}</p>
                      ) : (
                        <ol className="mt-4 grid grid-cols-4 gap-1">
                          {statuses.map(({ key, ar, en, Icon }, index) => (
                            <li key={key} className={`min-w-0 text-center text-[9px] ${stageIndex >= index ? 'text-[#F2E9DF]' : 'text-[#A8958B]/60'}`}>
                              <span className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border ${stageIndex >= index ? 'border-[#D5BFA8]/60 bg-[#581528]' : 'border-[#F2E9DF]/15'}`}><Icon className="h-3.5 w-3.5" /></span>
                              {t(ar, en)}
                            </li>
                          ))}
                        </ol>
                      )}
                      <button type="button" onClick={() => (order.items || []).forEach((item) => {
                        const product = products.find((candidate) => candidate.id === item.product_id || candidate.name_en === item.name)
                        const size = product?.sizes?.find((option) => option.size === item.size)
                        if (product && size) for (let count = 0; count < Number(item.quantity || 1); count += 1) addToCart(product, size)
                      })} className="mt-4 min-h-11 w-full border border-[#F2E9DF]/20 px-3 py-2 text-sm text-[#F2E9DF] hover:bg-[#581528]">
                        <RefreshCw className="me-2 inline h-4 w-4" />{t('إعادة طلب نفس العطور', 'Reorder these fragrances')}
                      </button>
                    </article>
                  )
                })}
              </div>
            )}
            {profileTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <CustomerDeliveryFields values={profile} onChange={setProfile} language={language} governorates={governorates} includePhones />
                {success && <p role="status" className="text-sm text-[#D5BFA8]">{success}</p>}
                {error && <p role="alert" className="text-sm text-[#F2E9DF]">{error}</p>}
                <button disabled={saving} type="submit" className="min-h-11 w-full bg-[#F2E9DF] px-4 py-2 font-semibold text-[#1A050B] disabled:opacity-50"><Save className="me-2 inline h-4 w-4" />{t('حفظ التعديلات', 'Save Profile')}</button>
              </form>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setGuestTab('login'); setError('') }} className={`min-h-11 border px-3 py-2 text-sm ${guestTab === 'login' ? 'border-[#D5BFA8]/60 bg-[#581528]/40 text-[#F2E9DF]' : 'border-[#F2E9DF]/10 text-[#A8958B]'}`}><LogIn className="me-2 inline h-4 w-4" />{t('تسجيل الدخول', 'Sign In')}</button>
              <button type="button" onClick={() => { setGuestTab('register'); setError('') }} className={`min-h-11 border px-3 py-2 text-sm ${guestTab === 'register' ? 'border-[#D5BFA8]/60 bg-[#581528]/40 text-[#F2E9DF]' : 'border-[#F2E9DF]/10 text-[#A8958B]'}`}><UserPlus className="me-2 inline h-4 w-4" />{t('إنشاء حساب', 'Create Account')}</button>
            </div>
            {guestTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <input required autoComplete="tel" type="tel" value={signIn.phone} onChange={(event) => setSignIn((current) => ({ ...current, phone: event.target.value }))} placeholder={t('رقم الموبايل', 'Phone Number')} className="min-h-11 w-full rounded-full border border-[#F2E9DF]/15 bg-[#1D070E] px-4 py-2 text-sm text-[#F2E9DF]" />
                <input required autoComplete="current-password" type="password" value={signIn.password} onChange={(event) => setSignIn((current) => ({ ...current, password: event.target.value }))} placeholder={t('كلمة المرور', 'Password')} className="min-h-11 w-full rounded-full border border-[#F2E9DF]/15 bg-[#1D070E] px-4 py-2 text-sm text-[#F2E9DF]" />
                <button type="button" onClick={() => setSignIn({ phone: '01012345678', password: '1234' })} className="text-xs text-[#D5BFA8]">{t('حساب تجريبي: 01012345678 / 1234', 'Demo account: 01012345678 / 1234')}</button>
                <button disabled={saving} type="submit" className="min-h-11 w-full bg-[#F2E9DF] px-4 py-2 font-semibold text-[#1A050B] disabled:opacity-50">{saving ? t('جارٍ تسجيل الدخول…', 'Signing in…') : t('دخول إلى حسابي', 'Sign In')}</button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <input required value={registration.full_name} onChange={(event) => setRegistration((current) => ({ ...current, full_name: event.target.value }))} placeholder={t('الاسم بالكامل', 'Full Name')} className="min-h-11 w-full rounded-full border border-[#F2E9DF]/15 bg-[#1D070E] px-4 py-2 text-sm text-[#F2E9DF]" />
                <input required type="tel" inputMode="tel" value={registration.phone} onChange={(event) => setRegistration((current) => ({ ...current, phone: event.target.value }))} placeholder={t('رقم الموبايل الأساسي', 'Phone Number')} className="min-h-11 w-full rounded-full border border-[#F2E9DF]/15 bg-[#1D070E] px-4 py-2 text-sm text-[#F2E9DF]" />
                <input required minLength={4} type="password" value={registration.password} onChange={(event) => setRegistration((current) => ({ ...current, password: event.target.value }))} placeholder={t('كلمة المرور (4 أحرف على الأقل)', 'Password (4+ characters)')} className="min-h-11 w-full rounded-full border border-[#F2E9DF]/15 bg-[#1D070E] px-4 py-2 text-sm text-[#F2E9DF]" />
                <input type="tel" value={registration.alt_phone} onChange={(event) => setRegistration((current) => ({ ...current, alt_phone: event.target.value }))} placeholder={t('رقم موبايل إضافي (اختياري)', 'Alternate Phone (Optional)')} className="min-h-11 w-full rounded-full border border-[#F2E9DF]/15 bg-[#1D070E] px-4 py-2 text-sm text-[#F2E9DF]" />
                <CustomerDeliveryFields values={registration} onChange={setRegistration} language={language} governorates={governorates} omitName />
                <button disabled={saving} type="submit" className="min-h-11 w-full bg-[#F2E9DF] px-4 py-2 font-semibold text-[#1A050B] disabled:opacity-50">{t('إنشاء حساب جديد', 'Create Account')}</button>
              </form>
            )}
            {error && <p role="alert" className="mt-3 text-sm text-[#F2E9DF]">{error}</p>}
            <div className="mt-auto border-t border-[#F2E9DF]/10 pt-4">
              <button type="button" aria-expanded={quickTrackOpen} onClick={() => setQuickTrackOpen((value) => !value)} className="flex min-h-11 w-full items-center justify-between text-start text-sm text-[#D5BFA8]">
                {t('تتبع طلب سريع برقم الطلب', 'Quick Track by Order #')}<span>{quickTrackOpen ? '−' : '+'}</span>
              </button>
              {quickTrackOpen && (
                <div className="mt-3 space-y-3">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="MDR-8492" className="min-h-11 w-full rounded-full border border-[#F2E9DF]/15 bg-[#1D070E] px-4 py-2 text-sm text-[#F2E9DF]" />
                  {quickOrder ? (
                    <div className="rounded-xl border border-[#F2E9DF]/10 bg-[#1D070E] p-3 text-sm text-[#A8958B]">
                      <strong className="text-[#F2E9DF]">#{quickOrder.order_number}</strong>
                      <p className="mt-1">{quickOrder.status} · {formatMoney(quickOrder.total, language)}</p>
                      <p className="mt-1">{(quickOrder.items || []).map((item) => `${item.name_ar || item.name} ${item.size} × ${item.quantity}`).join('، ')}</p>
                      <p className="mt-1">{[quickOrder.governorate, quickOrder.city, quickOrder.address_details].filter(Boolean).join(' - ')}</p>
                    </div>
                  ) : query.trim() ? <p className="text-xs text-[#A8958B]">{t('لا يوجد طلب بهذا الرقم.', 'No order found with that number.')}</p> : null}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function CustomerDeliveryFields({ values, onChange, language, governorates, omitName = false, includePhones = false }) {
  const t = (ar, en) => renderText(language, ar, en)
  const update = (key, value) => onChange((current) => ({ ...current, [key]: value }))
  const inputClass = 'min-h-11 w-full rounded-full border border-[#F2E9DF]/15 bg-[#1D070E] px-4 py-2 text-sm text-[#F2E9DF] placeholder:text-[#A8958B]'
  return (
    <>
      {!omitName && <input required value={values.full_name} onChange={(event) => update('full_name', event.target.value)} placeholder={t('الاسم بالكامل', 'Full Name')} className={inputClass} />}
      {includePhones && <>
        <input required type="tel" value={values.phone} onChange={(event) => update('phone', event.target.value)} placeholder={t('رقم الموبايل الأساسي', 'Primary Phone Number')} className={inputClass} />
        <input type="tel" value={values.alt_phone || ''} onChange={(event) => update('alt_phone', event.target.value)} placeholder={t('رقم موبايل إضافي', 'Alternate Phone')} className={inputClass} />
      </>}
      <label className="block text-xs text-[#A8958B]">{t('المحافظة', 'Governorate')}
        <select value={values.governorate} onChange={(event) => update('governorate', event.target.value)} className={`mt-1 ${inputClass}`}>
          {governorates.map((governorate) => <option key={governorate}>{governorate}</option>)}
        </select>
      </label>
      <input value={values.city} onChange={(event) => update('city', event.target.value)} placeholder={t('المدينة / المنطقة', 'City / Area')} className={inputClass} />
      <textarea value={values.address_details} onChange={(event) => update('address_details', event.target.value)} placeholder={t('العنوان بالتفصيل', 'Detailed Delivery Address')} className="min-h-20 w-full rounded-2xl border border-[#F2E9DF]/15 bg-[#1D070E] px-4 py-3 text-sm text-[#F2E9DF] placeholder:text-[#A8958B]" />
      {!omitName && <textarea value={values.notes || ''} onChange={(event) => update('notes', event.target.value)} placeholder={t('ملاحظات التوصيل', 'Delivery Notes')} className="min-h-16 w-full rounded-2xl border border-[#F2E9DF]/15 bg-[#1D070E] px-4 py-3 text-sm text-[#F2E9DF] placeholder:text-[#A8958B]" />}
    </>
  )
}

function WishlistDrawer({ open, language, products, wishlist, onClose, onRemove, onExplore, addToCart }) {
  const savedProducts = products.filter((product) => wishlist.includes(product.id))
  const addAll = () => savedProducts.forEach((product) => {
    const size = product.sizes?.find((option) => option.in_stock !== false)
    if (size) addToCart(product, size)
  })

  return (
    <aside className={`fixed inset-y-0 ${language === 'ar' ? 'left-0' : 'right-0'} z-[55] w-full sm:max-w-md overflow-y-auto border border-[#F2E9DF]/10 bg-[#140409] p-4 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : language === 'ar' ? '-translate-x-full' : 'translate-x-full'}`} aria-hidden={!open} inert={!open}>
      <div className="flex items-center justify-between border-b border-[#F2E9DF]/10 pb-4">
        <h2 className="font-['Readex_Pro'] text-2xl text-[#F2E9DF]">{renderText(language, 'قائمة الأمنيات', 'Your Wishlist')}</h2>
        <button type="button" aria-label={renderText(language, 'إغلاق قائمة الأمنيات', 'Close wishlist')} onClick={onClose} className="rounded-full border border-[#F2E9DF]/15 p-2 text-[#F2E9DF]"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 space-y-3">
        {!savedProducts.length && <p className="rounded-2xl border border-dashed border-[#F2E9DF]/15 p-6 text-center text-[#A8958B]">{renderText(language, 'لم تحفظ أي عطر بعد.', 'Your wishlist is empty.')}</p>}
        {savedProducts.map((product) => (
          <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-[#F2E9DF]/10 bg-[#1D070E] p-3">
            <div className="h-20 w-16 shrink-0"><ProductArtwork product={product} language={language} className="h-full w-full object-contain" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[#F2E9DF]">{renderText(language, product.name_ar, product.name_en)}</h3>
              <p className="text-xs text-[#A8958B]">{formatMoney(product.sizes?.[0]?.price, language)}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => onExplore(product)} className="text-xs text-[#D5BFA8]">{renderText(language, 'التفاصيل', 'Details')}</button>
                <button type="button" onClick={() => onRemove(product.id)} className="text-xs text-[#A8958B]">{renderText(language, 'إزالة', 'Remove')}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" disabled={!savedProducts.length} onClick={addAll} className="mt-5 w-full border border-[#F2E9DF] bg-[#F2E9DF] px-4 py-3 text-sm font-semibold text-[#1A050B] transition-colors hover:border-[#F2E9DF]/40 hover:bg-[#581528] hover:text-[#F2E9DF] disabled:opacity-40">
        {renderText(language, 'إضافة الكل إلى السلة', 'Add All to Bag')}
      </button>
    </aside>
  )
}

export function AdminStorefrontEditor({ onExit, onLock, onOpenOperations }) {
  return <AppShell adminMode onExit={onExit} onLock={onLock} onOpenOperations={onOpenOperations} />
}

function AppShell({ adminMode = false, onExit, onLock, onOpenOperations }) {
  const {
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
    toggleCustomerWishlist,
    removeFromWishlist,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    applyCouponCode,
    clearCoupon,
    placeOrder,
    registerCustomer,
    loginCustomer,
    updateCustomerProfile,
    logoutCustomer,
    store,
    updateProducts,
    updateCategories,
    updateQuizQuestions,
    storeSyncError,
    clearStoreSyncError,
  } = useAppContext()
  const [splashOpen, setSplashOpen] = useState(true)
  const [heroRevealing, setHeroRevealing] = useState(false)
  const [pouringActive, setPouringActive] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState(false)
  const [catalogFilter, setCatalogFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [saveGuestProfile, setSaveGuestProfile] = useState(true)
  const [guestAccountPassword, setGuestAccountPassword] = useState('')
  const [placingOrder, setPlacingOrder] = useState(false)
  const [toast, setToast] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const [checkoutForm, setCheckoutForm] = useState(() => checkoutValuesFromCustomer(currentCustomer))
  const [orderPlaced, setOrderPlaced] = useState(null)
  const [adminProductEditing, setAdminProductEditing] = useState(false)
  const [adminEditToast, setAdminEditToast] = useState('')
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(timer)
  }, [toast])

  const t = (ar, en) => (language === 'ar' ? ar : en)
  const saveAdminProduct = (productDraft) => {
    if (!productDraft?.name_ar?.trim() || !productDraft?.name_en?.trim()) {
      setAdminEditToast(t('أدخل اسم العطر باللغتين.', 'Enter the perfume name in both languages.'))
      return
    }
    if (!productDraft.category_id) {
      setAdminEditToast(t('اختر قسماً للعطر.', 'Choose a category for this perfume.'))
      return
    }
    const exists = store.products.some((product) => product.id === productDraft.id)
    const nextProducts = exists
      ? store.products.map((product) => product.id === productDraft.id ? productDraft : productDraft.is_top_seller ? { ...product, is_top_seller: false } : product)
      : [...store.products, productDraft]
    updateProducts(nextProducts)
    setAdminProductEditing(false)
    setSelectedProduct(null)
    setAdminEditToast(t('تم التحديث تلقائياً في الموقع بالكامل ✓', 'Updated across the storefront ✓'))
  }
  const openAdminProduct = (product) => {
    setSelectedProduct(product ? structuredClone(product) : {
      id: globalThis.crypto?.randomUUID?.() || `product-${Date.now()}`,
      name_ar: '', name_en: '', subtitle_ar: '', subtitle_en: '', description_ar: '', description_en: '',
      category_id: store.categories.find((category) => category.slug !== 'all')?.id || '',
      image_url: '', gallery_images: ['', '', ''], longevity_label_ar: '10 ساعات', longevity_label_en: '10h',
      longevity_percent: 80, sillage_percent: 86,
      sizes: [{ size: '50ml', price: 0, compare_price: 0, in_stock: true }], active: true, is_top_seller: false,
    })
    setAdminProductEditing(true)
  }
  const addAdminCategory = () => {
    const name_ar = window.prompt('اسم القسم بالعربية')
    if (!name_ar?.trim()) return
    const name_en = window.prompt('Category name in English')
    if (!name_en?.trim()) return
    const slug = name_en.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!slug || store.categories.some((category) => category.slug === slug)) {
      setAdminEditToast(t('اسم القسم مستخدم بالفعل أو غير صالح.', 'That category name is already in use or invalid.'))
      return
    }
    updateCategories([...store.categories, { id: globalThis.crypto?.randomUUID?.() || `category-${Date.now()}`, slug, name_ar: name_ar.trim(), name_en: name_en.trim(), sort_order: store.categories.length, is_custom: true }])
    setAdminEditToast(t('تم تحديث الأقسام ✓', 'Categories updated ✓'))
  }
  const deleteAdminCategory = (category) => {
    if (!window.confirm(t(`حذف قسم ${category.name_ar}؟`, `Delete ${category.name_en}?`))) return
    const categories = store.categories.filter((item) => item.id !== category.id)
    const fallbackCategory = categories.find((item) => item.slug !== 'all')
    updateCategories(categories)
    updateProducts(store.products.map((product) => product.category_id === category.id ? { ...product, category_id: fallbackCategory?.id || '' } : product))
    if (catalogFilter === category.id) setCatalogFilter('all')
    setAdminEditToast(t('تم حذف القسم وتحديث العطور المرتبطة به ✓', 'Category deleted and its perfumes reassigned ✓'))
  }
  const selectTopSeller = (productId) => updateProducts(store.products.map((product) => ({ ...product, is_top_seller: product.id === productId })))
  const toggleTopSeller = (product) => updateProducts(store.products.map((item) => ({ ...item, is_top_seller: item.id === product.id ? !product.is_top_seller : product.is_top_seller ? false : item.is_top_seller })))
  const toggleStock = (product) => {
    const inStock = !product.sizes?.some((size) => size.in_stock !== false)
    updateProducts(store.products.map((item) => item.id === product.id ? { ...item, sizes: (item.sizes || []).map((size) => ({ ...size, in_stock: inStock })) } : item))
  }
  const deleteAdminProduct = (product) => {
    if (!window.confirm(t(`هل تريد حذف عطر ${product.name_ar}؟`, `Delete ${product.name_en}?`))) return
    updateProducts(store.products.filter((item) => item.id !== product.id))
    updateQuizQuestions((store.quiz_questions || []).map((question) => ({
      ...question,
      options: (question.options || []).map((option) => ({ ...option, recommended_product_ids: (option.recommended_product_ids || []).filter((id) => id !== product.id) })),
    })))
    setAdminEditToast(t('تم حذف العطر ✓', 'Perfume deleted ✓'))
  }
  const finishSplash = useCallback(() => {
    setSplashOpen(false)
    setPouringActive(true)
  }, [])
  const revealHero = useCallback(() => setHeroRevealing(true), [])
  const handleAddToCart = (product, size) => {
    addToCart(product, size)
    setToast(t('تمت إضافة العطر إلى السلة', 'Added to your bag'))
  }
  const syncCheckoutCustomer = (customer) => setCheckoutForm(checkoutValuesFromCustomer(customer))
  const handleCustomerLogin = async (phone, password) => {
    const customer = await loginCustomer(phone, password)
    syncCheckoutCustomer(customer)
    return customer
  }
  const handleCustomerRegister = async (values) => {
    const customer = await registerCustomer(values)
    syncCheckoutCustomer(customer)
    return customer
  }
  const handleCustomerUpdate = async (updates) => {
    const customer = await updateCustomerProfile(updates)
    syncCheckoutCustomer(customer)
    return customer
  }
  const handleCustomerLogout = () => {
    logoutCustomer()
    syncCheckoutCustomer(null)
  }
  const filteredProducts = useMemo(() => {
    return store.products.filter((product) => {
        const matchesCategory = catalogFilter === 'all' || product.category_id === catalogFilter
        const haystack = [
          product.name_ar,
          product.name_en,
          product.subtitle_ar,
          product.subtitle_en,
          ...(product.top_notes_ar || []),
          ...(product.top_notes_en || []),
          ...(product.heart_notes_ar || []),
          ...(product.heart_notes_en || []),
          ...(product.base_notes_ar || []),
          ...(product.base_notes_en || []),
        ].join(' ').toLowerCase()
      const matchesSearch = haystack.includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch && product.active
    })
  }, [catalogFilter, searchTerm, store.products])
  const flagshipProduct = useMemo(
    () => store.products.find((product) => product.is_top_seller && product.active) || store.products.find((product) => product.featured && product.active) || store.products.find((product) => product.active),
    [store.products],
  )

  const handleApplyCoupon = () => {
    const result = applyCouponCode(couponInput.trim())
    if (result === 'minimum') {
      setCouponMessage(t('لم يصل الطلب للحد الأدنى المطلوب لهذا الكود.', 'Your order does not meet this code’s minimum subtotal.'))
      return
    }
    if (result !== 'applied') {
      setCouponMessage(t('كود الخصم غير صالح أو غير متاح.', 'This promo code is invalid or unavailable.'))
      return
    }
    setCouponMessage(t('تم تطبيق كود الخصم.', 'Promo code applied.'))
    setCouponInput('')
  }

  const handlePlaceOrder = async (event) => {
    event.preventDefault()
    if (placingOrder) return
    if (cart.length === 0) {
      setToast(t('السلة فارغة', 'Cart is empty'))
      return
    }
    const normalizedPhone = checkoutForm.customer_phone
      .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
      .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
      .replace(/\D/g, '')
    if (!/^(?:01[0125]\d{8}|201[0125]\d{8})$/.test(normalizedPhone)) {
      setToast(t('يرجى إدخال رقم موبايل مصري صحيح.', 'Enter a valid Egyptian mobile number.'))
      return
    }
    setPlacingOrder(true)
    try {
      let linkedCustomerId = currentCustomer?.id
      const customerValues = {
        full_name: checkoutForm.customer_name,
        phone: checkoutForm.customer_phone,
        alt_phone: checkoutForm.customer_alt_phone,
        governorate: checkoutForm.governorate,
        city: checkoutForm.city,
        address_details: checkoutForm.address_details,
        notes: checkoutForm.notes,
      }
      if (currentCustomer) {
        const updatedCustomer = await updateCustomerProfile(customerValues)
        linkedCustomerId = updatedCustomer.id
      } else if (saveGuestProfile && guestAccountPassword) {
        const existingCustomer = customers.find((customer) => customer.phone === normalizedPhone || customer.phone.endsWith(normalizedPhone.slice(-10)))
        if (existingCustomer) {
          await loginCustomer(checkoutForm.customer_phone, guestAccountPassword)
          const updatedCustomer = await updateCustomerProfile(customerValues)
          linkedCustomerId = updatedCustomer.id
        } else {
          const createdCustomer = await registerCustomer({ ...customerValues, password: guestAccountPassword })
          linkedCustomerId = createdCustomer.id
        }
      }
      const placed = await placeOrder({ ...checkoutForm, customer_id: linkedCustomerId })
      setOrderPlaced(placed)
      setCartOpen(false)
      setCheckoutMode(false)
      setCouponInput('')
      setCouponMessage('')
      setGuestAccountPassword('')
      setToast(t('تم تأكيد الطلب', 'Order confirmed'))
    } catch (error) {
      setToast(error.message || t('تعذر إتمام الطلب. حاول مرة أخرى.', 'Unable to place the order. Please try again.'))
    } finally {
      setPlacingOrder(false)
    }
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#090204] text-[#F2E9DF]">
      {adminMode && (
        <div className="admin-operation-bar sticky top-0 z-[90] flex h-12 items-center gap-2 overflow-x-auto border-b border-[#D5BFA8]/30 bg-[#100308]/95 px-3 shadow-lg backdrop-blur">
          <strong className="shrink-0 text-[10px] tracking-wider text-[#D5BFA8]">MADAR</strong>
          <button type="button" onClick={() => onOpenOperations?.('orders')} className="shrink-0 border border-[#D5BFA8]/25 px-3 py-2 text-[10px]">📦 الطلبات والشحن ({store.orders.filter((order) => order.status === 'pending').length})</button>
          <button type="button" onClick={() => onOpenOperations?.('coupons')} className="shrink-0 border border-[#D5BFA8]/25 px-3 py-2 text-[10px]">🎟 كوبونات الخصم</button>
          <button type="button" onClick={() => onOpenOperations?.('customers')} className="shrink-0 border border-[#D5BFA8]/25 px-3 py-2 text-[10px]">👥 العملاء ({customers.length})</button>
          <button type="button" onClick={() => onOpenOperations?.('settings')} className="shrink-0 border border-[#D5BFA8]/25 px-3 py-2 text-[10px]">⚙ إعدادات الشحن واللوجو والأمان</button>
          <button type="button" onClick={() => setLanguage((current) => current === 'ar' ? 'en' : 'ar')} className="shrink-0 border border-[#D5BFA8]/20 px-3 py-2 text-[10px]">{language === 'ar' ? 'EN' : 'عربي'}</button>
          <a href="/" target="_blank" rel="noreferrer" className="shrink-0 border border-[#D5BFA8]/20 px-3 py-2 text-[10px]">معاينة المتجر الأساسي ↗</a>
          {onExit && <button type="button" onClick={onExit} className="shrink-0 border border-[#D5BFA8]/20 px-3 py-2 text-[10px]">لوحة الإدارة</button>}
          {onLock && <button type="button" onClick={onLock} className="shrink-0 bg-[#581528] px-3 py-2 text-[10px]">قفل اللوحة 🔒</button>}
        </div>
      )}
      <div className="mx-auto max-w-[1600px] overflow-x-clip">
        <div className={`sticky ${adminMode ? 'top-12' : 'top-0'} z-40 border-b border-[#F2E9DF]/10 bg-[#090204]/95 backdrop-blur-md`}>
          <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3 md:px-8">
            <a href="#home" onClick={(event) => handleSectionNavigation(event, 'home')} aria-label="MADAR / مدار — Home" className="flex shrink-0 items-center gap-2 sm:gap-4">
              <MadarBrandLockup settings={store.settings} compact />
            </a>

            <nav className="hidden items-center gap-8 text-sm text-[#A8958B] md:flex">
              {navItems.map((item) => (
                <a key={item.key} href={`#${item.key}`} onClick={(event) => handleSectionNavigation(event, item.key)} className="transition hover:text-[#F2E9DF]">
                  {t(item.ar, item.en)}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-3">
              <button
                type="button"
                aria-label={mobileNavOpen ? t('إغلاق القائمة', 'Close menu') : t('فتح القائمة', 'Open menu')}
                aria-controls="mobile-navigation"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen((open) => !open)}
                className="rounded-full border border-[#F2E9DF]/10 bg-[#1D070E] p-1.5 text-[#F2E9DF] sm:p-2 md:hidden"
              >
                {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setLanguage((current) => (current === 'ar' ? 'en' : 'ar'))}
                className="flex items-center gap-1 rounded-full border border-[#F2E9DF]/10 bg-[#1D070E] px-2 py-1.5 text-xs text-[#F2E9DF] sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
              >
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {language === 'ar' ? 'EN' : 'عربي'}
              </button>

              <button type="button" aria-label={currentCustomer ? t('حسابي', 'My profile') : t('حسابي / تسجيل الدخول', 'My profile / Sign in')} onClick={() => setProfileOpen(true)} className={`flex items-center gap-1 rounded-full border p-1.5 text-[#F2E9DF] sm:gap-2 sm:px-3 sm:py-2 ${currentCustomer ? 'border-[#D5BFA8]/40 bg-[#581528]/40' : 'border-[#F2E9DF]/10 bg-[#1D070E]'}`}>
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="max-w-16 truncate text-[10px] sm:max-w-28 sm:text-xs">{currentCustomer ? currentCustomer.full_name?.split(/\s+/)[0] : t('حسابي', 'Sign In')}</span>
              </button>
              <button type="button" aria-label={t('قائمة الأمنيات', 'Wishlist')} aria-pressed={wishlistOpen} onClick={() => setWishlistOpen(true)} className="relative rounded-full border border-[#F2E9DF]/10 bg-[#1D070E] p-1.5 text-[#F2E9DF] sm:p-2">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                {wishlist.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D5BFA8] px-1 text-[10px] font-bold text-[#140409]">{wishlist.length}</span>}
              </button>
              <button
                type="button"
                aria-label={t('سلة المشتريات', 'Shopping bag')}
                onClick={() => setCartOpen(true)}
                className="relative rounded-full border border-[#D5BFA8]/50 bg-[#581528] p-1.5 text-[#F2E9DF] sm:p-2"
              >
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D5BFA8] text-[10px] font-bold text-[#140409]">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </button>
            </div>
          </div>
          {mobileNavOpen && (
            <nav id="mobile-navigation" aria-label={t('التنقل الرئيسي', 'Main navigation')} className="grid gap-1 border-t border-[#F2E9DF]/10 bg-[#090204] px-4 py-3 text-sm text-[#A8958B] md:hidden">
              {navItems.map((item) => (
                <a key={item.key} href={`#${item.key}`} onClick={(event) => { handleSectionNavigation(event, item.key); setMobileNavOpen(false) }} className="px-3 py-2 transition hover:text-[#F2E9DF]">
                  {t(item.ar, item.en)}
                </a>
              ))}
            </nav>
          )}
        </div>

        <main>
          <IconicHero language={language} isRevealing={heroRevealing} pouringActive={pouringActive} settings={store.settings} />
          <IconicEditorial
            product={flagshipProduct}
            products={store.products}
            language={language}
            addToCart={handleAddToCart}
            adminMode={adminMode}
            onSelectTopSeller={selectTopSeller}
            onEditProduct={openAdminProduct}
          />

          <section id="collection" className="scroll-mt-24 border-b border-[#F2E9DF]/10 bg-[#140409] px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#D5BFA8]">{t('مجموعة العطور', 'SHOP COLLECTION')}</p>
                  <h2 className="mt-2 font-['Amiri'] text-4xl text-[#F2E9DF]">{t('مجموعة عطور مدار', 'MADAR Perfume Collection')}</h2>
                </div>
                <div className="flex flex-col gap-3 md:items-end">
                  <div className="flex items-center gap-2 border border-[#F2E9DF]/15 bg-[#140409] px-3 py-2">
                    <Search className="h-4 w-4 text-[#A8958B]" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder={t('ابحث باسم العطر أو المكونات (مثل: عود، فانيليا، برغموت)...', 'Search by fragrance name or notes (e.g. oud, vanilla, bergamot)...')}
                      className="w-40 border-0 bg-transparent text-sm text-[#F2E9DF] placeholder:text-[#A8958B] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[{ id: 'all', name_ar: 'الكل', name_en: 'All' }, ...store.categories.filter((category) => category.slug !== 'all')].map((category) => {
                      const customCategory = category.is_custom || category.id.startsWith('category-')
                      return <span key={category.id} className={`inline-flex items-center border text-xs ${catalogFilter === category.id ? 'border-[#D5BFA8]/60 bg-[#581528]/40 text-[#F2E9DF]' : 'border-[#F2E9DF]/15 text-[#A8958B]'}`}>
                        <button type="button" aria-pressed={catalogFilter === category.id} onClick={() => setCatalogFilter(category.id)} className="px-3 py-2">{t(category.name_ar, category.name_en)}</button>
                        {adminMode && customCategory && <button type="button" aria-label={`${t('حذف قسم', 'Delete category')} ${t(category.name_ar, category.name_en)}`} onClick={() => deleteAdminCategory(category)} className="border-s border-[#F2E9DF]/15 px-2 py-2 text-rose-200">×</button>}
                      </span>
                    })}
                    {adminMode && <button type="button" onClick={addAdminCategory} className="border border-dashed border-[#D5BFA8]/50 px-3 py-2 text-xs text-[#D5BFA8]">+ إضافة قسم</button>}
                  </div>
                </div>
              </div>

              <div className="grid auto-rows-fr gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <div key={product.id} className={`relative flex h-full flex-col ${adminMode ? 'admin-edit-target' : ''}`}>
                    {adminMode && (
                      <div className="grid grid-cols-2 gap-1 border border-b-0 border-[#D5BFA8]/25 bg-[#1D070E] p-1.5 text-[10px]">
                        <button type="button" title="تعديل العطر والمقاسات والزوايا" onClick={() => openAdminProduct(product)} className="min-w-0 truncate border border-[#D5BFA8]/25 px-2 py-1.5">✎ تعديل العطر</button>
                        <button type="button" onClick={() => toggleStock(product)} className={`min-w-0 truncate border px-2 py-1.5 ${product.sizes?.some((size) => size.in_stock !== false) ? 'border-emerald-200/20 text-emerald-100' : 'border-rose-200/20 text-rose-100'}`}>{product.sizes?.some((size) => size.in_stock !== false) ? 'متوفر' : 'نفذ'}</button>
                        <button type="button" aria-pressed={Boolean(product.is_top_seller)} onClick={() => toggleTopSeller(product)} className={`min-w-0 truncate border px-2 py-1.5 ${product.is_top_seller ? 'border-[#D5BFA8]/60 text-[#D5BFA8]' : 'border-[#F2E9DF]/15'}`}>★ الأكثر مبيعاً</button>
                        <button type="button" onClick={() => deleteAdminProduct(product)} className="min-w-0 truncate border border-rose-200/20 px-2 py-1.5 text-rose-200">حذف</button>
                      </div>
                    )}
                    <ProductCard product={product} language={language} addToCart={handleAddToCart} onExplore={() => adminMode ? openAdminProduct(product) : setSelectedProduct(product)} adminEditMode={adminMode} isWishlisted={wishlist.includes(product.id)} onToggleWishlist={toggleCustomerWishlist} />
                  </div>
                ))}
                {adminMode && (
                  <button type="button" onClick={() => openAdminProduct(null)} className="flex h-full min-h-[420px] flex-col items-center justify-center border border-dashed border-[#D5BFA8]/50 bg-[#090204] p-8 text-center text-[#D5BFA8]">
                    <span className="text-4xl">+</span><span className="mt-3">+ إضافة عطر جديد</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          <OrbitConsultation products={store.products} questions={store.quiz_questions || []} language={language} addToCart={handleAddToCart} adminMode={adminMode} onSaveQuestions={updateQuizQuestions} />

          <section id="story" className="border-b border-[#F2E9DF]/10 bg-[#090204] px-4 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl border border-[#F2E9DF]/15 bg-[#140409] p-7 md:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="border border-[#F2E9DF]/10 bg-[#090204] p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#D5BFA8]">MADAR</p>
                  <h3 className="mt-4 font-['Readex_Pro'] text-3xl text-[#F2E9DF]">{t('قصتنا', 'Our Story')}</h3>
                  <p className="mt-4 text-[#A8958B]">
                    {t('نؤمن بأن لكل شخص حضوراً يميّزه، وأن العطر يعبّر عن شخصيته ويترك انطباعاً لا يُنسى.', 'We believe every person has a signature presence, and fragrance expresses it while leaving a lasting impression.')}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { icon: <Sun className="h-5 w-5 text-[#D5BFA8]" />, title: t('عطور للمساء', 'Evening Scents'), detail: t('روائح أنيقة تناسب السهرات', 'Elegant fragrances for evenings') },
                    { icon: <Wind className="h-5 w-5 text-[#D5BFA8]" />, title: t('نفحات منعشة', 'Fresh Notes'), detail: t('تركيبات عطرية متوازنة', 'Well-balanced fragrance blends') },
                    { icon: <Moon className="h-5 w-5 text-[#D5BFA8]" />, title: t('دفء فخم', 'Luxury Warmth'), detail: t('ظلٌ ناعم يدوم', 'Soft lingering presence') },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[24px] border border-[#F2E9DF]/10 bg-[#140409]/60 p-5">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#581528]">{item.icon}</div>
                      <h4 className="mb-2 text-lg text-[#F2E9DF]">{item.title}</h4>
                      <p className="text-sm text-[#A8958B]">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <footer className="border-t border-[#F2E9DF]/10 px-4 py-6 text-center text-xs text-[#A8958B]">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-4">
              <button type="button" onClick={() => setProfileOpen(true)} className="hover:text-[#F2E9DF]">{t('حسابي', 'My Profile')}</button>
              {store.settings.instagram_url && <a href={store.settings.instagram_url} target="_blank" rel="noreferrer" className="hover:text-[#F2E9DF]">Instagram</a>}
              {store.settings.facebook_url && <a href={store.settings.facebook_url} target="_blank" rel="noreferrer" className="hover:text-[#F2E9DF]">Facebook</a>}
              {store.settings.tiktok_url && <a href={store.settings.tiktok_url} target="_blank" rel="noreferrer" className="hover:text-[#F2E9DF]">TikTok</a>}
            </div>
            <span>Created by <a href="mailto:mohamedsabae50@gmail.com" className="text-[#D5BFA8] hover:text-[#F2E9DF]">mohamedsabae50@gmail.com</a></span>
          </footer>
        </main>
      </div>

      <aside className={`fixed inset-y-0 ${language === 'ar' ? 'right-0' : 'left-0'} z-50 w-full sm:max-w-md overflow-y-auto border-l border-[#F2E9DF]/10 bg-[#140409] p-4 shadow-2xl transition-transform duration-300 ${cartOpen ? 'translate-x-0' : language === 'ar' ? 'translate-x-full' : '-translate-x-full'}`} aria-hidden={!cartOpen} inert={!cartOpen}>
        <div className="flex items-center justify-between border-b border-[#F2E9DF]/10 pb-4">
          <div className="flex items-center gap-3">
            {checkoutMode && <button type="button" onClick={() => setCheckoutMode(false)} className="text-sm text-[#D5BFA8]">{t('رجوع للسلة', 'Back to bag')}</button>}
            <h3 className="font-['Readex_Pro'] text-2xl text-[#F2E9DF]">{checkoutMode ? t('إتمام الطلب', 'Checkout') : t('سلة المشتريات', 'Shopping Bag')}</h3>
          </div>
          <button type="button" aria-label={t('إغلاق السلة', 'Close bag')} onClick={() => { setCartOpen(false); setCheckoutMode(false) }} className="rounded-full border border-[#F2E9DF]/15 p-2 text-[#F2E9DF]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 overflow-y-auto pb-8">
          {cart.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#F2E9DF]/15 bg-[#1D070E] p-6 text-center text-[#A8958B]">
              {t('السلة فارغة حاليًا', 'Your cart is empty right now')}
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-[22px] border border-[#F2E9DF]/10 bg-[#1D070E] p-3">
                <div className="h-20 w-20 shrink-0 border border-[#D5BFA8]/20 bg-[#140409]">
                  <ProductArtwork product={{ name_ar: item.name_ar, name_en: item.name, id: item.id, image_url: item.image }} language={language} className="h-full w-full p-1" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-[#F2E9DF]">{renderText(language, item.name_ar || item.name, item.name)}</h4>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#A8958B]">{item.size}</p>
                    </div>
                    <button type="button" aria-label={t('إزالة المنتج', 'Remove item')} onClick={() => { removeFromCart(item.id); setToast(t('تمت إزالة المنتج', 'Item removed')) }} className="text-[#A8958B]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-[#F2E9DF]/10 bg-[#140409] px-2 py-1">
                      <button type="button" aria-label={t('تقليل الكمية', 'Decrease quantity')} onClick={() => updateCartQuantity(item.id, -1)} className="p-1 text-[#F2E9DF]">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-sm text-[#F2E9DF]">{item.quantity}</span>
                      <button type="button" aria-label={t('زيادة الكمية', 'Increase quantity')} onClick={() => updateCartQuantity(item.id, 1)} className="p-1 text-[#F2E9DF]">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-sm font-medium text-[#F2E9DF]">{formatMoney(item.price * item.quantity, language)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!checkoutMode ? (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-[22px] border border-[#F2E9DF]/10 bg-[#1D070E] p-4 text-sm text-[#A8958B]">
              <span>{t('المجموع الفرعي', 'Subtotal')}</span><span>{formatMoney(subtotal, language)}</span>
            </div>
            <button type="button" disabled={!cart.length} onClick={() => setCheckoutMode(true)} className="w-full rounded-full bg-[#F2E9DF] px-4 py-3 text-sm font-semibold text-[#1A050B] disabled:opacity-40">
              {t('المتابعة لإتمام الطلب', 'Proceed to Checkout')}
            </button>
            <button type="button" disabled={!cart.length} onClick={() => { clearCart(); setToast(t('تم إفراغ السلة', 'Bag emptied')) }} className="w-full border border-[#F2E9DF]/15 px-4 py-2 text-sm text-[#A8958B] disabled:opacity-40">
              {t('إفراغ السلة', 'Empty Bag')}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-[22px] border border-[#F2E9DF]/10 bg-[#1D070E] p-4">
              <label htmlFor="checkout-promo-code" className="mb-3 block text-sm text-[#F2E9DF]">{t('هل لديك كود خصم؟', 'Have a promo code?')}</label>
              <div className="flex gap-2">
                <input id="checkout-promo-code" value={couponInput} onChange={(event) => { setCouponInput(event.target.value); setCouponMessage('') }} placeholder={t('أدخل كود الخصم', 'Enter promo code')} className="min-w-0 flex-1 rounded-full border border-[#F2E9DF]/10 bg-[#140409] px-3 py-2 text-sm text-[#F2E9DF] placeholder:text-[#A8958B] focus:outline-none" />
                <button type="button" onClick={handleApplyCoupon} className="rounded-full bg-[#581528] px-4 py-2 text-sm text-[#F2E9DF]">{t('تطبيق', 'Apply')}</button>
              </div>
              {couponMessage && <p role="status" className="mt-2 text-xs text-[#D5BFA8]">{couponMessage}</p>}
              {activeCoupon && (
                <div className="mt-3 flex items-center justify-between rounded-full border border-[#D5BFA8]/40 bg-[#581528]/60 px-3 py-2 text-sm text-[#F2E9DF]">
                  <span>{activeCoupon.code}</span>
                  <button type="button" aria-label={t('إزالة كود الخصم', 'Remove promo code')} onClick={() => { clearCoupon(); setCouponMessage('') }} className="text-[#F2E9DF]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3 rounded-[22px] border border-[#F2E9DF]/10 bg-[#1D070E] p-4 text-sm text-[#A8958B]">
              <div className="flex items-center justify-between"><span>{t('المجموع الفرعي', 'Subtotal')}</span><span>{formatMoney(subtotal, language)}</span></div>
              <div className="flex items-center justify-between"><span>{t('الخصم', 'Discount')}</span><span>- {formatMoney(discountAmount, language)}</span></div>
              <div className="flex items-center justify-between"><span>{t('رسوم الشحن', 'Shipping fee')}</span><span>{formatMoney(shippingFee, language)}</span></div>
              <div className="flex items-center justify-between border-t border-[#F2E9DF]/10 pt-3 text-base font-medium text-[#F2E9DF]">
                <span>{t('الإجمالي النهائي', 'Final Total')}</span>
                <span>{formatMoney(total, language)}</span>
              </div>
            </div>

            <form onSubmit={handlePlaceOrder} className="mt-5 space-y-3">
              {currentCustomer ? (
                <div className="rounded-2xl border border-[#D5BFA8]/30 bg-[#581528]/25 px-3 py-3 text-xs text-[#F2E9DF]">
                  {t(`مرحباً ${currentCustomer.full_name} • تم ملء بيانات التوصيل تلقائياً من حسابك`, `Welcome ${currentCustomer.full_name} • Your saved delivery details are filled in`)}
                </div>
              ) : (
                <button type="button" onClick={() => setProfileOpen(true)} className="min-h-11 w-full rounded-2xl border border-[#F2E9DF]/15 bg-[#581528]/20 px-3 py-2 text-start text-xs text-[#D5BFA8]">
                  {t('لديك حساب بالفعل؟ سجل دخول لملء بياناتك تلقائياً', 'Already have an account? Sign in to autofill your details')}
                </button>
              )}
              <input required autoComplete="name" value={checkoutForm.customer_name} onChange={(event) => setCheckoutForm((current) => ({ ...current, customer_name: event.target.value }))} placeholder={t('الاسم بالكامل', 'Full name')} className="w-full rounded-full border border-[#F2E9DF]/10 bg-[#1D070E] px-3 py-2 text-sm text-[#F2E9DF] placeholder:text-[#A8958B] focus:outline-none" />
              <input required type="tel" inputMode="tel" autoComplete="tel" value={checkoutForm.customer_phone} onChange={(event) => setCheckoutForm((current) => ({ ...current, customer_phone: event.target.value }))} placeholder={t('رقم الموبايل (للتواصل وتأكيد الطلب)', 'Mobile number (for contact and order confirmation)')} className="w-full rounded-full border border-[#F2E9DF]/10 bg-[#1D070E] px-3 py-2 text-sm text-[#F2E9DF] placeholder:text-[#A8958B] focus:outline-none" />
              <input type="tel" inputMode="tel" autoComplete="tel-national" value={checkoutForm.customer_alt_phone} onChange={(event) => setCheckoutForm((current) => ({ ...current, customer_alt_phone: event.target.value }))} placeholder={t('رقم موبايل إضافي (اختياري)', 'Additional mobile number (optional)')} className="w-full rounded-full border border-[#F2E9DF]/10 bg-[#1D070E] px-3 py-2 text-sm text-[#F2E9DF] placeholder:text-[#A8958B] focus:outline-none" />
              <label className="block text-xs text-[#A8958B]">
                {t('المحافظة', 'Governorate')}
                <select aria-label={t('المحافظة', 'Governorate')} value={checkoutForm.governorate} onChange={(event) => setCheckoutForm((current) => ({ ...current, governorate: event.target.value }))} className="mt-1 w-full rounded-full border border-[#F2E9DF]/10 bg-[#1D070E] px-3 py-2 text-sm text-[#F2E9DF] focus:outline-none">
                  {governorates.map((gov) => <option key={gov}>{gov}</option>)}
                </select>
              </label>
              <input required autoComplete="address-level2" value={checkoutForm.city} onChange={(event) => setCheckoutForm((current) => ({ ...current, city: event.target.value }))} placeholder={t('المدينة / المنطقة', 'City / Area')} className="w-full rounded-full border border-[#F2E9DF]/10 bg-[#1D070E] px-3 py-2 text-sm text-[#F2E9DF] placeholder:text-[#A8958B] focus:outline-none" />
              <textarea required autoComplete="street-address" value={checkoutForm.address_details} onChange={(event) => setCheckoutForm((current) => ({ ...current, address_details: event.target.value }))} placeholder={t('العنوان بالتفصيل (الشارع، رقم العقار، علامة مميزة)', 'Full address (street, building number, landmark)')} className="min-h-[90px] w-full rounded-[18px] border border-[#F2E9DF]/10 bg-[#1D070E] px-3 py-2 text-sm text-[#F2E9DF] placeholder:text-[#A8958B] focus:outline-none" />
              <textarea value={checkoutForm.notes} onChange={(event) => setCheckoutForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t('ملاحظات إضافية على الطلب (اختياري)', 'Additional order notes (optional)')} className="min-h-[70px] w-full rounded-[18px] border border-[#F2E9DF]/10 bg-[#1D070E] px-3 py-2 text-sm text-[#F2E9DF] placeholder:text-[#A8958B] focus:outline-none" />

              {!currentCustomer && (
                <div className="space-y-2 rounded-2xl border border-[#F2E9DF]/10 bg-[#140409] p-3">
                  <label className="flex items-start gap-2 text-xs text-[#A8958B]">
                    <input type="checkbox" checked={saveGuestProfile} onChange={(event) => setSaveGuestProfile(event.target.checked)} className="mt-0.5 accent-[#D5BFA8]" />
                    <span>{t('حفظ بياناتي في حساب لسهولة الطلب المرة القادمة', 'Save my details in an account for faster checkout next time')}</span>
                  </label>
                  {saveGuestProfile && <input type="password" autoComplete="new-password" value={guestAccountPassword} onChange={(event) => setGuestAccountPassword(event.target.value)} placeholder={t('كلمة مرور للحساب (اختياري)', 'Account password (optional)')} className="min-h-11 w-full rounded-full border border-[#F2E9DF]/10 bg-[#1D070E] px-3 py-2 text-sm text-[#F2E9DF] placeholder:text-[#A8958B]" />}
                  {saveGuestProfile && <p className="text-[10px] text-[#A8958B]">{t('أدخل كلمة مرور لإنشاء حساب وحفظ بياناتك؛ اتركها فارغة للمتابعة كضيف.', 'Set a password to create an account; leave it blank to continue as a guest.')}</p>}
                </div>
              )}
              <div className="flex items-center justify-between rounded-full border border-[#D5BFA8]/30 bg-[#581528]/50 px-3 py-2 text-sm text-[#F2E9DF]">
                <span>{t('الدفع عند الاستلام', 'Cash on Delivery')}</span>
                <Banknote className="h-4 w-4 text-[#D5BFA8]" />
              </div>
              <button type="submit" disabled={placingOrder} className="w-full rounded-full border border-[#F2E9DF] bg-[#F2E9DF] px-4 py-3 text-sm font-semibold text-[#1A050B] transition-colors hover:border-[#F2E9DF]/40 hover:bg-[#581528] hover:text-[#F2E9DF] disabled:opacity-50">
                {placingOrder ? t('جارٍ تأكيد الطلب…', 'Placing order…') : t('تأكيد الطلب (الدفع عند الاستلام)', 'Confirm Order (Cash on Delivery)')}
              </button>
            </form>
          </>
        )}
      </aside>

      {orderPlaced && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#140409]/90 p-4">
          <div className="w-full max-w-xl rounded-[30px] border border-[#F2E9DF]/10 bg-[#1D070E] p-6 text-center shadow-glow">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#581528] text-[#F2E9DF]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 font-['Readex_Pro'] text-3xl text-[#F2E9DF]">{t('تم تأكيد طلبك', 'Order Confirmed')}</h3>
            <p className="mt-3 text-[#A8958B]">{t('مرجع الطلب', 'Order reference')} {orderPlaced.order_number}</p>
            <div className="mt-5 space-y-2 border-y border-[#F2E9DF]/10 py-4 text-start text-sm text-[#A8958B]">
              {orderPlaced.items.map((item) => (
                <div key={`${item.name}-${item.size}`} className="flex justify-between gap-4">
                  <span>{renderText(language, item.name_ar || item.name, item.name)} · {item.size} × {item.quantity}</span>
                  <span>{formatMoney(item.price * item.quantity, language)}</span>
                </div>
              ))}
              <div className="flex justify-between"><span>{t('المجموع الفرعي', 'Subtotal')}</span><span>{formatMoney(orderPlaced.subtotal, language)}</span></div>
              {orderPlaced.coupon_code && <div className="flex justify-between"><span>{t('الخصم', 'Discount')} · {orderPlaced.coupon_code}</span><span>- {formatMoney(orderPlaced.discount_amount, language)}</span></div>}
              <div className="flex justify-between"><span>{t('رسوم الشحن', 'Shipping fee')}</span><span>{formatMoney(orderPlaced.shipping_fee, language)}</span></div>
              <div className="flex justify-between border-t border-[#F2E9DF]/10 pt-2 font-semibold text-[#F2E9DF]"><span>{t('الإجمالي النهائي', 'Final Total')}</span><span>{formatMoney(orderPlaced.total, language)}</span></div>
            </div>
            <button type="button" onClick={() => setOrderPlaced(null)} className="mt-5 rounded-full bg-[#581528] px-5 py-3 text-[#F2E9DF]">
              {t('موافق', 'Done')}
            </button>
          </div>
        </div>
      )}

      {selectedProduct && <ProductOrbitModal
        key={selectedProduct.id}
        product={store.products.find((product) => product.id === selectedProduct.id) || selectedProduct}
        onClose={() => { setSelectedProduct(null); setAdminProductEditing(false) }}
        language={language}
        addToCart={handleAddToCart}
        isWishlisted={wishlist.includes(selectedProduct.id)}
        onToggleWishlist={toggleCustomerWishlist}
        adminEditMode={adminMode && adminProductEditing}
        categories={store.categories}
        onSaveProduct={saveAdminProduct}
      />}
      <WishlistDrawer open={wishlistOpen} language={language} products={store.products} wishlist={wishlist} onClose={() => setWishlistOpen(false)} onRemove={removeFromWishlist} onExplore={(product) => { setWishlistOpen(false); setSelectedProduct(product) }} addToCart={handleAddToCart} />
      <CustomerProfileModal key={`${profileOpen}-${currentCustomer?.id || 'guest'}`} open={profileOpen} language={language} currentCustomer={currentCustomer} orders={store.orders} products={store.products} onClose={() => setProfileOpen(false)} onLogin={handleCustomerLogin} onRegister={handleCustomerRegister} onUpdate={handleCustomerUpdate} onLogout={handleCustomerLogout} addToCart={addToCart} />
      {store.settings.whatsapp_number && !cartOpen && !wishlistOpen && !profileOpen && !selectedProduct && (
        <a
          href={`https://wa.me/${String(store.settings.whatsapp_number).replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          aria-label={t('تواصل معنا عبر واتساب', 'Contact us on WhatsApp')}
          className={`fixed bottom-6 ${language === 'ar' ? 'left-6' : 'right-6'} z-40 hidden h-12 w-12 items-center justify-center border border-[#F2E9DF]/30 bg-[#581528] text-[#F2E9DF] shadow-[0_0_24px_rgba(88,21,40,.5)] sm:flex`}
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      )}

      {toast && (
        <div className="fixed bottom-5 start-1/2 z-[80] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-[#D5BFA8]/30 bg-[#581528] px-4 py-2 text-center text-sm text-[#F2E9DF] shadow-lg">
          {toast}
        </div>
      )}
      {adminMode && adminEditToast && (
        <div role="status" className="fixed bottom-5 start-1/2 z-[100] -translate-x-1/2 rounded-full border border-[#D5BFA8]/40 bg-[#581528] px-5 py-3 text-xs shadow-lg">
          {adminEditToast}
          <button type="button" aria-label="إغلاق" onClick={() => setAdminEditToast('')} className="ms-3">×</button>
        </div>
      )}
      {storeSyncError && (
        <div role="alert" className="fixed bottom-20 start-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-rose-200/30 bg-[#3b101d] px-5 py-3 text-sm text-rose-100 shadow-lg">
          {storeSyncError}<button type="button" onClick={clearStoreSyncError} aria-label="إغلاق">×</button>
        </div>
      )}

      {splashOpen && <CosmicSplashScreen language={language} settings={store.settings} onWarp={revealHero} onFinish={finishSplash} />}
    </div>
  )
}

function ProductCard({ product, language, addToCart, onExplore, adminEditMode = false, isWishlisted, onToggleWishlist }) {
  const [selectedSizeName, setSelectedSizeName] = useState(product.sizes?.[0]?.size || '50ml')
  const selectedSize = product.sizes?.find((size) => size.size === selectedSizeName) || product.sizes?.[0] || { size: '50ml', price: 0 }

  const primaryPrice = selectedSize?.price || product.sizes?.[0]?.price || 0

  return (
    <article
      role={adminEditMode ? 'group' : undefined}
      tabIndex={adminEditMode ? 0 : undefined}
      onClick={(event) => {
        if (adminEditMode && !event.target.closest('button, input, select, a')) onExplore()
      }}
      onKeyDown={(event) => {
        if (adminEditMode && (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
          event.preventDefault()
          onExplore()
        }
      }}
      className={`group relative flex h-full flex-col justify-between border border-[#F2E9DF]/15 bg-[#090204] transition-colors hover:border-[#D5BFA8]/45 ${adminEditMode ? 'cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D5BFA8]' : ''}`}
    >
      <span className="absolute left-2 top-2 z-10 text-[#D5BFA8]/80">+</span>
      <span className="absolute right-2 top-2 z-10 text-[#D5BFA8]/80">+</span>
      <div className="relative aspect-[4/5] overflow-hidden bg-[radial-gradient(ellipse_at_50%_55%,rgba(58,11,25,.2),transparent_50%),#140409]">
        <button type="button" aria-pressed={isWishlisted} aria-label={renderText(language, 'إضافة إلى قائمة الأمنيات', 'Toggle wishlist')} onClick={() => onToggleWishlist(product.id)} className={`absolute right-3 top-3 z-10 rounded-full border p-2 backdrop-blur ${isWishlisted ? 'border-[#D5BFA8] bg-[#581528] text-[#F2E9DF] shadow-[0_0_18px_rgba(88,21,40,.7)]' : 'border-[#F2E9DF]/20 bg-[#140409]/75 text-[#F2E9DF]'}`}>
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>
        <div className="orbit-watermark absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[#D5BFA8]/20" />
        <div className="absolute left-1/2 top-1/2 h-52 w-64 -translate-x-1/2 -translate-y-1/2 rotate-[-28deg] rounded-[50%] border border-[#F2E9DF]/10" />
        <ProductArtwork product={product} language={language} className="relative z-[1] h-full w-full p-5 transition-transform duration-700 group-hover:scale-[1.04]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#090204] to-transparent" />
        <div className="absolute inset-x-5 bottom-4 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-[#D5BFA8]">
          <span>{product.concentration || 'Extrait de Parfum'}</span>
          <span>{formatGender(language, product.gender)}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.25em] text-[#D5BFA8]">
          <span>{formatGender(language, product.gender)}</span>
          <span>{formatSeason(language, product.season)}</span>
        </div>

        <div>
          <h3 className="font-['Readex_Pro'] text-2xl leading-relaxed text-[#F2E9DF]">{language === 'ar' ? product.name_ar : product.name_en}</h3>
          <p className="mt-2 text-sm leading-7 text-[#A8958B]">{language === 'ar' ? product.subtitle_ar : product.subtitle_en}</p>
        </div>

        <p className="text-xs text-[#A8958B]">{renderText(language, 'اختر الحجم:', 'Select Size:')}</p>
        <div className="flex flex-wrap gap-2">
          {product.sizes?.map((size) => (
            <button
              key={`${product.id}-${size.size}`}
              type="button"
              disabled={size.in_stock === false}
              onClick={() => setSelectedSizeName(size.size)}
              className={`min-h-11 min-w-[66px] border px-3 py-2 text-[9px] tracking-[0.15em] ${selectedSize.size === size.size ? 'border-[#D5BFA8] bg-[#581528]/50 text-[#F2E9DF]' : 'border-[#F2E9DF]/15 bg-[#140409] text-[#A8958B]'} disabled:cursor-not-allowed disabled:opacity-35`}
            >
              {size.size.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-[#F2E9DF]/10 pt-3">
          <div>
            <DiscountPrice size={{ ...selectedSize, price: primaryPrice }} language={language} />
          </div>
          {selectedSize.in_stock === false && (
            <span className="border border-[#D5BFA8]/40 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-[#F2E9DF]">
              {renderText(language, 'غير متوفر حالياً', 'Out of Stock')}
            </span>
          )}
        </div>

        <div className="grid gap-px border border-[#D5BFA8]/30 bg-[#D5BFA8]/25 sm:grid-cols-2">
          <button
            type="button"
            disabled={selectedSize.in_stock === false}
            onClick={() => addToCart(product, selectedSize)}
            className="min-h-12 border-e border-[#F2E9DF]/40 bg-[#F2E9DF] px-3 py-2.5 text-[9px] font-medium uppercase tracking-[0.16em] text-[#1A050B] transition-colors hover:bg-[#581528] hover:text-[#F2E9DF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {renderText(language, 'أضف إلى السلة', 'Add to Bag')}
          </button>
          <button
            type="button"
            onClick={() => onExplore(product)}
            className="min-h-12 bg-[#140409] px-3 py-2.5 text-[9px] uppercase tracking-[0.16em] text-[#F2E9DF] hover:bg-[#1D070E]"
          >
            {renderText(language, 'مكونات وتفاصيل العطر', 'Fragrance Notes & Details')}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}

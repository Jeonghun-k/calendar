import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const sectionMonthFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
})

const weekdayFormatter = new Intl.DateTimeFormat('ko-KR', {
  weekday: 'long',
})

const fullDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

const EVENT_COLORS = {
  none: { label: '없음', bg: '#eef0f4', fg: '#1c1c1e' },
  red: { label: '빨강', bg: '#ff3b30', fg: '#ffffff' },
  orange: { label: '주황', bg: '#ff9500', fg: '#ffffff' },
  green: { label: '초록', bg: '#34c759', fg: '#ffffff' },
  blue: { label: '파랑', bg: '#007aff', fg: '#ffffff' },
  purple: { label: '보라', bg: '#5856d6', fg: '#ffffff' },
}

const COLOR_KEYS = Object.keys(EVENT_COLORS)

const FALLBACK_HOLIDAYS = {
  '2026-01-01': '신정',
  '2026-02-16': '설날',
  '2026-02-17': '설날',
  '2026-02-18': '설날',
  '2026-03-01': '삼일절',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-09-24': '추석',
  '2026-09-25': '추석',
  '2026-09-26': '추석',
  '2026-10-03': '개천절',
  '2026-10-09': '한글날',
  '2026-12-25': '기독탄신일',
  '2027-01-01': '신정',
  '2027-02-05': '설날',
  '2027-02-06': '설날',
  '2027-02-07': '설날',
  '2027-03-01': '삼일절',
  '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-08-15': '광복절',
  '2027-09-14': '추석',
  '2027-09-15': '추석',
  '2027-09-16': '추석',
  '2027-10-03': '개천절',
  '2027-10-09': '한글날',
  '2027-12-25': '기독탄신일',
}

const HOLIDAY_PROXY_ENDPOINT = import.meta.env.VITE_HOLIDAY_PROXY_ENDPOINT?.trim() || ''

const EVENTS_STORAGE_KEY = 'calendar.events.v1'

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const toDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dateFromKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const dateFromMonthKey = (key) => {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

const getMonthOffset = (baseDate, targetDate) => {
  return (targetDate.getFullYear() - baseDate.getFullYear()) * 12 + (targetDate.getMonth() - baseDate.getMonth())
}

const formatTimeValue = (date) => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const fromEventMapToStorage = (eventMap) => JSON.stringify(eventMap)

const loadEventsFromStorage = () => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.error('로컬 일정 복원 실패', error)
    return {}
  }
}

const eventMapFromSupabaseRows = (rows) => {
  return rows.reduce((acc, row) => {
    const startDate = new Date(row.start_at)
    const dateKey = toDateKey(startDate)
    const payload = {
      id: row.id,
      time: row.all_day ? '종일' : formatTimeValue(startDate),
      title: row.title,
      notes: row.notes || '메모 없음',
      color: row.color || 'none',
    }
    const current = acc[dateKey] ?? []
    acc[dateKey] = [...current, payload]
    return acc
  }, {})
}

const eventDraftToSupabasePayload = ({ title, dateKey, allDay, time, notes, color }) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  const safeTime = time || '09:00'
  const [hour, minute] = safeTime.split(':').map(Number)
  const startAt = allDay ? new Date(year, month - 1, day, 0, 0, 0, 0) : new Date(year, month - 1, day, hour, minute, 0, 0)
  const endAt = allDay ? new Date(year, month - 1, day + 1, 0, 0, 0, 0) : new Date(year, month - 1, day, hour + 1, minute, 0, 0)

  return {
    title,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    all_day: allDay,
    notes: notes.trim() || '',
    color,
  }
}

const getDayToneClass = (date, isHolidayDate) => {
  if (isHolidayDate || date.getDay() === 0) {
    return 'sun'
  }
  if (date.getDay() === 6) {
    return 'sat'
  }
  return 'weekday'
}

const toWeeks = (days, leadingEmpty) => {
  const slots = Array.from({ length: leadingEmpty }, () => null).concat(days)
  const trailing = (7 - (slots.length % 7)) % 7

  for (let idx = 0; idx < trailing; idx += 1) {
    slots.push(null)
  }

  const weeks = []
  for (let start = 0; start < slots.length; start += 7) {
    weeks.push(slots.slice(start, start + 7))
  }

  return weeks
}

const createMonthData = (baseDate, offset) => {
  const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1)
  const year = firstDay.getFullYear()
  const month = firstDay.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1)
    return {
      date,
      key: toDateKey(date),
      dayNumber: index + 1,
    }
  })

  return {
    key: monthKey(firstDay),
    date: firstDay,
    title: sectionMonthFormatter.format(firstDay),
    weeks: toWeeks(days, firstDay.getDay()),
  }
}

const createDefaultDraft = (dateKey) => ({
  title: '',
  dateKey,
  allDay: false,
  time: '09:00',
  notes: '',
  color: 'none',
})

const resolveColorByKeyword = (title, selectedColor) => {
  const deadlineIndex = title.indexOf('마감')
  const basicIndex = title.indexOf('기초')

  if (deadlineIndex === -1 && basicIndex === -1) {
    return selectedColor || 'none'
  }
  if (deadlineIndex !== -1) {
    return 'blue'
  }
  return 'red'
}

const updateEventMap = (prevMap, sourceDateKey, targetDateKey, eventId, payload) => {
  const nextMap = {}

  Object.entries(prevMap).forEach(([dateKey, events]) => {
    const filtered = events.filter((item) => item.id !== eventId)
    if (filtered.length > 0) {
      nextMap[dateKey] = filtered
    }
  })

  const targetEvents = nextMap[targetDateKey] ?? []
  nextMap[targetDateKey] = [...targetEvents, payload]

  if (sourceDateKey === targetDateKey && targetEvents.length === 0 && !nextMap[targetDateKey]) {
    nextMap[targetDateKey] = [payload]
  }

  return nextMap
}

const getHeaderMonthLabel = (date) => `${date.getMonth() + 1}월`
const WINDOW_MONTH_COUNT = 24
const WINDOW_CENTER_INDEX = 12
const WINDOW_SHIFT_EDGE = 4

export default function App() {
  const today = useMemo(() => new Date(), [])
  const todayKey = useMemo(() => toDateKey(today), [today])
  const todayMonthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today])
  const [windowStartOffset, setWindowStartOffset] = useState(-12)

  const monthList = useMemo(() => {
    // 현재 달 기준 총 24개월 범위
    return Array.from({ length: WINDOW_MONTH_COUNT }, (_, index) => createMonthData(todayMonthStart, windowStartOffset + index))
  }, [todayMonthStart, windowStartOffset])

  const [activeMonthKey, setActiveMonthKey] = useState(monthKey(today))
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey)
  const [isEventOpen, setIsEventOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [eventsByDate, setEventsByDate] = useState(() => loadEventsFromStorage())
  const [holidaysByDate, setHolidaysByDate] = useState(FALLBACK_HOLIDAYS)
  const [eventDraft, setEventDraft] = useState(createDefaultDraft(todayKey))
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedEventDateKey, setSelectedEventDateKey] = useState(todayKey)
  const [editingEventId, setEditingEventId] = useState(null)
  const [editingSourceDateKey, setEditingSourceDateKey] = useState(todayKey)
  const [toastMessage, setToastMessage] = useState('')
  const [isSupabaseLinked, setIsSupabaseLinked] = useState(false)
  const [authStatus, setAuthStatus] = useState(supabase ? 'checking' : 'local')
  const [authDraft, setAuthDraft] = useState({ email: '', password: '' })
  const [authErrorMessage, setAuthErrorMessage] = useState('')
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [hasInitialFocus, setHasInitialFocus] = useState(false)
  const [todayFocusToken, setTodayFocusToken] = useState(0)

  const scrollRef = useRef(null)
  const monthRefs = useRef(new Map())
  const dayRefs = useRef(new Map())
  const pendingMonthAnchorRef = useRef(null)
  const isForcingTodayRef = useRef(false)
  const isSupabaseReadyRef = useRef(false)
  const isCalendarVisible = authStatus === 'authenticated' || authStatus === 'local'

  const requestTodayFocus = () => {
    isForcingTodayRef.current = true
    pendingMonthAnchorRef.current = null
    setHasInitialFocus(false)
    setWindowStartOffset(-12)
    setActiveMonthKey(monthKey(today))
    setSelectedDateKey(todayKey)
    setTodayFocusToken((prev) => prev + 1)
  }

  const loadEventsFromSupabase = useCallback(async () => {
    if (!supabase) {
      return
    }

    const { data, error } = await supabase
      .from('events')
      .select('id,title,start_at,end_at,all_day,notes,color')
      .order('start_at', { ascending: true })

    if (error) {
      throw error
    }

    const normalized = eventMapFromSupabaseRows(data ?? [])
    setEventsByDate(normalized)
  }, [])

  useEffect(() => {
    const yearSet = new Set(monthList.map((monthItem) => monthItem.date.getFullYear()))
    if (yearSet.size === 0 || !HOLIDAY_PROXY_ENDPOINT) {
      return
    }

    let isUnmounted = false

    const fetchHolidayByYear = async (year) => {
      const query = new URLSearchParams({ year: String(year) })
      const response = await fetch(`${HOLIDAY_PROXY_ENDPOINT}?${query.toString()}`)
      if (!response.ok) {
        throw new Error(`failed-${year}`)
      }

      const payload = await response.json()
      const itemValue = payload?.response?.body?.items?.item
      const itemsFromLegacy = Array.isArray(itemValue) ? itemValue : itemValue ? [itemValue] : []
      const itemsFromList = Array.isArray(payload?.holidays) ? payload.holidays : []
      const items = itemsFromList.length > 0 ? itemsFromList : itemsFromLegacy

      return items.reduce((acc, item) => {
        const rawDate = String(item?.date ?? item?.locdate ?? '')
        const normalizedDate = rawDate.includes('-') ? rawDate.replaceAll('-', '') : rawDate
        if (normalizedDate.length !== 8) {
          return acc
        }

        const nextKey = `${normalizedDate.slice(0, 4)}-${normalizedDate.slice(4, 6)}-${normalizedDate.slice(6, 8)}`
        const dateName = String(item?.name ?? item?.dateName ?? '공휴일')
        acc[nextKey] = dateName
        return acc
      }, {})
    }

    const loadHolidays = async () => {
      try {
        const yearList = Array.from(yearSet)
        const responses = await Promise.all(yearList.map((year) => fetchHolidayByYear(year)))
        const merged = responses.reduce((acc, byYear) => ({ ...acc, ...byYear }), {})
        if (isUnmounted || Object.keys(merged).length === 0) {
          return
        }
        setHolidaysByDate((prev) => ({ ...prev, ...merged }))
      } catch (error) {
        console.error('공휴일 API 조회 실패, 기본값을 사용합니다.', error)
      }
    }

    loadHolidays()

    return () => {
      isUnmounted = true
    }
  }, [monthList])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(EVENTS_STORAGE_KEY, fromEventMapToStorage(eventsByDate))
  }, [eventsByDate])

  useEffect(() => {
    if (!supabase) {
      setAuthStatus('local')
      setIsSupabaseLinked(false)
      isSupabaseReadyRef.current = false
      return
    }

    let isUnmounted = false
    const applySession = (session) => {
      if (isUnmounted) {
        return
      }

      const isAuthenticated = Boolean(session)
      setAuthStatus(isAuthenticated ? 'authenticated' : 'unauthenticated')
      setIsSupabaseLinked(isAuthenticated)
      isSupabaseReadyRef.current = isAuthenticated
      if (!isAuthenticated) {
        setAuthErrorMessage('')
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        applySession(data.session)
      })
      .catch((error) => {
        console.error('Supabase 세션 확인 실패', error)
        applySession(null)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    return () => {
      isUnmounted = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || authStatus !== 'authenticated') {
      return
    }

    let isUnmounted = false
    let channel = null

    const bindRealtime = async () => {
      try {
        await loadEventsFromSupabase()
        if (isUnmounted) {
          return
        }

        channel = supabase
          .channel('events-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
            loadEventsFromSupabase().catch((error) => {
              console.error('Supabase 실시간 동기화 실패', error)
            })
          })
          .subscribe()
      } catch (error) {
        console.error('Supabase 연동 실패', error)
      }
    }

    bindRealtime()

    return () => {
      isUnmounted = true
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [authStatus, loadEventsFromSupabase])

  useEffect(() => {
    if (!isCalendarVisible) {
      return
    }
    requestTodayFocus()
  }, [today, todayKey, isCalendarVisible])

  useEffect(() => {
    if (!isCalendarVisible) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestTodayFocus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [today, todayKey, isCalendarVisible])

  useEffect(() => {
    if (!isCalendarVisible) {
      return
    }

    if (todayFocusToken === 0) {
      return
    }

    const scroller = scrollRef.current
    if (!scroller) {
      isForcingTodayRef.current = false
      return
    }

    const todayMonthKey = monthKey(today)

    const tryFocusToday = (attempt = 0) => {
      requestAnimationFrame(() => {
        const monthNode = monthRefs.current.get(todayMonthKey)
        if (monthNode) {
          const targetTop = Math.max(
            monthNode.offsetTop - scroller.clientHeight / 2 + monthNode.clientHeight / 2,
            0,
          )
          scroller.scrollTo({ top: targetTop, behavior: 'auto' })
          setActiveMonthKey(todayMonthKey)
          requestAnimationFrame(() => {
            setHasInitialFocus(true)
            isForcingTodayRef.current = false
          })
          return
        }

        if (attempt < 12) {
          window.setTimeout(() => {
            tryFocusToday(attempt + 1)
          }, 50)
        } else {
          setHasInitialFocus(true)
          isForcingTodayRef.current = false
        }
      })
    }

    tryFocusToday(0)
  }, [todayFocusToken, today, isCalendarVisible])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) {
      return
    }

    if (isForcingTodayRef.current || !hasInitialFocus) {
      return
    }

    const activeIndex = monthList.findIndex((monthItem) => monthItem.key === activeMonthKey)
    if (activeIndex === -1) {
      const activeDate = dateFromMonthKey(activeMonthKey)
      const offsetFromToday = getMonthOffset(todayMonthStart, activeDate)
      setWindowStartOffset(offsetFromToday - 12)
      return
    }

    const isNearTopEdge = activeIndex <= WINDOW_SHIFT_EDGE
    const isNearBottomEdge = activeIndex >= WINDOW_MONTH_COUNT - WINDOW_SHIFT_EDGE - 1
    if (!isNearTopEdge && !isNearBottomEdge) {
      return
    }

    const delta = activeIndex - WINDOW_CENTER_INDEX
    if (delta === 0) {
      return
    }

    const activeNode = monthRefs.current.get(activeMonthKey)
    const relativeTop = activeNode ? activeNode.offsetTop - scroller.scrollTop : 120
    pendingMonthAnchorRef.current = {
      key: activeMonthKey,
      relativeTop,
    }

    setWindowStartOffset((prev) => prev + delta)
  }, [activeMonthKey, monthList, todayMonthStart, hasInitialFocus])

  useEffect(() => {
    if (isForcingTodayRef.current || !hasInitialFocus) {
      return
    }

    const pending = pendingMonthAnchorRef.current
    const scroller = scrollRef.current
    if (!pending || !scroller) {
      return
    }

    requestAnimationFrame(() => {
      const monthNode = monthRefs.current.get(pending.key)
      if (monthNode) {
        scroller.scrollTo({
          top: Math.max(monthNode.offsetTop - pending.relativeTop, 0),
          behavior: 'auto',
        })
      }
      pendingMonthAnchorRef.current = null
    })
  }, [monthList, hasInitialFocus])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) {
      return
    }

    let ticking = false

    const updateActiveMonth = () => {
      if (!hasInitialFocus || isForcingTodayRef.current) {
        ticking = false
        return
      }

      const focusY = scroller.scrollTop + scroller.clientHeight * 0.28
      let nextKey = monthList[0]?.key ?? monthKey(today)

      for (let index = 0; index < monthList.length; index += 1) {
        const currentMonth = monthList[index]
        const currentNode = monthRefs.current.get(currentMonth.key)
        if (!currentNode) {
          continue
        }

        if (focusY >= currentNode.offsetTop) {
          nextKey = currentMonth.key
          continue
        }

        break
      }

      setActiveMonthKey((prev) => (prev === nextKey ? prev : nextKey))
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(updateActiveMonth)
      }
    }

    const handleResize = () => updateActiveMonth()

    scroller.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    updateActiveMonth()

    return () => {
      scroller.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [monthList, today, hasInitialFocus])

  useEffect(() => {
    if (!toastMessage) {
      return
    }
    const timer = window.setTimeout(() => {
      setToastMessage('')
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const activeMonth = useMemo(() => {
    return monthList.find((monthItem) => monthItem.key === activeMonthKey) ?? monthList[0]
  }, [activeMonthKey, monthList])

  const selectedEventDate = useMemo(() => dateFromKey(selectedEventDateKey), [selectedEventDateKey])

  const openAddSheet = (dateKey) => {
    setSelectedDateKey(dateKey)
    setEditingEventId(null)
    setEditingSourceDateKey(dateKey)
    setEventDraft(createDefaultDraft(dateKey))
    setIsEventOpen(false)
    setIsAddOpen(true)
  }

  const openEditSheet = (dateKey, eventItem) => {
    setSelectedDateKey(dateKey)
    setEditingEventId(eventItem.id)
    setEditingSourceDateKey(dateKey)
    setEventDraft({
      title: eventItem.title,
      dateKey,
      allDay: eventItem.time === '종일',
      time: eventItem.time === '종일' ? '09:00' : eventItem.time,
      notes: eventItem.notes === '메모 없음' ? '' : eventItem.notes,
      color: eventItem.color || 'none',
    })
    setIsEventOpen(false)
    setIsAddOpen(true)
  }

  const openEventSheet = (dateKey, eventItem) => {
    setSelectedDateKey(dateKey)
    setSelectedEventDateKey(dateKey)
    setSelectedEvent(eventItem)
    setIsAddOpen(false)
    setIsEventOpen(true)
  }

  const handleDeleteSelectedEvent = async () => {
    if (!selectedEvent) {
      return
    }

    const isConfirmed = window.confirm('이 일정을 삭제할까요?')
    if (!isConfirmed) {
      return
    }

    const targetDateKey = selectedEventDateKey
    const targetEventId = selectedEvent.id

    if (isSupabaseReadyRef.current && supabase) {
      const { error } = await supabase.from('events').delete().eq('id', targetEventId)
      if (error) {
        console.error('Supabase 일정 삭제 실패', error)
        setToastMessage('삭제에 실패했어요. 잠시 후 다시 시도해주세요.')
        return
      }
    }

    setEventsByDate((prev) => {
      const current = prev[targetDateKey] ?? []
      const nextEvents = current.filter((item) => item.id !== targetEventId)
      if (nextEvents.length === 0) {
        const { [targetDateKey]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [targetDateKey]: nextEvents,
      }
    })

    setSelectedDateKey(targetDateKey)
    setSelectedEvent(null)
    setIsEventOpen(false)
    setToastMessage('일정을 삭제했어요.')
  }

  const handleDraftChange = (event) => {
    const { name, type, value, checked } = event.target
    setEventDraft((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleColorPick = (colorKey) => {
    setEventDraft((prev) => ({
      ...prev,
      color: colorKey,
    }))
  }

  const handleAuthDraftChange = (event) => {
    const { name, value } = event.target
    setAuthDraft((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    if (!supabase || isAuthSubmitting) {
      return
    }

    setIsAuthSubmitting(true)
    setAuthErrorMessage('')
    const { error } = await supabase.auth.signInWithPassword({
      email: authDraft.email.trim(),
      password: authDraft.password,
    })

    if (error) {
      setAuthErrorMessage('로그인에 실패했어요. 이메일/비밀번호를 확인해주세요.')
    } else {
      setAuthDraft((prev) => ({ ...prev, password: '' }))
    }
    setIsAuthSubmitting(false)
  }

  const handleAddSubmit = async (event) => {
    event.preventDefault()

    const title = eventDraft.title.trim()
    if (!title) {
      return
    }

    const targetDateKey = eventDraft.dateKey
    const resolvedColor = resolveColorByKeyword(title, eventDraft.color)
    const payload = eventDraftToSupabasePayload({
      ...eventDraft,
      title,
      color: resolvedColor,
    })

    if (editingEventId) {
      if (isSupabaseReadyRef.current && supabase) {
        const { data, error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editingEventId)
          .select('id,title,start_at,end_at,all_day,notes,color')
          .single()

        if (error) {
          console.error('Supabase 일정 수정 실패', error)
          setToastMessage('저장에 실패했어요. 잠시 후 다시 시도해주세요.')
          return
        }

        const parsedStart = new Date(data.start_at)
        const updatedItem = {
          id: data.id,
          time: data.all_day ? '종일' : formatTimeValue(parsedStart),
          title: data.title,
          notes: data.notes || '메모 없음',
          color: data.color || 'none',
        }

        setEventsByDate((prev) => updateEventMap(prev, editingSourceDateKey, targetDateKey, editingEventId, updatedItem))
        setSelectedEventDateKey(targetDateKey)
        setSelectedEvent(updatedItem)
        setIsEventOpen(true)
      } else {
        const updatedItem = {
          id: editingEventId,
          time: eventDraft.allDay ? '종일' : eventDraft.time || '09:00',
          title,
          notes: eventDraft.notes.trim() || '메모 없음',
          color: resolvedColor,
        }

        setEventsByDate((prev) => updateEventMap(prev, editingSourceDateKey, targetDateKey, editingEventId, updatedItem))
        setSelectedEventDateKey(targetDateKey)
        setSelectedEvent(updatedItem)
        setIsEventOpen(true)
      }
    } else {
      if (isSupabaseReadyRef.current && supabase) {
        const { data, error } = await supabase
          .from('events')
          .insert(payload)
          .select('id,title,start_at,end_at,all_day,notes,color')
          .single()

        if (error) {
          console.error('Supabase 일정 생성 실패', error)
          setToastMessage('저장에 실패했어요. 잠시 후 다시 시도해주세요.')
          return
        }

        const parsedStart = new Date(data.start_at)
        const nextItem = {
          id: data.id,
          time: data.all_day ? '종일' : formatTimeValue(parsedStart),
          title: data.title,
          notes: data.notes || '메모 없음',
          color: data.color || 'none',
        }

        setEventsByDate((prev) => {
          const current = prev[targetDateKey] ?? []
          return {
            ...prev,
            [targetDateKey]: [...current, nextItem],
          }
        })
        setSelectedEventDateKey(targetDateKey)
        setSelectedEvent(nextItem)
        setIsEventOpen(true)
      } else {
        const nextItem = {
          id: `local-${targetDateKey}-${Date.now()}`,
          time: eventDraft.allDay ? '종일' : eventDraft.time || '09:00',
          title,
          notes: eventDraft.notes.trim() || '메모 없음',
          color: resolvedColor,
        }

        setEventsByDate((prev) => {
          const current = prev[targetDateKey] ?? []
          return {
            ...prev,
            [targetDateKey]: [...current, nextItem],
          }
        })
        setSelectedEventDateKey(targetDateKey)
        setSelectedEvent(nextItem)
        setIsEventOpen(true)
      }
    }

    setSelectedDateKey(targetDateKey)
    setIsAddOpen(false)
    setEditingEventId(null)
  }

  const getEventChipStyle = (colorKey) => {
    const color = EVENT_COLORS[colorKey] ?? EVENT_COLORS.none
    return {
      backgroundColor: color.bg,
      color: color.fg,
    }
  }

  if (authStatus === 'checking') {
    return (
      <main className="calendar-app auth-screen" aria-label="로그인 상태 확인">
        <section className="auth-card">
          <h1>세션 확인 중</h1>
          <p>잠시만 기다려주세요.</p>
        </section>
      </main>
    )
  }

  if (authStatus === 'unauthenticated') {
    return (
      <main className="calendar-app auth-screen" aria-label="로그인">
        <section className="auth-card">
          <h1>공유 캘린더 로그인</h1>
          <p>가족 공용 계정으로 로그인하세요.</p>
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label className="field">
              <span>이메일</span>
              <input
                autoComplete="username"
                name="email"
                onChange={handleAuthDraftChange}
                required
                type="email"
                value={authDraft.email}
              />
            </label>
            <label className="field">
              <span>비밀번호</span>
              <input
                autoComplete="current-password"
                name="password"
                onChange={handleAuthDraftChange}
                required
                type="password"
                value={authDraft.password}
              />
            </label>
            {authErrorMessage ? <p className="auth-error">{authErrorMessage}</p> : null}
            <button className="auth-submit" disabled={isAuthSubmitting} type="submit">
              {isAuthSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="calendar-app" aria-label="모바일 캘린더">
      <div className="top-chrome">
        <header className="calendar-header">
          <div className="calendar-title-stack" aria-live="polite">
            <p className="title-year" key={`year-${activeMonth.key}`}>
              {activeMonth.date.getFullYear()}
            </p>
            <h1 className="title-month" key={`month-${activeMonth.key}`}>
              {getHeaderMonthLabel(activeMonth.date)}
            </h1>
          </div>

          <div className="header-actions">
            <span className={`sync-badge ${isSupabaseLinked ? 'ok' : 'local'}`}>
              {isSupabaseLinked ? 'Supabase 연결됨' : '로컬 저장 모드'}
            </span>
            <button className="top-today-button" onClick={requestTodayFocus} type="button">
              오늘
            </button>
            <button className="top-add-button" onClick={() => openAddSheet(selectedDateKey)} type="button">
              일정 추가
            </button>
          </div>
        </header>

        <div className="weekday-bar" role="row">
          {WEEKDAYS.map((day, index) => (
            <span className={index === 0 ? 'sun' : index === 6 ? 'sat' : 'weekday'} key={day} role="columnheader">
              {day}
            </span>
          ))}
        </div>
      </div>

      <div className="calendar-scroll" ref={scrollRef}>
        {monthList.map((monthItem) => (
          <section
            className="month-section"
            data-month={monthItem.key}
            key={monthItem.key}
            ref={(node) => {
              if (node) {
                monthRefs.current.set(monthItem.key, node)
              } else {
                monthRefs.current.delete(monthItem.key)
              }
            }}
          >
            <p className="month-inline-title">{monthItem.title}</p>

            <div className="month-weeks">
              {monthItem.weeks.map((week, weekIndex) => (
                <div className="week-row" key={`${monthItem.key}-week-${weekIndex}`}>
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return <div aria-hidden="true" className="day-slot empty" key={`${monthItem.key}-${weekIndex}-${dayIndex}`} />
                    }

                    const events = eventsByDate[day.key] ?? []
                    const holidayName = holidaysByDate[day.key]
                    const toneClass = getDayToneClass(day.date, Boolean(holidayName))
                    const isToday = day.key === todayKey
                    const isSelectedDate = day.key === selectedDateKey

                    return (
                      <div
                        className="day-slot"
                        key={day.key}
                        ref={(node) => {
                          if (node) {
                            dayRefs.current.set(day.key, node)
                          } else {
                            dayRefs.current.delete(day.key)
                          }
                        }}
                      >
                        <button
                          className={`day-number-anchor day-number-button ${isSelectedDate ? 'selected' : ''}`}
                          onClick={() => openAddSheet(day.key)}
                          type="button"
                        >
                          <span className={`day-number ${toneClass} ${isToday ? 'today' : ''}`}>{day.dayNumber}</span>
                        </button>

                        <span className="event-stack" aria-label={`${day.key} 일정`}>
                          {holidayName ? (
                            <span className="event-chip holiday-chip" style={{ backgroundColor: '#ff3b30', color: '#ffffff' }}>
                              <span className="event-title">{holidayName}</span>
                            </span>
                          ) : null}
                          {events.slice(0, 3).map((eventItem) => (
                            <button
                              className="event-chip event-chip-button"
                              key={eventItem.id}
                              onClick={() => openEventSheet(day.key, eventItem)}
                              style={getEventChipStyle(eventItem.color)}
                              type="button"
                            >
                              <span className="event-title">{eventItem.title}</span>
                              <span className="event-time">{eventItem.time}</span>
                            </button>
                          ))}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {isEventOpen && selectedEvent ? (
        <div className="sheet-overlay" onClick={() => setIsEventOpen(false)} role="presentation">
          <section className="detail-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />

            <div className="sheet-header">
              <div>
                <p className="sheet-caption">{fullDateFormatter.format(selectedEventDate)}</p>
                <h2>{selectedEvent.title}</h2>
              </div>
              <div className="sheet-header-actions">
                <button className="sheet-delete-button" onClick={handleDeleteSelectedEvent} type="button">
                  일정 삭제
                </button>
                <button className="sheet-add-button" onClick={() => openEditSheet(selectedEventDateKey, selectedEvent)} type="button">
                  일정 수정
                </button>
              </div>
            </div>

            <div className="sheet-events">
              <article className="sheet-event-item">
                <p className="sheet-event-time">{selectedEvent.time}</p>
                <p className="sheet-event-title">
                  색상: {EVENT_COLORS[selectedEvent.color]?.label ?? EVENT_COLORS.none.label}
                </p>
                <p className="sheet-event-notes">{selectedEvent.notes}</p>
              </article>
            </div>
          </section>
        </div>
      ) : null}

      {isAddOpen ? (
        <div className="sheet-overlay" onClick={() => setIsAddOpen(false)} role="presentation">
          <section className="detail-sheet add-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />

            <div className="sheet-header">
              <div>
                <p className="sheet-caption">{editingEventId ? '일정 수정' : '새 일정'}</p>
                <h2>{fullDateFormatter.format(dateFromKey(eventDraft.dateKey))}</h2>
              </div>
            </div>

            <form className="add-form" onSubmit={handleAddSubmit}>
              <label className="field">
                <span>제목</span>
                <input name="title" onChange={handleDraftChange} required type="text" value={eventDraft.title} />
              </label>

              <div className="field-row two">
                <label className="field">
                  <span>요일</span>
                  <input readOnly type="text" value={weekdayFormatter.format(dateFromKey(eventDraft.dateKey))} />
                </label>

                <label className="field">
                  <span>날짜</span>
                  <input name="dateKey" onChange={handleDraftChange} required type="date" value={eventDraft.dateKey} />
                </label>
              </div>

              <label className="check-field">
                <input checked={eventDraft.allDay} name="allDay" onChange={handleDraftChange} type="checkbox" />
                <span>종일 일정</span>
              </label>

              {!eventDraft.allDay ? (
                <label className="field">
                  <span>시간</span>
                  <input name="time" onChange={handleDraftChange} required type="time" value={eventDraft.time} />
                </label>
              ) : null}

              <fieldset className="color-fieldset">
                <legend>색상</legend>
                <div className="color-grid" role="radiogroup" aria-label="일정 색상 선택">
                  {COLOR_KEYS.map((colorKey) => {
                    const color = EVENT_COLORS[colorKey]
                    const isSelected = eventDraft.color === colorKey

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`color-swatch ${isSelected ? 'selected' : ''} ${colorKey === 'none' ? 'none' : ''}`}
                        key={colorKey}
                        onClick={() => handleColorPick(colorKey)}
                        style={{ backgroundColor: colorKey === 'none' ? '#ffffff' : color.bg }}
                        title={color.label}
                        type="button"
                      >
                        <span>{color.label}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <label className="field">
                <span>메모</span>
                <textarea name="notes" onChange={handleDraftChange} rows={3} value={eventDraft.notes} />
              </label>

              <div className="form-actions">
                <button className="sheet-add-button" type="submit">
                  저장
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {toastMessage ? <div className="toast-message">{toastMessage}</div> : null}
    </main>
  )
}

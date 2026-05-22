"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import {
  type LucideIcon,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  FileText,
  Image as ImageIcon,
  Languages,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Mic,
  Moon,
  Paperclip,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Shield,
  Sun,
  Ticket,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react"
import {
  type AdminUser,
  type FeedItem,
  type FeedType,
  type Profile,
  type Role,
  type SupportTicket,
  ensureAdminProfile,
  logout,
  redirectToAuth,
  request,
} from "@/lib/api"

gsap.registerPlugin(ScrollTrigger)

type Section = "overview" | "users" | "feed" | "tickets" | "ticket" | "subscriptions" | "profile" | "assistant"
type Lang = "ru" | "en"
type Theme = "dark" | "light"
type FeedService = "planner" | "documents"
type PageSize = 10 | 25 | 50 | 100 | "all"

type Copy = {
  nav: Record<Section, string>
  subtitle: string
  loading: string
  denied: string
  search: string
  save: string
  cancel: string
  create: string
  refresh: string
  close: string
  reply: string
  logout: string
  active: string
  blocked: string
  all: string
}

const DICT: Record<Lang, Copy> = {
  ru: {
    nav: { overview: "Обзор", users: "Пользователи", feed: "Лента", tickets: "Тикеты", ticket: "Тикет", subscriptions: "Подписки", profile: "Профиль", assistant: "Ассистент" },
    subtitle: "Единая админ-панель экосистемы Nerior",
    loading: "Загрузка админ-сессии…",
    denied: "Нужна админ-сессия. Перенаправляю на авторизацию.",
    search: "Поиск…",
    save: "Сохранить",
    cancel: "Отмена",
    create: "Создать",
    refresh: "Обновить",
    close: "Закрыть",
    reply: "Ответить",
    logout: "Выйти",
    active: "Активен",
    blocked: "Заблокирован",
    all: "Все",
  },
  en: {
    nav: { overview: "Overview", users: "Users", feed: "Feed", tickets: "Tickets", ticket: "Ticket", subscriptions: "Subscriptions", profile: "Profile", assistant: "Assistant" },
    subtitle: "Unified Nerior ecosystem administration",
    loading: "Loading admin session…",
    denied: "Admin session required. Redirecting to auth.",
    search: "Search…",
    save: "Save",
    cancel: "Cancel",
    create: "Create",
    refresh: "Refresh",
    close: "Close",
    reply: "Reply",
    logout: "Logout",
    active: "Active",
    blocked: "Blocked",
    all: "All",
  },
}

const navItems: Array<{ section: Section; href: string; icon: LucideIcon }> = [
  { section: "overview", href: "/", icon: LayoutDashboard },
  { section: "users", href: "/users", icon: Users },
  { section: "feed", href: "/feed", icon: Bell },
  { section: "tickets", href: "/tickets", icon: Ticket },
  { section: "subscriptions", href: "/subscriptions", icon: CreditCard },
]

const feedServices: Array<{ id: FeedService; label: string; description: string }> = [
  { id: "planner", label: "Planner", description: "Напоминания, обновления, уведомления и тикеты календаря." },
  { id: "documents", label: "Documents", description: "События архива, обработки документов и хранилища." },
]

const feedTypes: Array<{ id: FeedType; label: string; tone: string }> = [
  { id: "reminder", label: "Напоминание", tone: "tone-reminder" },
  { id: "notification", label: "Уведомление", tone: "tone-notification" },
  { id: "update", label: "Обновление", tone: "tone-update" },
  { id: "ticket", label: "Тикет", tone: "tone-ticket" },
]

const subscriptionPlans = [
  { id: "free", name: "Free", price: "0 ₽", users: 218, features: ["Базовый доступ", "Ручная организация", "Ограниченная история", "Поддержка по тикетам"] },
  { id: "plus", name: "Plus", price: "499 ₽", users: 74, features: ["AI summary", "Semantic search", "Интеграции", "Расширенная история", "Приоритетная поддержка"] },
  { id: "pro", name: "Pro", price: "1490 ₽", users: 19, features: ["Knowledge graph", "AI timeline", "Командные функции", "Расширенные отчёты", "Ранний доступ"] },
]

const planUsers = [
  { username: "karpik", email: "karpik@nerior.ru", plan: "Pro", expires: "22.08.2026" },
  { username: "anna", email: "anna@example.com", plan: "Plus", expires: "15.07.2026" },
  { username: "manager", email: "manager@nerior.ru", plan: "Free", expires: "—" },
]

function useSettings() {
  const [lang, setLang] = useState<Lang>("ru")
  const [theme, setTheme] = useState<Theme>("dark")
  useEffect(() => {
    const nextLang = (localStorage.getItem("nerior_admin_lang") as Lang | null) || "ru"
    const nextTheme = (localStorage.getItem("nerior_theme") as Theme | null) || "dark"
    setLang(nextLang === "en" ? "en" : "ru")
    setTheme(nextTheme === "light" ? "light" : "dark")
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = lang
    localStorage.setItem("nerior_admin_lang", lang)
    localStorage.setItem("nerior_theme", theme)
  }, [lang, theme])
  return { lang, setLang, theme, setTheme, t: DICT[lang] }
}

export function AdminWorkspace({ section, ticketId }: { section: Section; ticketId?: string }) {
  const settings = useSettings()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authState, setAuthState] = useState<"loading" | "ready" | "denied">("loading")
  const mainRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    ensureAdminProfile().then((item) => {
      if (!item) {
        setAuthState("denied")
        setTimeout(redirectToAuth, 700)
        return
      }
      setProfile(item)
      setAuthState("ready")
    })
  }, [])

  useGSAP(() => {
    if (authState !== "ready") return
    gsap.fromTo(".lux-enter", { y: 18, opacity: 0, filter: "blur(8px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, stagger: 0.045, ease: "power3.out" })
    gsap.utils.toArray<HTMLElement>(".stack-card").forEach((el, index) => {
      gsap.fromTo(el, { y: 26 + index * 4, opacity: 0.45 }, { y: 0, opacity: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 94%", end: "top 62%", scrub: true } })
    })
  }, { scope: mainRef, dependencies: [authState, section], revertOnUpdate: true })

  if (authState !== "ready") return <Gate text={authState === "loading" ? settings.t.loading : settings.t.denied} />

  return (
    <div className="shell">
      <Sidebar section={section} profile={profile} settings={settings} />
      <main className="main" ref={mainRef}>
        <Topbar title={settings.t.nav[section]} subtitle={settings.t.subtitle} profile={profile} />
        {section === "overview" && <Overview />}
        {section === "users" && <UsersPanel settings={settings} />}
        {section === "feed" && <FeedPanel settings={settings} />}
        {section === "tickets" && <TicketsPanel settings={settings} />}
        {section === "ticket" && <TicketPanel settings={settings} ticketId={ticketId} />}
        {section === "subscriptions" && <SubscriptionsPanel settings={settings} />}
        {section === "profile" && <ProfilePanel profile={profile} />}
        {section === "assistant" && <Overview />}
      </main>
    </div>
  )
}

function Gate({ text }: { text: string }) {
  return <div className="gate"><div className="brand-mark">NA</div><p>{text}</p></div>
}

function Sidebar({ section, profile, settings }: { section: Section; profile: Profile | null; settings: ReturnType<typeof useSettings> }) {
  return (
    <aside className="sidebar">
      <div className="brand"><div className="logo">N</div><div><b>Nerior Admin</b><span>control panel</span></div></div>
      <nav className="nav">
        <span className="nav-label">Навигация</span>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.section === section || (item.section === "tickets" && section === "ticket")
          return <Link className={active ? "nav-item active" : "nav-item"} href={item.href} key={item.href}><Icon size={17} />{settings.t.nav[item.section]}</Link>
        })}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={() => settings.setLang(settings.lang === "ru" ? "en" : "ru")}><Languages size={17} />{settings.lang.toUpperCase()}</button>
        <button className="nav-item" onClick={() => settings.setTheme(settings.theme === "dark" ? "light" : "dark")}>{settings.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}{settings.theme === "dark" ? "Светлая" : "Тёмная"}</button>
        <Link className={section === "profile" ? "nav-item active" : "nav-item"} href="/profile"><User size={17} />{profile?.username || "profile"}</Link>
        <button className="nav-item" onClick={() => void logout()}><LogOut size={17} />{settings.t.logout}</button>
      </div>
    </aside>
  )
}

function Topbar({ title, subtitle, profile }: { title: string; subtitle: string; profile: Profile | null }) {
  return <header className="topbar lux-enter"><div><span className="kicker">Nerior / Admin</span><h1>{title}</h1><p>{subtitle}</p></div><div className="top-actions"><span className="pill admin"><Shield size={16} />{profile?.username}</span></div></header>
}

function Overview() {
  const stats = [
    ["Пользователи", "311", "+18 за месяц"],
    ["Открытые тикеты", "12", "3 требуют ответа"],
    ["События ленты", "1 482", "planner + documents"],
    ["Подписки", "93", "Plus / Pro"],
  ]
  return (
    <section className="overview-lux">
      <div className="command-hero lux-enter">
        <div><span className="overline">Операционный обзор</span><h2>Единый контроль пользователей, ленты, поддержки и подписок.</h2></div>
        <p>Минималистичная административная поверхность для всей экосистемы Nerior: без декоративного шума, с быстрым доступом к данным и действиям.</p>
      </div>
      <div className="stat-grid">{stats.map(([label, value, hint]) => <article className="stat-card stack-card" key={label}><span>{label}</span><b>{value}</b><em>{hint}</em></article>)}</div>
      <div className="ops-grid">
        <Link className="ops-card" href="/users"><Users />Проверить пользователей<span>роли, доступ, почта</span></Link>
        <Link className="ops-card" href="/feed"><Bell />Опубликовать в ленту<span>planner / documents</span></Link>
        <Link className="ops-card" href="/tickets"><Ticket />Ответить в поддержку<span>чат и вложения</span></Link>
        <Link className="ops-card" href="/subscriptions"><CreditCard />Управлять подписками<span>Free, Plus, Pro</span></Link>
      </div>
    </section>
  )
}

function UsersPanel({ settings }: { settings: ReturnType<typeof useSettings> }) {
  const [q, setQ] = useState("")
  const [pageSize, setPageSize] = useState<PageSize>(25)
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [draft, setDraft] = useState<AdminUser | null>(null)
  const [password, setPassword] = useState("")
  const limit = pageSize === "all" ? 10000 : pageSize
  const pages = Math.max(1, Math.ceil((total || users.length) / limit))

  const load = useCallback(async () => {
    const offset = pageSize === "all" ? 0 : (page - 1) * limit
    const res = await request<AdminUser[]>(`/admin/users?limit=${limit}&offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ""}`)
    setUsers(res.data || [])
    setTotal(res.meta?.pagination?.total || res.data?.length || 0)
  }, [limit, page, pageSize, q])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setPage(1) }, [q, pageSize])

  function openUser(user: AdminUser) { setEditing(user); setDraft(user); setPassword("") }
  async function saveUser() {
    if (!draft) return
    const body: Record<string, unknown> = { username: draft.username, display_name: draft.display_name || null, role: draft.role, is_active: draft.is_active, email: draft.email }
    if (password.trim()) body.new_password = password.trim()
    const res = await request<AdminUser>(`/admin/users/${draft.user_id}`, { method: "PATCH", body: JSON.stringify(body) })
    if (res.data) { setEditing(null); setDraft(null); setPassword(""); await load() }
  }

  return (
    <section className="panel lux-enter">
      <PanelHeader title="Пользователи" action={<button className="icon-btn" onClick={() => void load()}><RefreshCcw size={16}/></button>} />
      <div className="toolbar users-toolbar"><SearchBox value={q} onChange={setQ} placeholder="Поиск по логину или почте…"/><select value={String(pageSize)} onChange={(e)=>setPageSize(e.target.value === "all" ? "all" : Number(e.target.value) as PageSize)}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="all">Все</option></select></div>
      <div className="user-table"><div className="user-table-head"><span>Пользователь</span><span>Почта</span><span>Роль</span><span>Доступ</span></div>{users.map((u) => <button key={u.user_id} className="user-row" onClick={() => openUser(u)}><span><b>{u.username}</b><em>{u.display_name || "—"}</em></span><span>{u.email}</span><span>{roleLabel(u.role)}</span><Status active={u.is_active} settings={settings}/></button>)}</div>
      <div className="pagination"><span>Всего: {total || users.length}</span><div><button className="icon-btn" disabled={page <= 1 || pageSize === "all"} onClick={()=>setPage((v)=>Math.max(1, v-1))}><ChevronLeft size={16}/></button><b>{pageSize === "all" ? "Все" : `${page} / ${pages}`}</b><button className="icon-btn" disabled={page >= pages || pageSize === "all"} onClick={()=>setPage((v)=>Math.min(pages, v+1))}><ChevronRight size={16}/></button></div></div>
      {editing && draft && <div className="modal-backdrop" onClick={()=>setEditing(null)}><div className="modal" onClick={(e)=>e.stopPropagation()}><div className="modal-head"><div><span className="overline">Редактирование</span><h2>{editing.username}</h2></div><button className="icon-btn" onClick={()=>setEditing(null)}><X size={17}/></button></div><div className="form-grid"><label>Username<input value={draft.username} onChange={(e)=>setDraft({...draft, username:e.target.value})}/></label><label>Отображаемое имя<input value={draft.display_name || ""} onChange={(e)=>setDraft({...draft, display_name:e.target.value})}/></label><label>Роль<select value={draft.role} onChange={(e)=>setDraft({...draft, role:e.target.value as Role})}><option value="user">Пользователь</option><option value="support">Поддержка</option><option value="admin">Админ</option></select></label><label>Доступ<select value={draft.is_active ? "1" : "0"} onChange={(e)=>setDraft({...draft, is_active:e.target.value === "1"})}><option value="1">Активен</option><option value="0">Заблокирован</option></select></label><label className="wide">Почта<input value={draft.email} onChange={(e)=>setDraft({...draft, email:e.target.value})}/></label><label className="wide">Новый пароль<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Оставьте пустым, если не менять"/></label></div><div className="modal-actions"><button className="secondary" onClick={()=>setEditing(null)}>{settings.t.cancel}</button><button className="primary" onClick={() => void saveUser()}>{settings.t.save}</button></div></div></div>}
    </section>
  )
}

function FeedPanel({ settings }: { settings: ReturnType<typeof useSettings> }) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [service, setService] = useState<FeedService>("planner")
  const [type, setType] = useState<FeedType>("reminder")
  const [target, setTarget] = useState("")
  const [dateTime, setDateTime] = useState("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [points, setPoints] = useState([""])
  const [preview, setPreview] = useState(true)
  const load = useCallback(async () => { const res = await request<FeedItem[]>("/admin/feed?limit=100"); setItems(res.data || []) }, [])
  useEffect(() => { void load() }, [load])
  async function create() {
    if (!title.trim() || !body.trim()) return
    const fullBody = points.some(Boolean) ? `${body}\n\n${points.filter(Boolean).map((p)=>`• ${p}`).join("\n")}` : body
    await request<FeedItem>("/admin/feed", { method: "POST", body: JSON.stringify({ type, title, body: fullBody, target_username: target.trim() || null, service, scheduled_at: dateTime || null }) })
    setTitle(""); setBody(""); setTarget(""); setDateTime(""); setPoints([""]); await load()
  }
  async function remove(id: string) { await request(`/admin/feed/${id}`, { method: "DELETE" }); await load() }
  return <section className="feed-layout lux-enter"><div className="panel feed-composer"><PanelHeader title="Лента" action={<button className="icon-btn" onClick={() => void load()}><RefreshCcw size={16}/></button>} /><div className="service-tabs">{feedServices.map((s)=><button key={s.id} className={service===s.id ? "tab active" : "tab"} onClick={()=>setService(s.id)}><b>{s.label}</b><span>{s.description}</span></button>)}</div><div className="type-grid">{feedTypes.map((ft)=><button key={ft.id} className={type===ft.id ? `type-chip active ${ft.tone}` : `type-chip ${ft.tone}`} onClick={()=>setType(ft.id)}>{ft.label}</button>)}</div><div className="form-grid"><label>Пользователь<input value={target} onChange={(e)=>setTarget(e.target.value)} placeholder="пусто = всем"/></label><label>Дата и время<input type="datetime-local" value={dateTime} onChange={(e)=>setDateTime(e.target.value)}/></label><label className="wide">Заголовок<input value={title} onChange={(e)=>setTitle(e.target.value)}/></label><label className="wide">Текст<textarea value={body} onChange={(e)=>setBody(e.target.value)}/></label><div className="wide points"><div className="points-head"><b>Список параметров</b><button className="icon-btn" onClick={()=>setPoints([...points, ""])}><Plus size={16}/></button></div>{points.map((point, i)=><div className="point-row" key={i}><input value={point} onChange={(e)=>setPoints(points.map((p,idx)=>idx===i ? e.target.value : p))} placeholder={i===0 ? "Главное изменение" : "Дополнительный пункт"}/>{i>0 && <button className="icon-btn" onClick={()=>setPoints(points.filter((_,idx)=>idx!==i))}><Trash2 size={15}/></button>}</div>)}</div></div><div className="modal-actions"><button className="secondary" onClick={()=>setPreview((v)=>!v)}><Eye size={16}/>Предпросмотр</button><button className="primary" onClick={() => void create()}><Plus size={17}/>{settings.t.create}</button></div></div><aside className="panel feed-side">{preview && <FeedPreview service={service} type={type} title={title} body={body} target={target} points={points} dateTime={dateTime}/>}<h3>Последние события</h3><div className="list">{items.map((item)=><article className={`feed-row ${toneFor(item.type)}`} key={item.id}><b>{item.title}</b><p>{item.body}</p><span>{item.type}{item.target_username ? ` · ${item.target_username}` : " · всем"}</span><button onClick={() => void remove(item.id)}>Удалить</button></article>)}</div></aside></section>
}

function FeedPreview({ service, type, title, body, target, points, dateTime }: { service: FeedService; type: FeedType; title: string; body: string; target: string; points: string[]; dateTime: string }) {
  return <article className={`preview-card ${toneFor(type)}`}><span>{service} · {feedTypes.find((x)=>x.id===type)?.label}</span><h3>{title || "Заголовок события"}</h3><p>{body || "Текст сообщения будет выглядеть так в ленте пользователя."}</p>{points.filter(Boolean).length > 0 && <ul>{points.filter(Boolean).map((p)=><li key={p}>{p}</li>)}</ul>}<em>{target || "Все пользователи"} · {dateTime || "сейчас"}</em></article>
}

function TicketsPanel({ settings }: { settings: ReturnType<typeof useSettings> }) {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const load = useCallback(async () => { const params = new URLSearchParams({ limit: "100" }); if (q) params.set("q", q); if (status !== "all") params.set("status", status); const res = await request<SupportTicket[]>(`/admin/tickets?${params.toString()}`); setTickets(res.data || []) }, [q, status])
  useEffect(() => { void load() }, [load])
  return <section className="panel lux-enter"><PanelHeader title="Тикеты" action={<button className="icon-btn" onClick={() => void load()}><RefreshCcw size={16}/></button>} /><div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder={settings.t.search}/><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="all">Все</option><option value="open">Открытые</option><option value="closed">Закрытые</option></select></div><div className="ticket-table">{tickets.map((t)=><Link href={`/tickets/${t.id}`} className="ticket-row" key={t.id}><span>#{t.public_number}</span><b>{t.subject}</b><em>{t.user_username || t.user_id}</em><small>{t.topic} / {t.subtopic}</small><Status active={t.status === "open"} settings={settings} label={t.status}/></Link>)}</div></section>
}

function TicketPanel({ settings, ticketId }: { settings: ReturnType<typeof useSettings>; ticketId?: string }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [message, setMessage] = useState("")
  const load = useCallback(async () => { if (!ticketId) return; const res = await request<SupportTicket>(`/admin/tickets/${ticketId}`); setTicket(res.data || null) }, [ticketId])
  useEffect(() => { void load() }, [load])
  async function reply() { if (!ticket || !message.trim()) return; const res = await request<SupportTicket>(`/admin/tickets/${ticket.id}/reply`, { method: "POST", body: JSON.stringify({ message }) }); setTicket(res.data || ticket); setMessage("") }
  async function closeTicket() { if (!ticket) return; const res = await request<SupportTicket>(`/admin/tickets/${ticket.id}/close`, { method: "POST" }); setTicket(res.data || ticket) }
  if (!ticket) return <section className="panel lux-enter">Тикет не найден</section>
  return <section className="telegram-chat lux-enter"><div className="chat-head"><div><Link className="back-link" href="/tickets">← Все тикеты</Link><h2>{ticket.subject}</h2><p>#{ticket.public_number} · {ticket.user_username || ticket.user_id} · {ticket.topic} / {ticket.subtopic}</p></div><button className="secondary" onClick={() => void closeTicket()}><CheckCircle2 size={16}/>Закрыть тикет</button></div><div className="messages">{ticket.messages?.map((m)=><div className={`msg ${m.author_role}`} key={m.id}><b>{m.author_role}</b><p>{m.body}</p><span>{new Date(m.created_at).toLocaleString(settings.lang === "ru" ? "ru-RU" : "en-US")}</span></div>)}</div><div className="composer telegram"><button className="attach"><Paperclip size={18}/></button><button className="attach"><ImageIcon size={18}/></button><button className="attach"><FileText size={18}/></button><input value={message} placeholder="Сообщение" onChange={(e)=>setMessage(e.target.value)} onKeyDown={(e)=>{ if(e.key === "Enter") void reply() }}/><button className="attach"><Mic size={18}/></button><button className="primary send-btn" onClick={() => void reply()}><Send size={17}/></button></div></section>
}

function SubscriptionsPanel({ settings }: { settings: ReturnType<typeof useSettings> }) {
  return <section className="subscriptions lux-enter"><div className="plans-grid">{subscriptionPlans.map((plan)=><article className="plan-card stack-card" key={plan.id}><span>{plan.name}</span><b>{plan.price}</b><em>{plan.users} пользователей</em><ul>{plan.features.map((f)=><li key={f}>{f}</li>)}</ul><button className="secondary">Настроить</button></article>)}</div><div className="panel"><PanelHeader title="Пользователи с подписками"/><div className="subscription-table">{planUsers.map((u)=><div className="subscription-row" key={u.email}><span><b>{u.username}</b><em>{u.email}</em></span><strong>{u.plan}</strong><small>до {u.expires}</small><div><button className="secondary small">Продлить</button><button className="secondary small">Отменить</button></div></div>)}</div></div></section>
}

function ProfilePanel({ profile }: { profile: Profile | null }) { return <section className="panel detail lux-enter"><h2>Профиль</h2><div className="profile-card"><div className="avatar">{profile?.username?.slice(0,2).toUpperCase()}</div><b>{profile?.username}</b><span>{profile?.email}</span><em>{profile?.role}</em></div></section> }
function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }) { return <div className="panel-head"><h2>{title}</h2>{action}</div> }
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) { return <label className="search"><Search size={17}/><input value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}/></label> }
function Status({ active, settings, label }: { active: boolean; settings: ReturnType<typeof useSettings>; label?: string }) { return <span className={active ? "status ok" : "status off"}>{label || (active ? settings.t.active : settings.t.blocked)}</span> }
function roleLabel(role: Role) { return role === "admin" ? "Админ" : role === "support" ? "Поддержка" : "Пользователь" }
function toneFor(type: FeedType) { return type === "reminder" ? "tone-reminder" : type === "ticket" ? "tone-ticket" : type === "update" ? "tone-update" : "tone-notification" }

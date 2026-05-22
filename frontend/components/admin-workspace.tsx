"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  type LucideIcon,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Languages,
  LogOut,
  Moon,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Shield,
  Sun,
  Ticket,
  Users,
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

type Section = "overview" | "users" | "feed" | "tickets" | "ticket" | "assistant" | "profile"
type Lang = "ru" | "en"
type Theme = "dark" | "light"

type Copy = {
  nav: Record<Section, string>
  subtitle: string
  loading: string
  denied: string
  search: string
  save: string
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
    nav: { overview: "Обзор", users: "Пользователи", feed: "Лента", tickets: "Тикеты", ticket: "Тикет", assistant: "Ассистент", profile: "Профиль" },
    subtitle: "Единая админ-панель экосистемы Nerior",
    loading: "Загрузка админ-сессии…",
    denied: "Нужна админ-сессия. Перенаправляю на авторизацию.",
    search: "Поиск…",
    save: "Сохранить",
    create: "Создать",
    refresh: "Обновить",
    close: "Закрыть",
    reply: "Ответить",
    logout: "Выйти",
    active: "Активен",
    blocked: "Выключен",
    all: "Все",
  },
  en: {
    nav: { overview: "Overview", users: "Users", feed: "Feed", tickets: "Tickets", ticket: "Ticket", assistant: "Assistant", profile: "Profile" },
    subtitle: "Unified Nerior ecosystem administration",
    loading: "Loading admin session…",
    denied: "Admin session required. Redirecting to auth.",
    search: "Search…",
    save: "Save",
    create: "Create",
    refresh: "Refresh",
    close: "Close",
    reply: "Reply",
    logout: "Logout",
    active: "Active",
    blocked: "Disabled",
    all: "All",
  },
}

const navItems: Array<{ section: Section; href: string; icon: LucideIcon }> = [
  { section: "overview", href: "/", icon: Shield },
  { section: "users", href: "/users", icon: Users },
  { section: "feed", href: "/feed", icon: Bell },
  { section: "tickets", href: "/tickets", icon: Ticket },
  { section: "assistant", href: "/assistant", icon: Bot },
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

  if (authState !== "ready") {
    return <Gate text={authState === "loading" ? settings.t.loading : settings.t.denied} />
  }

  return (
    <div className="shell">
      <Sidebar section={section} profile={profile} settings={settings} />
      <main className="main">
        <Topbar title={settings.t.nav[section]} subtitle={settings.t.subtitle} profile={profile} />
        {section === "overview" && <Overview settings={settings} />}
        {section === "users" && <UsersPanel settings={settings} />}
        {section === "feed" && <FeedPanel settings={settings} />}
        {section === "tickets" && <TicketsPanel settings={settings} />}
        {section === "ticket" && <TicketPanel settings={settings} ticketId={ticketId} />}
        {section === "assistant" && <AssistantPanel />}
        {section === "profile" && <ProfilePanel profile={profile} settings={settings} />}
      </main>
    </div>
  )
}

function Gate({ text }: { text: string }) {
  return (
    <div className="gate">
      <div className="brand-mark">NA</div>
      <p>{text}</p>
    </div>
  )
}

function Sidebar({ section, profile, settings }: { section: Section; profile: Profile | null; settings: ReturnType<typeof useSettings> }) {
  return (
    <aside className="sidebar">
      <div className="brand"><div className="logo">NA</div><div><b>Nerior Admin</b><span>control center</span></div></div>
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
        <button className="nav-item" onClick={() => settings.setTheme(settings.theme === "dark" ? "light" : "dark")}>{settings.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}{settings.theme === "dark" ? "Светлая тема" : "Тёмная тема"}</button>
        <Link className={section === "profile" ? "nav-item active" : "nav-item"} href="/profile"><Users size={17} />{profile?.username || "profile"}</Link>
        <button className="nav-item" onClick={() => void logout()}><LogOut size={17} />{settings.t.logout}</button>
      </div>
    </aside>
  )
}

function Topbar({ title, subtitle, profile }: { title: string; subtitle: string; profile: Profile | null }) {
  return <header className="topbar"><div><h1>{title}</h1><p>{subtitle}</p></div><div className="top-actions"><a className="pill" href="https://planner.nerior.ru/feed">Лента</a><a className="pill" href="https://documents.nerior.ru">Документы</a><span className="pill admin"><Shield size={16} />{profile?.username}</span></div></header>
}

function Overview({ settings }: { settings: ReturnType<typeof useSettings> }) {
  const cards = [
    { href: "/users", title: settings.t.nav.users, text: "Роли, пароли, статус аккаунтов.", icon: Users },
    { href: "/feed", title: settings.t.nav.feed, text: "Объявления, обновления и адресные уведомления.", icon: Bell },
    { href: "/tickets", title: settings.t.nav.tickets, text: "Поддержка пользователей и закрытие обращений.", icon: Ticket },
    { href: "/assistant", title: settings.t.nav.assistant, text: "AI-инструменты администратора.", icon: Bot },
  ]
  return <section className="grid cards">{cards.map((card) => <Link href={card.href} className="card action-card" key={card.href}><card.icon size={24}/><h2>{card.title}</h2><p>{card.text}</p><span>Открыть <ChevronRight size={16}/></span></Link>)}</section>
}

function UsersPanel({ settings }: { settings: ReturnType<typeof useSettings> }) {
  const [q, setQ] = useState("")
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [password, setPassword] = useState("")
  const load = useCallback(async () => {
    const res = await request<AdminUser[]>(`/admin/users?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}`)
    setUsers(res.data || [])
    if (!selected && res.data?.[0]) setSelected(res.data[0])
  }, [q, selected])
  useEffect(() => { void load() }, [load])
  async function save() {
    if (!selected) return
    const body: Record<string, unknown> = { username: selected.username, display_name: selected.display_name || null, role: selected.role, is_active: selected.is_active }
    if (password.trim()) body.new_password = password.trim()
    const res = await request<AdminUser>(`/admin/users/${selected.user_id}`, { method: "PATCH", body: JSON.stringify(body) })
    if (res.data) { setSelected(res.data); setPassword(""); await load() }
  }
  return <section className="split"><div className="panel"><PanelHeader title="Пользователи" action={<button className="icon-btn" onClick={() => void load()}><RefreshCcw size={16}/></button>} /><SearchBox value={q} onChange={setQ} placeholder={settings.t.search}/><div className="list">{users.map((u) => <button key={u.user_id} className={selected?.user_id === u.user_id ? "row selected" : "row"} onClick={() => setSelected(u)}><span><b>{u.username}</b><em>{u.email}</em></span><Status active={u.is_active} settings={settings}/></button>)}</div></div><div className="panel detail">{selected ? <><h2>{selected.username}</h2><div className="form-grid"><label>Username<input value={selected.username} onChange={(e)=>setSelected({...selected, username:e.target.value})}/></label><label>Display name<input value={selected.display_name || ""} onChange={(e)=>setSelected({...selected, display_name:e.target.value})}/></label><label>Role<select value={selected.role} onChange={(e)=>setSelected({...selected, role:e.target.value as Role})}><option value="user">user</option><option value="admin">admin</option></select></label><label>Status<select value={selected.is_active ? "1" : "0"} onChange={(e)=>setSelected({...selected, is_active:e.target.value === "1"})}><option value="1">{settings.t.active}</option><option value="0">{settings.t.blocked}</option></select></label><label>Новый пароль<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)}/></label></div><button className="primary" onClick={() => void save()}>{settings.t.save}</button></> : <p>Нет пользователя</p>}</div></section>
}

function FeedPanel({ settings }: { settings: ReturnType<typeof useSettings> }) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [type, setType] = useState<FeedType>("notification")
  const [target, setTarget] = useState("")
  const load = useCallback(async () => {
    const res = await request<FeedItem[]>("/admin/feed?limit=100")
    setItems(res.data || [])
  }, [])
  useEffect(() => { void load() }, [load])
  async function create() {
    if (!title.trim() || !body.trim()) return
    await request<FeedItem>("/admin/feed", { method: "POST", body: JSON.stringify({ type, title, body, target_username: target.trim() || null }) })
    setTitle(""); setBody(""); setTarget(""); await load()
  }
  async function remove(id: string) { await request(`/admin/feed/${id}`, { method: "DELETE" }); await load() }
  return <section className="split"><div className="panel"><PanelHeader title="Лента" action={<button className="icon-btn" onClick={() => void load()}><RefreshCcw size={16}/></button>} /><div className="list">{items.map((item) => <article className="feed-row" key={item.id}><b>{item.title}</b><p>{item.body}</p><span>{item.type}{item.target_username ? ` · ${item.target_username}` : ""}</span><button onClick={() => void remove(item.id)}>Удалить</button></article>)}</div></div><div className="panel detail"><h2>Новая запись</h2><div className="form-grid"><label>Тип<select value={type} onChange={(e)=>setType(e.target.value as FeedType)}><option value="notification">notification</option><option value="update">update</option><option value="reminder">reminder</option><option value="ticket">ticket</option></select></label><label>Адресат<input value={target} placeholder="пусто = всем" onChange={(e)=>setTarget(e.target.value)}/></label><label className="wide">Заголовок<input value={title} onChange={(e)=>setTitle(e.target.value)}/></label><label className="wide">Текст<textarea value={body} onChange={(e)=>setBody(e.target.value)}/></label></div><button className="primary" onClick={() => void create()}><Plus size={17}/>{settings.t.create}</button></div></section>
}

function TicketsPanel({ settings }: { settings: ReturnType<typeof useSettings> }) {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" })
    if (q) params.set("q", q)
    if (status !== "all") params.set("status", status)
    const res = await request<SupportTicket[]>(`/admin/tickets?${params.toString()}`)
    setTickets(res.data || [])
  }, [q, status])
  useEffect(() => { void load() }, [load])
  return <section className="panel"><PanelHeader title="Тикеты" action={<button className="icon-btn" onClick={() => void load()}><RefreshCcw size={16}/></button>} /><div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder={settings.t.search}/><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="all">{settings.t.all}</option><option value="open">open</option><option value="closed">closed</option></select></div><div className="table">{tickets.map((t) => <Link href={`/tickets/${t.id}`} className="table-row" key={t.id}><span>#{t.public_number}</span><b>{t.subject}</b><span>{t.user_username || t.user_id}</span><Status active={t.status === "open"} settings={settings} label={t.status}/></Link>)}</div></section>
}

function TicketPanel({ settings, ticketId }: { settings: ReturnType<typeof useSettings>; ticketId?: string }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [message, setMessage] = useState("")
  const load = useCallback(async () => { if (!ticketId) return; const res = await request<SupportTicket>(`/admin/tickets/${ticketId}`); setTicket(res.data || null) }, [ticketId])
  useEffect(() => { void load() }, [load])
  async function reply() { if (!ticket || !message.trim()) return; const res = await request<SupportTicket>(`/admin/tickets/${ticket.id}/reply`, { method: "POST", body: JSON.stringify({ message }) }); setTicket(res.data || ticket); setMessage("") }
  async function closeTicket() { if (!ticket) return; const res = await request<SupportTicket>(`/admin/tickets/${ticket.id}/close`, { method: "POST" }); setTicket(res.data || ticket) }
  if (!ticket) return <section className="panel">Тикет не найден</section>
  return <section className="chat-panel"><div className="chat-head"><div><h2>{ticket.subject}</h2><p>#{ticket.public_number} · {ticket.user_username || ticket.user_id} · {ticket.topic} / {ticket.subtopic}</p></div><button className="secondary" onClick={() => void closeTicket()}><CheckCircle2 size={16}/>{settings.t.close}</button></div><div className="messages">{ticket.messages?.map((m) => <div className={`msg ${m.author_role}`} key={m.id}><b>{m.author_role}</b><p>{m.body}</p><span>{new Date(m.created_at).toLocaleString(settings.lang === "ru" ? "ru-RU" : "en-US")}</span></div>)}</div><div className="composer"><input value={message} placeholder="Сообщение" onChange={(e)=>setMessage(e.target.value)} onKeyDown={(e)=>{ if(e.key === "Enter") void reply() }}/><button className="primary" onClick={() => void reply()}><Send size={17}/>{settings.t.reply}</button></div></section>
}

function AssistantPanel() { return <section className="panel center"><Bot size={36}/><h2>AI ассистент администратора</h2><p>Здесь будет единая точка для сервисных действий: поиск пользователя, проверка статусов, отчёты и массовые операции.</p></section> }
function ProfilePanel({ profile }: { profile: Profile | null; settings: ReturnType<typeof useSettings> }) { return <section className="panel detail"><h2>Профиль</h2><div className="profile-card"><div className="avatar">{profile?.username?.slice(0,2).toUpperCase()}</div><b>{profile?.username}</b><span>{profile?.email}</span><em>{profile?.role}</em></div></section> }

function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }) { return <div className="panel-head"><h2>{title}</h2>{action}</div> }
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) { return <label className="search"><Search size={17}/><input value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}/></label> }
function Status({ active, settings, label }: { active: boolean; settings: ReturnType<typeof useSettings>; label?: string }) { return <span className={active ? "status ok" : "status off"}>{label || (active ? settings.t.active : settings.t.blocked)}</span> }

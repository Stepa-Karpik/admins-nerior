"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Bell, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, FileText, Image as ImageIcon, Languages, LayoutDashboard, LogOut, Mic, Moon, Paperclip, Plus, Search, Send, Square, Sun, Ticket, Trash2, User, Users, X, type LucideIcon } from "lucide-react"
import { type AdminUser, type FeedItem, type FeedType, type Profile, type Role, type SupportTicket, downloadBlob, ensureAdminProfile, logout, redirectToAuth, request, saveBlob } from "@/lib/api"

type Section = "overview" | "users" | "feed" | "tickets" | "ticket" | "subscriptions" | "profile" | "assistant"
type Lang = "ru" | "en"
type Theme = "dark" | "light"
type Service = "all" | "planner" | "documents" | "finance" | "habits"
type PageSize = 10 | 25 | 50 | 100 | "all"
type TicketStatus = "all" | "open" | "answered" | "closed"

type OverviewData = {
  service: string
  users_total: number
  open_tickets: number
  answered_tickets: number
  closed_tickets: number
  feed_items: number
  active_subscriptions: number
  subscription_distribution: Record<string, number>
  new_users: Array<{ date: string; count: number }>
  api_requests: Array<{ date: string; count: number }>
}

type Subscription = {
  id: string
  user_id: string
  username: string
  display_name?: string | null
  email: string
  plan: "free" | "plus" | "pro"
  expires_at?: string | null
  created_at: string
  updated_at: string
}

const navItems: Array<{ section: Section; href: string; icon: LucideIcon; label: string }> = [
  { section: "overview", href: "/", icon: LayoutDashboard, label: "Обзор" },
  { section: "users", href: "/users", icon: Users, label: "Пользователи" },
  { section: "feed", href: "/feed", icon: Bell, label: "Лента" },
  { section: "tickets", href: "/tickets", icon: Ticket, label: "Тикеты" },
  { section: "subscriptions", href: "/subscriptions", icon: CreditCard, label: "Подписки" },
]

const services: Array<{ id: Service; label: string }> = [
  { id: "all", label: "Все" },
  { id: "planner", label: "Planner" },
  { id: "documents", label: "Documents" },
  { id: "finance", label: "Финансы" },
  { id: "habits", label: "Привычки" },
]

const feedTypes: Array<{ id: FeedType; label: string; tone: string }> = [
  { id: "reminder", label: "Напоминание", tone: "tone-reminder" },
  { id: "notification", label: "Уведомление", tone: "tone-notification" },
  { id: "update", label: "Обновление", tone: "tone-update" },
  { id: "ticket", label: "Тикет", tone: "tone-ticket" },
]

const planCopy = [
  { id: "free", title: "Free", price: "0 ₽", features: ["Все сервисы экосистемы", "Неограниченные события календаря", "Неограниченные документы", "Базовая лента", "Поддержка через тикеты"] },
  { id: "plus", title: "Plus", price: "499 ₽", features: ["Всё из Free", "AI-ассистент в календаре", "Диаграммы Ганта", "AI-анализ документов", "Поиск документов по смыслу", "Умные напоминания"] },
  { id: "pro", title: "Pro", price: "1490 ₽", features: ["Всё из Plus", "Безлимитные AI-операции", "Knowledge graph", "AI timeline", "Расширенные отчёты", "Приоритетные функции всех новых сервисов"] },
] as const

function useSettings() {
  const [lang, setLang] = useState<Lang>("ru")
  const [theme, setTheme] = useState<Theme>("dark")
  useEffect(() => {
    setLang((localStorage.getItem("nerior_admin_lang") as Lang | null) === "en" ? "en" : "ru")
    setTheme((localStorage.getItem("nerior_theme") as Theme | null) === "light" ? "light" : "dark")
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = lang
    localStorage.setItem("nerior_admin_lang", lang)
    localStorage.setItem("nerior_theme", theme)
  }, [lang, theme])
  return { lang, setLang, theme, setTheme }
}

export function AdminWorkspace({ section, ticketId }: { section: Section; ticketId?: string }) {
  const settings = useSettings()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authState, setAuthState] = useState<"loading" | "ready" | "denied">("loading")
  const [service, setService] = useState<Service>("all")
  const mainRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("nerior_admin_service") as Service | null
    if (stored && services.some((item) => item.id === stored)) setService(stored)
  }, [])
  useEffect(() => { localStorage.setItem("nerior_admin_service", service) }, [service])
  useEffect(() => {
    ensureAdminProfile().then((item) => {
      if (!item) { setAuthState("denied"); setTimeout(redirectToAuth, 700); return }
      setProfile(item); setAuthState("ready")
    })
  }, [])
  useGSAP(() => {
    if (authState !== "ready") return
    gsap.fromTo(".page-enter", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .38, stagger: .025, ease: "power2.out" })
  }, { scope: mainRef, dependencies: [authState, section, service], revertOnUpdate: true })

  if (authState !== "ready") return <div className="gate"><div className="logo">N</div><p>{authState === "loading" ? "Загрузка" : "Нет доступа"}</p></div>

  return <div className="shell"><Sidebar section={section} profile={profile} settings={settings}/><main className="main" ref={mainRef}>{section === "overview" && <Overview service={service} setService={setService}/>} {section === "users" && <UsersPanel service={service}/>} {section === "feed" && <FeedPanel service={service}/>} {section === "tickets" && <TicketsPanel service={service}/>} {section === "ticket" && <TicketPanel ticketId={ticketId}/>} {section === "subscriptions" && <SubscriptionsPanel/>} {section === "profile" && <ProfilePanel profile={profile}/>} {section === "assistant" && <Overview service={service} setService={setService}/>}</main></div>
}

function Sidebar({ section, profile, settings }: { section: Section; profile: Profile | null; settings: ReturnType<typeof useSettings> }) {
  return <aside className="sidebar"><div className="brand"><div className="logo">N</div><b>Nerior Admin</b></div><nav className="nav">{navItems.map((item)=>{ const Icon=item.icon; const active=item.section===section || (item.section==="tickets" && section==="ticket"); return <Link key={item.href} href={item.href} className={active ? "nav-item active" : "nav-item"}><Icon size={17}/>{item.label}</Link> })}</nav><div className="sidebar-bottom"><button className="nav-item" onClick={()=>settings.setLang(settings.lang === "ru" ? "en" : "ru")}><Languages size={17}/>{settings.lang.toUpperCase()}</button><button className="nav-item" onClick={()=>settings.setTheme(settings.theme === "dark" ? "light" : "dark")}>{settings.theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>} {settings.theme === "dark" ? "Светлая" : "Тёмная"}</button><Link href="/profile" className={section==="profile" ? "nav-item active" : "nav-item"}><User size={17}/>{displayUser(profile)}</Link><button className="nav-item" onClick={()=>void logout()}><LogOut size={17}/>Выйти</button></div></aside>
}

function Overview({ service, setService }: { service: Service; setService: (v: Service)=>void }) {
  const [data, setData] = useState<OverviewData | null>(null)
  const load = useCallback(async () => { const res = await request<OverviewData>(`/admin/overview${service !== "all" ? `?service=${service}` : ""}`); setData(res.data) }, [service])
  useEffect(()=>{ void load() }, [load])
  return <section className="page overview page-enter"><ServiceSwitch value={service} onChange={setService}/><div className="metric-grid"><Metric label="Пользователи" value={data?.users_total}/><Metric label="Открытые тикеты" value={data?.open_tickets}/><Metric label="Ждут пользователя" value={data?.answered_tickets}/><Metric label="События ленты" value={data?.feed_items}/><Metric label="Подписки" value={data?.active_subscriptions}/></div><div className="charts-grid"><SubscriptionChart distribution={data?.subscription_distribution || {}}/><ActivityChart title="Новые пользователи" rows={data?.new_users || []}/><ActivityChart title="API-запросы" rows={data?.api_requests || []}/></div></section>
}

function UsersPanel({ service }: { service: Service }) {
  const [q, setQ] = useState(""); const [pageSize,setPageSize]=useState<PageSize>(25); const [page,setPage]=useState(1); const [users,setUsers]=useState<AdminUser[]>([]); const [total,setTotal]=useState(0); const [draft,setDraft]=useState<AdminUser|null>(null); const [password,setPassword]=useState("")
  const limit = pageSize === "all" ? 200 : pageSize
  const pages = Math.max(1, Math.ceil(total / limit))
  const load = useCallback(async()=>{ if(pageSize === "all") { const all: AdminUser[]=[]; let offset=0; while(true){ const res=await request<AdminUser[]>(`/admin/users?limit=200&offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ""}`); const chunk=res.data||[]; all.push(...chunk); const t=res.meta?.pagination?.total || all.length; if(all.length>=t || chunk.length===0) { setUsers(all); setTotal(t); break } offset += 200 } return } const offset=(page-1)*limit; const res=await request<AdminUser[]>(`/admin/users?limit=${limit}&offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ""}`); setUsers(res.data||[]); setTotal(res.meta?.pagination?.total || 0) },[limit,page,pageSize,q])
  useEffect(()=>{ void load() },[load]); useEffect(()=>setPage(1),[q,pageSize,service])
  async function save(){ if(!draft) return; const body:Record<string,unknown>={email:draft.email, username:draft.username, display_name:draft.display_name || null, role:draft.role, is_active:draft.is_active}; if(password.trim()) body.new_password=password.trim(); const res=await request<AdminUser>(`/admin/users/${draft.user_id}`,{method:"PATCH", body:JSON.stringify(body)}); if(res.data){ setDraft(null); setPassword(""); await load() } }
  return <section className="page page-enter"><div className="table-tools"><SearchBox value={q} onChange={setQ} placeholder="Поиск по имени, логину или почте"/><CustomSelect value={String(pageSize)} options={["10","25","50","100","all"]} labels={{all:"Все"}} onChange={(v)=>setPageSize(v === "all" ? "all" : Number(v) as PageSize)}/></div><div className="data-table users-table"><div className="thead"><span>Имя</span><span>Почта</span><span>Роль</span><span>Доступ</span></div>{users.map((u)=><button className="trow" key={u.user_id} onClick={()=>setDraft(u)}><span><b>{displayUser(u)}</b><em>{u.username}</em></span><span>{u.email}</span><span>{roleLabel(u.role)}</span><Status status={u.is_active ? "active" : "blocked"}/></button>)}</div><div className="pagination"><span>{total}</span><div><button disabled={page<=1 || pageSize==="all"} onClick={()=>setPage(v=>Math.max(1,v-1))}><ChevronLeft size={16}/></button><b>{pageSize === "all" ? "Все" : `${page}/${pages}`}</b><button disabled={page>=pages || pageSize==="all"} onClick={()=>setPage(v=>Math.min(pages,v+1))}><ChevronRight size={16}/></button></div></div>{draft && <Modal onClose={()=>setDraft(null)}><div className="modal-head"><h2>{displayUser(draft)}</h2><button onClick={()=>setDraft(null)}><X size={18}/></button></div><div className="form-grid"><label>Username<input value={draft.username} onChange={(e)=>setDraft({...draft, username:e.target.value})}/></label><label>Отображаемое имя<input value={draft.display_name || ""} onChange={(e)=>setDraft({...draft, display_name:e.target.value})}/></label><label>Роль<CustomSelect value={draft.role} options={["user","support","admin"]} labels={{user:"Пользователь",support:"Поддержка",admin:"Админ"}} onChange={(v)=>setDraft({...draft, role:v as Role})}/></label><label>Доступ<CustomSelect value={draft.is_active ? "active" : "blocked"} options={["active","blocked"]} labels={{active:"Активен",blocked:"Заблокирован"}} onChange={(v)=>setDraft({...draft, is_active:v==="active"})}/></label><label className="wide">Почта<input value={draft.email} onChange={(e)=>setDraft({...draft, email:e.target.value})}/></label><label className="wide">Новый пароль<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)}/></label></div><div className="modal-actions"><button className="secondary" onClick={()=>setDraft(null)}>Отмена</button><button className="primary" onClick={()=>void save()}>Сохранить</button></div></Modal>}</section>
}

function FeedPanel({ service }: { service: Service }) {
  const [items,setItems]=useState<FeedItem[]>([]); const [type,setType]=useState<FeedType>("reminder"); const [target,setTarget]=useState(""); const [dateTime,setDateTime]=useState(""); const [title,setTitle]=useState(""); const [body,setBody]=useState(""); const [points,setPoints]=useState([""]); const [editing,setEditing]=useState<FeedItem|null>(null)
  const effectiveService = service === "all" ? "planner" : service
  const load=useCallback(async()=>{ const res=await request<FeedItem[]>(`/admin/feed?limit=100${service!=="all"?`&service=${service}`:""}`); setItems(res.data||[]) },[service])
  useEffect(()=>{ void load() },[load])
  function reset(){ setTitle(""); setBody(""); setTarget(""); setDateTime(""); setPoints([""]); setType("reminder"); setEditing(null) }
  function fill(item: FeedItem){ setEditing(item); setType(item.type); setTitle(item.title); setBody(item.body); setTarget(item.target_username || ""); setDateTime(item.published_at ? item.published_at.slice(0,16) : ""); const raw=(item.meta as {points?: string[]}|null)?.points; setPoints(Array.isArray(raw)&&raw.length?raw:[""]) }
  async function save(){ if(!title.trim()||!body.trim()) return; const payload={service:effectiveService,type,title,body,meta:type==="update"?{points:points.filter(Boolean)}:null,target_username:target.trim()||null,published_at:dateTime?new Date(dateTime).toISOString():null}; if(editing) await request<FeedItem>(`/admin/feed/${editing.id}`,{method:"PATCH",body:JSON.stringify(payload)}); else await request<FeedItem>("/admin/feed",{method:"POST",body:JSON.stringify(payload)}); reset(); await load() }
  async function remove(id:string){ await request(`/admin/feed/${id}`,{method:"DELETE"}); await load() }
  return <section className="page feed-page page-enter"><div className="composer-block"><div className="type-grid">{feedTypes.map(ft=><button key={ft.id} className={type===ft.id ? `type active ${ft.tone}` : `type ${ft.tone}`} onClick={()=>setType(ft.id)}>{ft.label}</button>)}</div><div className="form-grid"><label>Пользователь<input value={target} onChange={e=>setTarget(e.target.value)} placeholder="пусто = всем"/></label><label>Дата и время<input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)}/></label><label className="wide">Заголовок<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="wide">Текст<textarea value={body} onChange={e=>setBody(e.target.value)}/></label>{type==="update" && <div className="wide points-min"><b>Параметры</b>{points.map((p,i)=><div className="point-row" key={i}><input value={p} onChange={e=>setPoints(points.map((x,idx)=>idx===i?e.target.value:x))}/>{i>0&&<button onClick={()=>setPoints(points.filter((_,idx)=>idx!==i))}><Trash2 size={15}/></button>}</div>)}<button className="secondary" onClick={()=>setPoints([...points,""])}><Plus size={15}/>Добавить</button></div>}</div><div className="modal-actions"><FeedPreview service={effectiveService} type={type} title={title} body={body} points={type==="update"?points:[]}/>{editing && <button className="secondary" onClick={reset}>Отмена</button>}<button className="primary" onClick={()=>void save()}>{editing?"Сохранить":"Опубликовать"}</button></div></div><div className="data-table feed-table">{items.map(item=><article className={`feed-row ${toneFor(item.type)}`} key={item.id}><button className="feed-open" onClick={()=>fill(item)}><b>{item.title}</b><p>{item.body}</p></button><span>{service==="all" ? item.service || "planner" : item.type}</span><button onClick={()=>void remove(item.id)}>Удалить</button></article>)}</div></section>
}

function TicketsPanel({ service }: { service: Service }) {
  const [q,setQ]=useState(""); const [status,setStatus]=useState<TicketStatus>("all"); const [tickets,setTickets]=useState<SupportTicket[]>([])
  const load=useCallback(async()=>{ const params=new URLSearchParams({limit:"100"}); if(q)params.set("q",q); if(status!=="all")params.set("status",status); if(service!=="all")params.set("service",service); const res=await request<SupportTicket[]>(`/admin/tickets?${params}`); setTickets(res.data||[]) },[q,status,service])
  useEffect(()=>{ void load() },[load])
  return <section className="page page-enter"><div className="table-tools"><SearchBox value={q} onChange={setQ} placeholder="Поиск"/><CustomSelect value={status} options={["all","open","answered","closed"]} labels={{all:"Все",open:"Ждёт ответа",answered:"Отвечен",closed:"Закрыт"}} onChange={(v)=>setStatus(v as TicketStatus)}/></div><div className="data-table ticket-table">{tickets.map(t=><Link className="ticket-row" href={`/tickets/${t.id}`} key={t.id}><span>#{t.public_number}</span><b>{t.subject}</b><span>{displayTicketUser(t)}</span><span>{service==="all" ? t.service || "planner" : t.topic}</span><TicketStatusBadge status={t.status}/></Link>)}</div></section>
}

function TicketPanel({ ticketId }: { ticketId?: string }) {
  const [ticket,setTicket]=useState<SupportTicket|null>(null); const [message,setMessage]=useState(""); const [files,setFiles]=useState<File[]>([]); const [sending,setSending]=useState(false); const [recording,setRecording]=useState(false); const recorderRef=useRef<MediaRecorder|null>(null); const chunksRef=useRef<Blob[]>([])
  const load=useCallback(async()=>{ if(!ticketId)return; const res=await request<SupportTicket>(`/admin/tickets/${ticketId}`); setTicket(res.data||null) },[ticketId])
  useEffect(()=>{ void load() },[load])
  async function send(){ if(!ticket || ticket.status==="closed" || sending || (!message.trim()&&!files.length)) return; setSending(true); try { let res; if(files.length){ const fd=new FormData(); fd.append("message",message); files.forEach(f=>fd.append("files",f)); res=await request<SupportTicket>(`/admin/tickets/${ticket.id}/reply-with-files`,{method:"POST",body:fd}) } else res=await request<SupportTicket>(`/admin/tickets/${ticket.id}/reply`,{method:"POST",body:JSON.stringify({message})}); if(res.data){ setTicket(res.data); setMessage(""); setFiles([]) } } finally { setSending(false) } }
  async function close(){ if(!ticket)return; const res=await request<SupportTicket>(`/admin/tickets/${ticket.id}/close`,{method:"POST"}); if(res.data)setTicket(res.data) }
  async function toggleRecord(){ if(recording){ recorderRef.current?.stop(); setRecording(false); return } if(!navigator.mediaDevices?.getUserMedia) return; const stream=await navigator.mediaDevices.getUserMedia({audio:true}); chunksRef.current=[]; const recorder=new MediaRecorder(stream); recorderRef.current=recorder; recorder.ondataavailable=(event)=>{ if(event.data.size) chunksRef.current.push(event.data) }; recorder.onstop=()=>{ const blob=new Blob(chunksRef.current,{type:recorder.mimeType || "audio/webm"}); const file=new File([blob],`voice-${Date.now()}.webm`,{type:blob.type}); setFiles(prev=>[...prev,file]); stream.getTracks().forEach(track=>track.stop()) }; recorder.start(); setRecording(true) }
  if(!ticket)return <section className="page page-enter">Тикет не найден</section>
  const closed=ticket.status==="closed"
  return <section className="chat page-enter"><div className="chat-head"><div><Link href="/tickets">← Тикеты</Link><h2>{ticket.subject}</h2><p>#{ticket.public_number} · {displayTicketUser(ticket)} · {ticket.service || "planner"}</p></div><TicketStatusBadge status={ticket.status}/>{!closed&&<button className="secondary" onClick={()=>void close()}><CheckCircle2 size={16}/>Закрыть</button>}</div><div className="messages">{ticket.messages?.map(m=><div className={`msg ${m.author_role}`} key={m.id}><b>{m.author_role}</b><p>{m.body}</p>{m.attachments?.length ? <div className="attachments">{m.attachments.map(a=><button key={a.stored_name} onClick={()=>void downloadAttachment(ticket.id, m.id, a.stored_name)}>{a.original_name}</button>)}</div>:null}</div>)}</div>{files.length ? <div className="file-strip">{files.map((f,i)=><span key={`${f.name}-${i}`}>{f.name}<button onClick={()=>setFiles(files.filter((_,idx)=>idx!==i))}>×</button></span>)}</div> : null}<div className={closed ? "composer disabled" : "composer"}><label><Paperclip size={18}/><input type="file" multiple hidden disabled={closed} onChange={e=>setFiles(prev=>[...prev,...Array.from(e.target.files||[])])}/></label><label><ImageIcon size={18}/><input type="file" accept="image/*" multiple hidden disabled={closed} onChange={e=>setFiles(prev=>[...prev,...Array.from(e.target.files||[])])}/></label><label><FileText size={18}/><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" multiple hidden disabled={closed} onChange={e=>setFiles(prev=>[...prev,...Array.from(e.target.files||[])])}/></label><input disabled={closed} value={closed ? "Тикет закрыт" : message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void send()}}/><button type="button" disabled={closed} className={recording?"recording":""} onClick={()=>void toggleRecord()}>{recording?<Square size={18}/>:<Mic size={18}/>}</button><button className="primary" disabled={closed||sending} onClick={()=>void send()}><Send size={17}/></button></div></section>
}

function SubscriptionsPanel(){ const [items,setItems]=useState<Subscription[]>([]); const [draft,setDraft]=useState<Subscription|null>(null); const load=useCallback(async()=>{ const res=await request<Subscription[]>("/admin/subscriptions"); setItems(res.data||[]) },[]); useEffect(()=>{void load()},[load]); async function save(){ if(!draft)return; const res=await request<Subscription>(`/admin/subscriptions/${draft.id}`,{method:"PATCH",body:JSON.stringify({plan:draft.plan,expires_at:draft.expires_at || null})}); if(res.data){setDraft(null); await load()} } return <section className="page page-enter"><div className="plans">{planCopy.map(p=><article className="plan" key={p.id}><h2>{p.title}</h2><b>{p.price}</b><ul>{p.features.map(f=><li key={f}>{f}</li>)}</ul></article>)}</div><div className="data-table subscription-table">{items.map(s=><button className="subscription-row" key={s.id} onClick={()=>setDraft(s)}><span><b>{displayUser(s)}</b><em>{s.email}</em></span><strong>{planLabel(s.plan)}</strong><span>{s.expires_at ? new Date(s.expires_at).toLocaleString("ru-RU") : "Без срока"}</span></button>)}</div>{draft&&<Modal onClose={()=>setDraft(null)}><div className="modal-head"><h2>{displayUser(draft)}</h2><button onClick={()=>setDraft(null)}><X size={18}/></button></div><div className="form-grid"><label>Подписка<CustomSelect value={draft.plan} options={["free","plus","pro"]} labels={{free:"Free",plus:"Plus",pro:"Pro"}} onChange={v=>setDraft({...draft,plan:v as Subscription["plan"]})}/></label><label>Срок<input type="datetime-local" value={draft.expires_at ? draft.expires_at.slice(0,16) : ""} onChange={e=>setDraft({...draft,expires_at:e.target.value ? new Date(e.target.value).toISOString() : null})}/></label></div><div className="modal-actions"><button className="secondary" onClick={()=>setDraft(null)}>Отмена</button><button className="secondary" onClick={()=>setDraft({...draft,expires_at:new Date().toISOString()})}>Отменить подписку</button><button className="primary" onClick={()=>void save()}>Сохранить</button></div></Modal>}</section> }

function ProfilePanel({ profile }: { profile: Profile | null }) { return <section className="page page-enter"><div className="profile-line"><b>{displayUser(profile)}</b><span>{profile?.email}</span><em>{profile?.role}</em></div></section> }
function ServiceSwitch({value,onChange}:{value:Service;onChange:(v:Service)=>void}){return <div className="service-switch">{services.map(s=><button key={s.id} className={value===s.id?"active":""} onClick={()=>onChange(s.id)}>{s.label}</button>)}</div>}
function Metric({label,value}:{label:string;value?:number}){return <article className="metric"><span>{label}</span><b>{value ?? "—"}</b></article>}
function SubscriptionChart({distribution}:{distribution:Record<string,number>}){const plans=["free","plus","pro"];const total=plans.reduce((sum,plan)=>sum+(distribution[plan]||0),0);return <article className="chart-card"><div className="chart-head"><h2>Подписки</h2><strong>{total}</strong></div>{total===0?<EmptyChart label="Нет активных подписок"/>:<div className="subscription-chart">{plans.map((plan)=>{const value=distribution[plan]||0;const percent=Math.round((value/total)*100);return <div className="subscription-line" key={plan}><div><span>{planLabel(plan)}</span><b>{value}</b></div><div className="subscription-track"><i style={{width:`${percent}%`}}/></div><em>{percent}%</em></div>})}</div>}</article>}
function ActivityChart({title,rows}:{title:string;rows:Array<{date:string;count:number}>}){const series=useMemo(()=>normalizeSeries(rows),[rows]);const max=Math.max(1,...series.map(item=>item.count));const total=series.reduce((sum,item)=>sum+item.count,0);const points=series.map((item,index)=>{const x=series.length===1?160:(index/(series.length-1))*300+10;const y=130-(item.count/max)*100;return `${x},${y}`}).join(" ");const area=points?`10,140 ${points} 310,140`:"";return <article className="chart-card"><div className="chart-head"><h2>{title}</h2><strong>{total}</strong></div>{series.length===0?<EmptyChart label="Данных пока нет"/>:<><svg className="line-chart" viewBox="0 0 320 150" role="img" aria-label={title}><line x1="10" y1="140" x2="310" y2="140"/><line x1="10" y1="30" x2="10" y2="140"/><polygon points={area}/><polyline points={points}/>{series.map((item,index)=>{const x=series.length===1?160:(index/(series.length-1))*300+10;const y=130-(item.count/max)*100;return <circle key={`${item.date}-${index}`} cx={x} cy={y} r="3"><title>{`${formatChartDate(item.date)} · ${item.count}`}</title></circle>})}</svg><div className="chart-axis"><span>{formatChartDate(series[0]?.date)}</span><span>{formatChartDate(series.at(-1)?.date)}</span></div></>}</article>}
function EmptyChart({label}:{label:string}){return <div className="empty-chart"><span>{label}</span></div>}
function normalizeSeries(rows:Array<{date:string;count:number}>){return [...rows].filter(item=>Number.isFinite(item.count)).sort((a,b)=>a.date.localeCompare(b.date)).slice(-14)}
function formatChartDate(date?:string){if(!date)return "—";const parsed=new Date(date);if(Number.isNaN(parsed.getTime()))return date;return parsed.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"})}
function SearchBox({value,onChange,placeholder}:{value:string;onChange:(v:string)=>void;placeholder:string}){return <label className="search"><Search size={16}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}
function CustomSelect({value,options,labels,onChange}:{value:string;options:string[];labels?:Record<string,string>;onChange:(v:string)=>void}){const[open,setOpen]=useState(false);return <div className="select"><button type="button" onClick={()=>setOpen(!open)}>{labels?.[value]||value}</button>{open&&<div className="select-menu">{options.map(o=><button key={o} onClick={()=>{onChange(o);setOpen(false)}}>{labels?.[o]||o}</button>)}</div>}</div>}
function Modal({children,onClose}:{children:React.ReactNode;onClose:()=>void}){return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>{children}</div></div>}
function FeedPreview({service,type,title,body,points}:{service:string;type:FeedType;title:string;body:string;points:string[]}){return <article className={`feed-preview ${toneFor(type)}`}><span>{service}</span><b>{title||"Заголовок"}</b><p>{body||"Текст"}</p>{points.filter(Boolean).map(p=><em key={p}>{p}</em>)}</article>}
function Status({status}:{status:"active"|"blocked"}){return <span className={`status ${status}`}>{status==="active"?"Активен":"Заблокирован"}</span>}
function TicketStatusBadge({status}:{status:string}){const label=status==="closed"?"Закрыт":status==="answered"?"Отвечен":"Ждёт ответа";return <span className={`ticket-status ${status}`}>{label}</span>}
async function downloadAttachment(ticketId:string,messageId:string,storedName:string){ const result=await downloadBlob(`/admin/tickets/${ticketId}/messages/${messageId}/attachments/${encodeURIComponent(storedName)}`); if(result) saveBlob(result.blob,result.filename) }
function displayUser(u?: {display_name?: string|null; username?: string|null} | null){return u?.display_name || u?.username || "—"}
function displayTicketUser(t: SupportTicket & {user_display_name?: string|null}){return t.user_display_name || t.user_username || t.user_id}
function roleLabel(role:Role){return role==="admin"?"Админ":role==="support"?"Поддержка":"Пользователь"}
function planLabel(plan:string){return plan==="pro"?"Pro":plan==="plus"?"Plus":"Free"}
function toneFor(type:FeedType){return type==="reminder"?"tone-reminder":type==="ticket"?"tone-ticket":type==="update"?"tone-update":"tone-notification"}

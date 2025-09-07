import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { format } from 'date-fns'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line } from 'recharts'

type Price = { id?: string; created_at?: string; coffee_type?: string; grade?: string; base_price?: number; differential?: number; notes?: string }
type Payment = { id?: string; reference?: string; created_at?: string; supplier?: string; supplier_code?: string; amount?: number; method?: string; status?: string; notes?: string; approved_at?: string | null }
type Expense = { id?: string; reference?: string; created_at?: string; category?: string; payee?: string; amount?: number; status?: string; notes?: string; approved_at?: string | null }
type Ledger = { id?: string; date?: string; ref?: string; type?: string; debit?: number | null; credit?: number | null; balance?: number | null }

const money = (n?: number | null) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(Number(n||0))

function Navbar({ onNewPayment }: { onNewPayment: () => void }) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-black/5 dark:bg-gray-900/70 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="font-semibold">Great Pearl — Finance</div>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn-outline" onClick={testConnection}>Test Connection</button>
          <button className="btn" onClick={onNewPayment}>New Payment</button>
          <AuthMenu />
        </div>
      </div>
    </div>
  )
}

function AuthMenu() {
  const [email, setEmail] = useState('')
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => { sub.subscription.unsubscribe() }
  }, [])

  async function signIn() {
    if (!email) return alert('Enter email')
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message); else alert('Magic link sent. Check your email.')
  }
  async function signOut() { await supabase.auth.signOut(); alert('Signed out.') }

  return (
    <div className="flex items-center gap-2">
      {session ? (
        <button className="btn-outline" onClick={signOut}>Sign out</button>
      ) : (
        <div className="flex items-center gap-2">
          <input className="input w-48" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
          <button className="btn-outline" onClick={signIn}>Sign in</button>
        </div>
      )}
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="max-w-7xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <a href="#top" className="text-sm text-gray-500 hover:underline">Back to top</a>
      </div>
      {children}
    </section>
  )
}

function Card({ children }: { children: React.ReactNode }) { return <div className="card p-4">{children}</div> }

function Table({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>{r.map((c,j)=>(<td key={j}>{c}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function exportCsv(data: any[], filename: string) {
  if (!data?.length) return alert('Nothing to export')
  const cols = Object.keys(data[0])
  const csv = [cols.join(','), ...data.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function printReceipt(obj: { title: string; rows: [string, any][] }) {
  const win = window.open('', '_blank')
  if (!win) return
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${obj.title}</title>
    <style>body{font-family: ui-sans-serif, system-ui; padding:24px} h1{font-size:18px;margin:0 0 12px} 
    table{width:100%;border-collapse:collapse} td{padding:8px;border-bottom:1px solid #eee} .ft{margin-top:16px;font-size:12px;color:#555}</style>
    </head><body><h1>${obj.title}</h1><table>${obj.rows.map(([k,v])=>`<tr><td><b>${k}</b></td><td>${v ?? ''}</td></tr>`).join('')}</table>
    <div class="ft">Great Pearl Coffee Factory • www.greatpearlcoffee.com • 0781121639 / 0778536681</div></body></html>`
  win.document.write(html); win.document.close(); win.focus(); win.print()
}

function useRealtime(table: string, reload: () => void) {
  useEffect(() => {
    const ch = supabase.channel(`${table}_rt`).on('postgres_changes', { event: '*', schema: 'public', table }, reload).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])
}

function usePayments(from?: string, to?: string) {
  const [rows, setRows] = useState<Payment[]>([])
  async function load() {
    let q = supabase.from('finance_payments').select('*').order('created_at', { ascending: false }).limit(500)
    if (from) q = q.gte('created_at', from)
    if (to) q = q.lte('created_at', to)
    const { data, error } = await q
    if (error) alert('Payments load failed: ' + error.message)
    setRows(data || [])
  }
  useEffect(()=>{ load() }, [from, to])
  useRealtime('finance_payments', load)
  return { rows, reload: load }
}

function useExpenses(from?: string, to?: string) {
  const [rows, setRows] = useState<Expense[]>([])
  async function load() {
    let q = supabase.from('finance_expenses').select('*').order('created_at', { ascending: false }).limit(500)
    if (from) q = q.gte('created_at', from)
    if (to) q = q.lte('created_at', to)
    const { data, error } = await q
    if (error) alert('Expenses load failed: ' + error.message)
    setRows(data || [])
  }
  useEffect(()=>{ load() }, [from, to])
  useRealtime('finance_expenses', load)
  return { rows, reload: load }
}

function usePrices() {
  const [rows, setRows] = useState<Price[]>([])
  async function load() {
    const { data, error } = await supabase.from('finance_prices').select('*').order('created_at', { ascending: false }).limit(100)
    if (error) alert('Prices load failed: ' + error.message)
    setRows(data || [])
  }
  useEffect(()=>{ load() }, [])
  return { rows, reload: load }
}

function useLedger(from?: string, to?: string) {
  const [rows, setRows] = useState<Ledger[]>([])
  async function load() {
    const { data, error } = await supabase.from('finance_ledgers').select('*').order('date', { ascending: true })
    if (!error && data) { setRows(data as any); return }
    // Fallback compute from payments + expenses
    const [p, e] = await Promise.all([
      supabase.from('finance_payments').select('created_at,reference,amount').order('created_at', { ascending: true }),
      supabase.from('finance_expenses').select('created_at,reference,amount').order('created_at', { ascending: true }),
    ])
    const combined: Ledger[] = []
    let bal = 0
    ;(p.data || []).forEach((r: any) => { bal -= Number(r.amount||0); combined.push({ date: r.created_at, ref: r.reference, type: 'Supplier Payment', debit: Number(r.amount||0), credit: 0, balance: bal }) })
    ;(e.data || []).forEach((r: any) => { bal -= Number(r.amount||0); combined.push({ date: r.created_at, ref: r.reference, type: 'Expense', debit: Number(r.amount||0), credit: 0, balance: bal }) })
    combined.sort((a,b)=> new Date(a.date||0).getTime() - new Date(b.date||0).getTime())
    setRows(combined)
  }
  useEffect(()=>{ load() }, [from, to])
  return { rows, reload: load }
}

function Dashboard() {
  const [kpis, setKpis] = useState<{label:string; value:number; delta:number}[]>([
    { label: 'Collections (MTD)', value: 0, delta: 0 },
    { label: 'Payments (MTD)', value: 0, delta: 0 },
    { label: 'Expenses (MTD)', value: 0, delta: 0 },
    { label: 'Cash on Hand', value: 0, delta: 0 },
  ])
  useEffect(()=>{
    const start = new Date(); start.setDate(1)
    Promise.all([
      supabase.from('finance_payments').select('amount,created_at'),
      supabase.from('finance_expenses').select('amount,created_at'),
    ]).then(([p,e])=>{
      const pm = (p.data||[]).filter(r => new Date(r.created_at) >= start).reduce((s,r)=> s + Number(r.amount||0), 0)
      const ex = (e.data||[]).filter(r => new Date(r.created_at) >= start).reduce((s,r)=> s + Number(r.amount||0), 0)
      const cash = Math.max(0, pm - ex)
      setKpis([
        { label: 'Collections (MTD)', value: 0, delta: 0 },
        { label: 'Payments (MTD)', value: pm, delta: 0 },
        { label: 'Expenses (MTD)', value: ex, delta: 0 },
        { label: 'Cash on Hand', value: cash, delta: 0 },
      ])
    })
  }, [])

  const data = useMemo(()=> Array.from({ length: 12 }).map((_,i)=> ({
    month: format(new Date(2025, i, 1), 'MMM'),
    inflow: Math.round(50 + Math.random()*150),
    outflow: Math.round(30 + Math.random()*120),
  })), [])

  return (
    <Section id="dashboard" title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <div className="text-sm text-gray-500">{k.label}</div>
            <div className="text-2xl font-semibold mt-1">{money(k.value)}</div>
            <div className="text-xs text-gray-500 mt-1">{k.delta >= 0 ? '▲' : '▼'} {k.delta}% vs last month</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-2 font-medium">Monthly Cashflow</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="inflow" stroke="#10b981" fillOpacity={1} fill="url(#inflow)" />
              <Area type="monotone" dataKey="outflow" stroke="#f59e0b" fillOpacity={1} fill="url(#outflow)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </Section>
  )
}

function Pricing() {
  const { rows: prices, reload } = usePrices()
  const [form, setForm] = useState<Price>({ coffee_type: 'Robusta', grade: 'FAQ', base_price: undefined, differential: 0, notes: '' })

  async function publish() {
    const { error } = await supabase.from('finance_prices').insert([{ ...form }])
    if (error) return alert(error.message)
    alert('Price published')
    setForm({ coffee_type: 'Robusta', grade: 'FAQ', base_price: undefined, differential: 0, notes: '' })
    reload()
  }

  return (
    <Section id="pricing" title="Receive Coffee Pricing">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-1">Coffee Type</div>
            <select className="select" value={form.coffee_type||''} onChange={e=>setForm(p=>({...p, coffee_type: e.target.value}))}>
              <option>Robusta</option>
              <option>Arabica</option>
            </select>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Grade / Screen</div>
            <input className="input" value={form.grade||''} onChange={e=>setForm(p=>({...p, grade: e.target.value}))} placeholder="Screen 15/16, FAQ" />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Base Price (UGX/kg)</div>
            <input type="number" className="input" value={form.base_price as any || ''} onChange={e=>setForm(p=>({...p, base_price: Number(e.target.value)||undefined}))} placeholder="16500" />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Differential (+/- UGX/kg)</div>
            <input type="number" className="input" value={form.differential as any || 0} onChange={e=>setForm(p=>({...p, differential: Number(e.target.value)||0}))} placeholder="+500" />
          </div>
          <div className="md:col-span-2">
            <div className="text-sm font-medium mb-1">Notes</div>
            <textarea className="textarea" value={form.notes||''} onChange={e=>setForm(p=>({...p, notes: e.target.value}))} placeholder="Pricing rationale, market refs, UCDA guidance…" />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-outline" onClick={reload}>Reload</button>
          <button className="btn" onClick={publish}>Publish</button>
        </div>
      </Card>

      <Card>
        <div className="mb-2 font-medium">Recent Prices</div>
        <Table
          cols={['Date','Type','Grade','Base','Diff','Notes']}
          rows={(prices||[]).map(r => [
            r.created_at ? new Date(r.created_at).toLocaleString() : '',
            r.coffee_type || '',
            r.grade || '',
            money(r.base_price || 0),
            money(r.differential || 0),
            r.notes || '',
          ])}
        />
      </Card>
    </Section>
  )
}

function Payments() {
  const [formOpen, setFormOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { rows: payments, reload } = usePayments(from ? new Date(from).toISOString() : undefined, to ? new Date(to).toISOString() : undefined)
  const [form, setForm] = useState<Payment>({ supplier: '', supplier_code: '', amount: undefined, method: 'Bank', reference: '', notes: '' })

  async function submit() {
    if (!form.supplier || !form.amount) return alert('Supplier and amount required')
    const payload = { ...form, status: 'Pending' }
    const { error } = await supabase.from('finance_payments').insert([payload])
    if (error) return alert(error.message)
    alert('Payment created')
    setFormOpen(false); setForm({ supplier: '', supplier_code: '', amount: undefined, method: 'Bank', reference: '', notes: '' })
    reload()
  }

  function viewReceipt(p: Payment) {
    printReceipt({
      title: `Payment Receipt ${p.reference || p.id}`,
      rows: [
        ['Reference', p.reference || p.id],
        ['Date', p.created_at ? new Date(p.created_at).toLocaleString() : ''],
        ['Supplier', `${p.supplier || ''} ${p.supplier_code ? '('+p.supplier_code+')' : ''}`],
        ['Amount', money(p.amount)],
        ['Method', p.method || ''],
        ['Status', p.status || ''],
        ['Notes', p.notes || ''],
      ]
    })
  }

  return (
    <Section id="payments" title="Payments">
      <Card>
        <div className="flex items-center gap-2">
          <input type="date" className="input w-44" value={from} onChange={e=>setFrom(e.target.value)} />
          <input type="date" className="input w-44" value={to} onChange={e=>setTo(e.target.value)} />
          <div className="ml-auto flex items-center gap-2">
            <button className="btn-outline" onClick={()=> exportCsv(payments as any, 'payments.csv')}>Export CSV</button>
            <button className="btn" onClick={()=> setFormOpen(true)}>Issue Payment</button>
          </div>
        </div>
      </Card>

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
          <div className="card max-w-2xl w-full p-4">
            <div className="text-lg font-semibold mb-2">Issue Supplier Payment</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-1">Supplier</div>
                <input className="input" value={form.supplier||''} onChange={e=>setForm(p=>({...p, supplier: e.target.value}))} placeholder="Kyagalanyi Coffee – BWS00421" />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Amount (UGX)</div>
                <input type="number" className="input" value={form.amount as any || ''} onChange={e=>setForm(p=>({...p, amount: Number(e.target.value)||undefined}))} placeholder="0" />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Method</div>
                <select className="select" value={form.method||'Bank'} onChange={e=>setForm(p=>({...p, method: e.target.value}))}>
                  <option>Bank</option>
                  <option>Mobile Money</option>
                  <option>Cash</option>
                </select>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Reference</div>
                <input className="input" value={form.reference||''} onChange={e=>setForm(p=>({...p, reference: e.target.value}))} placeholder="Auto or custom" />
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium mb-1">Purpose / Notes</div>
                <textarea className="textarea" value={form.notes||''} onChange={e=>setForm(p=>({...p, notes: e.target.value}))} placeholder="Advance against contract, settlement, etc." />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn-outline" onClick={()=> setFormOpen(false)}>Cancel</button>
              <button className="btn" onClick={submit}>Submit</button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <div className="mb-2 font-medium">Recent Payments</div>
        <Table
          cols={['Ref','Supplier','Amount','Method','Date','Status','Actions']}
          rows={payments.map(p => [
            <span className="font-mono">{p.reference || p.id}</span>,
            p.supplier || '',
            money(p.amount),
            p.method || '',
            p.created_at ? new Date(p.created_at).toLocaleString() : '',
            <span className={'badge ' + (p.status === 'Approved' ? 'green' : p.status === 'Pending' ? 'amber' : 'red')}>{p.status}</span>,
            <div className="flex gap-2"><button className="btn-outline" onClick={()=>viewReceipt(p)}>Receipt</button></div>
          ])}
        />
      </Card>
    </Section>
  )
}

function Expenses() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { rows: expenses, reload } = useExpenses(from ? new Date(from).toISOString() : undefined, to ? new Date(to).toISOString() : undefined)

  async function approve(exp: Expense, yes: boolean) {
    const { error } = await supabase.from('finance_expenses').update({ status: yes ? 'Approved' : 'Rejected', approved_at: new Date().toISOString() }).eq('id', exp.id)
    if (error) return alert(error.message)
    alert(yes ? 'Expense approved' : 'Expense rejected')
    reload()
  }

  return (
    <Section id="expenses" title="Expenses">
      <Card>
        <div className="flex items-center gap-2">
          <input type="date" className="input w-44" value={from} onChange={e=>setFrom(e.target.value)} />
          <input type="date" className="input w-44" value={to} onChange={e=>setTo(e.target.value)} />
          <div className="ml-auto"></div>
        </div>
      </Card>
      <Card>
        <div className="mb-2 font-medium">Expense Register</div>
        <Table
          cols={['Ref','Category','Payee','Amount','Date','Status','Actions']}
          rows={expenses.map(e => [
            <span className="font-mono">{e.reference || e.id}</span>,
            e.category || '',
            e.payee || '',
            money(e.amount),
            e.created_at ? new Date(e.created_at).toLocaleString() : '',
            <span className={'badge ' + (e.status === 'Approved' ? 'green' : e.status === 'Pending' ? 'amber' : 'red')}>{e.status}</span>,
            <div className="flex gap-2">
              <button className="btn-outline" onClick={()=>approve(e,true)}>Approve</button>
              <button className="btn-outline" onClick={()=>approve(e,false)}>Reject</button>
            </div>
          ])}
        />
      </Card>
    </Section>
  )
}

function Approvals() {
  const { rows: payments, reload: reloadP } = usePayments()
  const { rows: expenses, reload: reloadE } = useExpenses()

  async function approvePayment(p: Payment, yes: boolean) {
    const { error } = await supabase.from('finance_payments').update({ status: yes ? 'Approved' : 'Rejected', approved_at: new Date().toISOString() }).eq('id', p.id)
    if (error) return alert(error.message)
    alert(yes ? 'Payment approved' : 'Payment rejected')
    reloadP()
  }

  return (
    <Section id="approvals" title="Approvals">
      <Card>
        <div className="font-medium mb-2">Payments</div>
        <Table
          cols={['Ref','Supplier','Amount','Submitted','Actions']}
          rows={payments.filter(p => p.status === 'Pending').map(p => [
            <span className="font-mono">{p.reference || p.id}</span>,
            p.supplier || '',
            money(p.amount),
            p.created_at ? new Date(p.created_at).toLocaleString() : '',
            <div className="flex gap-2">
              <button className="btn" onClick={()=>approvePayment(p,true)}>Approve</button>
              <button className="btn-outline" onClick={()=>approvePayment(p,false)}>Reject</button>
            </div>
          ])}
        />
      </Card>
      <Card>
        <div className="font-medium mb-2">Expenses</div>
        <Table
          cols={['Ref','Category','Payee','Amount','Submitted','Actions']}
          rows={expenses.filter(e => e.status === 'Pending').map(e => [
            <span className="font-mono">{e.reference || e.id}</span>,
            e.category || '',
            e.payee || '',
            money(e.amount),
            e.created_at ? new Date(e.created_at).toLocaleString() : '',
            <div className="flex gap-2">
              <button className="btn" onClick={async()=>{ const { error } = await supabase.from('finance_expenses').update({ status: 'Approved', approved_at: new Date().toISOString() }).eq('id', e.id); if (error) alert(error.message); else { alert('Expense approved'); reloadE() }}}>Approve</button>
              <button className="btn-outline" onClick={async()=>{ const { error } = await supabase.from('finance_expenses').update({ status: 'Rejected', approved_at: new Date().toISOString() }).eq('id', e.id); if (error) alert(error.message); else { alert('Expense rejected'); reloadE() }}}>Reject</button>
            </div>
          ])}
        />
      </Card>
    </Section>
  )
}

function Statements() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { rows: ledger } = useLedger(from ? new Date(from).toISOString() : undefined, to ? new Date(to).toISOString() : undefined)

  return (
    <Section id="statements" title="Statements">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="text-sm font-medium mb-1">Account</div>
            <input className="input" placeholder="Supplier name / code / account no. (future filter)" />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">From</div>
            <input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">To</div>
            <input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
        </div>
      </Card>
      <Card>
        <div className="mb-2 font-medium">Ledger</div>
        <Table
          cols={['Date','Reference','Type','Debit','Credit','Balance']}
          rows={ledger.map(l => [
            l.date ? new Date(l.date).toLocaleString() : '',
            <span className="font-mono">{l.ref}</span>,
            l.type || '',
            l.debit ? money(l.debit) : '',
            l.credit ? money(l.credit) : '',
            money(l.balance||0),
          ])}
        />
      </Card>
    </Section>
  )
}

function Reports() {
  return (
    <Section id="reports" title="Reports">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-sm text-gray-500">Total Collections</div>
            <div className="text-xl font-semibold mt-1">{money(312_000_000)}</div>
            <div className="text-xs text-gray-500 mt-1">+8.3% vs prev.</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">Total Payments</div>
            <div className="text-xl font-semibold mt-1">{money(284_000_000)}</div>
            <div className="text-xs text-gray-500 mt-1">-2.1% vs prev.</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">Net Cash</div>
            <div className="text-xl font-semibold mt-1">{money(28_000_000)}</div>
            <div className="text-xs text-gray-500 mt-1">Healthy</div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="btn-outline" onClick={async()=>{
            const [p, e] = await Promise.all([
              supabase.from('finance_payments').select('*').limit(1000),
              supabase.from('finance_expenses').select('*').limit(1000),
            ])
            if (!p.error) {
              const cols = Object.keys(p.data?.[0] || {id:''})
              const csv = [cols.join(','), ...(p.data||[]).map(r => cols.map(c=>JSON.stringify(r[c]??'')).join(','))].join('\n')
              const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
              const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='payments.csv'; a.click(); URL.revokeObjectURL(url)
            }
            if (!e.error) {
              const cols = Object.keys(e.data?.[0] || {id:''})
              const csv = [cols.join(','), ...(e.data||[]).map(r => cols.map(c=>JSON.stringify(r[c]??'')).join(','))].join('\n')
              const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
              const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='expenses.csv'; a.click(); URL.revokeObjectURL(url)
            }
          }}>Export CSV</button>
        </div>
      </Card>
    </Section>
  )
}

function Settings() {
  return (
    <Section id="settings" title="Settings">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-1">Supabase URL</div>
            <input className="input" value={import.meta.env.VITE_SUPABASE_URL || ''} readOnly />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Supabase Anon Key</div>
            <input className="input" value={import.meta.env.VITE_SUPABASE_ANON_KEY ? '••••••••' : ''} readOnly />
          </div>
          <div className="md:col-span-2">
            <div className="text-sm font-medium mb-1">Webhooks (Lovable Actions)</div>
            <textarea className="textarea" placeholder="/api/approve-payment, /api/approve-expense, /api/run-payroll" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button className="btn-outline" onClick={testConnection}>Test Connection</button>
        </div>
      </Card>
    </Section>
  )
}

async function testConnection() {
  const { error } = await supabase.from('finance_payments').select('count', {count:'exact', head: true})
  alert(error ? 'Connection failed' : 'Connection OK')
}

export default function App() {
  return (
    <div id="top" className="min-h-screen">
      <Navbar onNewPayment={()=>{
        const el = document.getElementById('payments')
        if (el) el.scrollIntoView({ behavior:'smooth' })
      }}/>
      <div className="flex">
        <aside className="hidden md:block w-64 border-r border-black/5">
          <div className="h-14 flex items-center px-4 font-semibold">Great Pearl</div>
          <nav className="p-3 space-y-1">
            {[
              ['dashboard','Dashboard'],
              ['pricing','Pricing'],
              ['payments','Payments'],
              ['expenses','Expenses'],
              ['approvals','Approvals'],
              ['statements','Statements'],
              ['reports','Reports'],
              ['settings','Settings'],
            ].map(([k, label]) => (
              <a key={k} href={'#'+k} className="block px-3 py-2 rounded-xl hover:bg-emerald-50">{label}</a>
            ))}
          </nav>
        </aside>
        <main className="flex-1 space-y-10 pb-16">
          <Dashboard />
          <Pricing />
          <Payments />
          <Expenses />
          <Approvals />
          <Statements />
          <Reports />
          <Settings />
        </main>
      </div>
    </div>
  )
}
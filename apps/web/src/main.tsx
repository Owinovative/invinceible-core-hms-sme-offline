import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, Beaker, ClipboardList, CreditCard, DatabaseBackup, Home, Pill, Search, Stethoscope, Users } from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_BASE || "http://127.0.0.1:4789";
type Page = "dashboard" | "patients" | "reception" | "triage" | "doctor" | "lab" | "pharmacy" | "billing" | "backup";

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("offline-hms-token");
  const response = await fetch(`${API}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function value(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}

function money(cents = 0) {
  return `KES ${(Number(cents) / 100).toFixed(2)}`;
}

function App() {
  const [setupDone, setSetupDone] = useState<boolean | null>(null);
  const [token, setToken] = useState(localStorage.getItem("offline-hms-token") || "");
  const [page, setPage] = useState<Page>("dashboard");
  const [msg, setMsg] = useState("Ready.");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    request("/setup/status", { headers: {} }).then((data) => setSetupDone(data.completed)).catch(() => setSetupDone(false));
  }, []);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      const result = await fn();
      setMsg(`${label} completed.`);
      setRefreshKey((key) => key + 1);
      return result;
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Request failed.");
    }
  };

  if (setupDone === null) return <div className="center">Starting offline HMS...</div>;
  if (!setupDone) return <Setup onDone={() => setSetupDone(true)} setMsg={setMsg} />;
  if (!token) return <Login setToken={setToken} setMsg={setMsg} />;

  const nav = [
    ["dashboard", Home, "Dashboard"],
    ["patients", Users, "Patients"],
    ["reception", ClipboardList, "Reception"],
    ["triage", Activity, "Triage"],
    ["doctor", Stethoscope, "Doctor"],
    ["lab", Beaker, "Lab"],
    ["pharmacy", Pill, "Pharmacy"],
    ["billing", CreditCard, "Billing"],
    ["backup", DatabaseBackup, "Backup"],
  ] as const;

  return (
    <div className="app">
      <aside>
        <div className="brand"><span>IC</span><strong>Invinceible Core<br />SME Offline</strong></div>
        {nav.map(([id, Icon, label]) => (
          <button className={page === id ? "active" : ""} key={id} onClick={() => setPage(id)}>
            <Icon size={18} /> {label}
          </button>
        ))}
        <button onClick={() => { localStorage.removeItem("offline-hms-token"); setToken(""); }}>Logout</button>
      </aside>
      <main>
        <header>
          <div>
            <p>Offline desktop hospital management</p>
            <h1>{nav.find(([id]) => id === page)?.[2]}</h1>
          </div>
          <div className="status">{msg}</div>
        </header>
        {page === "dashboard" && <Dashboard refreshKey={refreshKey} />}
        {page === "patients" && <Patients run={run} refreshKey={refreshKey} />}
        {page === "reception" && <Reception run={run} refreshKey={refreshKey} />}
        {page === "triage" && <Triage run={run} refreshKey={refreshKey} />}
        {page === "doctor" && <Doctor run={run} refreshKey={refreshKey} />}
        {page === "lab" && <Lab run={run} refreshKey={refreshKey} />}
        {page === "pharmacy" && <Pharmacy run={run} refreshKey={refreshKey} />}
        {page === "billing" && <Billing run={run} refreshKey={refreshKey} />}
        {page === "backup" && <Backup run={run} />}
      </main>
    </div>
  );
}

function Setup({ onDone, setMsg }: { onDone: () => void; setMsg: (msg: string) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await request("/setup", { method: "POST", body: JSON.stringify(value(event.currentTarget)), headers: {} });
    setMsg("Setup completed. Sign in with your admin account.");
    onDone();
  }
  return <div className="center"><form className="card form" onSubmit={submit}><h1>First-run setup</h1><input name="facilityName" placeholder="Facility name" required /><input name="address" placeholder="Address" /><input name="phone" placeholder="Phone" /><input name="adminFullName" placeholder="Admin full name" required /><input name="adminUsername" placeholder="Admin username" required /><input name="adminPassword" type="password" placeholder="Admin password" required /><button>Complete setup</button></form></div>;
}

function Login({ setToken, setMsg }: { setToken: (token: string) => void; setMsg: (msg: string) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = await request("/auth/login", { method: "POST", body: JSON.stringify(value(event.currentTarget)), headers: {} });
    localStorage.setItem("offline-hms-token", data.token);
    setToken(data.token);
    setMsg(`Signed in as ${data.user.fullName}`);
  }
  return <div className="center"><form className="card form" onSubmit={submit}><h1>Login</h1><input name="username" placeholder="Username" required /><input name="password" type="password" placeholder="Password" required /><button>Open HMS</button></form></div>;
}

function Dashboard({ refreshKey }: { refreshKey: number }) {
  const [report, setReport] = useState<any>({});
  useEffect(() => { request("/reports/dashboard").then(setReport); }, [refreshKey]);
  return <section className="grid stats">{Object.entries(report).map(([k, v]) => <div className="card" key={k}><span>{k.replaceAll(/([A-Z])/g, " $1")}</span><strong>{k.includes("Cents") ? money(v as number) : String(v)}</strong></div>)}</section>;
}

function Patients({ run, refreshKey }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  useEffect(() => { request("/patients").then(setRows); }, [refreshKey]);
  return <section className="two"><form className="card form" onSubmit={(e) => { e.preventDefault(); run("Patient registration", () => request("/patients", { method: "POST", body: JSON.stringify(value(e.currentTarget)) })); }}><h2>Register patient</h2><input name="firstName" placeholder="First name" required /><input name="middleName" placeholder="Middle name" /><input name="lastName" placeholder="Last name" required /><select name="sex"><option>FEMALE</option><option>MALE</option><option>OTHER</option></select><input name="ageYears" type="number" placeholder="Age" /><input name="phone" placeholder="Phone" /><input name="address" placeholder="Address" /><input name="nextOfKinName" placeholder="Next of kin" /><input name="nextOfKinPhone" placeholder="Next of kin phone" /><button>Save patient</button></form><div className="card"><h2>Patients</h2><List rows={rows} render={(p) => <button className="row" onClick={async () => setSelected(await request(`/patients/${p.id}`))}><strong>{p.patientNumber}</strong><span>{p.firstName} {p.lastName}</span><span>{p.phone}</span></button>} />{selected && <pre>{JSON.stringify(selected.encounters?.slice(0, 3), null, 2)}</pre>}</div></section>;
}

function Reception({ run, refreshKey }: any) {
  const [patients, setPatients] = useState<any[]>([]); const [arrivals, setArrivals] = useState<any[]>([]);
  useEffect(() => { request("/patients").then(setPatients); request("/encounters/today").then(setArrivals); }, [refreshKey]);
  return <section className="two"><form className="card form" onSubmit={(e) => { e.preventDefault(); run("Visit creation", () => request("/encounters", { method: "POST", body: JSON.stringify(value(e.currentTarget)) })); }}><h2>Create visit</h2><select name="patientId">{patients.map(p => <option key={p.id} value={p.id}>{p.patientNumber} - {p.firstName} {p.lastName}</option>)}</select><button>Route to triage</button></form><div className="card"><h2>Today's arrivals</h2><List rows={arrivals} render={(e) => <div className="row"><strong>{e.visitNumber}</strong><span>{e.patient.firstName} {e.patient.lastName}</span><span>{e.status}</span></div>} /></div></section>;
}

function Triage({ run, refreshKey }: any) {
  const [queue, setQueue] = useState<any[]>([]); useEffect(() => { request("/triage/queue").then(setQueue); }, [refreshKey]);
  return <section className="two"><div className="card"><h2>Triage queue</h2><List rows={queue} render={(e) => <div className="row"><strong>{e.visitNumber}</strong><span>{e.patient.firstName} {e.patient.lastName}</span></div>} /></div><form className="card form" onSubmit={(e) => { e.preventDefault(); const data = value(e.currentTarget); const encounterId = String(data.encounterId); delete (data as any).encounterId; run("Triage", () => request(`/triage/${encounterId}`, { method: "POST", body: JSON.stringify(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ["chiefComplaint", "priority"].includes(k) ? v : Number(v)]))) })); }}><h2>Capture vitals</h2><select name="encounterId">{queue.map(e => <option key={e.id} value={e.id}>{e.visitNumber} - {e.patient.firstName}</option>)}</select><input name="temperature" type="number" step="0.1" placeholder="Temperature" /><input name="systolicBp" type="number" placeholder="Systolic BP" /><input name="diastolicBp" type="number" placeholder="Diastolic BP" /><input name="pulse" type="number" placeholder="Pulse" /><input name="respiratoryRate" type="number" placeholder="Respiratory rate" /><input name="oxygenSaturation" type="number" placeholder="SpO2" /><input name="weightKg" type="number" step="0.1" placeholder="Weight kg" /><input name="painScore" type="number" placeholder="Pain score" /><input name="chiefComplaint" placeholder="Chief complaint" required /><select name="priority"><option value="">Use system suggestion</option><option>NORMAL</option><option>URGENT</option><option>EMERGENCY</option><option>CRITICAL</option></select><button>Complete triage</button></form></section>;
}

function Doctor({ run, refreshKey }: any) {
  const [queue, setQueue] = useState<any[]>([]); const [workspace, setWorkspace] = useState<any>(null); const [meds, setMeds] = useState<any[]>([]);
  useEffect(() => { request("/consultations/doctor-queue").then(setQueue); request("/pharmacy/medications").then(setMeds); }, [refreshKey]);
  const encounter = workspace?.encounter;
  return <section className="two"><div className="card"><h2>Doctor queue</h2><List rows={queue} render={(e) => <button className="row" onClick={async () => setWorkspace(await request(`/consultations/${e.id}`))}><strong>{e.triage?.priority}</strong><span>{e.visitNumber}</span><span>{e.patient.firstName} {e.patient.lastName}</span><span>{e.triage?.chiefComplaint}</span></button>} /></div>{encounter && <div className="card form"><h2>{encounter.patient.firstName} {encounter.patient.lastName}</h2><p>{encounter.visitNumber} / {encounter.triage?.priority} / {encounter.triage?.chiefComplaint}</p><form className="form" onSubmit={(e) => { e.preventDefault(); run("Consultation", () => request(`/consultations/${encounter.id}`, { method: "POST", body: JSON.stringify({ ...value(e.currentTarget), completed: true }) })); }}><textarea name="historyOfPresentingComplaint" placeholder="History of presenting complaint" /><textarea name="examinationFindings" placeholder="Examination findings" /><textarea name="diagnosisText" placeholder="Diagnosis" /><textarea name="treatmentPlan" placeholder="Treatment plan" /><textarea name="clinicalNotes" placeholder="Clinical notes" /><button>Complete consultation</button></form><form className="inline" onSubmit={(e) => { e.preventDefault(); run("Lab order", () => request(`/consultations/${encounter.id}/labs`, { method: "POST", body: JSON.stringify(value(e.currentTarget)) })); }}><input name="testName" placeholder="Lab test" /><button>Order lab</button></form><form className="form" onSubmit={(e) => { e.preventDefault(); const data = value(e.currentTarget); const med = meds.find(m => m.id === data.medicationId); run("Prescription", () => request(`/consultations/${encounter.id}/prescriptions`, { method: "POST", body: JSON.stringify({ items: [{ ...data, medicineName: med?.name || data.medicineName, quantity: Number(data.quantity || 1) }] }) })); }}><h3>Prescribe medicine</h3><select name="medicationId">{meds.map(m => <option key={m.id} value={m.id}>{m.name} {m.strength}</option>)}</select><input name="dosage" placeholder="Dosage" required /><input name="route" placeholder="Route" /><input name="frequency" placeholder="Frequency" required /><input name="duration" placeholder="Duration" required /><input name="quantity" type="number" placeholder="Quantity" required /><input name="instructions" placeholder="Instructions" /><button>Send prescription</button></form></div>}</section>;
}

function Lab({ run, refreshKey }: any) {
  const [orders, setOrders] = useState<any[]>([]); useEffect(() => { request("/lab/orders").then(setOrders); }, [refreshKey]);
  return <section className="card"><h2>Pending lab orders</h2><List rows={orders} render={(o) => <form className="row" onSubmit={(e) => { e.preventDefault(); run("Lab result", () => request(`/lab/orders/${o.id}/result`, { method: "POST", body: JSON.stringify(value(e.currentTarget)) })); }}><strong>{o.testName}</strong><span>{o.encounter.patient.firstName} {o.encounter.patient.lastName}</span><input name="resultText" placeholder="Result" required /><button>Complete</button></form>} /></section>;
}

function Pharmacy({ run, refreshKey }: any) {
  const [queue, setQueue] = useState<any[]>([]); useEffect(() => { request("/pharmacy/queue").then(setQueue); }, [refreshKey]);
  return <section className="card"><h2>Pharmacy queue</h2><List rows={queue} render={(p) => <div className="row"><strong>{p.encounter.patient.firstName} {p.encounter.patient.lastName}</strong><span>{p.items.map((i: any) => `${i.medicineNameSnapshot} x${i.quantity}`).join(", ")}</span><button onClick={() => run("Dispense", () => request(`/pharmacy/prescriptions/${p.id}/dispense`, { method: "POST", body: JSON.stringify({ quantities: Object.fromEntries(p.items.map((i: any) => [i.id, i.quantity])) }) }))}>Dispense</button></div>} /></section>;
}

function Billing({ run, refreshKey }: any) {
  const [arrivals, setArrivals] = useState<any[]>([]); const [invoices, setInvoices] = useState<any[]>([]);
  useEffect(() => { request("/encounters/today").then(setArrivals); request("/billing/invoices").then(setInvoices); }, [refreshKey]);
  const [printInvoice, setPrintInvoice] = useState<any>(null);
  function print(i: any) {
    setPrintInvoice(i);
    window.setTimeout(() => window.print(), 80);
  }
  return <section className="two"><form className="card form" onSubmit={(e) => { e.preventDefault(); const data = value(e.currentTarget); run("Invoice", () => request("/billing/invoices", { method: "POST", body: JSON.stringify({ encounterId: data.encounterId, items: [{ description: data.description, quantity: Number(data.quantity || 1), unitCents: Number(data.unitCents || 0) }] }) })); }}><h2>Create invoice</h2><select name="encounterId">{arrivals.map(e => <option key={e.id} value={e.id}>{e.visitNumber} - {e.patient.firstName}</option>)}</select><input name="description" placeholder="Charge description" required /><input name="quantity" type="number" defaultValue="1" /><input name="unitCents" type="number" placeholder="Unit cents" required /><button>Create invoice</button></form><div className="card"><h2>Invoices and receipts</h2><List rows={invoices} render={(i) => <div className="row"><strong>{i.invoiceNo}</strong><span>{i.encounter.patient.firstName} {i.encounter.patient.lastName}</span><span className={`badge ${String(i.status).toLowerCase()}`}>{i.status}</span><span>{money(i.totalCents)}</span><button onClick={() => run("Payment", () => request(`/billing/invoices/${i.id}/payments`, { method: "POST", body: JSON.stringify({ amountCents: i.totalCents, method: "CASH" }) }))}>Mark paid</button><button className="secondary" onClick={() => print(i)}>Print</button></div>} /></div>{printInvoice && <PrintableInvoice invoice={printInvoice} />}</section>;
}

function PrintableInvoice({ invoice }: { invoice: any }) {
  const patient = invoice.encounter?.patient || {};
  const paid = (invoice.payments || []).reduce((sum: number, payment: any) => sum + Number(payment.amountCents || 0), 0);
  return (
    <article className="print-sheet" aria-hidden="true">
      <header className="print-header">
        <div className="print-mark">IC</div>
        <div>
          <h1>Invinceible Core HMS SME Offline</h1>
          <p>Offline clinic billing document</p>
        </div>
        <strong>{invoice.status === "PAID" ? "RECEIPT" : "INVOICE"}</strong>
      </header>
      <section className="print-meta">
        <p><b>Document No:</b> {invoice.invoiceNo}</p>
        <p><b>Date:</b> {new Date(invoice.createdAt).toLocaleString()}</p>
        <p><b>Patient:</b> {patient.firstName} {patient.lastName}</p>
        <p><b>Patient No:</b> {patient.patientNumber}</p>
        <p><b>Visit No:</b> {invoice.encounter?.visitNumber}</p>
        <p><b>Status:</b> {invoice.status}</p>
      </section>
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
        <tbody>{invoice.items?.map((item: any) => <tr key={item.id}><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.unitCents)}</td><td>{money(item.totalCents)}</td></tr>)}</tbody>
      </table>
      <section className="print-totals">
        <p><span>Total</span><b>{money(invoice.totalCents)}</b></p>
        <p><span>Paid</span><b>{money(paid)}</b></p>
        <p><span>Balance</span><b>{money(Math.max(0, Number(invoice.totalCents || 0) - paid))}</b></p>
      </section>
      <footer>Generated by Invinceible Core HMS SME Offline | Keep this document for facility records.</footer>
    </article>
  );
}

function Backup({ run }: any) {
  return <section className="card"><h2>Backup and restore</h2><p>Export creates a local SQLite backup file. Copy backups to external storage regularly.</p><button onClick={() => run("Backup export", () => request("/backup/export", { method: "POST", body: "{}" }))}>Export backup</button><form className="inline" onSubmit={(e) => { e.preventDefault(); run("Restore", () => request("/backup/restore", { method: "POST", body: JSON.stringify(value(e.currentTarget)) })); }}><input name="path" placeholder="Full .sqlite backup path" /><button>Restore</button></form></section>;
}

function List({ rows, render }: { rows: any[]; render: (row: any) => React.ReactNode }) {
  if (!rows?.length) return <p className="empty">No records yet.</p>;
  return <div className="list">{rows.map((row) => <React.Fragment key={row.id}>{render(row)}</React.Fragment>)}</div>;
}

createRoot(document.getElementById("root")!).render(<App />);

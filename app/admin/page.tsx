"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, AlertCircle, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness,
  CheckCircle2, Clock3, GraduationCap, Mail, Package, RefreshCw, ShoppingCart,
  Users, Wallet,
} from "lucide-react";
import AdminPageShell from "./admin-page-shell";
import { graphqlRequest } from "@/lib/graphql";

type Order = { id:string; orderNumber:string; customerName:string; customerPhone:string; status:string; paymentStatus:string; total:number; amountPaid:number; createdAt:string; items:{productName:string;quantity:number}[] };
type Product = { id:string; name:string; conditions:{stock:number;isAvailable:boolean;price:number;salePrice:number|null}[] };
type Service = { id:string; title:string; isActive:boolean };
type Contact = { id:string; name:string; service:string; status:string; createdAt:string };
type Training = { id:string; fullName:string; course:string; status:string; createdAt:string };
type Subscriber = { id:string; email:string; status:string; subscribedAt:string };
type Slide = { id:string; title:string; isActive:boolean; sortOrder:number };
const money=(value:number)=>"UGX "+Math.round(value).toLocaleString("en-UG");
const date=(value:string)=>new Date(value).toLocaleString("en-UG",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
const statusLabel=(value:string)=>value.replaceAll("_"," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());

export default function AdminPage(){
 const [orders,setOrders]=useState<Order[]>([]);
 const [products,setProducts]=useState<Product[]>([]);
 const [services,setServices]=useState<Service[]>([]);
 const [contacts,setContacts]=useState<Contact[]>([]);
 const [training,setTraining]=useState<Training[]>([]);
 const [subscribers,setSubscribers]=useState<Subscriber[]>([]);
 const [slides,setSlides]=useState<Slide[]>([]);
 const [loading,setLoading]=useState(true);
 const [refreshing,setRefreshing]=useState(false);
 const [error,setError]=useState("");
 const [lastUpdated,setLastUpdated]=useState<Date|null>(null);

 const load=useCallback(async()=>{
  setRefreshing(true);setError("");
  const results=await Promise.allSettled([
   graphqlRequest<{ordersList:Order[]}>("query DashboardOrders{ordersList{ id orderNumber customerName customerPhone status paymentStatus total amountPaid createdAt items{productName quantity} }}"),
   graphqlRequest<{products:Product[]}>("query DashboardProducts{products{ id name conditions{stock isAvailable price salePrice} }}"),
   graphqlRequest<{services:Service[]}>("query DashboardServices{services{ id title isActive }}"),
   graphqlRequest<{contactSubmissions:Contact[]}>("query DashboardContacts{contactSubmissions{ id name service status createdAt }}"),
   graphqlRequest<{trainingEnquiries:Training[]}>("query DashboardTraining{trainingEnquiries{ id fullName course status createdAt }}"),
   graphqlRequest<{newsletterSubscriptions:Subscriber[]}>("query DashboardNewsletter{newsletterSubscriptions{ id email status subscribedAt }}"),
   graphqlRequest<{homepageSlides:Slide[]}>("query DashboardSlides{homepageSlides{ id title isActive sortOrder }}"),
  ]);
  const failures:string[]=[];
  if(results[0].status==="fulfilled")setOrders(results[0].value.ordersList);else failures.push("orders");
  if(results[1].status==="fulfilled")setProducts(results[1].value.products);else failures.push("products");
  if(results[2].status==="fulfilled")setServices(results[2].value.services);else failures.push("services");
  if(results[3].status==="fulfilled")setContacts(results[3].value.contactSubmissions);else failures.push("contact submissions");
  if(results[4].status==="fulfilled")setTraining(results[4].value.trainingEnquiries);else failures.push("training enquiries");
  if(results[5].status==="fulfilled")setSubscribers(results[5].value.newsletterSubscriptions);else failures.push("newsletter subscribers");
  if(results[6].status==="fulfilled")setSlides(results[6].value.homepageSlides);else failures.push("homepage slides");
  if(failures.length)setError("Some dashboard data could not be loaded: "+failures.join(", ")+". Check the API connection and your admin permissions.");
  setLastUpdated(new Date());setLoading(false);setRefreshing(false);
 },[]);
 useEffect(()=>{void load()},[load]);

 const activeOrders=orders.filter(o=>!["COMPLETED","CANCELLED"].includes(o.status));
 const unpaidOrders=orders.filter(o=>!["PAID","REFUNDED"].includes(o.paymentStatus)&&o.status!=="CANCELLED");
 const revenue=orders.filter(o=>o.status!=="CANCELLED").reduce((sum,o)=>sum+(o.amountPaid||0),0);
 const pendingContacts=contacts.filter(x=>x.status==="NEW"||x.status==="IN_PROGRESS");
 const pendingTraining=training.filter(x=>x.status==="NEW"||x.status==="IN_PROGRESS");
 const lowStock=products.filter(p=>p.conditions.reduce((n,c)=>n+(c.stock||0),0)<=3);
 const totalStock=products.reduce((n,p)=>n+p.conditions.reduce((m,c)=>m+(c.stock||0),0),0);
 const activeSubscribers=subscribers.filter(s=>s.status==="ACTIVE").length;
 const monthData=useMemo(()=>{
  const now=new Date();
  return Array.from({length:6},(_,i)=>{
   const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);
   const amount=orders.filter(o=>{const created=new Date(o.createdAt);return created.getFullYear()===d.getFullYear()&&created.getMonth()===d.getMonth()&&o.status!=="CANCELLED"}).reduce((n,o)=>n+(o.amountPaid||0),0);
   return {label:d.toLocaleDateString("en-UG",{month:"short"}),amount};
  });
 },[orders]);
 const maxMonth=Math.max(1,...monthData.map(m=>m.amount));
 const activity=useMemo(()=>[
  ...orders.map(o=>({id:"o"+o.id,kind:"Order",title:o.orderNumber+" · "+o.customerName,detail:(o.items||[]).reduce((n,i)=>n+i.quantity,0)+" item(s) · "+money(o.total),status:o.status,createdAt:o.createdAt,href:"/admin/orders"})),
  ...contacts.map(c=>({id:"c"+c.id,kind:"Contact",title:c.name,detail:c.service||"General enquiry",status:c.status,createdAt:c.createdAt,href:"/admin/contact-submissions"})),
  ...training.map(t=>({id:"t"+t.id,kind:"Training",title:t.fullName,detail:t.course,status:t.status,createdAt:t.createdAt,href:"/admin/training-enquiries"})),
  ...subscribers.map(s=>({id:"n"+s.id,kind:"Newsletter",title:s.email,detail:"Newsletter subscription",status:s.status,createdAt:s.subscribedAt,href:"/admin/newsletter"})),
 ].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,8),[orders,contacts,training,subscribers]);

 return <AdminPageShell active="Overview" title="Business overview" subtitle="A live snapshot of your shop, orders, customer enquiries and website operations.">
  <section className="dash-welcome">
   <div><span className="dash-kicker"><Activity size={14}/> LIVE BUSINESS WORKSPACE</span><h2>Your business, <em>at a glance.</em></h2><p>Monitor sales, keep on top of customer requests and spot inventory that needs attention.</p><small>{lastUpdated?"Last synced "+lastUpdated.toLocaleTimeString("en-UG",{hour:"2-digit",minute:"2-digit"}):"Connecting to your database…"}</small></div>
   <button className="dash-refresh" onClick={()=>void load()} disabled={refreshing}><RefreshCw size={16} className={refreshing?"dash-spin":""}/>{refreshing?"Refreshing…":"Refresh data"}</button>
  </section>
  {error&&<div className="dash-error"><AlertCircle size={17}/><span>{error}</span></div>}
  <section className="dash-kpis">
   <article><span className="dash-kpi-icon violet"><Wallet/></span><div><small>Payments received</small><b>{loading?"—":money(revenue)}</b><em>Recorded against orders</em></div></article>
   <article><span className="dash-kpi-icon blue"><ShoppingCart/></span><div><small>Total shop orders</small><b>{loading?"—":orders.length}</b><em>{activeOrders.length} still being processed</em></div></article>
   <article><span className="dash-kpi-icon amber"><Package/></span><div><small>Products in catalogue</small><b>{loading?"—":products.length}</b><em>{totalStock.toLocaleString()} units in recorded stock</em></div></article>
   <article><span className="dash-kpi-icon green"><Users/></span><div><small>Customer requests</small><b>{loading?"—":pendingContacts.length+pendingTraining.length}</b><em>{pendingContacts.length} contact · {pendingTraining.length} training</em></div></article>
  </section>
  <section className="dash-grid">
   <article className="ad-panel dash-revenue">
    <div className="ad-panel-head"><div><h2>Payments received</h2><p>Actual order payments recorded in the database · last 6 months</p></div><span className="ad-pill">UGX</span></div>
    <div className="dash-chart">{monthData.map(m=><div className="dash-chart-col" key={m.label}><b>{m.amount?money(m.amount):"—"}</b><i><span style={{height:Math.max(m.amount?5:0,(m.amount/maxMonth)*100)+"%"}}/></i><small>{m.label}</small></div>)}</div>
    <div className="dash-chart-foot"><span><i/> Amount received</span><b>{money(revenue)} total recorded</b></div>
   </article>
   <article className="ad-panel dash-attention">
    <div className="ad-panel-head"><div><h2>Needs your attention</h2><p>Items that may need follow-up</p></div><Bell size={18}/></div>
    <Link href="/admin/orders" className="dash-attention-row"><span className="dash-attention-icon amber"><Wallet/></span><span><b>{unpaidOrders.length} orders</b><small>Awaiting full payment</small></span><ArrowRight/></Link>
    <Link href="/admin/contact-submissions" className="dash-attention-row"><span className="dash-attention-icon blue"><Mail/></span><span><b>{pendingContacts.length} contact enquiries</b><small>New or in progress</small></span><ArrowRight/></Link>
    <Link href="/admin/training-enquiries" className="dash-attention-row"><span className="dash-attention-icon violet"><GraduationCap/></span><span><b>{pendingTraining.length} training requests</b><small>New or in progress</small></span><ArrowRight/></Link>
    <Link href="/admin/products" className="dash-attention-row"><span className="dash-attention-icon red"><AlertCircle/></span><span><b>{lowStock.length} low-stock products</b><small>Three units or fewer across conditions</small></span><ArrowRight/></Link>
   </article>
  </section>
  <section className="dash-grid dash-lower">
   <article className="ad-panel dash-activity">
    <div className="ad-panel-head"><div><h2>Recent business activity</h2><p>Latest orders and customer interactions from your database</p></div><Clock3 size={18}/></div>
    {loading?<div className="dash-empty">Loading recent activity…</div>:activity.length===0?<div className="dash-empty">No orders or enquiries have been recorded yet.</div>:<div className="dash-activity-list">{activity.map(item=><Link href={item.href} key={item.id} className="dash-activity-item"><span className={"dash-activity-dot "+item.kind.toLowerCase()}/><span className="dash-activity-copy"><b>{item.title}</b><small>{item.kind} · {item.detail}</small></span><span className="dash-activity-meta"><b>{statusLabel(item.status)}</b><small>{date(item.createdAt)}</small></span><ArrowRight size={15}/></Link>)}</div>}
    <Link href="/admin/orders" className="dash-view-all">Open order management <ArrowRight size={15}/></Link>
   </article>
   <article className="ad-panel dash-operations">
    <div className="ad-panel-head"><div><h2>Website & store health</h2><p>Live counts from managed sections</p></div><CheckCircle2 size={18}/></div>
    <div className="dash-health-row"><span><BriefcaseBusiness/> Services visible</span><b>{services.filter(s=>s.isActive).length} / {services.length}</b></div>
    <div className="dash-health-row"><span><Activity/> Homepage slides active</span><b>{slides.filter(s=>s.isActive).length} / {slides.length}</b></div>
    <div className="dash-health-row"><span><Mail/> Active newsletter subscribers</span><b>{activeSubscribers}</b></div>
    <div className="dash-health-row"><span><Package/> Total stock units</span><b>{totalStock.toLocaleString()}</b></div>
    <div className="dash-health-row"><span><ShoppingCart/> Orders completed</span><b>{orders.filter(o=>o.status==="COMPLETED").length}</b></div>
    <div className="dash-shortcuts"><Link href="/admin/products">Manage products <ArrowUpRight/></Link><Link href="/admin/homepage-carousel">Edit homepage carousel <ArrowUpRight/></Link><Link href="/admin/services">Manage services <ArrowUpRight/></Link></div>
   </article>
  </section>
  <section className="dash-quicklinks"><div><h2>Quick actions</h2><p>Jump straight into common admin tasks.</p></div><Link href="/admin/products"> <Package/> Add / manage products <ArrowRight/></Link><Link href="/admin/orders"><ShoppingCart/> Review orders <ArrowRight/></Link><Link href="/admin/homepage-carousel"><Activity/> Update homepage <ArrowRight/></Link><Link href="/admin/training-enquiries"><GraduationCap/> Follow up training <ArrowRight/></Link></section>
 </AdminPageShell>;
}

"use client";
import {use, useEffect, useMemo, useState} from "react";
import {ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Heart, MessageCircle, Minus, PackageCheck, Plus, Share2, ShieldCheck, ShoppingCart, Truck} from "lucide-react";
import {SiteHeader, SiteFooter} from "../../site-chrome";
import NewsletterSignup from "../../newsletter";
import {PRODUCTS} from "../shop-products";

const money=(n:number)=>"UGX "+n.toLocaleString("en-UG");
const WHATSAPP="256705187025";
const CART_KEY="abdul-ict-shop-cart-v1";
type CartLine={id:string;quantity:number};
export default function ProductDetailsPage({params}:{params:Promise<{id:string}>}){
 const {id}=use(params); const product=PRODUCTS.find(p=>p.id===id); const [active,setActive]=useState(0); const [shareMessage,setShareMessage]=useState(""); const [cart,setCart]=useState<CartLine[]>([]); const [cartReady,setCartReady]=useState(false);
 useEffect(()=>{
  try {
   const saved=localStorage.getItem(CART_KEY);
   if(saved){
    const rows=JSON.parse(saved);
    if(Array.isArray(rows)) setCart(rows.filter((line:any)=>line&&typeof line.id==="string"&&Number.isInteger(line.quantity)&&line.quantity>0&&PRODUCTS.some(p=>p.id===line.id)));
   }
  } catch {}
  setCartReady(true);
  const sync=()=>{
   try {
    const rows=JSON.parse(localStorage.getItem(CART_KEY)||"[]");
    if(Array.isArray(rows)) setCart(rows.filter((line:any)=>line&&typeof line.id==="string"&&Number.isInteger(line.quantity)&&line.quantity>0&&PRODUCTS.some(p=>p.id===line.id)));
   } catch {}
  };
  window.addEventListener("storage",sync);
  return ()=>window.removeEventListener("storage",sync);
 },[]);
 useEffect(()=>{
  if(cartReady){
   localStorage.setItem(CART_KEY,JSON.stringify(cart));
   window.dispatchEvent(new Event("abdul-cart-updated"));
  }
 },[cart,cartReady]);
 const productQuantity=cart.find(line=>line.id===id)?.quantity||0;
 const addToCart=()=>setCart(old=>{
  const found=old.find(line=>line.id===id);
  return found?old.map(line=>line.id===id?{...line,quantity:line.quantity+1}:line):[...old,{id,quantity:1}];
 });
 const changeQuantity=(delta:number)=>setCart(old=>old.map(line=>line.id===id?{...line,quantity:line.quantity+delta}:line).filter(line=>line.quantity>0));
 const related=useMemo(()=>product?PRODUCTS.filter(p=>p.id!==product.id&&p.category===product.category).concat(PRODUCTS.filter(p=>p.id!==product.id&&p.category!==product.category)).slice(0,4):[],[product]);
 if(!product)return <main className="product-detail-page"><SiteHeader/><div className="container product-not-found"><span>PRODUCT NOT FOUND</span><h1>Let’s find something you’ll love.</h1><p>This product may have moved or is no longer listed.</p><a className="btn primary" href="/shop">Back to the shop <ArrowLeft/></a></div><SiteFooter/></main>;
 const gallery=[{label:"Product view",style:""},{label:"Closer look",style:"zoom"},{label:"Product preview",style:"soft"}];
 const orderUrl="https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent("Hello Abdul ICT & Electrical Solutions, I would like to order/enquire about:\n"+product.name+"\nListed price: "+money(product.price)+"\nPlease confirm current availability, exact specifications and delivery/pickup options.");
 const share=async()=>{const url=window.location.href;try{if(navigator.share){await navigator.share({title:product.name,text:"Check out "+product.name+" at Abdul ICT & Electrical Solutions",url});setShareMessage("Thanks for sharing!")}else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setShareMessage("Product link copied to clipboard.")}else{window.prompt("Copy this product link",url);setShareMessage("Copy the link to share this product.")}}catch(error){if(error instanceof Error&&error.name!=="AbortError")setShareMessage("Could not open sharing. Copy the page link from your browser.")}window.setTimeout(()=>setShareMessage(""),3500)};
 return <main className="product-detail-page"><SiteHeader/><div className="product-detail-ambient"><div className="container"><div className="product-breadcrumb"><a href="/">Home</a><ChevronRight/><a href="/shop">Shop</a><ChevronRight/><span>{product.name}</span></div><a className="product-back-link" href="/shop"><ArrowLeft/> Back to all products</a>
 <section className="product-detail-layout"><div className="product-gallery"><div className="product-gallery-main"><span className="product-gallery-label"><span/> {product.tag||"Selected for you"}</span><div className={"product-gallery-art "+gallery[active].style}><img src={product.image} alt={product.name}/></div><button className="product-gallery-arrow prev" aria-label="Previous product image" onClick={()=>setActive(v=>(v+gallery.length-1)%gallery.length)}><ChevronLeft/></button><button className="product-gallery-arrow next" aria-label="Next product image" onClick={()=>setActive(v=>(v+1)%gallery.length)}><ChevronRight/></button><span className="product-gallery-count">{active+1} / {gallery.length}</span></div><div className="product-gallery-thumbs">{gallery.map((item,i)=><button key={item.label} className={active===i?"active":""} onClick={()=>setActive(i)} aria-label={"Show "+item.label}><span className={"product-thumb-art "+item.style}><img src={product.image} alt=""/></span><small>{item.label}</small></button>)}</div><div className="product-gallery-caption"><ShieldCheck/><span>Need a closer look? <b>Ask us for current product photos and specifications.</b></span></div></div>
 <div className="product-detail-copy"><div className="product-detail-kicker"><span>{product.category}</span><span className="product-availability"><i/> Availability confirmed on enquiry</span></div><h1>{product.name}</h1><p className="product-detail-short">{product.description}</p><div className="product-detail-price-row"><div><span className="product-detail-price">{money(product.price)}</span><small>Indicative price · confirm before payment</small></div>{product.tag?.includes("OFF")&&<span className="product-detail-deal">{product.tag}</span>}</div><div className="product-detail-rule"/><p className="product-detail-about">{product.about}</p><div className="product-detail-points">{product.details.map(d=><span key={d}><Check/>{d}</span>)}</div><div className="product-detail-cart-row">{productQuantity>0?<div className="product-quantity-control" aria-label={"Quantity of "+product.name}><button type="button" aria-label="Decrease quantity" onClick={()=>changeQuantity(-1)}><Minus/></button><span>{productQuantity}</span><button type="button" aria-label="Increase quantity" onClick={()=>changeQuantity(1)}><Plus/></button></div>:<button type="button" className="product-add-to-cart" onClick={addToCart} disabled={!cartReady}><ShoppingCart/> Add to cart</button>}<span className="product-cart-hint">{productQuantity>0?"Added to your cart":"Add this item to your shopping cart"}</span></div><div className="product-detail-actions"><a className="product-order-button" href={orderUrl} target="_blank" rel="noreferrer"><MessageCircle/> Call to order on WhatsApp <ArrowRight/></a><button className="product-share-button" onClick={share}><Share2/> Share product</button>{shareMessage&&<p className="product-share-message" role="status">{shareMessage}</p>}</div><div className="product-assurance"><div><span><Truck/></span><p><b>Pickup & delivery</b><small>Ask us about available options</small></p></div><div><span><PackageCheck/></span><p><b>Before you pay</b><small>Confirm price and availability</small></p></div><div><span><Heart/></span><p><b>Friendly support</b><small>We’ll help with your questions</small></p></div></div><div className="product-contact-strip"><span>Have a question about this item?</span><a href={"https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent("Hello, I have a question about "+product.name+".")} target="_blank" rel="noreferrer">Chat with our team <ArrowRight/></a></div></div></section></div></div>
 <section className="product-related-section"><div className="container"><div className="product-related-heading"><div><span className="shop-eyebrow"><span/> YOU MAY ALSO LIKE</span><h2>More to explore</h2><p>Related picks and everyday essentials from our shop.</p></div><a href="/shop">Explore all products <ArrowRight/></a></div><div className="product-related-grid">{related.map(p=><article className="product-related-card" key={p.id}><a className="product-related-image" href={"/shop/"+p.id}><img src={p.image} alt={p.name}/>{p.tag&&<span>{p.tag}</span>}</a><div className="product-related-info"><small>{p.category}</small><a href={"/shop/"+p.id}><h3>{p.name}</h3></a><p>{p.description}</p><div><b>{money(p.price)}</b><a href={"/shop/"+p.id} aria-label={"View "+p.name}><ArrowRight/></a></div></div></article>)}</div></div></section><section className="product-detail-bottom-cta"><div className="container"><div><span>PERSONAL HELP, JUST A MESSAGE AWAY</span><h2>Not sure which one is right for you?</h2><p>Tell us what you need. We’ll help you check compatibility and availability.</p></div><a href={"https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent("Hello Abdul ICT & Electrical Solutions, please help me choose a product.")} target="_blank" rel="noreferrer"><MessageCircle/> Talk to our team <ArrowRight/></a></div></section><NewsletterSignup/><SiteFooter/></main>
}

"use client";

import {FormEvent,useState} from "react";
import {ArrowRight,CheckCircle2,Mail,Sparkles,Tag} from "lucide-react";
import { graphqlRequest } from "@/lib/graphql";

export default function NewsletterSignup(){
  const [submitted,setSubmitted]=useState(false);
  function subscribe(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const email=String(new FormData(form).get("email")||"").trim();
    const subject=encodeURIComponent("Newsletter subscription request");
    const body=encodeURIComponent("Please add me to the Abdul ICT & Electrical Solutions newsletter.\n\nMy email address: "+email+"\n\nI would like to receive updates about new products, offers and discounts.");
    window.location.href="mailto:abdulictelectricalsolutions@gmail.com?subject="+subject+"&body="+body;
    setSubmitted(true);
  }
  return <section className="newsletter-section" aria-labelledby="newsletter-title"><div className="container"><div className="newsletter-card"><div className="newsletter-decoration newsletter-decoration-one"></div><div className="newsletter-decoration newsletter-decoration-two"></div><div className="newsletter-copy"><span className="newsletter-eyebrow"><Sparkles/> THE INSIDE UPDATE</span><h2 id="newsletter-title">Good deals deserve to find <em>you.</em></h2><p>Be first to hear about fresh arrivals, exclusive offers, special discounts and helpful tech updates from Abdul ICT.</p><div className="newsletter-perks"><span><CheckCircle2/> New product alerts</span><span><Tag/> Offers & discounts</span></div></div><div className="newsletter-form-panel"><div className="newsletter-mail-icon"><Mail/></div><h3>Join our newsletter</h3><p>Useful updates, straight to your inbox.</p><form className="newsletter-form" onSubmit={subscribe}><label className="newsletter-sr-only" htmlFor="newsletter-email">Your email address</label><input id="newsletter-email" type="email" name="email" placeholder="Enter your email address" autoComplete="email" required/><button type="submit" aria-label="Subscribe to newsletter" disabled={submitting}>{submitting?"Saving…":"Subscribe"} <ArrowRight/></button></form><small className="newsletter-privacy">No spam — just products, offers and updates.</small>{error&&<p className="newsletter-notice" role="alert">{error}</p>}{submitted&&<p className="newsletter-notice" role="status"><CheckCircle2/> You’re subscribed! Your email has been saved successfully.</p>}</div></div></div></section>;
}

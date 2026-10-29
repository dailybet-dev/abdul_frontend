"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Camera, GraduationCap, Headphones, Monitor, Phone, Smartphone, Wrench, Zap } from "lucide-react";
import { graphqlRequest } from "@/lib/graphql";

type Service = {
  id: string; title: string; slug: string; description: string; imageUrl: string;
  icon: string; whatsappMessage: string; sortOrder: number; isActive: boolean;
};
const iconMap: Record<string, typeof Wrench> = {
  Camera, GraduationCap, Headphones, Monitor, Smartphone, Wrench, Zap,
};

export default function ServiceCards() {
  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => {
    let active = true;
    graphqlRequest<{ services: Service[] }>(
      `query PublicServices { services(activeOnly: true) { id title slug description imageUrl icon whatsappMessage sortOrder isActive } }`,
    ).then(data => { if (active) setServices(data.services); })
      .catch(() => { if (active) setServices([]); });
    return () => { active = false; };
  }, []);

  return <div className="our-services-grid">{services.map((service, index) => {
    const Icon = iconMap[service.icon] || Wrench;
    const detailsUrl = "/services/" + service.slug;
    return <article className="our-service-card our-service-card-clickable" key={service.id} role="link" tabIndex={0} aria-label={"View details for " + service.title} onClick={() => { window.location.href = detailsUrl; }} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); window.location.href = detailsUrl; } }}>
      <div className="our-service-image"><span className="our-service-number">{String(index + 1).padStart(2, "0")}</span><img src={service.imageUrl} alt={service.title} loading="lazy"/></div>
      <div className="our-service-card-content"><span className="our-service-icon"><Icon/></span><h3>{service.title}</h3><p>{service.description}</p>
        <div className="service-card-contact-actions">
          <a href={"https://wa.me/256705187025?text=" + encodeURIComponent(service.whatsappMessage || ("Hello Abdul ICT & Electrical Solutions, I would like to enquire about " + service.title + ". Please share more details."))} target="_blank" rel="noreferrer" aria-label={"WhatsApp about " + service.title} title="WhatsApp" onClick={event => event.stopPropagation()}><svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16 .8C7.7.8 1 7.5 1 15.8c0 2.7.7 5.3 2.1 7.6L.9 31.2l8-2.1a15 15 0 0 0 7.1 1.8h.1c8.3 0 15-6.7 15-15S24.3.8 16 .8Zm0 27.4h-.1a12.4 12.4 0 0 1-6.3-1.7l-.5-.3-4.7 1.2 1.3-4.6-.3-.5a12.3 12.3 0 1 1 10.6 5.9Zm6.8-9.2c-.4-.2-2.1-1-2.5-1.1-.3-.1-.6-.2-.8.2-.2.4-.9 1.1-1.1 1.4-.2.2-.4.3-.8.1-.4-.2-1.5-.6-2.9-1.8-1.1-1-1.8-2.1-2-2.5-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.4-.6.1-.2.1-.4 0-.6-.1-.2-.8-2-1.1-2.7-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5.1.8.4 1.4.6 1.9.7.8.3 1.5.2 2.1.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7-.1-.1-.4-.2-.8-.4Z"/></svg></a>
          <a href="tel:+256705187025" aria-label={"Call about " + service.title} title="Call us" onClick={event => event.stopPropagation()}><Phone/></a>
          <a className="service-card-details" href={detailsUrl} aria-label={"View details for " + service.title} onClick={event => event.stopPropagation()}><ArrowRight/></a>
        </div>
      </div>
    </article>;
  })}</div>;
}

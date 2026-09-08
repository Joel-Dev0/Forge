"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Package, Shield, Cpu } from "lucide-react";

export default function Products() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const ctx = gsap.context(() => {
      gsap.fromTo(".product-header",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.2, ease: "power2.out" }
      );

      gsap.fromTo(".product-card",
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, stagger: 0.2, delay: 0.4, ease: "back.out(1.5)" }
      );
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  const products = [
    {
      name: "Forge Browser",
      customIcon: (
        <img
          src="/logo.png"
          alt="Forge Browser"
          className="w-12 h-12 rounded-xl object-contain shadow-md"
        />
      ),
      desc: "The browser for developers. Raw socket HTTP engine, live network interception, and full CDP body inspection.",
      href: "/downloads",
    },
    { name: "Forge Core", icon: <Cpu className="w-10 h-10 text-primary" />, desc: "The foundational engine for your development workflow." },
    { name: "Forge Shield", icon: <Shield className="w-10 h-10 text-accent" />, desc: "Enterprise-grade security and vulnerability scanning." },
    { name: "Forge Hub", icon: <Package className="w-10 h-10 text-primary" />, desc: "Centralized package management and distribution." },
  ];

  return (
    <div ref={containerRef} className="min-h-screen py-20 px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h1 className="product-header text-4xl md:text-6xl font-bold mb-6">Our Products</h1>
          <p className="product-header text-xl text-foreground/70 max-w-2xl mx-auto">
            Discover the tools that will redefine how you build, deploy, and scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.map((product, i) => (
            <div key={i} className="product-card p-8 rounded-3xl bg-surface-1 border border-surface-2 hover:border-primary transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -mr-10 -mt-10 group-hover:bg-primary/20 transition-all" />
              <div className="mb-8 p-3 bg-background inline-block rounded-2xl group-hover:scale-110 transition-transform">
                {product.customIcon ? product.customIcon : product.icon}
              </div>
              <h2 className="text-2xl font-bold mb-4">{product.name}</h2>
              <p className="text-foreground/70 mb-8">{product.desc}</p>
              <a
                href={product.href || "#"}
                className="text-primary font-semibold flex items-center gap-2 group-hover:gap-4 transition-all"
              >
                {product.href ? "Get Started" : "Learn more"} <span>&rarr;</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

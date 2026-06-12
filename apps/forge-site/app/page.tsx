"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";
import { ArrowRight, Download, Terminal, Layers, Zap } from "lucide-react";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const ctx = gsap.context(() => {
      // Hero animations
      gsap.from(".hero-text", {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
      });
      
      gsap.from(".hero-btn", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.6,
        ease: "back.out(1.7)",
      });

      // Features animations
      gsap.from(".feature-card", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        delay: 0.8,
        ease: "power2.out",
      });
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/10 blur-[150px]" />
      </div>

      <div className="max-w-5xl w-full text-center mt-20 md:mt-32">
        <h1 className="hero-text text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Forge Your Next <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Masterpiece.
          </span>
        </h1>
        
        <p className="hero-text text-lg md:text-2xl text-foreground/70 max-w-2xl mx-auto mb-10">
          The ultimate developer experience tailored for focus, speed, and absolute control.
        </p>
        
        {/* Primary CTAs */}
        <div className="hero-btn flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <Link
            href="/products"
            className="px-8 py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(255,107,0,0.4)] flex items-center gap-2"
          >
            Explore Products <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/docs"
            className="px-8 py-4 bg-surface-1 border border-surface-2 text-foreground font-semibold rounded-lg hover:bg-surface-2 transition-all"
          >
            Read the Docs
          </Link>
        </div>

        {/* Secondary CTA — Download */}
        <div className="hero-btn flex items-center justify-center">
          <Link
            href="/downloads"
            id="hero-download-btn"
            className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors group"
          >
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            Download the app for free
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl w-full mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
        {[
          {
            icon: <Terminal className="w-8 h-8 text-primary" />,
            title: "Developer First",
            desc: "Built from the ground up to integrate perfectly with your existing workflow."
          },
          {
            icon: <Zap className="w-8 h-8 text-accent" />,
            title: "Blazing Fast",
            desc: "Optimized performance ensuring you never have to wait on your tools."
          },
          {
            icon: <Layers className="w-8 h-8 text-primary" />,
            title: "Highly Extensible",
            desc: "Customizable to the core. Tailor every aspect to your specific needs."
          }
        ].map((feature, i) => (
          <div key={i} className="feature-card p-8 rounded-2xl bg-surface-1 border border-surface-2 hover:border-primary/50 transition-colors group">
            <div className="bg-background w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-foreground/70">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Download, Monitor, Apple, MonitorSmartphone } from "lucide-react";

export default function Downloads() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const ctx = gsap.context(() => {
      gsap.from(".dl-header", {
        y: -30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power2.out",
      });
      
      gsap.from(".dl-card", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        delay: 0.4,
        ease: "power3.out",
      });
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  const platforms = [
    { name: "Windows", icon: <Monitor className="w-12 h-12" />, arch: "x64 / arm64", version: "v2.4.0" },
    { name: "macOS", icon: <Apple className="w-12 h-12" />, arch: "Intel / Apple Silicon", version: "v2.4.0" },
    { name: "Linux", icon: <MonitorSmartphone className="w-12 h-12" />, arch: "deb / rpm / AppImage", version: "v2.4.0" },
  ];

  return (
    <div ref={containerRef} className="min-h-screen py-20 px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] -z-10" />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <h1 className="dl-header text-5xl md:text-6xl font-bold mb-6">Download Forge</h1>
          <p className="dl-header text-xl text-foreground/70 max-w-2xl mx-auto">
            Get the latest version of Forge for your operating system and start building immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map((os, i) => (
            <div key={i} className="dl-card p-8 rounded-2xl bg-surface-1 border border-surface-2 hover:border-primary/50 transition-all flex flex-col items-center text-center group">
              <div className="mb-6 p-4 bg-background rounded-full group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                {os.icon}
              </div>
              <h2 className="text-2xl font-bold mb-2">{os.name}</h2>
              <p className="text-sm text-foreground/50 mb-6">{os.arch}</p>
              
              <button className="w-full py-3 bg-primary/10 text-primary hover:bg-primary hover:text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download {os.version}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

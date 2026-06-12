"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Book, FileCode, Search } from "lucide-react";

export default function Documentation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const ctx = gsap.context(() => {
      gsap.fromTo(".doc-sidebar",
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
      );

      gsap.fromTo(".doc-content",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.3, ease: "power2.out" }
      );
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row gap-12">
      {/* Sidebar */}
      <div className="doc-sidebar w-full md:w-64 flex-shrink-0">
        <div className="sticky top-24">
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input 
              type="text" 
              placeholder="Search docs..." 
              className="w-full pl-10 pr-4 py-2 bg-surface-1 border border-surface-2 rounded-lg focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-3 text-foreground/80">Getting Started</h3>
              <ul className="space-y-2 text-foreground/60">
                <li className="text-primary font-medium cursor-pointer">Introduction</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">Installation</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">Quick Start</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3 text-foreground/80">Core Concepts</h3>
              <ul className="space-y-2 text-foreground/60">
                <li className="hover:text-foreground cursor-pointer transition-colors">Architecture</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">Configuration</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">Plugins</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="doc-content flex-1">
        <div className="mb-8 flex items-center gap-3 text-primary">
          <Book className="w-8 h-8" />
          <h1 className="text-4xl font-bold text-foreground">Introduction</h1>
        </div>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-xl text-foreground/70 mb-8 leading-relaxed">
            Welcome to the Forge documentation. This comprehensive guide will help you understand
            how to leverage our tools to build incredible software faster than ever before.
          </p>
          
          <h2 className="text-2xl font-semibold mt-12 mb-4 border-b border-surface-2 pb-2">What is Forge?</h2>
          <p className="text-foreground/70 mb-6 leading-relaxed">
            Forge is a suite of development tools designed from the ground up to provide the best possible developer experience. 
            We focus on speed, reliability, and extensibility.
          </p>
          
          <div className="bg-surface-1 border border-surface-2 p-6 rounded-xl my-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <div className="flex items-start gap-4">
              <FileCode className="w-6 h-6 text-primary mt-1" />
              <div>
                <h4 className="font-bold mb-2">Pro Tip</h4>
                <p className="text-foreground/70 text-sm">
                  You can use our CLI to instantly scaffold new projects. Try running <code>forge init</code> in your terminal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

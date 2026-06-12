"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Milestone, CheckCircle2, CircleDashed } from "lucide-react";

export default function Roadmap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const ctx = gsap.context(() => {
      gsap.from(".roadmap-header", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
      });
      
      gsap.from(".timeline-item", {
        x: -50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        delay: 0.4,
        ease: "power3.out",
      });
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  const roadmapItems = [
    {
      quarter: "Q3 2026",
      title: "Forge Core 3.0",
      desc: "Complete rewrite of the core engine in Rust for 10x performance gains.",
      status: "completed",
    },
    {
      quarter: "Q4 2026",
      title: "AI Integrations",
      desc: "Seamless integration with local and cloud LLMs for code generation and review.",
      status: "in-progress",
    },
    {
      quarter: "Q1 2027",
      title: "Cloud Sync",
      desc: "Real-time collaboration and workspace synchronization across all your devices.",
      status: "planned",
    },
    {
      quarter: "Q2 2027",
      title: "Plugin Marketplace",
      desc: "Official marketplace for community-driven extensions and themes.",
      status: "planned",
    }
  ];

  return (
    <div ref={containerRef} className="min-h-screen py-20 px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-20">
          <Milestone className="roadmap-header w-16 h-16 text-accent mx-auto mb-6" />
          <h1 className="roadmap-header text-5xl md:text-6xl font-bold mb-6">Our Roadmap</h1>
          <p className="roadmap-header text-xl text-foreground/70 max-w-2xl mx-auto">
            A transparent look into the future of Forge. See what we're building next.
          </p>
        </div>

        <div className="relative border-l-2 border-surface-2 ml-4 md:ml-0 md:pl-8 space-y-12">
          {roadmapItems.map((item, i) => (
            <div key={i} className="timeline-item relative pl-8 md:pl-0">
              {/* Timeline dot */}
              <div className="absolute -left-[41px] md:-left-[41px] top-1 bg-background p-1 rounded-full">
                {item.status === "completed" ? (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                ) : item.status === "in-progress" ? (
                  <CircleDashed className="w-6 h-6 text-accent animate-spin" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-surface-2" />
                )}
              </div>

              <div className="bg-surface-1 border border-surface-2 p-6 rounded-xl hover:border-primary/30 transition-colors">
                <span className="text-sm font-bold text-accent tracking-wider uppercase mb-2 block">
                  {item.quarter}
                </span>
                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                <p className="text-foreground/70">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

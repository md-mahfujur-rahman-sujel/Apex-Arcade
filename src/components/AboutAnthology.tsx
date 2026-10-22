import React from 'react';
import { Layers, ShieldCheck, Cpu, Code2 } from 'lucide-react';
import { Card } from './ui/Card';

export const AboutAnthology: React.FC = () => {
  return (
    <section id="about" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-line">
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-accent uppercase tracking-wider mb-2">
          <Code2 className="w-4 h-4" />
          <span>Architectural Philosophy</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-fg tracking-tight">
          100% Client-Side Web Engineering
        </h2>
        <p className="text-sm text-fg-muted mt-2 leading-relaxed">
          How modern frontend technologies render 2D games with distinct 3D visual perspective without requiring backend servers, commercial emulators, or heavy assets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="w-10 h-10 rounded-xl bg-accent-soft border border-accent/30 flex items-center justify-center text-accent mb-4">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-fg mb-2">
            Isometric &amp; 2.5D Projections
          </h3>
          <p className="text-xs text-fg-muted leading-relaxed">
            By transforming 2D game grids through affine matrix transformations, variable z-depth layers, and directional light shading on canvas polygon faces, games gain authentic physical volume while preserving 2D game mechanics.
          </p>
        </Card>

        <Card className="p-6">
          <div className="w-10 h-10 rounded-xl bg-accent-soft border border-line-strong flex items-center justify-center text-accent mb-4">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-fg mb-2">
            Static Hosting &amp; Instant Loading
          </h3>
          <p className="text-xs text-fg-muted leading-relaxed">
            Every component, particle system, and mathematical engine runs completely in-browser. This enables instant deployment to free static platforms like GitHub Pages, Vercel, or Netlify with zero hosting costs or cold start penalties.
          </p>
        </Card>

        <Card className="p-6">
          <div className="w-10 h-10 rounded-xl bg-accent-soft border border-accent/30 flex items-center justify-center text-accent mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-fg mb-2">
            Zero External Asset Failures
          </h3>
          <p className="text-xs text-fg-muted leading-relaxed">
            Audio effects are procedurally generated on the fly via the Web Audio API, and visuals are computed through HTML5 2D Canvas loops, guaranteeing that game assets will never fail, buffer, or return 404 network errors.
          </p>
        </Card>
      </div>
    </section>
  );
};

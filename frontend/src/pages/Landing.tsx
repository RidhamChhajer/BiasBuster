import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brain, Shield, Zap } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-4xl w-full space-y-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 glass-card rounded-2xl">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold gradient-text">
              BiasBuster
            </h1>
          </div>
          
          <p className="text-2xl md:text-3xl text-foreground/80 font-medium max-w-2xl mx-auto">
            Detect and fix bias in your AI models and datasets with ease
          </p>
          
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Advanced AI-powered analysis to ensure fairness and eliminate bias from your machine learning systems
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="glass-card rounded-2xl p-6 space-y-3 hover:shadow-[0_20px_40px_-12px_rgba(139,92,246,0.2)] transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Bias Detection</h3>
            <p className="text-muted-foreground">
              Identify hidden biases in your datasets and model predictions
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3 hover:shadow-[0_20px_40px_-12px_rgba(139,92,246,0.2)] transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">AI-Powered</h3>
            <p className="text-muted-foreground">
              Leverage advanced AI to analyze and provide actionable insights
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3 hover:shadow-[0_20px_40px_-12px_rgba(139,92,246,0.2)] transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Quick Fixes</h3>
            <p className="text-muted-foreground">
              Get detailed recommendations to eliminate bias effectively
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            className="text-lg px-8 py-6 rounded-xl font-semibold shadow-[0_8px_32px_-8px_rgba(139,92,246,0.3)] hover:shadow-[0_12px_40px_-8px_rgba(139,92,246,0.4)] transition-all duration-300"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing;

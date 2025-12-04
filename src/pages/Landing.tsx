import { useState, useEffect } from "react";
import { ArrowRight, Sparkles, FileText, Brain, Target, TrendingUp, Users, Zap, Shield, BarChart3, Clock, Menu, X, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const stats = [
    { value: "70%", label: "Time Saved", icon: Clock },
    { value: "3x", label: "Win Rate Increase", icon: TrendingUp },
    { value: "500+", label: "Active Users", icon: Users },
    { value: "98%", label: "Accuracy Rate", icon: Shield },
  ];

  const features = [
    {
      icon: Brain,
      title: "AI-Powered RFP Analysis",
      description: "Automatically extract key insights, requirements, and challenges from any RFP document with advanced AI.",
      color: "from-blue-500/20 to-purple-500/20",
    },
    {
      icon: Target,
      title: "Smart Discovery Questions",
      description: "Generate tailored questionnaires to understand client needs and pain points intelligently.",
      color: "from-purple-500/20 to-pink-500/20",
    },
    {
      icon: FileText,
      title: "Dynamic Proposal Builder",
      description: "Create winning proposals with AI-suggested content and case studies that resonate.",
      color: "from-pink-500/20 to-red-500/20",
    },
    {
      icon: TrendingUp,
      title: "Value Proposition Generation",
      description: "Craft compelling value propositions aligned with client business objectives automatically.",
      color: "from-green-500/20 to-blue-500/20",
    },
    {
      icon: Zap,
      title: "Real-time Collaboration",
      description: "Work seamlessly with your team on proposals with live updates and version control.",
      color: "from-yellow-500/20 to-orange-500/20",
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Track proposal performance and get actionable insights to improve your win rate.",
      color: "from-indigo-500/20 to-purple-500/20",
    },
  ];


  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-1/2 -right-4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className={`sticky top-0 z-50 border-b border-border/40 glass-effect shadow-sm transition-all duration-300 ${scrollY > 50 ? 'bg-background/95 backdrop-blur-md' : 'bg-background/80'}`}>
        <div className="mx-auto flex h-16 max-w-[1388px] items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-md hover:shadow-lg transition-shadow duration-200">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                NovaIntel
              </h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">AI Proposal Platform</p>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button variant="gradient" size="sm">Get Started</Button>
            </Link>
          </div>
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-sm font-medium text-muted-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <Link to="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Login</Button>
              </Link>
              <Link to="/register" className="block" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="gradient" className="w-full">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="mx-auto max-w-[1388px] px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="flex flex-col justify-center space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm hover:scale-105 transition-transform cursor-default">
                <Sparkles className="h-4 w-4 animate-pulse" />
                AI-Powered Presales Intelligence
              </div>
              <h1 className="font-heading text-5xl font-bold leading-tight tracking-tight lg:text-7xl">
                Accelerate Your Presales Process with{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent animate-gradient">AI</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                NovaIntel automates RFP analysis, discovery questions, insights generation, case study mapping, and
                proposal creation—saving you time and winning more deals.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <Button size="lg" className="bg-gradient-primary shadow-lg hover:shadow-xl hover:scale-105 transition-all text-base px-8">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-base px-8 hover:scale-105 transition-all">
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="relative animate-slide-up">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-2xl opacity-20 animate-pulse"></div>
                <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-primary/20">
                  <img src={heroBanner} alt="NovaIntel Dashboard" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-b from-transparent to-background/50">
        <div className="mx-auto max-w-[1388px] px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="group relative overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm p-6 text-center hover:scale-105 transition-all duration-300 hover:shadow-lg hover:border-primary/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <stat.icon className="h-8 w-8 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-3xl font-bold mb-1 bg-gradient-primary bg-clip-text text-transparent">{stat.value}</div>
                  <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="mx-auto max-w-[1388px] px-6">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              <Zap className="h-4 w-4" />
              Powerful Features
            </div>
            <h2 className="mb-4 font-heading text-4xl lg:text-5xl font-bold">Everything You Need to Win</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your entire presales workflow from RFP to proposal with AI-powered intelligence
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group relative overflow-hidden border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                <div className="relative p-8">
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 font-heading text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  <div className="mt-6 flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">Learn more</span>
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm py-6">
        <div className="mx-auto max-w-[1388px] px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-md">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                NovaIntel
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2025 NovaIntel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

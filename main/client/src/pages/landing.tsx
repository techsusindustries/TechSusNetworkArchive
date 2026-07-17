import { useState } from "react";
import Navigation from "@/components/navigation";
import AuthModal from "@/components/auth-modal-new";
import DiscordModal from "@/components/discord-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Check, Code, Twitter, Linkedin, Github } from "lucide-react";

export default function Landing() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [soldSeparatelyOpen, setSoldSeparatelyOpen] = useState(false);
  const [discordModalOpen, setDiscordModalOpen] = useState(false);
  const [discordModalData, setDiscordModalData] = useState({
    type: 'plan' as 'plan' | 'service',
    planName: '',
    serviceName: '',
    price: ''
  });

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSignInClick = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleGetStartedClick = () => {
    setAuthModalMode('register');
    setAuthModalOpen(true);
  };

  const openDiscordModal = (type: 'plan' | 'service', name: string, price: string) => {
    setDiscordModalData({
      type,
      planName: type === 'plan' ? name : '',
      serviceName: type === 'service' ? name : '',
      price
    });
    setDiscordModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation 
        onSignInClick={handleSignInClick}
        onGetStartedClick={handleGetStartedClick}
      />
      
      {/* Hero Section */}
      <section id="home" className="bg-gradient-to-br from-primary to-primary-dark text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">TechSus Network</h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Access exclusive tools and services designed for people that don't want to do their school work on their school chromebook.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => scrollToSection('products')}
                className="bg-white text-primary hover:bg-gray-100 px-8 py-3 text-lg"
              >
                Explore Products
              </Button>
              <Button 
                onClick={() => scrollToSection('about')}
                className="bg-white text-primary hover:bg-gray-100 px-8 py-3 text-lg"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Products</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Gaming, entertainment, and productivity tools to help you get through the school day
            </p>
          </div>

          {/* Proxy Playground Feature */}
          <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 md:p-12 text-white mb-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4">Proxy Playground</h3>
                <p className="text-xl mb-6 text-blue-100">
                  Access blocked sites, play games, convert videos, and watch shows - all the tools you need when you don't want to focus on schoolwork.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <Badge variant="secondary" className="bg-white/20 text-white">Minecraft</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">YouTube Converter</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">Site Unblocking</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">KSM</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">Discord</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">Steam Remote Play</Badge>
                  
                </div>
                <Button 
                  onClick={() => scrollToSection('pricing')}
                  className="bg-white text-primary hover:bg-gray-100"
                >
                  View Pricing Plans
                </Button>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/10 rounded-xl p-8 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Feature */}
          <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 md:p-12 text-white mb-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4">AI</h3>
                <p className="text-xl mb-6 text-blue-100">
                  Access Aura and Nexus AI, your personal assistants for schoolwork, entertainment, and more. Get help with homework, generate content, or just have fun chatting.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <Badge variant="secondary" className="bg-white/20 text-white">Aura</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">Nexus</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">Nexus Ultra</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">OpenWebUI</Badge>
                </div>
                <Button 
                  onClick={() => scrollToSection('pricing')}
                  className="bg-white text-primary hover:bg-gray-100"
                >
                  View Pricing Plans
                </Button>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/10 rounded-xl p-8 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GG Feature */}
          <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 md:p-12 text-white mb-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4">Goon Gang Script Hub</h3>
                <p className="text-xl mb-6 text-blue-100">
                  A collection of Roblox exploits and scripts for roblox exploiters. Access popular scripts and tools to enhance your gaming experience.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <Badge variant="secondary" className="bg-white/20 text-white">Roblox</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">Exploits</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">Infinite Yield</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white">Easy Key System</Badge>
                </div>
                <Button 
                  onClick={() => window.open("https://goongang.techsusindustries.com", "_blank")}
                  className="bg-white text-primary hover:bg-gray-100"
                >
                  Access the Script Hub
                </Button>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/10 rounded-xl p-8 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                    <div className="bg-white/20 rounded-lg p-4 h-20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Plans */}
          <div id="pricing" className="mb-16">
            <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">Subscription Plans</h3>
            <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* Free Priority Plan */}
              <Card className="border-2 border-gray-200 hover:border-primary transition-colors">
                <CardContent className="p-6 md:p-8">
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-semibold mb-2">Free Priority</h4>
                    <div className="text-3xl font-bold text-primary mb-2">
                      Free
                    </div>
                    <p className="text-gray-600">Perfect for getting started</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <Check className="text-accent mr-3 h-4 w-4" />
                      KSM(30 Minutes per Session)
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Priority Plan */}
              <Card className="border-2 border-primary bg-primary/5 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white">Most Popular</Badge>
                </div>
                <CardContent className="p-6 md:p-8">
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-semibold mb-2">Priority</h4>
                    <div className="text-3xl font-bold text-primary mb-2">
                      $5<span className="text-lg text-gray-600">/Mo</span>
                    </div>
                    <div className="text-lg font-semibold text-primary mb-2">
                      $30<span className="text-sm text-gray-600">/Yr</span>
                    </div>
                    <p className="text-gray-600">Equal to ~$3.33/Mo</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <Check className="text-accent mr-3 h-4 w-4" />
                      KSM(1 Hour per Session)
                    </li>
                    <li className="flex items-center">
                      <Check className="text-accent mr-3 h-4 w-4 flex-shrink-0" />
                      Extra Resources and exclusive access to select KSM VM's(Ubuntu Jammy, Unity Hub, and a 4 core, 4GB RAM version of Steam)
                    </li>
                    <li className="flex items-center">
                      <Check className="text-accent mr-3 h-4 w-4" />
                      Movie/TV Show Archive
                    </li>
                    <li className="flex items-center">
                      <Check className="text-accent mr-3 h-4 w-4" />
                      Nexus Ultra(Currently incomplete)
                    </li>
                    <li className="flex items-center">
                      <Check className="text-accent mr-3 h-4 w-4" />
                      Future features
                    </li>
                  </ul>
                  <Button 
                    className="w-full bg-primary hover:bg-primary-dark"
                    onClick={handleGetStartedClick}
                  >
                    Choose Plan
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sold Separately Section */}
          <div className="bg-gray-50 rounded-xl p-8">
            <Collapsible open={soldSeparatelyOpen} onOpenChange={setSoldSeparatelyOpen}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Individual Services</h3>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="text-primary hover:text-primary-dark">
                    View Details
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${soldSeparatelyOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent>
                <p className="text-gray-600 mb-6">
                  Purchase individual services without a subscription. Perfect for occasional use or testing specific features.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <Card>
                    <CardContent className="p-4 md:p-6">
                      <h4 className="font-semibold mb-2">Movie/TV Show Archive</h4>
                      <p className="text-2xl font-bold text-primary mb-2">$TBD</p>
                      <p className="text-sm text-gray-600 mb-4">One-time purchase</p>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={handleGetStartedClick}
                      >
                        Purchase
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">About TechSus Network</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We provide access to Proxy Playground, a collection of tools and services designed for students who want alternatives to doing schoolwork on their Chromebooks.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-primary">TechSus</span>
              <span className="text-gray-300 ml-1">Network</span>
            </div>
            <p className="text-gray-400 mb-8">
              Access to Proxy Playground services for students
            </p>
            <div className="border-t border-gray-800 pt-8 text-gray-400">
              <div className="flex justify-center space-x-6 mb-4">
                <a href="/privacy-policy" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </div>
              <p>&copy; 2026 TechSus Network. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
        initialMode={authModalMode}
      />

      <DiscordModal
        open={discordModalOpen}
        onOpenChange={setDiscordModalOpen}
        type={discordModalData.type}
        planName={discordModalData.planName}
        serviceName={discordModalData.serviceName}
        price={discordModalData.price}
      />
    </div>
  );
}

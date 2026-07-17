import { useState } from "react";
import Navigation from "@/components/navigation";
import DashboardModal from "@/components/dashboard-modal";
import DiscordModal from "@/components/discord-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, Server, FileVideo, Gamepad2, Code, LogOut } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [discordModalOpen, setDiscordModalOpen] = useState(false);
  const [discordModalData, setDiscordModalData] = useState({
    type: 'plan' as 'plan' | 'service',
    planName: '',
    serviceName: '',
    price: ''
  });

  const { data: subscription } = useQuery({
    queryKey: ["/api/subscriptions/me"],
  });

  const { data: services } = useQuery({
    queryKey: ["/api/services/me"],
  });

  const openDiscordModal = (type: 'plan' | 'service', name: string, price: string) => {
    setDiscordModalData({
      type,
      planName: type === 'plan' ? name : '',
      serviceName: type === 'service' ? name : '',
      price
    });
    setDiscordModalOpen(true);
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.reload();
    },
  });

  const serviceIcons = {
    'main': Server,
    'ksm': Server,
    'ksm-browser': Server,
    'ksm-application': Server,
    'ksm-desktop': Server,
    'anysite': Code,
    ytmp4: FileVideo,
    eaglercraft: Gamepad2,
    selenite: Code,
    materialious: FileVideo,
    adea: FileVideo,
    fgea: FileVideo,
    spea: FileVideo,
  };

  const serviceNames = {
    'main': "Main Service Access",
    'ksm': "KSM Access",
    'ksm-browser': "KSM: Browser Access",
    'ksm-application': "KSM: Application Access", 
    'ksm-desktop': "KSM: Desktop Access",
    'anysite': "TechSus Web Embedder",
    ytmp4: "YTMP4",
    eaglercraft: "Eaglercraft",
    selenite: "Selenite",
    materialious: "Invidious",
    adea: "Movie/TV Show Archive",
    fgea: "Priority Queue Access", 
    spea: "Riptool Premium(Password currently broken)",
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation 
        user={user} 
        onLogoutClick={() => logoutMutation.mutate()}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || user?.username}!
          </h1>
          <p className="text-gray-600">
            Manage your TechSus Industries services and subscriptions
          </p>
        </div>

        {/* Current Subscription */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription?.subscription ? (
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="secondary" className="text-lg px-3 py-1 mb-2">
                    {subscription.subscription.plan === "medium" ? "Priority" : subscription.subscription.plan.charAt(0).toUpperCase() + subscription.subscription.plan.slice(1) + " Priority"}
                  </Badge>
                  <p className="text-sm text-gray-600">
                    Active subscription
                  </p>
                </div>

              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">No active subscription</p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 border-primary bg-primary/5">
                    <h4 className="font-semibold mb-2">Priority</h4>
                    <div className="text-2xl font-bold text-primary mb-1">$5<span className="text-sm text-gray-600">/Mo</span></div>
                    <div className="text-lg font-semibold text-primary mb-3">$30<span className="text-xs text-gray-600">/Yr</span></div>
                    <Button
                      onClick={() => openDiscordModal('plan', 'Priority', '$5/month')}
                      className="w-full"
                    >
                      Subscribe
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Services */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Active Services</CardTitle>
          </CardHeader>
          <CardContent>
            {services?.services && services.services.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {services.services.map((service: any) => {
                  const Icon = serviceIcons[service.serviceName as keyof typeof serviceIcons] || Server;
                  return (
                    <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-medium">{serviceNames[service.serviceName as keyof typeof serviceNames]}</h3>
                          <p className="text-sm text-gray-600">
                            Password: {service.password}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600">No active services</p>
            )}
          </CardContent>
        </Card>

        {/* Individual Services */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Individual Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { service: 'ytmp4', name: 'Movie/TV Show Archive', price: '$TBD', icon: FileVideo }
              ].map(({ service, name, price, icon: Icon }) => {
                const hasService = services?.services?.some((s: any) => s.serviceName === service);
                return (
                  <div key={service} className="border rounded-lg p-4">
                    <Icon className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-medium mb-1">{name}</h3>
                    <p className="text-lg font-bold text-primary mb-2">{price}</p>
                    <p className="text-sm text-gray-600 mb-3">One-time purchase</p>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => openDiscordModal('service', name, price)}
                      disabled={hasService}
                    >
                      {hasService ? 'Owned' : 'Purchase'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <DashboardModal open={dashboardOpen} onOpenChange={setDashboardOpen} />
      
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

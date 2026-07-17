import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, ExternalLink, Server, FileVideo, Gamepad2, Code } from "lucide-react";

interface DashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DashboardModal({ open, onOpenChange }: DashboardModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscription } = useQuery({
    queryKey: ["/api/subscriptions/me"],
    enabled: open,
  });

  const { data: services } = useQuery({
    queryKey: ["/api/services/me"],
    enabled: open,
  });

  const regeneratePasswordMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      await apiRequest("POST", `/api/services/${serviceName}/regenerate-password`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/me"] });
      toast({
        title: "Success",
        description: "Password regenerated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addMainServiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/add-main-service");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/me"] });
      toast({
        title: "Success",
        description: "Main site access created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: `${type} copied to clipboard!`,
      });
    });
  };

  const serviceIcons = {
    main: Server,
    ksm: Server,
    ai: Code,
    ytmp4: FileVideo,
    eaglercraft: Gamepad2,
    selenite: Code,
    materialious: FileVideo,
    adea: FileVideo,
    fgea: FileVideo,
    spea: FileVideo,
    anysite: Code,
  };

  const serviceNames = {
    main: "Main Site Access",
    ksm: "KSM Browser",
    ai: "AI Tools",
    ytmp4: "YTMP4",
    eaglercraft: "Eaglercraft 1.12.2",
    selenite: "Selenite",
    materialious: "Materialious",
    adea: "ADEA (American Dad Episode Archive)",
    fgea: "FGEA (Family Guy Episode Archive)", 
    spea: "SPEA (South Park Episode Archive)",
    anysite: "Anysite Embedder",
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">User Dashboard</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Account Information</h3>
              <p className="text-sm text-gray-600">
                Email: <span className="font-medium">{user?.email}</span>
              </p>
              {subscription?.subscription && (
                <p className="text-sm text-gray-600">
                  Plan: <span className="font-medium">
                    {subscription.subscription.plan.charAt(0).toUpperCase() + subscription.subscription.plan.slice(1)} Priority
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Service Credentials */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Service Credentials</h3>
              {services?.services && !services.services.find((s: any) => s.serviceName === 'main') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addMainServiceMutation.mutate()}
                  disabled={addMainServiceMutation.isPending}
                >
                  {addMainServiceMutation.isPending ? "Adding..." : "Add Main Site Access"}
                </Button>
              )}
            </div>
            {services?.services && services.services.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {services.services.map((service: any) => {
                  const Icon = serviceIcons[service.serviceName as keyof typeof serviceIcons] || Server;
                  const serviceName = serviceNames[service.serviceName as keyof typeof serviceNames] || service.serviceName;
                  
                  return (
                    <Card key={service.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-primary" />
                            <h4 className="font-medium">{serviceName}</h4>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-gray-500">Password</Label>
                            <div className="flex items-center justify-between bg-gray-50 p-2 rounded mt-1">
                              <span className="text-sm font-mono">{service.password}</span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => regeneratePasswordMutation.mutate(service.serviceName)}
                                  disabled={regeneratePasswordMutation.isPending}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => copyToClipboard(service.password, "Password")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="pt-2">
                            <p className="text-xs text-gray-500">
                              Expires: {new Date(service.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600 mb-4">No active services</p>
                  <p className="text-sm text-gray-500">
                    Purchase a subscription or individual services to get started
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Access Proxy Playground */}
          <div className="text-center pt-4">
            <Button 
              className="bg-primary hover:bg-primary-dark text-white px-6 py-3"
              onClick={() => {
                window.open('https://proxyplayground.com', '_blank');
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Access Proxy Playground
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
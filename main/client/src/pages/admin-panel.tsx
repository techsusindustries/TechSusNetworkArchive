import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Settings, 
  UserPlus, 
  Trash2, 
  Shield,
  LogOut,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Dictionary to map internal service names to user-friendly display names
const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  'main': 'Main Service Access',
  'ksm': 'KSM Access',
  'ytmp4': 'YTMP4',
  'eaglercraft': 'Eaglercraft',
  'selenite': 'Selenite',
  'materialious': 'Invidious',
  'adea': 'Movie/TV Show Archive',
  'fgea': 'Priority Queue Access',
  'spea': 'Riptool Premium',
  'anysite': 'TechSus Web Embedder'
};

interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface ServiceAccess {
  id: string;
  userId: string;
  serviceName: string;
  password: string;
  createdAt: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [serviceAccess, setServiceAccess] = useState<ServiceAccess[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [accessDenied, setAccessDenied] = useState(false);
  const { toast } = useToast();

  const services = [
    'main', 'ksm', 'ytmp4', 'eaglercraft', 
    'selenite', 'materialious', 'adea', 'fgea', 'spea', 'anysite'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersResponse, servicesResponse] = await Promise.all([
        apiRequest("GET", "/api/admin/users"),
        apiRequest("GET", "/api/admin/services")
      ]);
      
      // Ensure we have arrays before setting state
      const usersData = Array.isArray(usersResponse) ? usersResponse : [];
      const servicesData = Array.isArray(servicesResponse) ? servicesResponse : [];
      
      setUsers(usersData);
      setServiceAccess(servicesData);
      setAccessDenied(false);
      
      // Load subscriptions separately
      try {
        const subscriptionsResponse = await apiRequest("GET", "/api/admin/subscriptions");
        const subscriptionsData = Array.isArray(subscriptionsResponse) ? subscriptionsResponse : [];
        setSubscriptions(subscriptionsData);
      } catch (subError) {
        console.log('Subscriptions not available yet');
        setSubscriptions([]);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('403')) {
        setAccessDenied(true);
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load data",
          variant: "destructive",
        });
      }
      // Set empty arrays on error to prevent map errors
      setUsers([]);
      setServiceAccess([]);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;

    try {
      await apiRequest("POST", "/api/admin/users", newUser);
      setNewUser({ username: "", password: "" });
      loadData();
      toast({
        title: "Success",
        description: "User created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
      loadData();
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const toggleService = async (userId: string, serviceName: string, hasService: boolean) => {
    try {
      if (hasService) {
        await apiRequest("DELETE", `/api/admin/users/${userId}/services/${serviceName}`);
      } else {
        await apiRequest("POST", `/api/admin/users/${userId}/services/${serviceName}`);
      }
      loadData();
      toast({
        title: "Success",
        description: `Service ${hasService ? 'removed' : 'added'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update service",
        variant: "destructive",
      });
    }
  };

  const regeneratePassword = async (userId: string, serviceName: string) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/services/${serviceName}/regenerate`);
      loadData();
      toast({
        title: "Success",
        description: "Password regenerated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate password",
        variant: "destructive",
      });
    }
  };

  const togglePasswordVisibility = (serviceId: string) => {
    const newShowPasswords = new Set(showPasswords);
    if (newShowPasswords.has(serviceId)) {
      newShowPasswords.delete(serviceId);
    } else {
      newShowPasswords.add(serviceId);
    }
    setShowPasswords(newShowPasswords);
  };

  const grantSubscription = async (userId: string, plan: string) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/subscription`, { plan });
      loadData();
      toast({
        title: "Success",
        description: `${plan} subscription granted successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to grant subscription",
        variant: "destructive",
      });
    }
  };

  const removeSubscription = async (userId: string) => {
    try {
      await apiRequest("DELETE", `/api/admin/users/${userId}/subscription`);
      loadData();
      toast({
        title: "Success",
        description: "Subscription removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove subscription",
        variant: "destructive",
      });
    }
  };

  const removeAllServices = async (userId: string) => {
    if (!confirm(`Are you sure you want to remove ALL services for this user? This cannot be undone.`)) return;

    try {
      await apiRequest("DELETE", `/api/admin/users/${userId}/services`);
      loadData();
      toast({
        title: "Success",
        description: "All services removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove all services",
        variant: "destructive",
      });
    }
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout");
      window.location.href = "/";
    } catch (error) {
      // Even if logout fails, redirect to home
      window.location.href = "/";
    }
  };

  // Show access denied page if user is not authenticated as admin
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Shield className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <CardTitle className="text-2xl font-bold text-red-600">Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                You do not have permission to access the admin panel.
              </p>
              <p className="text-sm text-gray-500">
                Please log in with valid administrator credentials.
              </p>
              <div className="flex flex-col gap-2 mt-6">
                <Button 
                  onClick={() => window.location.href = "/admin/login"}
                  className="w-full"
                >
                  Go to Admin Login
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                TechSus Admin Panel
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="services">
              <Settings className="h-4 w-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              <Shield className="h-4 w-4 mr-2" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="add-user">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading users...</div>
                ) : !Array.isArray(users) || users.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No users found</div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{user.username}</h3>
                          {user.email && <p className="text-sm text-gray-600">{user.email}</p>}
                          {(user.firstName || user.lastName) && (
                            <p className="text-sm text-gray-600">
                              {user.firstName} {user.lastName}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">ID: {user.id}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUser(user.id, user.username)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Access Management</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading services...</div>
                ) : (
                  <div className="space-y-6">
                    {users.map((user) => {
                      const userServices = serviceAccess.filter(sa => sa.userId === user.id);
                      return (
                        <div key={user.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">{user.username}</h3>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeAllServices(user.id)}
                            >
                              Remove All Services
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {services.map((service) => {
                              const hasService = userServices.find(us => us.serviceName === service);
                              return (
                                <div key={service} className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      {/* Use the friendly name map here, fallback to service key if missing */}
                                      {SERVICE_DISPLAY_NAMES[service] || service}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant={hasService ? "destructive" : "default"}
                                      onClick={() => toggleService(user.id, service, !!hasService)}
                                    >
                                      {hasService ? "Remove" : "Add"}
                                    </Button>
                                  </div>
                                  {hasService && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type={showPasswords.has(hasService.id) ? "text" : "password"}
                                          value={hasService.password}
                                          readOnly
                                          className="text-xs"
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => togglePasswordVisibility(hasService.id)}
                                        >
                                          {showPasswords.has(hasService.id) ? (
                                            <EyeOff className="h-3 w-3" />
                                          ) : (
                                            <Eye className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-xs"
                                        onClick={() => regeneratePassword(user.id, service)}
                                      >
                                        Regenerate
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading subscriptions...</div>
                ) : (
                  <div className="space-y-6">
                    {users.map((user) => {
                      // Find user's current subscription
                      const userSubscription = subscriptions.find((sub: any) => 
                        sub.userId === user.id
                      );
                      
                      return (
                        <div key={user.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold">{user.username}</h3>
                            {userSubscription && (
                              <div className="text-right">
                                <Badge variant="secondary" className="mb-2">
                                  Current: {userSubscription.plan} Priority
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeSubscription(user.id)}
                                  className="block w-full mb-2"
                                >
                                  Remove Subscription
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeAllServices(user.id)}
                                  className="block w-full"
                                >
                                  Remove All Services
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['low', 'medium', 'high'].map((plan) => (
                              <div key={plan} className="border rounded p-3">
                                <h4 className="font-medium capitalize mb-2">{plan === "medium" ? "Priority" : plan.charAt(0).toUpperCase() + plan.slice(1) + " Priority"}</h4>
                                <p className="text-sm text-gray-600 mb-3">
                                  {plan === 'low' && '$3/month - KSM Browser + YTMP4'}
                                  {plan === 'medium' && '$7/month - KSM App + 4 services'}
                                  {plan === 'high' && '$15/month - All services + priority'}
                                </p>
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() => grantSubscription(user.id, plan)}
                                >
                                  Grant {plan === "medium" ? "Priority" : plan.charAt(0).toUpperCase() + plan.slice(1) + " Priority"}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add-user" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New User</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createUser} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="new-username">Username</Label>
                    <Input
                      id="new-username"
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter username"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

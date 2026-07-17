import express, { type Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import connectPg from "connect-pg-simple";
import cors from "cors";
import {
  insertUserSchema,
  insertSubscriptionSchema,
  insertServiceAccessSchema,
} from "@shared/schema";
import { Pool } from 'pg'; // <-- ADDED: Import the Pool object from pg

export async function registerRoutes(app: Express): Promise<Server> {

  // CORS setup - allow all origins in development
  app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Serve Proxy Playground files
  app.use('/proxy-playground', express.static(path.join(process.cwd(), 'proxy-playground')));

  // Add a simple health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Auth system is operational' });
  });

  // --- START: NEW DATABASE HEALTH CHECK ENDPOINT ---
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  app.get('/db-health', async (req, res) => {
    try {
      await dbPool.query('SELECT 1'); // A simple, non-destructive query to test the connection
      res.status(200).json({ status: 'ok', message: 'Database connection successful' });
    } catch (error) {
      console.error("Database check failed:", error);
      res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
  });
  // --- END: NEW DATABASE HEALTH CHECK ENDPOINT ---

  // Session setup with PostgreSQL store
  const pgStore = connectPg(session);
  app.use(session({
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: 7 * 24 * 60 * 60, // 7 days in seconds
    }),
    secret: process.env.SESSION_SECRET || 'techsus-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      httpOnly: true
    }
  }));

  // Passport setup
  app.use(passport.initialize());
  app.use(passport.session());

  // OAuth callback logic
  const oauthCallback = async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error("No email found"), false);
      }

      let user = await storage.getUserByUsername(profile.displayName || email);
      if (!user) {
        // Create new user
        user = await storage.createUser({
          username: profile.displayName || email.split('@')[0],
          firstName: profile.name?.givenName || "",
          lastName: profile.name?.familyName || "",
          password: "" // No password needed for OAuth users
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  };

  // Set up strategies for both domains
  passport.use('google-localhost', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "http://localhost:5000/api/auth/google/callback"
  }, oauthCallback));

  passport.use('google-replit', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "https://techsus.replit.app/api/auth/google/callback"
  }, oauthCallback));

  passport.use('google-custom', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "https://techsusindustries.com/api/auth/google/callback"
  }, oauthCallback));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth routes - dynamic strategy selection
  app.get('/api/auth/google', (req, res, next) => {
    const host = req.get('host') || '';
    let strategy = 'google-replit';
    if (host.includes('localhost')) strategy = 'google-localhost';
    else if (host.includes('techsusindustries.com')) strategy = 'google-custom';

    passport.authenticate(strategy, { scope: ['profile', 'email'] })(req, res, next);
  });

  app.get('/api/auth/google/callback', (req, res, next) => {
    const host = req.get('host') || '';
    let strategy = 'google-replit';
    if (host.includes('localhost')) strategy = 'google-localhost';
    else if (host.includes('techsusindustries.com')) strategy = 'google-custom';

    passport.authenticate(strategy, { failureRedirect: '/' }, (err: any, user: any) => {
      if (err) return next(err);
      if (!user) return res.redirect('/');

      req.logIn(user, (err: any) => {
        if (err) return next(err);
        (req.session as any).userId = user.id;

        // Redirect back to the correct domain
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.redirect(`${baseUrl}/`);
      });
    })(req, res, next);
  });

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username as string);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password as string, 10);

      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        firstName,
        lastName,
      });

      // Automatically log in the user after registration
      (req.session as any).userId = user.id;

      res.json({ user: { id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      (req.session as any).userId = user.id;

      res.json({ user: { id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Login failed" });
    }
  });

  app.get('/api/auth/user', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Admin authentication routes
  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;

    if (username === "adminpanel" && password === "NewPassword1" || password === "NewPassword2" ) {
      (req.session as any).isAdmin = true;
      req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        res.json({ success: true });
      });
    } else {
      res.status(401).json({ message: "Invalid admin credentials" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    (req.session as any).isAdmin = false;
    res.json({ success: true });
  });

  // Admin middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Admin routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/services", requireAdmin, async (req, res) => {
    try {
      const services = await storage.getAllServiceAccess();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/admin/subscriptions", requireAdmin, async (req, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        firstName: null,
        lastName: null
      });
      res.json(user);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(400).json({ message: "Failed to create user: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });

  app.delete("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/admin/users/:userId/services/:serviceName", requireAdmin, async (req, res) => {
    try {
      const serviceAccess = await storage.createServiceAccess({
        userId: req.params.userId,
        serviceName: req.params.serviceName,
        password: storage.generateServicePassword(),
        accessType: "full"
      });
      res.json(serviceAccess);
    } catch (error) {
      res.status(500).json({ message: "Failed to add service" });
    }
  });

  app.delete("/api/admin/users/:userId/services/:serviceName", requireAdmin, async (req, res) => {
    try {
      await storage.removeUserService(req.params.userId, req.params.serviceName);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove service" });
    }
  });

  app.post("/api/admin/users/:userId/services/:serviceName/regenerate", requireAdmin, async (req, res) => {
    try {
      const serviceAccess = await storage.regenerateServicePassword(req.params.userId, req.params.serviceName);
      res.json(serviceAccess);
    } catch (error) {
      res.status(500).json({ message: "Failed to regenerate password" });
    }
  });

  // Admin subscription management
  app.post("/api/admin/users/:userId/subscription", requireAdmin, async (req, res) => {
    try {
      const { plan } = req.body;
      const userId = req.params.userId;

      if (!['low', 'medium', 'high'].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan" });
      }

      // Check if user already has a subscription
      const existingSubscription = await storage.getUserSubscription(userId);

      let subscription;
      if (existingSubscription) {
        // Update existing subscription
        subscription = await storage.updateUserSubscription(userId, plan);
      } else {
        // Create new subscription
        subscription = await storage.createSubscription({
          userId,
          plan,
          status: 'active'
        });
      }

      // Remove all existing subscription services first
      const existingServices = await storage.getUserServiceAccess(userId);
      for (const service of existingServices) {
        if (service.accessType === 'subscription') {
          await storage.removeUserService(userId, service.serviceName);
        }
      }

      // Grant services based on new plan
      const services = getServicesForPlan(plan);
      for (const serviceName of services) {
        try {
          await storage.createServiceAccess({
            userId,
            serviceName,
            password: storage.generateServicePassword(),
            accessType: 'subscription'
          });
        } catch (error) {
          // Service might already exist, continue with others
        }
      }

      res.json({ success: true, subscription });
    } catch (error) {
      console.error("Grant subscription error:", error);
      res.status(500).json({ message: "Failed to grant subscription" });
    }
  });

  // Remove user subscription
  app.delete("/api/admin/users/:userId/subscription", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.userId;

      // Remove subscription
      await storage.removeUserSubscription(userId);

      // Remove all subscription services
      const services = await storage.getUserServiceAccess(userId);
      for (const service of services) {
        if (service.accessType === 'subscription') {
          await storage.removeUserService(userId, service.serviceName);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Remove subscription error:", error);
      res.status(500).json({ message: "Failed to remove subscription" });
    }
  });

  // Subscription routes
  app.post('/api/subscriptions', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { plan } = req.body;
      if (!['low', 'medium', 'high'].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan" });
      }

      const subscription = await storage.createSubscription({
        userId,
        plan,
      });

      // Create service access based on plan
      const services = getServicesForPlan(plan);
      for (const serviceName of services) {
        await storage.createServiceAccess({
          userId,
          serviceName,
          password: storage.generateServicePassword(),
          accessType: 'subscription',
        });
      }

      res.json({ subscription });
    } catch (error) {
      console.error("Create subscription error:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.get('/api/subscriptions/me', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const subscription = await storage.getUserSubscription(userId);
      res.json({ subscription });
    } catch (error) {
      console.error("Get subscription error:", error);
      res.status(500).json({ message: "Failed to get subscription" });
    }
  });

  // Service access routes
  app.post('/api/services/purchase', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { serviceName } = req.body;
      const validServices = ['main', 'ksm', 'ai', 'ytmp4', 'eaglercraft', 'selenite', 'materialious', 'adea', 'fgea', 'spea', 'anysite'];
      if (!validServices.includes(serviceName)) {
        return res.status(400).json({ message: "Invalid service" });
      }

      // Check if user already has access
      const existingAccess = await storage.getServiceAccess(userId, serviceName);
      if (existingAccess) {
        return res.status(400).json({ message: "Service already purchased" });
      }

      // Create service access
      const serviceAccess = await storage.createServiceAccess({
        userId,
        serviceName,
        password: storage.generateServicePassword(),
        accessType: 'individual',
      });

      res.json({ serviceAccess });
    } catch (error) {
      console.error("Purchase service error:", error);
      res.status(500).json({ message: "Failed to purchase service" });
    }
  });

  app.get('/api/services/me', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const services = await storage.getUserServiceAccess(userId);
      res.json({ services });
    } catch (error) {
      console.error("Get services error:", error);
      res.status(500).json({ message: "Failed to get services" });
    }
  });

  app.post('/api/services/:serviceName/regenerate-password', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { serviceName } = req.params;
      const updatedService = await storage.regenerateServicePassword(userId, serviceName);

      res.json({ serviceAccess: updatedService });
    } catch (error) {
      console.error("Regenerate password error:", error);
      res.status(500).json({ message: "Failed to regenerate password" });
    }
  });

  // Add main service for existing users who don't have it
  app.post("/api/add-main-service", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if user already has main service
      const existingMainService = await storage.getServiceAccess(userId, 'main');
      if (existingMainService) {
        return res.json({ message: "Main service already exists" });
      }

      // Create main service access
      const serviceAccess = await storage.createServiceAccess({
        userId,
        serviceName: 'main',
        password: storage.generateServicePassword(),
        accessType: 'subscription',
      });

      res.json({ serviceAccess, message: "Main service access created!" });
    } catch (error) {
      console.error("Add main service error:", error);
      res.status(500).json({ message: "Failed to create main service access" });
    }
  });

  // Validate service password for Proxy Playground
  app.post("/api/validate-service-password", async (req, res) => {
    try {
      const { password, serviceName } = req.body;

      console.log(`[DEBUG] Password validation attempt: serviceName="${serviceName}", password="${password}"`);

      if (!password || !serviceName) {
        return res.status(400).json({ valid: false, message: "Password and service name required" });
      }

      // Find user by service password
      const allServiceAccess = await storage.getAllServiceAccess();
      console.log(`[DEBUG] Available services:`, allServiceAccess.map(a => ({ serviceName: a.serviceName, password: a.password })));

      const matchingAccess = allServiceAccess.find((access: any) =>
        access.password === password && access.serviceName === serviceName
      );

      if (matchingAccess) {
        console.log(`[DEBUG] Password validation successful for ${serviceName}`);
        res.json({ valid: true });
      } else {
        console.log(`[DEBUG] Password validation failed for ${serviceName}`);
        res.json({ valid: false });
      }
    } catch (error) {
      console.error("Service password validation error:", error);
      res.status(500).json({ valid: false, message: "Validation failed" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get('/api/admin/users/:userId/services', async (req, res) => {
    try {
      const { userId } = req.params;
      const services = await storage.getUserServiceAccess(userId);
      res.json({ services });
    } catch (error) {
      console.error("Get user services error:", error);
      res.status(500).json({ message: "Failed to get user services" });
    }
  });

  app.post('/api/admin/users/:userId/services', async (req, res) => {
    try {
      const { userId } = req.params;
      const { serviceName } = req.body;

      const serviceAccess = await storage.createServiceAccess({
        userId,
        serviceName,
        password: storage.generateServicePassword(),
        accessType: 'admin',
      });

      res.json({ serviceAccess });
    } catch (error) {
      console.error("Add user service error:", error);
      res.status(500).json({ message: "Failed to add service" });
    }
  });

  app.delete('/api/admin/users/:userId/services/:serviceName', async (req, res) => {
    try {
      const { userId, serviceName } = req.params;
      await storage.removeUserService(userId, serviceName);
      res.json({ message: "Service removed successfully" });
    } catch (error) {
      console.error("Remove user service error:", error);
      res.status(500).json({ message: "Failed to remove service" });
    }
  });

  app.delete('/api/admin/users/:userId/services', async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.removeAllUserServices(userId);
      res.json({ message: "All services removed successfully" });
    } catch (error) {
      console.error("Remove all user services error:", error);
      res.status(500).json({ message: "Failed to remove all services" });
    }
  });

  app.post('/api/admin/users', async (req, res) => {
    try {
      const { firstName, lastName, username, password } = req.body;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        firstName,
        lastName,
      });

      res.json({ user });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete('/api/admin/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function getServicesForPlan(plan: string): string[] {
  switch (plan) {
    case 'low':
      return [];
    case 'medium':
      return ['adea', 'fgea', 'spea'];
    case 'high':
      return ['main', 'ksm', 'ytmp4', 'eaglercraft', 'selenite', 'materialious', 'adea', 'fgea', 'spea', 'anysite'];
    default:
      return [];
  }
}


import {
  users,
  subscriptions,
  serviceAccess,
  type User,
  type UpsertUser,
  type InsertUser,
  type Subscription,
  type InsertSubscription,
  type ServiceAccess,
  type InsertServiceAccess,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Subscription operations
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  getAllSubscriptions(): Promise<Subscription[]>;
  updateUserSubscription(userId: string, plan: string): Promise<Subscription>;
  removeUserSubscription(userId: string): Promise<void>;
  
  // Service access operations
  createServiceAccess(serviceAccess: InsertServiceAccess): Promise<ServiceAccess>;
  getUserServiceAccess(userId: string): Promise<ServiceAccess[]>;
  getAllServiceAccess(): Promise<ServiceAccess[]>;
  getServiceAccess(userId: string, serviceName: string): Promise<ServiceAccess | undefined>;
  regenerateServicePassword(userId: string, serviceName: string): Promise<ServiceAccess>;
  
  // Admin methods
  getAllUsers(): Promise<User[]>;
  removeUserService(userId: string, serviceName: string): Promise<void>;
  removeAllUserServices(userId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  
  // Utility methods
  generateServicePassword(): string;
  generateUserId(): string;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }



  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.generateUserId();
    const [user] = await db
      .insert(users)
      .values({
        id,
        ...userData,
      })
      .returning();
    return user;
  }

  // Subscription operations
  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const id = nanoid();
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        id,
        ...subscriptionData,
      })
      .returning();
    return subscription;
  }

  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')));
    return subscription;
  }

  async updateUserSubscription(userId: string, plan: string): Promise<Subscription> {
    // First, check if user already has an active subscription
    const existingSubscription = await this.getUserSubscription(userId);
    
    if (existingSubscription) {
      // Update the existing subscription
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({ plan })
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
        .returning();
      return updatedSubscription;
    } else {
      // Create new subscription
      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          id: nanoid(),
          userId,
          plan,
          status: 'active'
        })
        .returning();
      return newSubscription;
    }
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    const allSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));
    return allSubscriptions;
  }

  async removeUserSubscription(userId: string): Promise<void> {
    await db
      .update(subscriptions)
      .set({ status: 'cancelled' })
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')));
  }

  // Service access operations
  async createServiceAccess(serviceAccessData: InsertServiceAccess): Promise<ServiceAccess> {
    const id = nanoid();
    const [newServiceAccess] = await db
      .insert(serviceAccess)
      .values({
        id,
        ...serviceAccessData,
      })
      .returning();
    return newServiceAccess;
  }

  async getUserServiceAccess(userId: string): Promise<ServiceAccess[]> {
    const services = await db
      .select()
      .from(serviceAccess)
      .where(and(eq(serviceAccess.userId, userId), eq(serviceAccess.status, 'active')));
    return services;
  }

  async getAllServiceAccess(): Promise<ServiceAccess[]> {
    const allServices = await db
      .select()
      .from(serviceAccess)
      .where(eq(serviceAccess.status, 'active'));
    return allServices;
  }

  async getServiceAccess(userId: string, serviceName: string): Promise<ServiceAccess | undefined> {
    const [service] = await db
      .select()
      .from(serviceAccess)
      .where(
        and(
          eq(serviceAccess.userId, userId),
          eq(serviceAccess.serviceName, serviceName),
          eq(serviceAccess.status, 'active')
        )
      );
    return service;
  }

  async regenerateServicePassword(userId: string, serviceName: string): Promise<ServiceAccess> {
    const newPassword = this.generateServicePassword();
    const [updatedService] = await db
      .update(serviceAccess)
      .set({ password: newPassword })
      .where(
        and(
          eq(serviceAccess.userId, userId),
          eq(serviceAccess.serviceName, serviceName),
          eq(serviceAccess.status, 'active')
        )
      )
      .returning();
    return updatedService;
  }

  // Utility methods
  generateServicePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  generateUserId(): string {
    return nanoid();
  }

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async removeUserService(userId: string, serviceName: string): Promise<void> {
    await db.delete(serviceAccess)
      .where(and(
        eq(serviceAccess.userId, userId),
        eq(serviceAccess.serviceName, serviceName)
      ));
  }

  async removeAllUserServices(userId: string): Promise<void> {
    await db.delete(serviceAccess).where(eq(serviceAccess.userId, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    // Delete user's service access first
    await db.delete(serviceAccess).where(eq(serviceAccess.userId, userId));

    // Delete user's subscriptions
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId));

    // Delete the user
    await db.delete(users).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();

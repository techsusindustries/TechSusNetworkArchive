import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique(),
  password: varchar("password"), // for username/password auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  plan: varchar("plan").notNull(), // 'low', 'medium', 'high'
  status: varchar("status").notNull().default('active'), // 'active', 'cancelled'
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceAccess = pgTable("service_access", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  serviceName: varchar("service_name").notNull(), // 'ksm-browser', 'ksm-application', 'ksm-desktop', 'ytmp4', 'eaglercraft', 'selenite', 'materialious', 'adea', 'fgea', 'spea', 'techsus-anysite'
  password: varchar("password").notNull(), // auto-generated 8-char password
  accessType: varchar("access_type").notNull(), // 'subscription' or 'individual'
  status: varchar("status").notNull().default('active'), // 'active', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  plan: true,
  status: true,
  stripePaymentIntentId: true,
});

export const insertServiceAccessSchema = createInsertSchema(serviceAccess).pick({
  userId: true,
  serviceName: true,
  password: true,
  accessType: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type ServiceAccess = typeof serviceAccess.$inferSelect;
export type InsertServiceAccess = z.infer<typeof insertServiceAccessSchema>;
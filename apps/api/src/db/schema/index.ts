import {
  bigint,
  boolean,
  date,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("account_issuer_accountId_uidx").on(t.issuer, t.accountId)],
)

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const twoFactor = pgTable("two_factor", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  verified: boolean("verified").default(true),
  failedVerificationCount: integer("failed_verification_count").default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
})

export const contact = pgTable(
  "contact",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("contact_id_user_id_key").on(t.id, t.userId)],
)

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status").notNull(),
    position: integer("position").notNull().default(0),
    contactId: text("contact_id"),
    startedAt: date("started_at").notNull(),
    endedAt: date("ended_at"),
    dealKind: text("deal_kind").notNull(),
    dealAmountCents: bigint("deal_amount_cents", { mode: "bigint" }).notNull().default(0n),
    dealCurrency: text("deal_currency").notNull().default("BRL"),
    dealInstallments: integer("deal_installments"),
    repoFullName: text("repo_full_name"),
    repoUrl: text("repo_url"),
    repoWorkflow: text("repo_workflow"),
    description: text("description"),
    comments: jsonb("comments").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("project_id_user_id_key").on(t.id, t.userId),
    foreignKey({
      name: "project_contact_user_fk",
      columns: [t.contactId, t.userId],
      foreignColumns: [contact.id, contact.userId],
    }).onDelete("set null"),
  ],
)

export const projectTool = pgTable(
  "project_tool",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    catalogId: text("catalog_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    account: text("account"),
    amountCents: bigint("amount_cents", { mode: "bigint" }),
    currency: text("currency"),
    cycle: text("cycle"),
    nextInvoice: date("next_invoice"),
    payer: text("payer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("project_tool_id_user_id_key").on(t.id, t.userId),
    foreignKey({
      name: "project_tool_project_user_fk",
      columns: [t.projectId, t.userId],
      foreignColumns: [project.id, project.userId],
    }).onDelete("cascade"),
  ],
)

export const credential = pgTable(
  "credential",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectToolId: text("project_tool_id").notNull(),
    label: text("label").notNull(),
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    tag: text("tag").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "credential_tool_user_fk",
      columns: [t.projectToolId, t.userId],
      foreignColumns: [projectTool.id, projectTool.userId],
    }).onDelete("cascade"),
  ],
)

export const invoice = pgTable(
  "invoice",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentMethod: text("payment_method"),
    referenceMonth: text("reference_month"),
    payerName: text("payer_name").notNull().default(""),
    hasAttachment: boolean("has_attachment").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("invoice_id_user_id_key").on(t.id, t.userId),
    foreignKey({
      name: "invoice_project_user_fk",
      columns: [t.projectId, t.userId],
      foreignColumns: [project.id, project.userId],
    }).onDelete("cascade"),
  ],
)

export const payment = pgTable(
  "payment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id").notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    method: text("method").notNull(),
  },
  (t) => [
    foreignKey({
      name: "payment_invoice_user_fk",
      columns: [t.invoiceId, t.userId],
      foreignColumns: [invoice.id, invoice.userId],
    }).onDelete("cascade"),
  ],
)

export const customTool = pgTable(
  "custom_tool",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
  },
  (t) => [unique().on(t.userId, t.name)],
)

export const userKey = pgTable("user_key", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  wrappedDek: text("wrapped_dek").notNull(),
  iv: text("iv").notNull(),
  tag: text("tag").notNull(),
  masterKeyVersion: integer("master_key_version").notNull().default(1),
})

export const githubToken = pgTable("github_token", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  login: text("login"),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  tag: text("tag").notNull(),
  version: integer("version").notNull().default(1),
  hookId: text("hook_id").notNull().unique(),
  hookSecret: text("hook_secret").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  module: text("module").notNull(),
  action: text("action").notNull(),
  subjectId: text("subject_id"),
  subjectLabel: text("subject_label"),
  projectId: text("project_id"),
  changes: jsonb("changes")
    .$type<{ field: string; from: string; to: string }[]>()
    .notNull()
    .default([]),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const schema = {
  user,
  session,
  account,
  verification,
  twoFactor,
  contact,
  project,
  projectTool,
  credential,
  invoice,
  payment,
  customTool,
  userKey,
  githubToken,
  auditLog,
}

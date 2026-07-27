import { pgTable, serial, text, integer, numeric, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  employeeCode: text("employee_code").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  department: text("department"),
  dateOfJoining: date("date_of_joining"),
  status: text("status", { enum: ["active", "inactive", "terminated"] }).notNull().default("active"),
  // Salary structure (monthly amounts in ₹)
  basic: numeric("basic", { precision: 12, scale: 2 }).notNull().default("0"),
  hra: numeric("hra", { precision: 12, scale: 2 }).notNull().default("0"),
  allowances: numeric("allowances", { precision: 12, scale: 2 }).notNull().default("0"),
  otherDeductions: numeric("other_deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  pfEnabled: boolean("pf_enabled").notNull().default(false),
  esiEnabled: boolean("esi_enabled").notNull().default(false),
  // Bank details
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  ifsc: text("ifsc"),
  panNumber: text("pan_number"),
  // Leave balances stored as jsonb { casual: 12, sick: 7, ... }
  leaveBalances: jsonb("leave_balances").$type<Record<string, number>>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: text("status", { enum: ["present", "absent", "half", "leave", "holiday", "weekoff"] }).notNull(),
  leaveType: text("leave_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payrollRunsTable = pgTable("payroll_runs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  periodMonth: integer("period_month").notNull(),
  periodYear: integer("period_year").notNull(),
  status: text("status", { enum: ["draft", "computed", "paid"] }).notNull().default("draft"),
  totalGross: numeric("total_gross", { precision: 14, scale: 2 }).notNull().default("0"),
  totalDeductions: numeric("total_deductions", { precision: 14, scale: 2 }).notNull().default("0"),
  totalNet: numeric("total_net", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payslipsTable = pgTable("payslips", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  payrollRunId: integer("payroll_run_id").notNull().references(() => payrollRunsTable.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "restrict" }),
  // Snapshot of salary structure at run time
  basic: numeric("basic", { precision: 12, scale: 2 }).notNull(),
  hra: numeric("hra", { precision: 12, scale: 2 }).notNull(),
  allowances: numeric("allowances", { precision: 12, scale: 2 }).notNull(),
  daysWorked: numeric("days_worked", { precision: 6, scale: 2 }).notNull(),
  daysInMonth: integer("days_in_month").notNull(),
  lopAmount: numeric("lop_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  pfAmount: numeric("pf_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  esiAmount: numeric("esi_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  otherDeductions: numeric("other_deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  gross: numeric("gross", { precision: 12, scale: 2 }).notNull(),
  deductions: numeric("deductions", { precision: 12, scale: 2 }).notNull(),
  net: numeric("net", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "paid"] }).notNull().default("pending"),
  paidAt: timestamp("paid_at"),
});

export const leaveRequestsTable = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  leaveType: text("leave_type").notNull().default("casual"),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  days: numeric("days", { precision: 5, scale: 1 }).notNull().default("1"),
  reason: text("reason"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  approverId: integer("approver_id"),
  decidedAt: timestamp("decided_at"),
  decisionNote: text("decision_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type LeaveRequest = typeof leaveRequestsTable.$inferSelect;

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true });
export const insertPayrollRunSchema = createInsertSchema(payrollRunsTable).omit({ id: true, createdAt: true });
export const insertPayslipSchema = createInsertSchema(payslipsTable).omit({ id: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
export type Attendance = typeof attendanceTable.$inferSelect;
export type PayrollRun = typeof payrollRunsTable.$inferSelect;
export type Payslip = typeof payslipsTable.$inferSelect;

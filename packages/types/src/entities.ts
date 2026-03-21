/**
 * @file entities.ts
 * @description Shared TypeScript interfaces for all PawRoute data entities.
 * These mirror the Prisma schema exactly so they can be used safely across
 * API responses, frontend state, and mobile app data layers.
 */

import type { PetSizeKey, PetTypeKey } from '@pawroute/config';

// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'CUSTOMER';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'GROOMER';
export type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';
export type PaymentMethod = 'CARD' | 'UPI' | 'WALLET' | 'CASH';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type DiscountType = 'FLAT' | 'PERCENTAGE';
export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'REMINDER_24H'
  | 'REMINDER_2H'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAYMENT_SUCCESS'
  | 'PROMOTIONAL';
export type GalleryBeforeAfter = 'BEFORE' | 'AFTER' | 'GENERAL';
export type LoyaltyTransactionType = 'EARN' | 'REDEEM' | 'EXPIRE' | 'REFERRAL_BONUS';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePhoto: string | null;
  googleId: string | null;
  facebookId: string | null;
  otpVerified: boolean;
  fcmToken: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic
  extends Pick<User, 'id' | 'name' | 'email' | 'phone' | 'profilePhoto' | 'createdAt'> {}

// ─── Address ──────────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  userId: string;
  label: string; // e.g. "Home", "Work"
  street: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Pet ──────────────────────────────────────────────────────────────────────

export interface Pet {
  id: string;
  userId: string;
  name: string;
  type: PetTypeKey;
  breed: string;
  ageYears: number;
  ageMonths: number;
  weightKg: number;
  sizeCategory: PetSizeKey; // auto-classified from weight
  gender: PetGender;
  photo: string | null;
  specialNotes: string | null;
  detectedBreed: string | null; // AI-detected breed suggestion
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  petType: PetTypeKey;
  sortOrder: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  categoryId: string;
  category?: ServiceCategory;
  name: string;
  description: string;
  durationMin: number;
  sortOrder: number;
  isActive: boolean;
  pricing?: ServicePricing[];
  addons?: Addon[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePricing {
  id: string;
  serviceId: string;
  sizeLabel: PetSizeKey;
  price: number;
}

export interface Addon {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  isActive: boolean;
  deletedAt: string | null;
}

// ─── Time Slot ────────────────────────────────────────────────────────────────

export interface TimeSlot {
  id: string;
  date: string; // ISO date: YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  groomerId: string | null;
  capacity: number;
  bookedCount: number;
  isBlocked: boolean;
  blockReason: string | null;
  createdAt: string;
}

export interface TimeSlotAvailability extends Pick<TimeSlot, 'id' | 'startTime' | 'endTime' | 'capacity' | 'bookedCount'> {
  available: boolean;
  remainingCapacity: number;
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  bookingRef: string; // PAW-YYYYMMDD-XXXX
  userId: string;
  user?: UserPublic;
  petId: string;
  pet?: Pet;
  serviceId: string;
  service?: Service;
  addonIds: string[];
  addons?: Addon[];
  groomerId: string | null;
  slotId: string;
  slot?: TimeSlot;
  sizeCategory: PetSizeKey;
  status: AppointmentStatus;
  notes: string | null;
  internalNotes: string | null; // admin-only
  totalAmount: number;
  serviceFee: number;
  addonFee: number;
  discountAmount: number;
  couponCode: string | null;
  payment?: Payment;
  cancelledBy: 'CUSTOMER' | 'ADMIN' | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentActivity {
  id: string;
  appointmentId: string;
  action: string;
  performedBy: string;
  performedByType: 'CUSTOMER' | 'ADMIN';
  note: string | null;
  createdAt: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayRef: string | null; // Stripe PaymentIntent ID
  clientSecret: string | null; // Stripe client secret (transient)
  invoiceUrl: string | null;
  invoiceNumber: string | null;
  refundedAmount: number;
  refundReason: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Coupon ───────────────────────────────────────────────────────────────────

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string | null;
  applicableServiceIds: string[]; // empty = all services
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponValidation {
  valid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  error?: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null; // deep link data
  isRead: boolean;
  sentAt: string;
  createdAt: string;
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

export interface GalleryImage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  petType: PetTypeKey | null;
  beforeAfterType: GalleryBeforeAfter;
  caption: string | null;
  sortOrder: number;
  uploadedAt: string;
}

// ─── Review (Phase 2) ─────────────────────────────────────────────────────────

export interface Review {
  id: string;
  userId: string;
  user?: UserPublic;
  appointmentId: string;
  rating: number; // 1-5
  comment: string | null;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Loyalty (Phase 2) ───────────────────────────────────────────────────────

export interface LoyaltyPoints {
  id: string;
  userId: string;
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  appointmentId: string | null;
  type: LoyaltyTransactionType;
  points: number;
  description: string;
  expiresAt: string | null;
  createdAt: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  admin?: Pick<AdminUser, 'id' | 'name' | 'email' | 'role'>;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettings {
  id: string;
  businessName: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  city: string;
  country: string;
  mapLat: number | null;
  mapLng: number | null;
  workingHours: WorkingHours;
  // Overridable booking rules (override appConfig.booking defaults)
  cancellationWindowHours: number;
  slotHoldMinutes: number;
  maxAdvanceBookingDays: number;
  vatEnabled: boolean;
  vatRate: number;
  vatNumber: string;
  currency: string;
  timezone: string;
  updatedAt: string;
}

export interface WorkingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalBookings: number;
  totalBookingsChangePercent: number;
  todayAppointments: number;
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  activeCustomers: number;
  pendingAppointments: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AuthResponse extends AuthTokens {
  user: UserPublic;
}

export interface AdminAuthResponse extends AuthTokens {
  admin: AdminUser;
}

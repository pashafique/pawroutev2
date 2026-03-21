/**
 * @file api.ts
 * @description Zod schemas for API request/response validation.
 * Shared between the backend (Fastify route schemas) and frontend (form validation).
 * Single source of truth — no divergence between client and server validation.
 */

import { z } from 'zod';
import { appConfig } from '@pawroute/config';

const { auth: authConfig, booking: bookingConfig, uploads: uploadConfig } = appConfig;

// ─── Common ───────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .coerce.number()
    .int()
    .min(1)
    .max(appConfig.pagination.maxPageSize)
    .default(appConfig.pagination.defaultPageSize),
});

export const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format'),
  password: z
    .string()
    .min(authConfig.passwordMinLength, `Password must be at least ${authConfig.passwordMinLength} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const LoginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
  fcmToken: z.string().optional(),
});

export const OtpSendSchema = z.object({
  type: z.enum(['email', 'whatsapp']),
  target: z.string().min(1),
  name: z.string().min(1).default('there'),
});

export const OtpVerifySchema = z.object({
  target: z.string().min(1),
  otp: z.string().length(authConfig.otpLength, `OTP must be ${authConfig.otpLength} digits`),
  channel: z.enum(['email', 'whatsapp']).default('email'),
});

export const GoogleSsoSchema = z.object({
  idToken: z.string().min(1),
  fcmToken: z.string().optional(),
});

export const FacebookSsoSchema = z.object({
  accessToken: z.string().min(1),
  fcmToken: z.string().optional(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(authConfig.passwordMinLength)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(authConfig.passwordMinLength)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── User / Profile Schemas ───────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/).optional(),
});

export const AddressSchema = z.object({
  label: z.string().min(1).max(50).default('Home'),
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  zip: z.string().min(1).max(20),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
});

export const NotificationPreferencesSchema = z.object({
  pushBookings: z.boolean(),
  pushReminders: z.boolean(),
  pushPromotions: z.boolean(),
  emailBookings: z.boolean(),
  emailPromotions: z.boolean(),
});

// ─── Pet Schemas ──────────────────────────────────────────────────────────────

export const PetSchema = z.object({
  name: z.string().min(1, 'Pet name is required').max(50),
  type: z.enum(['DOG', 'CAT']),
  breed: z.string().min(1).max(100),
  ageYears: z.coerce.number().int().min(0).max(30),
  ageMonths: z.coerce.number().int().min(0).max(11),
  weightKg: z.coerce
    .number()
    .positive('Weight must be a positive number')
    .max(200, 'Weight seems too high'),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']),
  specialNotes: z.string().max(500).optional(),
});

export const UpdatePetSchema = PetSchema.partial();

// ─── Booking / Appointment Schemas ────────────────────────────────────────────

export const CreateAppointmentSchema = z.object({
  petId: z.string().uuid('Invalid pet ID'),
  serviceId: z.string().uuid('Invalid service ID'),
  addonIds: z.array(z.string().uuid()).max(bookingConfig.maxAddonsPerBooking).default([]),
  slotId: z.string().uuid('Invalid slot ID'),
  sizeCategory: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'XL']),
  notes: z.string().max(500).optional(),
  couponCode: z.string().max(20).optional(),
  paymentMethod: z.enum(['CARD', 'UPI', 'WALLET', 'CASH']),
});

export const CancelAppointmentSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

export const RescheduleAppointmentSchema = z.object({
  slotId: z.string().uuid('Invalid slot ID'),
});

// ─── Payment Schemas ──────────────────────────────────────────────────────────

export const CreatePaymentIntentSchema = z.object({
  appointmentId: z.string().uuid(),
  method: z.enum(['CARD', 'UPI', 'WALLET']),
});

export const ConfirmPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  gatewayRef: z.string().min(1),
});

// ─── Coupon Schemas ───────────────────────────────────────────────────────────

export const ValidateCouponSchema = z.object({
  code: z.string().min(1).max(20),
  appointmentTotal: z.number().positive(),
  serviceId: z.string().uuid().optional(),
});

// ─── Admin Schemas ────────────────────────────────────────────────────────────

export const CreateServiceSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  durationMin: z.coerce.number().int().min(15).max(480),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  pricing: z.array(
    z.object({
      sizeLabel: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'XL']),
      price: z.number().positive(),
    })
  ).min(1, 'At least one pricing tier is required'),
});

export const CreateSlotSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm format'),
  capacity: z.coerce.number().int().min(1).max(10).default(1),
  groomerId: z.string().uuid().optional(),
});

export const UpdateAppointmentStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  reason: z.string().max(500).optional(),
  internalNote: z.string().max(1000).optional(),
});

export const CreateCouponSchema = z.object({
  code: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/, 'Code must be uppercase alphanumeric'),
  discountType: z.enum(['FLAT', 'PERCENTAGE']),
  discountValue: z.number().positive().max(100, 'Percentage cannot exceed 100'),
  minOrderValue: z.number().nonnegative().optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  perUserLimit: z.coerce.number().int().positive().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
  applicableServiceIds: z.array(z.string().uuid()).default([]),
  isActive: z.boolean().default(true),
});

export const BroadcastNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  segment: z.enum(['ALL', 'ACTIVE_30D', 'INACTIVE_90D', 'SPECIFIC']).default('ALL'),
  userIds: z.array(z.string().uuid()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const CreateAdminUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'GROOMER']), // SUPER_ADMIN can only be set in DB
  password: z.string().min(authConfig.passwordMinLength),
});

export const UpdateBusinessSettingsSchema = z.object({
  businessName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  mapLat: z.number().min(-90).max(90).optional(),
  mapLng: z.number().min(-180).max(180).optional(),
  cancellationWindowHours: z.number().int().min(0).max(168).optional(),
  vatEnabled: z.boolean().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  vatNumber: z.string().max(50).optional(),
  currency: z.string().length(3).optional(),
});

export const CreateFaqSchema = z.object({
  question: z.string().min(5).max(300),
  answer: z.string().min(10).max(2000),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

// ─── Type Inference ───────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PetInput = z.infer<typeof PetSchema>;
export type UpdatePetInput = z.infer<typeof UpdatePetSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type CreateSlotInput = z.infer<typeof CreateSlotSchema>;
export type CreateCouponInput = z.infer<typeof CreateCouponSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof UpdateAppointmentStatusSchema>;
export type BroadcastNotificationInput = z.infer<typeof BroadcastNotificationSchema>;
export type UpdateBusinessSettingsInput = z.infer<typeof UpdateBusinessSettingsSchema>;

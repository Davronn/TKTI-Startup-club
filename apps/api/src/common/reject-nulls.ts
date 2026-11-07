import { BadRequestException } from '@nestjs/common';

/**
 * PATCH DTO'larida `@IsOptional()` `null` qiymatni ham o'tkazib yuboradi.
 * Majburiy (NOT NULL) ustunlar uchun `null` kelsa, 500 xato o'rniga 400 qaytaramiz.
 */
export function rejectNulls<T extends object>(dto: T, fields: readonly (keyof T)[]) {
  const invalid = fields.filter((field) => (dto as Record<keyof T, unknown>)[field] === null);
  if (invalid.length) {
    throw new BadRequestException(
      invalid.map((field) => `${String(field)} bo‘sh (null) bo‘lishi mumkin emas`),
    );
  }
}

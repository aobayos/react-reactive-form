import type { ValidatorFn, ValidationErrors, AbstractControlLike, FormGroupLike } from '../types';

function isEmptyValue(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim() === '');
}

export class Validators {
  static required(control: AbstractControlLike): ValidationErrors | null {
    return isEmptyValue(control.value) ? { required: true } : null;
  }

  static requiredTrue(control: AbstractControlLike): ValidationErrors | null {
    return control.value === true ? null : { required: true };
  }

  static minLength(minLen: number): ValidatorFn {
    return (control) => {
      if (isEmptyValue(control.value)) return null;
      const length = (control.value as string | unknown[]).length;
      return length >= minLen
        ? null
        : { minlength: { requiredLength: minLen, actualLength: length } };
    };
  }

  static maxLength(maxLen: number): ValidatorFn {
    return (control) => {
      if (isEmptyValue(control.value)) return null;
      const length = (control.value as string | unknown[]).length;
      return length <= maxLen
        ? null
        : { maxlength: { requiredLength: maxLen, actualLength: length } };
    };
  }

  static min(min: number): ValidatorFn {
    return (control) => {
      if (isEmptyValue(control.value)) return null;
      const parsed = parseFloat(control.value as string);
      return isNaN(parsed) || parsed >= min
        ? null
        : { min: { min, actual: control.value } };
    };
  }

  static max(max: number): ValidatorFn {
    return (control) => {
      if (isEmptyValue(control.value)) return null;
      const parsed = parseFloat(control.value as string);
      return isNaN(parsed) || parsed <= max
        ? null
        : { max: { max, actual: control.value } };
    };
  }

  static pattern(pattern: string | RegExp): ValidatorFn {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return (control) => {
      if (isEmptyValue(control.value)) return null;
      return regex.test(String(control.value))
        ? null
        : { pattern: { requiredPattern: regex.toString(), actualValue: control.value } };
    };
  }

  static email(control: AbstractControlLike): ValidationErrors | null {
    if (isEmptyValue(control.value)) return null;
    const emailRe = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRe.test(String(control.value)) ? null : { email: true };
  }

  static compose(
    validators: (ValidatorFn | null | undefined)[]
  ): ValidatorFn | null {
    const present = validators.filter(Boolean) as ValidatorFn[];
    if (present.length === 0) return null;
    return (control) => {
      const errors: ValidationErrors = {};
      let hasError = false;
      for (const v of present) {
        const result = v(control);
        if (result) {
          Object.assign(errors, result);
          hasError = true;
        }
      }
      return hasError ? errors : null;
    };
  }

  static equals(otherField: string): ValidatorFn {
    return (control) => {
      const group = control.parent;
      if (!group) return null;
      const other = (group as unknown as FormGroupLike).controls[otherField];
      if (!other) return null;
      return control.value === other.value
        ? null
        : { equals: { field: otherField } };
    };
  }

  static nullValidator(_control: AbstractControlLike): ValidationErrors | null {
    return null;
  }
}

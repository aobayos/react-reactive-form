export type ValidationErrors = Record<string, unknown>;

export type ValidatorFn<T = unknown> = (
  control: AbstractControlLike<T>
) => ValidationErrors | null;

export type AsyncValidatorFn<T = unknown> = (
  control: AbstractControlLike<T>
) => Promise<ValidationErrors | null>;

export type ControlStatus = 'VALID' | 'INVALID' | 'PENDING' | 'DISABLED';

/**
 * Minimal interface required from a parent control.
 * Using an interface (not the class) avoids the variance issue that arises
 * when comparing two AbstractControl<T> instances with different T.
 */
export interface ControlParent {
  _notify(): void;
  _updateStatus(): void;
}

/**
 * Minimal interface for a FormGroup seen from a cross-field validator.
 * Validators cast control.parent to this to access sibling controls.
 */
export interface FormGroupLike {
  readonly controls: Record<string, AbstractControlLike>;
}

/**
 * The read/write interface a validator receives.
 * Methods use method-signature syntax so TypeScript applies bivariant checking,
 * which lets AbstractControl<string> satisfy AbstractControlLike<unknown>
 * without needing `any`.
 */
export interface AbstractControlLike<T = unknown> {
  readonly value: T;
  readonly valid: boolean;
  readonly invalid: boolean;
  readonly pending: boolean;
  readonly disabled: boolean;
  readonly enabled: boolean;
  readonly errors: ValidationErrors | null;
  readonly status: ControlStatus;
  readonly dirty: boolean;
  readonly pristine: boolean;
  readonly touched: boolean;
  readonly untouched: boolean;
  readonly parent: ControlParent | null;
  setValue(value: T, options?: { emitEvent?: boolean }): void;
  markAsTouched(): void;
}

export interface FormControlOptions<T = unknown> {
  validators?: ValidatorFn<T> | ValidatorFn<T>[];
  asyncValidators?: AsyncValidatorFn<T> | AsyncValidatorFn<T>[];
  disabled?: boolean;
}

export interface ControlConfig<T = unknown> {
  value: T;
  validators?: ValidatorFn<T> | ValidatorFn<T>[];
  asyncValidators?: AsyncValidatorFn<T> | AsyncValidatorFn<T>[];
  disabled?: boolean;
}

export type FormGroupControls = Record<string, AbstractControlLike>;

export type FormGroupValue<T extends FormGroupControls> = {
  [K in keyof T]: T[K] extends AbstractControlLike<infer V> ? V : never;
};

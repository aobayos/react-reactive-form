import { AbstractControl } from './AbstractControl';
import type {
  ValidatorFn,
  AsyncValidatorFn,
  FormControlOptions,
} from '../types';

export class FormControl<T = unknown> extends AbstractControl<T> {
  constructor(
    value: T,
    validatorsOrOptions?:
      | ValidatorFn<T>
      | ValidatorFn<T>[]
      | FormControlOptions<T>,
    asyncValidators?: AsyncValidatorFn<T> | AsyncValidatorFn<T>[]
  ) {
    let validators: ValidatorFn<T> | ValidatorFn<T>[] = [];
    let async: AsyncValidatorFn<T> | AsyncValidatorFn<T>[] = [];
    let disabled = false;

    if (
      validatorsOrOptions &&
      !Array.isArray(validatorsOrOptions) &&
      typeof validatorsOrOptions === 'object' &&
      !('length' in validatorsOrOptions)
    ) {
      const opts = validatorsOrOptions as FormControlOptions<T>;
      validators = opts.validators ?? [];
      async = opts.asyncValidators ?? [];
      disabled = opts.disabled ?? false;
    } else if (validatorsOrOptions) {
      validators = validatorsOrOptions as ValidatorFn<T> | ValidatorFn<T>[];
      async = asyncValidators ?? [];
    }

    super(value, validators, async);
    if (disabled) {
      this._disabled = true;
      this._status = 'DISABLED';
    } else {
      this._runValidation();
    }
  }

  setValue(value: T, options: { emitEvent?: boolean } = {}): void {
    this._value = value;
    this._dirty = true;
    this._runValidation();
    if (options.emitEvent !== false) this._notify();
  }

  patchValue(value: T, options: { emitEvent?: boolean } = {}): void {
    this.setValue(value, options);
  }

  reset(value?: T): void {
    this._value = value !== undefined ? value : ('' as unknown as T);
    this._dirty = false;
    this._touched = false;
    this._runValidation();
    this._notify();
  }

  _updateStatus(): void {
    this._runValidation();
  }
}

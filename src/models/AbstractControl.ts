import type {
  ControlStatus,
  ControlParent,
  ValidationErrors,
  ValidatorFn,
  AsyncValidatorFn,
} from '../types';

type Listener = () => void;

export abstract class AbstractControl<T = unknown> {
  protected _value: T;
  protected _status: ControlStatus = 'VALID';
  protected _errors: ValidationErrors | null = null;
  protected _dirty = false;
  protected _touched = false;
  protected _disabled = false;
  protected _validators: ValidatorFn<T>[];
  protected _asyncValidators: AsyncValidatorFn<T>[];
  protected _asyncGeneration = 0;
  protected _listeners = new Set<Listener>();
  protected _parent: ControlParent | null = null;

  constructor(
    value: T,
    validators: ValidatorFn<T> | ValidatorFn<T>[] = [],
    asyncValidators: AsyncValidatorFn<T> | AsyncValidatorFn<T>[] = []
  ) {
    this._value = value;
    this._validators = Array.isArray(validators) ? validators : [validators];
    this._asyncValidators = Array.isArray(asyncValidators)
      ? asyncValidators
      : [asyncValidators];
  }

  get value(): T {
    return this._value;
  }

  get status(): ControlStatus {
    return this._status;
  }

  get errors(): ValidationErrors | null {
    return this._errors;
  }

  get valid(): boolean {
    return this._status === 'VALID';
  }

  get invalid(): boolean {
    return this._status === 'INVALID';
  }

  get pending(): boolean {
    return this._status === 'PENDING';
  }

  get disabled(): boolean {
    return this._disabled;
  }

  get enabled(): boolean {
    return !this._disabled;
  }

  get dirty(): boolean {
    return this._dirty;
  }

  get pristine(): boolean {
    return !this._dirty;
  }

  get touched(): boolean {
    return this._touched;
  }

  get untouched(): boolean {
    return !this._touched;
  }

  get parent(): ControlParent | null {
    return this._parent;
  }

  setParent(parent: ControlParent): void {
    this._parent = parent;
  }

  markAsDirty(): void {
    this._dirty = true;
    this._notify();
  }

  markAsPristine(): void {
    this._dirty = false;
    this._notify();
  }

  markAsTouched(): void {
    this._touched = true;
    this._notify();
  }

  markAsUntouched(): void {
    this._touched = false;
    this._notify();
  }

  disable(): void {
    this._disabled = true;
    this._status = 'DISABLED';
    this._notify();
  }

  enable(): void {
    this._disabled = false;
    this._runValidation();
    this._notify();
  }

  setValidators(validators: ValidatorFn<T> | ValidatorFn<T>[]): void {
    this._validators = Array.isArray(validators) ? validators : [validators];
    this._runValidation();
  }

  clearValidators(): void {
    this._validators = [];
    this._runValidation();
  }

  setErrors(errors: ValidationErrors | null): void {
    this._errors = errors;
    this._status = errors ? 'INVALID' : 'VALID';
    this._notify();
    this._parent?._updateStatus();
  }

  getError(errorCode: string): unknown {
    return this._errors?.[errorCode] ?? null;
  }

  hasError(errorCode: string): boolean {
    return this._errors != null && errorCode in this._errors;
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  // Not protected — must be accessible via the ControlParent interface
  // so parent controls can call it on their children without needing `any`.
  _notify(): void {
    this._listeners.forEach((l) => l());
    this._parent?._notify();
  }

  protected _runValidation(): void {
    if (this._disabled) {
      this._errors = null;
      this._status = 'DISABLED';
      return;
    }

    const errors = this._runSyncValidators();
    this._errors = errors;
    this._status = errors ? 'INVALID' : 'VALID';

    if (!errors && this._asyncValidators.length > 0) {
      this._status = 'PENDING';
      this._runAsyncValidators();
    }
  }

  protected _runSyncValidators(): ValidationErrors | null {
    if (this._validators.length === 0) return null;
    const errors: ValidationErrors = {};
    let hasError = false;
    for (const validator of this._validators) {
      const result = validator(this);
      if (result) {
        Object.assign(errors, result);
        hasError = true;
      }
    }
    return hasError ? errors : null;
  }

  protected _runAsyncValidators(): void {
    const generation = ++this._asyncGeneration;
    const current = this._asyncValidators.map((v) => v(this));
    Promise.all(current).then((results) => {
      if (generation !== this._asyncGeneration) return;
      const errors: ValidationErrors = {};
      let hasError = false;
      for (const result of results) {
        if (result) {
          Object.assign(errors, result);
          hasError = true;
        }
      }
      this._errors = hasError ? errors : null;
      this._status = hasError ? 'INVALID' : 'VALID';
      this._notify();
      this._parent?._updateStatus();
    });
  }

  abstract setValue(value: T, options?: { emitEvent?: boolean }): void;
  abstract reset(value?: T): void;
  abstract _updateStatus(): void;
}

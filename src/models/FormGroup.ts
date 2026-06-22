import { AbstractControl } from './AbstractControl';
import type { ValidatorFn, AsyncValidatorFn, ValidationErrors } from '../types';

type Controls = Record<string, AbstractControl>;

type GroupValue<T extends Controls> = {
  [K in keyof T]: T[K] extends AbstractControl<infer V> ? V : never;
};

export class FormGroup<T extends Controls = Controls> extends AbstractControl<
  GroupValue<T>
> {
  readonly controls: T;

  constructor(
    controls: T,
    validators: ValidatorFn<GroupValue<T>> | ValidatorFn<GroupValue<T>>[] = [],
    asyncValidators:
      | AsyncValidatorFn<GroupValue<T>>
      | AsyncValidatorFn<GroupValue<T>>[] = []
  ) {
    super({} as GroupValue<T>, validators, asyncValidators);
    this.controls = controls;
    for (const ctrl of Object.values(controls)) {
      ctrl.setParent(this);
    }
    this._value = this._collectValue();
    this._updateStatus();
  }

  get<K extends keyof T>(name: K): T[K] {
    return this.controls[name];
  }

  setValue(
    value: GroupValue<T>,
    options: { emitEvent?: boolean } = {}
  ): void {
    for (const key of Object.keys(value) as (keyof T)[]) {
      if (this.controls[key]) {
        (this.controls[key] as AbstractControl).setValue(
          value[key] as never,
          { emitEvent: false }
        );
      }
    }
    this._value = this._collectValue();
    this._updateStatus();
    if (options.emitEvent !== false) this._notify();
  }

  patchValue(
    value: Partial<GroupValue<T>>,
    options: { emitEvent?: boolean } = {}
  ): void {
    for (const key of Object.keys(value) as (keyof T)[]) {
      if (this.controls[key] && value[key] !== undefined) {
        (this.controls[key] as AbstractControl).setValue(
          value[key] as never,
          { emitEvent: false }
        );
      }
    }
    this._value = this._collectValue();
    this._updateStatus();
    if (options.emitEvent !== false) this._notify();
  }

  reset(value?: Partial<GroupValue<T>>): void {
    for (const key of Object.keys(this.controls) as (keyof T)[]) {
      (this.controls[key] as AbstractControl).reset(
        value?.[key] as never
      );
    }
    this._dirty = false;
    this._touched = false;
    this._value = this._collectValue();
    this._updateStatus();
    this._notify();
  }

  addControl(name: string, control: AbstractControl): void {
    (this.controls as Controls)[name] = control;
    control.setParent(this);
    this._value = this._collectValue();
    this._updateStatus();
    this._notify();
  }

  removeControl(name: string): void {
    delete (this.controls as Controls)[name];
    this._value = this._collectValue();
    this._updateStatus();
    this._notify();
  }

  contains(name: string): boolean {
    return name in this.controls;
  }

  _updateStatus(): void {
    this._value = this._collectValue();

    let hasDisabled = false;
    let hasInvalid = false;
    let hasPending = false;

    for (const ctrl of Object.values(this.controls)) {
      if (ctrl.disabled) { hasDisabled = true; continue; }
      if (ctrl.pending) hasPending = true;
      if (ctrl.invalid) hasInvalid = true;
    }

    if (this._disabled) {
      this._status = 'DISABLED';
    } else if (hasPending) {
      this._status = 'PENDING';
    } else {
      const groupErrors = this._runSyncValidators();
      const childInvalid = hasInvalid;
      this._errors = groupErrors;
      this._status = groupErrors || childInvalid ? 'INVALID' : 'VALID';
    }
    void hasDisabled;
  }

  private _collectValue(): GroupValue<T> {
    const value = {} as GroupValue<T>;
    for (const key of Object.keys(this.controls) as (keyof T)[]) {
      const ctrl = this.controls[key];
      if (!ctrl.disabled) {
        (value as Record<keyof T, unknown>)[key] = ctrl.value;
      }
    }
    return value;
  }

  getRawValue(): GroupValue<T> {
    const value = {} as GroupValue<T>;
    for (const key of Object.keys(this.controls) as (keyof T)[]) {
      (value as Record<keyof T, unknown>)[key] = this.controls[key].value;
    }
    return value;
  }

  getErrors(): ValidationErrors | null {
    return this._errors;
  }

  getControlErrors(name: string): ValidationErrors | null {
    return (this.controls as Controls)[name]?.errors ?? null;
  }

  markAllTouched(): void {
    for (const ctrl of Object.values(this.controls)) {
      ctrl.markAsTouched();
    }
    this._notify();
  }
}

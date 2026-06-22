import { AbstractControl } from './AbstractControl';
import type { ValidatorFn, AsyncValidatorFn } from '../types';

export class FormArray<T = unknown> extends AbstractControl<T[]> {
  readonly controls: AbstractControl<T>[];

  constructor(
    controls: AbstractControl<T>[],
    validators: ValidatorFn<T[]> | ValidatorFn<T[]>[] = [],
    asyncValidators: AsyncValidatorFn<T[]> | AsyncValidatorFn<T[]>[] = []
  ) {
    super([], validators, asyncValidators);
    this.controls = controls;
    for (const ctrl of controls) {
      ctrl.setParent(this);
    }
    this._updateStatus();
  }

  get length(): number {
    return this.controls.length;
  }

  at(index: number): AbstractControl<T> {
    return this.controls[index];
  }

  push(control: AbstractControl<T>): void {
    this.controls.push(control);
    control.setParent(this);
    this._updateStatus();
    this._notify();
  }

  insert(index: number, control: AbstractControl<T>): void {
    this.controls.splice(index, 0, control);
    control.setParent(this);
    this._updateStatus();
    this._notify();
  }

  removeAt(index: number): void {
    this.controls.splice(index, 1);
    this._updateStatus();
    this._notify();
  }

  setValue(value: T[], options: { emitEvent?: boolean } = {}): void {
    for (let i = 0; i < value.length; i++) {
      if (this.controls[i]) {
        this.controls[i].setValue(value[i], { emitEvent: false });
      }
    }
    this._updateStatus();
    if (options.emitEvent !== false) this._notify();
  }

  patchValue(value: T[], options: { emitEvent?: boolean } = {}): void {
    const len = Math.min(value.length, this.controls.length);
    for (let i = 0; i < len; i++) {
      this.controls[i].setValue(value[i], { emitEvent: false });
    }
    this._updateStatus();
    if (options.emitEvent !== false) this._notify();
  }

  reset(value?: T[]): void {
    for (let i = 0; i < this.controls.length; i++) {
      this.controls[i].reset(value?.[i]);
    }
    this._dirty = false;
    this._touched = false;
    this._updateStatus();
    this._notify();
  }

  clear(): void {
    this.controls.splice(0, this.controls.length);
    this._updateStatus();
    this._notify();
  }

  getRawValue(): T[] {
    return this.controls.map((c) => c.value);
  }

  _updateStatus(): void {
    this._value = this.controls
      .filter((c) => !c.disabled)
      .map((c) => c.value);

    let hasInvalid = false;
    let hasPending = false;

    for (const ctrl of this.controls) {
      if (ctrl.disabled) continue;
      if (ctrl.pending) hasPending = true;
      if (ctrl.invalid) hasInvalid = true;
    }

    if (this._disabled) {
      this._status = 'DISABLED';
    } else if (hasPending) {
      this._status = 'PENDING';
    } else {
      const arrayErrors = this._runSyncValidators();
      this._errors = arrayErrors;
      this._status = arrayErrors || hasInvalid ? 'INVALID' : 'VALID';
    }
  }
}

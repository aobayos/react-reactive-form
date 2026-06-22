import { FormControl } from './FormControl';
import { FormGroup } from './FormGroup';
import { FormArray } from './FormArray';
import { AbstractControl } from './AbstractControl';
import type { ValidatorFn, AsyncValidatorFn, FormControlOptions } from '../types';

type ControlConfig<T> =
  | [T]
  | [T, ValidatorFn<T> | ValidatorFn<T>[] | FormControlOptions<T>]
  | [T, ValidatorFn<T> | ValidatorFn<T>[], AsyncValidatorFn<T> | AsyncValidatorFn<T>[]];

type GroupConfig = Record<string, ControlConfig<unknown> | AbstractControl>;

type GroupControls<T extends GroupConfig> = {
  [K in keyof T]: T[K] extends AbstractControl
    ? T[K]
    : T[K] extends ControlConfig<infer V>
    ? FormControl<V>
    : never;
};

export class FormBuilder {
  group<T extends GroupConfig>(
    config: T,
    options?: {
      validators?: ValidatorFn | ValidatorFn[];
      asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[];
    }
  ): FormGroup<GroupControls<T>> {
    const controls = {} as Record<string, AbstractControl>;

    for (const key of Object.keys(config)) {
      const entry = config[key];
      if (entry instanceof AbstractControl) {
        controls[key] = entry;
      } else if (Array.isArray(entry)) {
        const [value, validatorsOrOpts, asyncVals] = entry as [
          unknown,
          ValidatorFn | ValidatorFn[] | FormControlOptions | undefined,
          AsyncValidatorFn | AsyncValidatorFn[] | undefined
        ];
        controls[key] = new FormControl(value, validatorsOrOpts, asyncVals);
      }
    }

    return new FormGroup<GroupControls<T>>(
      controls as GroupControls<T>,
      options?.validators,
      options?.asyncValidators
    );
  }

  control<T>(
    value: T,
    validatorsOrOptions?: ValidatorFn<T> | ValidatorFn<T>[] | FormControlOptions<T>,
    asyncValidators?: AsyncValidatorFn<T> | AsyncValidatorFn<T>[]
  ): FormControl<T> {
    return new FormControl(value, validatorsOrOptions, asyncValidators);
  }

  array<T>(
    controls: AbstractControl<T>[],
    validators?: ValidatorFn<T[]> | ValidatorFn<T[]>[],
    asyncValidators?: AsyncValidatorFn<T[]> | AsyncValidatorFn<T[]>[]
  ): FormArray<T> {
    return new FormArray(controls, validators, asyncValidators);
  }
}

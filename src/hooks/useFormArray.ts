import { useReducer, useRef, useEffect } from 'react';
import { FormArray } from '../models/FormArray';
import { AbstractControl } from '../models/AbstractControl';
import type { ValidatorFn, AsyncValidatorFn } from '../types';

const forceUpdate = () => ({});

export function useFormArray<T>(
  factory: () => FormArray<T>,
): FormArray<T>;
export function useFormArray<T>(
  controls: AbstractControl<T>[],
  validators?: ValidatorFn<T[]> | ValidatorFn<T[]>[],
  asyncValidators?: AsyncValidatorFn<T[]> | AsyncValidatorFn<T[]>[]
): FormArray<T>;
export function useFormArray<T>(
  controlsOrFactory: AbstractControl<T>[] | (() => FormArray<T>),
  validators?: ValidatorFn<T[]> | ValidatorFn<T[]>[],
  asyncValidators?: AsyncValidatorFn<T[]> | AsyncValidatorFn<T[]>[]
): FormArray<T> {
  const [, rerender] = useReducer(forceUpdate, {});

  const arrayRef = useRef<FormArray<T> | null>(null);
  if (!arrayRef.current) {
    if (typeof controlsOrFactory === 'function') {
      arrayRef.current = (controlsOrFactory as () => FormArray<T>)();
    } else {
      arrayRef.current = new FormArray<T>(
        controlsOrFactory,
        validators,
        asyncValidators
      );
    }
  }

  useEffect(() => {
    return arrayRef.current!.subscribe(rerender);
  }, []);

  return arrayRef.current;
}

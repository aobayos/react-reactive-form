import { useReducer, useRef, useCallback, useEffect } from 'react';
import { FormControl } from '../models/FormControl';
import type { ValidatorFn, AsyncValidatorFn, FormControlOptions } from '../types';

const forceUpdate = () => ({});

export function useFormControl<T>(
  initialValue: T,
  validatorsOrOptions?:
    | ValidatorFn<T>
    | ValidatorFn<T>[]
    | FormControlOptions<T>,
  asyncValidators?: AsyncValidatorFn<T> | AsyncValidatorFn<T>[]
): FormControl<T> {
  const [, rerender] = useReducer(forceUpdate, {});

  const controlRef = useRef<FormControl<T> | null>(null);
  if (!controlRef.current) {
    controlRef.current = new FormControl<T>(
      initialValue,
      validatorsOrOptions,
      asyncValidators
    );
  }

  useEffect(() => {
    return controlRef.current!.subscribe(rerender);
  }, []);

  return controlRef.current;
}

export function useControlValue<T>(control: FormControl<T>): T {
  const [, rerender] = useReducer(forceUpdate, {});
  useEffect(() => control.subscribe(rerender), [control]);
  return control.value;
}

export function useControlProps<T>(control: FormControl<T>) {
  const [, rerender] = useReducer(forceUpdate, {});
  useEffect(() => control.subscribe(rerender), [control]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      control.setValue(e.target.value as unknown as T);
    },
    [control]
  );

  const onBlur = useCallback(() => {
    control.markAsTouched();
  }, [control]);

  return {
    value: control.value as unknown as string,
    onChange,
    onBlur,
    disabled: control.disabled,
  };
}

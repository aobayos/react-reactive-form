import { useReducer, useRef, useEffect } from 'react';
import { FormGroup } from '../models/FormGroup';
import { FormControl } from '../models/FormControl';
import type { ControlConfig } from '../types';

const forceUpdate = () => ({});

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyConfig = { value: unknown; validators?: unknown; asyncValidators?: unknown; disabled?: boolean };

type ControlsFromConfig<C extends Record<string, AnyConfig>> = {
  [K in keyof C]: FormControl<C[K]['value']>;
};

// ─── Overloads ────────────────────────────────────────────────────────────────

/** Primary API: pass a config map of { value, validators?, disabled? } per field. */
export function useFormGroup<C extends Record<string, AnyConfig>>(
  config: C
): FormGroup<ControlsFromConfig<C>>;

/** Power-user API: pass a factory that returns an already-built FormGroup. */
export function useFormGroup<T extends Record<string, FormControl>>(
  factory: () => FormGroup<T>
): FormGroup<T>;

// ─── Implementation ───────────────────────────────────────────────────────────

export function useFormGroup(
  configOrFactory: Record<string, AnyConfig> | (() => FormGroup<Record<string, FormControl>>)
): FormGroup<Record<string, FormControl>> {
  const [, rerender] = useReducer(forceUpdate, {});

  const groupRef = useRef<FormGroup<Record<string, FormControl>> | null>(null);

  if (!groupRef.current) {
    if (typeof configOrFactory === 'function') {
      groupRef.current = configOrFactory();
    } else {
      const controls: Record<string, FormControl> = {};
      for (const key of Object.keys(configOrFactory)) {
        const cfg = configOrFactory[key] as ControlConfig;
        controls[key] = new FormControl(
          cfg.value,
          cfg.validators,
          cfg.asyncValidators
        );
      }
      groupRef.current = new FormGroup(controls);
    }
  }

  useEffect(() => {
    return groupRef.current!.subscribe(rerender);
  }, []);

  return groupRef.current;
}

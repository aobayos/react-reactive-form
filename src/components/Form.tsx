import React, {
  createContext,
  useContext,
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  type FormHTMLAttributes,
  type HTMLAttributes,
} from 'react';
import type { AbstractControlLike, ValidationErrors } from '../types';

// ─── Internal structural types ────────────────────────────────────────────────
//
// We use AbstractControlLike (interface) rather than AbstractControl (class).
// TypeScript checks class-to-interface compatibility using only public members
// with bivariant method checking, so FormControl<string> satisfies
// AbstractControlLike<unknown> without needing `any`.
//
// The two `as unknown as` casts below are the narrowest possible escape: they
// swap a verified-structural type through `unknown` (not `any`), which the
// linter does not flag.

type AnyControl = AbstractControlLike;

type AnyFormGroup = {
  readonly controls: Record<string, AnyControl>;
  readonly valid: boolean;
  markAllTouched(): void;
  getRawValue(): Record<string, unknown>;
  subscribe(listener: () => void): () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const FormContext = createContext<AnyFormGroup | null>(null);

// ─── wireChildren ─────────────────────────────────────────────────────────────

function wireChildren(children: ReactNode, form: AnyFormGroup): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;

    const props = child.props as HTMLAttributes<HTMLElement> & {
      formControl?: string;
      children?: ReactNode;
    };

    if (props.formControl) {
      const controlName = props.formControl;
      const control = form.controls[controlName];

      if (!control) {
        console.warn(`[Form] No control found for formControl="${controlName}"`);
        return child;
      }

      const { formControl: _fc, onChange, onBlur, ...rest } =
        child.props as React.InputHTMLAttributes<HTMLInputElement> & {
          formControl?: string;
        };

      return cloneElement(
        child as React.ReactElement<Record<string, unknown>>,
        {
          ...rest,
          value: (control.value as string) ?? '',
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            control.setValue(e.target.value);
            (onChange as React.ChangeEventHandler<HTMLInputElement> | undefined)?.(e);
          },
          onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
            control.markAsTouched();
            (onBlur as React.FocusEventHandler<HTMLInputElement> | undefined)?.(e);
          },
          'data-valid': String(control.valid),
          'data-touched': String(control.touched),
          'data-dirty': String(control.dirty),
        }
      );
    }

    if (props.children) {
      return cloneElement(child as React.ReactElement<{ children: ReactNode }>, {
        children: wireChildren(props.children, form),
      });
    }

    return child;
  });
}

// ─── <Form> ───────────────────────────────────────────────────────────────────
//
// `form` is typed as `AnyFormGroup & { getRawValue(): V }` so TypeScript infers
// V from the actual form's getRawValue() return type, giving onSubmit its proper
// typed values — without coupling FormProps to FormGroup's class constraint.

export interface FormProps<V extends Record<string, unknown> = Record<string, unknown>>
  extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: AnyFormGroup & { getRawValue(): V };
  onSubmit?: (values: V) => void;
  children?: ReactNode;
}

export function Form<V extends Record<string, unknown> = Record<string, unknown>>({
  form,
  children,
  onSubmit,
  ...props
}: FormProps<V>) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.markAllTouched();
    onSubmit?.(form.getRawValue() as V);
  };

  return (
    <FormContext.Provider value={form}>
      <form onSubmit={handleSubmit} {...props}>
        {wireChildren(children, form)}
      </form>
    </FormContext.Provider>
  );
}

// ─── useFormContext ────────────────────────────────────────────────────────────

export function useFormContext(): AnyFormGroup {
  const form = useContext(FormContext);
  if (!form) throw new Error('useFormContext must be used inside a <Form> component.');
  return form;
}

// ─── <FieldError> ─────────────────────────────────────────────────────────────

type ErrorResolver = string | ((val: unknown) => string);

const ERROR_MESSAGES: Record<string, ErrorResolver> = {
  required: 'This field is required.',
  email: 'Please enter a valid email address.',
  pattern: 'Invalid format.',
  minlength: (e) => `Minimum ${(e as { requiredLength: number }).requiredLength} characters required.`,
  maxlength: (e) => `Maximum ${(e as { requiredLength: number }).requiredLength} characters allowed.`,
  min: (e) => `Value must be at least ${(e as { min: number }).min}.`,
  max: (e) => `Value must be at most ${(e as { max: number }).max}.`,
  equals: (e) => `Must match the "${(e as { field: string }).field}" field.`,
};

export interface FieldErrorProps extends HTMLAttributes<HTMLDivElement> {
  field: string;
}

export function FieldError({ field, ...props }: FieldErrorProps) {
  const form = useFormContext();
  const control: AnyControl | undefined = form.controls[field];
  const errors: ValidationErrors | null = control?.errors ?? null;

  if (!errors || !control?.touched) return null;

  return (
    <div role="alert" {...props}>
      {Object.entries(errors).map(([key, val]) => {
        const resolver = ERROR_MESSAGES[key];
        const message =
          typeof resolver === 'function'
            ? resolver(val)
            : (resolver ?? `Validation error: ${key}`);
        return <span key={key}>{message}</span>;
      })}
    </div>
  );
}

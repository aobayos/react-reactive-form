# react-reactive-forms

A React form management library inspired by Angular's Reactive Forms. Define your form structure in TypeScript, attach it to JSX with a single `formControl` prop, and get real-time validation with full type inference — no boilerplate.

---

## Table of Contents

- [Installation](#installation)
- [Setup](#setup)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
  - [useFormGroup](#useformgroup)
  - [FormGroup](#formgroup)
  - [FormControl](#formcontrol)
  - [FormArray](#formarray)
  - [FormBuilder](#formbuilder)
  - [Validators](#validators)
  - [Form component](#form-component)
  - [FieldError component](#fielderror-component)
  - [useFormContext](#useformcontext)
  - [useFormControl](#useformcontrol)
  - [useControlValue](#usecontrolvalue)
  - [useFormArray](#useformarray)
- [Custom Validators](#custom-validators)
- [Async Validators](#async-validators)
- [Cross-field Validation](#cross-field-validation)
- [Dynamic Forms with FormArray](#dynamic-forms-with-formarray)
- [Types](#types)

---

## Installation

```bash
npm install react-reactive-forms
```

Requires React 18 or later as a peer dependency.

---

## Setup

Add a declaration file anywhere in your `src/` to enable the `formControl` prop on native HTML elements:

```ts
// src/formControl.d.ts
import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    formControl?: string;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & { formControl?: string };
      textarea: React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement> & { formControl?: string };
      select: React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & { formControl?: string };
    }
  }
}
```

This is a one-time step per project. TypeScript will then accept `formControl` on any `<input>`, `<textarea>`, or `<select>` without complaints.

---

## Quick Start

```tsx
import { useFormGroup, Form, FieldError, Validators } from 'react-reactive-forms';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function RegisterForm() {
  const form = useFormGroup({
    username:        { value: '' },
    email:           { value: '', validators: [Validators.required, Validators.email] },
    password:        { value: '', validators: [Validators.required, Validators.pattern(PASSWORD_PATTERN)] },
    confirmPassword: { value: '', validators: [Validators.required, Validators.equals('password')] },
  });

  const handleSubmit = (values: typeof form.value) => {
    console.log(values); // { username: string, email: string, ... }
  };

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <input formControl="username" type="text" placeholder="Username" />

      <input formControl="email" type="email" placeholder="Email" />
      <FieldError field="email" />

      <input formControl="password" type="password" placeholder="Password" />
      <FieldError field="password" />

      <input formControl="confirmPassword" type="password" placeholder="Confirm password" />
      <FieldError field="confirmPassword" />

      <button type="submit" disabled={form.invalid}>Register</button>
    </Form>
  );
}
```

---

## Core Concepts

The library is built around three classes that mirror Angular's reactive forms:

| Class | Description |
|---|---|
| `FormControl<T>` | A single field. Holds a value, validation state, and touch/dirty state. |
| `FormGroup<T>` | A group of named controls. Its value is the merged object of all its controls. |
| `FormArray<T>` | An ordered list of controls. Its value is an array of each control's value. |

All three extend `AbstractControl` and share the same status properties (`valid`, `invalid`, `dirty`, `touched`, etc.).

State updates propagate upward: when a `FormControl` inside a `FormGroup` changes, the group recalculates its own `valid` status automatically.

---

## API Reference

### `useFormGroup`

The primary hook for creating a group of form fields. Accepts a **config map** where each key is a field name and each value is a `ControlConfig` object.

```ts
function useFormGroup(config: Record<string, ControlConfig>): FormGroup
```

**Parameters:**

| Key | Type | Description |
|---|---|---|
| `value` | `T` | Initial value of the field |
| `validators` | `ValidatorFn \| ValidatorFn[]` | Optional sync validators |
| `asyncValidators` | `AsyncValidatorFn \| AsyncValidatorFn[]` | Optional async validators |
| `disabled` | `boolean` | Whether the field starts disabled |

```tsx
const form = useFormGroup({
  name:  { value: '' },
  age:   { value: 0,  validators: [Validators.required, Validators.min(18)] },
  email: { value: '', validators: [Validators.required, Validators.email], disabled: false },
});
```

TypeScript infers each field's value type from the `value` property, so `form.controls.age` is typed as `FormControl<number>` and `form.value.age` is `number`.

**Factory overload** — for when you need to build the group programmatically:

```ts
function useFormGroup(factory: () => FormGroup): FormGroup
```

```tsx
const form = useFormGroup(() => {
  const fb = new FormBuilder();
  return fb.group({ name: [{ value: '' }] });
});
```

The group instance is stable across renders. The hook subscribes internally and triggers a re-render whenever any control in the group changes.

---

### `FormGroup`

Represents a collection of named controls.

#### Properties

| Property | Type | Description |
|---|---|---|
| `controls` | `Record<string, FormControl>` | Map of all child controls |
| `value` | `object` | Current values of all enabled controls |
| `valid` | `boolean` | `true` if all controls are valid |
| `invalid` | `boolean` | `true` if any control is invalid |
| `status` | `ControlStatus` | `'VALID' \| 'INVALID' \| 'PENDING' \| 'DISABLED'` |
| `errors` | `ValidationErrors \| null` | Errors from group-level validators (not child errors) |
| `dirty` | `boolean` | `true` if any child has been changed |
| `touched` | `boolean` | `true` if any child has been blurred |
| `disabled` | `boolean` | `true` if the group itself is disabled |

#### Methods

```ts
// Set all field values at once
form.setValue({ name: 'Alice', age: 30 })

// Set only some fields (others unchanged)
form.patchValue({ name: 'Bob' })

// Reset all fields to their initial values
form.reset()
form.reset({ name: 'Default' })

// Get values including disabled fields
form.getRawValue()

// Access a typed control by name
const ctrl = form.get('email') // FormControl<string>

// Mark all controls as touched (usually called on submit to show all errors)
form.markAllTouched()

// Get errors for a specific child control
form.getControlErrors('email') // ValidationErrors | null

// Dynamically add / remove controls
form.addControl('phone', new FormControl(''))
form.removeControl('phone')

// Check if a control exists
form.contains('phone') // boolean

// Subscribe to any change in the group
const unsubscribe = form.subscribe(() => console.log(form.value))
unsubscribe() // call to clean up

// Disable / enable the entire group
form.disable()
form.enable()
```

---

### `FormControl`

Represents a single field.

#### Properties

| Property | Type | Description |
|---|---|---|
| `value` | `T` | Current value |
| `valid` | `boolean` | No errors |
| `invalid` | `boolean` | Has errors |
| `errors` | `ValidationErrors \| null` | Current validation errors |
| `status` | `ControlStatus` | `'VALID' \| 'INVALID' \| 'PENDING' \| 'DISABLED'` |
| `dirty` | `boolean` | Value has been changed since init or last reset |
| `pristine` | `boolean` | Value has not been changed |
| `touched` | `boolean` | Control has been blurred |
| `untouched` | `boolean` | Control has not been blurred |
| `disabled` | `boolean` | |
| `enabled` | `boolean` | |
| `parent` | `AbstractControl \| null` | The parent `FormGroup` or `FormArray` |

#### Methods

```ts
control.setValue('new value')
control.patchValue('new value')  // alias for setValue on FormControl
control.reset()                  // restore to empty + clear dirty/touched
control.reset('default')         // restore to a specific value

control.markAsTouched()
control.markAsUntouched()
control.markAsDirty()
control.markAsPristine()

control.disable()
control.enable()

// Replace validators and re-run validation
control.setValidators([Validators.required, Validators.minLength(3)])
control.clearValidators()

// Manually set errors (e.g., from a server response)
control.setErrors({ serverError: 'Username is taken' })
control.setErrors(null) // clear errors

control.hasError('required')     // boolean
control.getError('minlength')    // the error value, or null

const unsubscribe = control.subscribe(() => console.log(control.value))
```

#### Standalone usage (outside a form)

```tsx
function CharCounter() {
  const bio = useFormControl('', Validators.maxLength(200));

  return (
    <div>
      <textarea
        value={bio.value}
        onChange={(e) => bio.setValue(e.target.value)}
        onBlur={() => bio.markAsTouched()}
      />
      <span>{(bio.value as string).length} / 200</span>
      {bio.touched && bio.hasError('maxlength') && (
        <p>Too long!</p>
      )}
    </div>
  );
}
```

---

### `FormArray`

Represents an ordered list of controls. Useful for repeating fields like a list of email addresses or a dynamic list of items.

#### Properties

| Property | Type | Description |
|---|---|---|
| `controls` | `AbstractControl[]` | Ordered list of child controls |
| `value` | `T[]` | Values of all enabled controls |
| `length` | `number` | Number of controls |
| `valid`, `invalid`, `errors`, `status` | — | Same as FormGroup |

#### Methods

```ts
array.at(0)               // get control at index
array.push(new FormControl(''))
array.insert(1, new FormControl(''))
array.removeAt(0)
array.clear()

array.setValue(['a', 'b', 'c'])
array.patchValue(['a'])   // updates only as many controls as values provided
array.reset()

array.getRawValue()       // includes disabled controls
```

---

### `FormBuilder`

A factory class for creating groups, controls, and arrays. Useful for building forms programmatically.

```ts
import { FormBuilder, Validators } from 'react-reactive-forms';

const fb = new FormBuilder();

// group() — same config syntax as useFormGroup
const form = fb.group({
  name:  [{ value: '' }],
  email: [{ value: '', validators: Validators.required }],
});

// control()
const ctrl = fb.control('', [Validators.required]);

// array()
const arr = fb.array([
  fb.control('alice@example.com'),
  fb.control('bob@example.com'),
]);
```

---

### `Validators`

All built-in validators are static members of the `Validators` class. Validators without parameters are used directly (no call needed); validators with parameters are factory functions.

#### Without parameters (pass directly)

```ts
Validators.required      // value must not be empty (null, undefined, or blank string)
Validators.requiredTrue  // value must be exactly true (use for checkboxes)
Validators.email         // value must be a valid email address
Validators.nullValidator // always passes (no-op)
```

#### With parameters (call to produce a ValidatorFn)

```ts
Validators.minLength(8)          // string or array must have at least 8 characters
Validators.maxLength(100)        // string or array must have at most 100 characters
Validators.min(18)               // numeric value must be >= 18
Validators.max(120)              // numeric value must be <= 120
Validators.pattern(/^\d{5}$/)    // value must match the regex
Validators.pattern('^\\d{5}$')   // also accepts a string pattern
Validators.equals('password')    // value must equal another field in the same FormGroup
```

#### Combining validators

Pass an array — both approaches are equivalent:

```ts
// Array syntax (recommended)
validators: [Validators.required, Validators.minLength(8)]

// compose() — useful when you need to produce a single ValidatorFn
const passwordValidator = Validators.compose([
  Validators.required,
  Validators.minLength(8),
  Validators.pattern(/[A-Z]/),
]);
```

#### Error shapes

Each failing validator adds a key to the control's `errors` object:

| Validator | Error key | Error value |
|---|---|---|
| `required` | `required` | `true` |
| `requiredTrue` | `required` | `true` |
| `email` | `email` | `true` |
| `minLength(n)` | `minlength` | `{ requiredLength: n, actualLength: number }` |
| `maxLength(n)` | `maxlength` | `{ requiredLength: n, actualLength: number }` |
| `min(n)` | `min` | `{ min: n, actual: number }` |
| `max(n)` | `max` | `{ max: n, actual: number }` |
| `pattern(r)` | `pattern` | `{ requiredPattern: string, actualValue: unknown }` |
| `equals(field)` | `equals` | `{ field: string }` |

---

### `Form` component

Wraps a native `<form>` and wires your `FormGroup` to the DOM. Any HTML element inside the form with a `formControl` prop will be automatically linked to the matching control by name.

```tsx
<Form form={form} onSubmit={handleSubmit} className="my-form">
  ...
</Form>
```

#### Props

| Prop | Type | Description |
|---|---|---|
| `form` | `FormGroup` | The form group to bind |
| `onSubmit` | `(values) => void` | Called on submit. Receives the form's current values. Always fires — gate it yourself via `disabled` on the submit button. |
| `...rest` | `FormHTMLAttributes` | All standard `<form>` attributes |

#### How `formControl` wiring works

`<Form>` walks its children recursively. When it finds an element with a `formControl` prop matching a control name, it injects:

- `value` — from the control's current value
- `onChange` — calls `control.setValue(e.target.value)` and marks dirty
- `onBlur` — calls `control.markAsTouched()`
- `data-valid` — `"true"` or `"false"`
- `data-touched` — `"true"` or `"false"`
- `data-dirty` — `"true"` or `"false"`

Your own `onChange` / `onBlur` handlers are preserved and called after the library's.

#### Controlling submission

`<Form>` always calls `onSubmit` (after marking all fields as touched so errors appear). You decide whether to allow submission:

```tsx
// Block until valid
<button type="submit" disabled={form.invalid}>Submit</button>

// Always allow, but show a warning
<button type="submit">Submit</button>
{form.invalid && <p>Please fix the errors above.</p>}

// Custom condition
<button type="submit" disabled={form.invalid || isLoading}>Submit</button>
```

---

### `FieldError` component

Displays validation error messages for a named field. Renders nothing until the field has been touched, so errors only appear after the user interacts with the field (or the form is submitted, which calls `markAllTouched()`).

```tsx
<FieldError field="email" />
<FieldError field="email" className="error-text" style={{ color: 'red' }} />
```

#### Props

| Prop | Type | Description |
|---|---|---|
| `field` | `string` | The control name to show errors for |
| `...rest` | `HTMLAttributes<div>` | Any attributes are passed to the wrapping `<div role="alert">` |

#### Built-in messages

| Error key | Message |
|---|---|
| `required` | This field is required. |
| `email` | Please enter a valid email address. |
| `pattern` | Invalid format. |
| `minlength` | Minimum *n* characters required. |
| `maxlength` | Maximum *n* characters allowed. |
| `min` | Value must be at least *n*. |
| `max` | Value must be at most *n*. |
| `equals` | Must match the "*field*" field. |

For custom error keys not in the list above, `FieldError` renders `Validation error: <key>`. Override this by not using `FieldError` and reading `form.getControlErrors('field')` directly.

---

### `useFormContext`

Returns the nearest `FormGroup` from React context. Must be called inside a component rendered inside `<Form>`.

```tsx
function SubmitStatus() {
  const form = useFormContext();
  return <p>{form.valid ? 'Ready to submit' : 'Please fill all fields'}</p>;
}

function MyForm() {
  const form = useFormGroup({ email: { value: '' } });
  return (
    <Form form={form}>
      <input formControl="email" />
      <SubmitStatus />
    </Form>
  );
}
```

---

### `useFormControl`

Creates and subscribes to a standalone `FormControl` outside of a `FormGroup`. The hook returns the same control instance on every render and triggers a re-render when the control changes.

```ts
function useFormControl<T>(
  initialValue: T,
  validators?: ValidatorFn | ValidatorFn[],
  asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[]
): FormControl<T>
```

```tsx
function SearchInput() {
  const search = useFormControl('', Validators.minLength(3));

  return (
    <div>
      <input
        value={search.value as string}
        onChange={(e) => search.setValue(e.target.value)}
        onBlur={() => search.markAsTouched()}
      />
      {search.touched && search.hasError('minlength') && (
        <span>Enter at least 3 characters</span>
      )}
    </div>
  );
}
```

**`useControlProps`** — a helper that returns the standard input event props pre-wired to a control, saving boilerplate:

```tsx
function SearchInput() {
  const search = useFormControl('');
  const inputProps = useControlProps(search);

  // inputProps = { value, onChange, onBlur, disabled }
  return <input {...inputProps} />;
}
```

**`useControlValue`** — subscribes to an existing control and returns its current value, re-rendering whenever it changes. Useful when you have a control from a `FormGroup` and only need to observe its value in a child component:

```tsx
import { useControlValue } from 'react-reactive-forms';

function CharCount({ control }: { control: FormControl<string> }) {
  const value = useControlValue(control);
  return <span>{value.length} / 200</span>;
}

function MyForm() {
  const form = useFormGroup({ bio: { value: '' } });

  return (
    <Form form={form} onSubmit={console.log}>
      <input formControl="bio" />
      <CharCount control={form.controls.bio} />
    </Form>
  );
}
```

---

### `useFormArray`

Creates and subscribes to a `FormArray`. Like `useFormGroup`, the array instance is stable across renders.

```ts
function useFormArray<T>(controls: AbstractControl<T>[], validators?): FormArray<T>
function useFormArray<T>(factory: () => FormArray<T>): FormArray<T>
```

See [Dynamic Forms with FormArray](#dynamic-forms-with-formarray) for a full example.

---

## Custom Validators

A validator is any function that accepts an `AbstractControlLike` and returns `ValidationErrors | null`.

```ts
import type { ValidatorFn } from 'react-reactive-forms';

const noSpaces: ValidatorFn = (control) => {
  if (typeof control.value === 'string' && control.value.includes(' ')) {
    return { noSpaces: true };
  }
  return null;
};

// Use it like any built-in
const form = useFormGroup({
  username: { value: '', validators: [Validators.required, noSpaces] },
});
```

For validators that need a parameter, wrap in a factory:

```ts
const maxWords = (max: number): ValidatorFn => (control) => {
  const words = String(control.value).trim().split(/\s+/).filter(Boolean);
  return words.length <= max
    ? null
    : { maxWords: { max, actual: words.length } };
};

// Usage
validators: maxWords(50)
```

To show a custom error message, read `control.errors` directly instead of using `<FieldError>`:

```tsx
{control.touched && control.hasError('maxWords') && (
  <span>
    Too many words ({(control.getError('maxWords') as { actual: number }).actual} / {max})
  </span>
)}
```

---

## Async Validators

Async validators return a `Promise<ValidationErrors | null>`. The control's status becomes `'PENDING'` while they run.

```ts
import type { AsyncValidatorFn } from 'react-reactive-forms';

const uniqueUsername: AsyncValidatorFn = async (control) => {
  const taken = await checkUsernameAvailability(control.value as string);
  return taken ? { usernameTaken: true } : null;
};

const form = useFormGroup({
  username: {
    value: '',
    validators: Validators.required,
    asyncValidators: uniqueUsername,
  },
});

// Check pending state
{form.controls.username.pending && <span>Checking availability…</span>}
{form.controls.username.hasError('usernameTaken') && <span>Username is taken.</span>}
```

Async validators only run after all sync validators pass. The control status is `'PENDING'` while waiting and transitions to `'VALID'` or `'INVALID'` when the promise resolves.

---

## Cross-field Validation

`Validators.equals(fieldName)` is a built-in cross-field validator. It reads the value of another field in the same `FormGroup` at validation time via `control.parent`.

```tsx
const form = useFormGroup({
  password:        { value: '', validators: [Validators.required, Validators.minLength(8)] },
  confirmPassword: { value: '', validators: [Validators.required, Validators.equals('password')] },
});
```

For custom cross-field validators, access the parent group the same way:

```ts
import type { AbstractControlLike } from 'react-reactive-forms';

const mustDiffer = (otherField: string): ValidatorFn => (control) => {
  const group = control.parent as unknown as { controls: Record<string, AbstractControlLike> } | null;
  if (!group) return null;
  const other = group.controls?.[otherField];
  return control.value !== other?.value
    ? null
    : { mustDiffer: { field: otherField } };
};
```

> `Validators.equals` is only meaningful when the control is part of a `FormGroup`. It returns `null` (valid) if there is no parent.

---

## Dynamic Forms with FormArray

```tsx
import {
  useFormArray,
  FormControl,
  Validators,
  Form,
} from 'react-reactive-forms';

function EmailListForm() {
  const emails = useFormArray([
    new FormControl('', [Validators.required, Validators.email]),
  ]);

  const addEmail = () => {
    emails.push(new FormControl('', [Validators.required, Validators.email]));
  };

  const removeEmail = (index: number) => {
    emails.removeAt(index);
  };

  const handleSubmit = () => {
    console.log(emails.value); // string[]
  };

  return (
    <div>
      {emails.controls.map((ctrl, i) => {
        const control = ctrl as FormControl<string>;
        return (
          <div key={i}>
            <input
              value={control.value}
              onChange={(e) => control.setValue(e.target.value)}
              onBlur={() => control.markAsTouched()}
              placeholder="Email address"
            />
            {control.touched && control.hasError('email') && (
              <span>Invalid email</span>
            )}
            <button type="button" onClick={() => removeEmail(i)}>Remove</button>
          </div>
        );
      })}

      <button type="button" onClick={addEmail}>Add email</button>
      <button onClick={handleSubmit} disabled={emails.invalid}>Submit</button>
    </div>
  );
}
```

---

## Types

```ts
// The config shape passed to useFormGroup / FormBuilder.group
interface ControlConfig<T = unknown> {
  value: T;
  validators?: ValidatorFn | ValidatorFn[];
  asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[];
  disabled?: boolean;
}

// A sync validator function
type ValidatorFn<T = unknown> = (control: AbstractControlLike<T>) => ValidationErrors | null;

// An async validator function
type AsyncValidatorFn<T = unknown> = (control: AbstractControlLike<T>) => Promise<ValidationErrors | null>;

// The error object shape — a plain record of error keys to error details
type ValidationErrors = Record<string, unknown>;

// Control lifecycle status
type ControlStatus = 'VALID' | 'INVALID' | 'PENDING' | 'DISABLED';

// The read-only interface a validator receives
interface AbstractControlLike<T = unknown> {
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
  readonly parent: AbstractControlLike | null;
}
```

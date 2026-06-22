import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    /** Links an HTML element to a FormControl by control name inside a <Form>. */
    formControl?: string;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      input: React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      > & { formControl?: string };
      textarea: React.DetailedHTMLProps<
        React.TextareaHTMLAttributes<HTMLTextAreaElement>,
        HTMLTextAreaElement
      > & { formControl?: string };
      select: React.DetailedHTMLProps<
        React.SelectHTMLAttributes<HTMLSelectElement>,
        HTMLSelectElement
      > & { formControl?: string };
    }
  }
}

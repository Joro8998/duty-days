import { useId, type ReactNode } from 'react';

/** Labeled form row. `children` gets the id to put on the input. */
export function Field(props: {
  label: string;
  hint?: string;
  prefix?: string;
  error?: string;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  const classes = ['field', props.error && 'has-error', props.className].filter(Boolean);
  return (
    <div className={classes.join(' ')}>
      <label htmlFor={id}>{props.label}</label>
      <div className="field-input">
        {props.prefix && <span className="field-prefix">{props.prefix}</span>}
        {props.children(id)}
      </div>
      {props.error ? (
        <p className="field-error">{props.error}</p>
      ) : (
        props.hint && <p className="field-hint">{props.hint}</p>
      )}
    </div>
  );
}

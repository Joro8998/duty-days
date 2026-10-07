import { liveQuery } from 'dexie';
import { useEffect, useState, type DependencyList } from 'react';

type State<T> = { status: 'loading' } | { status: 'ready'; value: T };

/**
 * Runs a Dexie query and re-runs it whenever the data it read changes.
 * Returns { status: 'loading' } until the first result arrives.
 */
export function useLiveQuery<T>(query: () => Promise<T>, deps: DependencyList): State<T> {
  const [state, setState] = useState<State<T>>({ status: 'loading' });

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: (value) => setState({ status: 'ready', value }),
      error: (err) => console.error('Database query failed', err),
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps, like useEffect
  }, deps);

  return state;
}

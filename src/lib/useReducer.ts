import { writable, type Invalidator, type Subscriber, type Unsubscriber } from 'svelte/store';

export default function useReducer<S, A>(
	reducer: (state: S, action: A) => S,
	initialArg: S,
	initFunc?: (initialArg: S) => S
): [
	{
		subscribe: (
			this: void,
			run: Subscriber<S>,
			invalidate?: Invalidator<S> | undefined
		) => Unsubscriber;
	},
	(action: A) => void
] {
	const initialState = initFunc instanceof Function ? initFunc(initialArg) : initialArg;
	const { update, subscribe } = writable<S>(initialState);

	function dispatch(action: A) {
		update((state: S) => reducer(state, action));
	}

	return [{ subscribe }, dispatch];
}

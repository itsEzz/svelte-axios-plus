import { afterUpdate, onDestroy } from 'svelte';

export function useEffect(callback: (() => CallableFunction) | (() => void), deps?: () => any[]) {
	let cleanupCallback: CallableFunction | void;

	function rerun() {
		if (cleanupCallback) {
			cleanupCallback();
		}
		cleanupCallback = callback();
	}

	if (deps) {
		let values: any[] | null = null;
		afterUpdate(() => {
			const new_values = deps();
			if (values === null || new_values.some((value, i) => value !== values![i])) {
				rerun();
				values = new_values;
			}
		});
	} else {
		afterUpdate(rerun);
	}

	onDestroy(() => {
		if (cleanupCallback) cleanupCallback();
	});
}

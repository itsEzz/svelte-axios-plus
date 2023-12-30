import StaticAxios, {
	isCancel,
	type AxiosError,
	type AxiosInstance,
	type AxiosRequestConfig,
	type AxiosResponse
} from 'axios';
import { LRUCache } from 'lru-cache';
import {
	type Readable,
	derived,
	type Subscriber,
	type Invalidator,
	type Unsubscriber,
	writable
} from 'svelte/store';
import { afterUpdate, onDestroy } from 'svelte';

interface AxiosPlusOptions {
	manual?: boolean;
	useCache?: boolean;
	autoCancel?: boolean;
}

interface AxiosPlusLoadOptions {
	useCache?: boolean;
}

interface AxiosPlusOptionsConfig extends AxiosPlusOptions {
	axios?: AxiosInstance;
	cache?: LRUCache<any, any>;
	defaultOptions?: AxiosPlusOptions;
	defaultLoadOptions?: AxiosPlusLoadOptions;
}

interface AxiosPlusState<T> {
	loading: boolean;
	data?: T;
	error: AxiosError<T> | null;
	response?: AxiosResponse<T>;
}

interface MakeAxiosPlus<T> {
	(config: AxiosRequestConfig<T> | string, options?: AxiosPlusOptions): [
		{
			loading: Readable<boolean>;
			data?: Readable<T>;
			error: Readable<AxiosError<T> | null>;
			response?: Readable<AxiosResponse<T> | undefined>;
		},
		(
			configOverride?: AxiosRequestConfig<T>,
			options?: AxiosPlusOptions
		) => Promise<AxiosResponse<T>>,
		() => void
	];
	resetConfigure(): void;
	configure(options?: AxiosPlusOptionsConfig): void;
	clearCache(): void;
	load(
		config: AxiosRequestConfig<T> | string,
		options?: AxiosPlusLoadOptions
	): Promise<
		[{ data: T | undefined; error: AxiosError<T> | null; response?: AxiosResponse<T> | undefined }]
	>;
}

interface AxiosPlusAction<T> {
	type: string;
	payload?: AxiosResponse<T> | AxiosError<T>;
	error?: boolean;
}

const DEFAULT_OPTIONS: AxiosPlusOptions = {
	manual: false,
	useCache: true,
	autoCancel: true
};

const DEFAULT_LOAD_OPTIONS: AxiosPlusOptions = {
	useCache: true
};

const actions = {
	REQUEST_START: 'REQUEST_START',
	REQUEST_END: 'REQUEST_END',
	REQUEST_CANCEL: 'REQUEST_END_CANCEL'
};

const axiosPlus: MakeAxiosPlus<any> = makeAxiosPlus();

export default axiosPlus;

export const { resetConfigure, configure, clearCache, load } = axiosPlus;

function useEffect(callback: (() => CallableFunction) | (() => void), deps?: () => any[]) {
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

function useReducer<S, A>(
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

function isEvent(event: any) {
	return event instanceof Event;
}

function createCacheKey<T>(config: AxiosRequestConfig<T>): string {
	const cleanedConfig = { ...config };
	delete cleanedConfig.cancelToken;

	return JSON.stringify(cleanedConfig);
}

function configToObject<T>(config: string | AxiosRequestConfig<T>): AxiosRequestConfig<T> {
	if (typeof config === 'string') {
		return {
			url: config
		};
	}

	return Object.assign({}, config);
}

export function makeAxiosPlus(configureOptions?: AxiosPlusOptionsConfig): MakeAxiosPlus<any> {
	let cache: LRUCache<any, any>;
	let axiosInstance: AxiosInstance;
	let defaultOptions: AxiosPlusOptions;
	let defaultLoadOptions: AxiosPlusLoadOptions;

	function resetConfigure(): void {
		cache = new LRUCache({ max: 500, ttl: 1000 * 60 });
		axiosInstance = StaticAxios;
		defaultOptions = DEFAULT_OPTIONS;
		defaultLoadOptions = DEFAULT_LOAD_OPTIONS;
	}

	function configure(options: AxiosPlusOptionsConfig = {}): void {
		if (options.axios !== undefined) {
			axiosInstance = options.axios;
		}

		if (options.cache !== undefined) {
			cache = options.cache;
		}

		if (options.defaultOptions !== undefined) {
			defaultOptions = { ...DEFAULT_OPTIONS, ...options.defaultOptions };
		}

		if (options.defaultLoadOptions !== undefined) {
			defaultLoadOptions = { ...DEFAULT_LOAD_OPTIONS, ...options.defaultLoadOptions };
		}
	}

	resetConfigure();
	configure(configureOptions);

	function clearCache(): void {
		cache.clear();
	}

	return Object.assign(svelteAxiosPlus, {
		resetConfigure,
		configure,
		clearCache,
		load
	});

	function tryStoreInCache<T>(config: AxiosRequestConfig<T>, response: AxiosResponse<T>): void {
		if (!cache) {
			return;
		}

		const cacheKey = createCacheKey(config);

		const { config: responseConfig, request, ...responseForCache } = response;

		cache.set(cacheKey, responseForCache);
	}

	function createInitialState<T>(
		config: AxiosRequestConfig<T>,
		options: AxiosPlusOptions
	): AxiosPlusState<T> {
		const response =
			!options.manual && (tryGetFromCache(config, options) as AxiosResponse<T> | undefined);

		return {
			loading: !options.manual && !response,
			error: null,
			...(response ? { data: response.data as T | undefined, response } : null)
		};
	}

	function reducer<T>(state: AxiosPlusState<T>, action: AxiosPlusAction<T>): AxiosPlusState<T> {
		switch (action.type) {
			case actions.REQUEST_START:
				return {
					...state,
					loading: true,
					error: null
				};
			case actions.REQUEST_END:
				return {
					...state,
					loading: false,
					...(action.error ? {} : { data: (action.payload as AxiosResponse<T>).data, error: null }),
					[action.error ? 'error' : 'response']: action.payload
				};
			case actions.REQUEST_CANCEL:
				return {
					...state,
					loading: false
				};
			default:
				return state;
		}
	}

	function tryGetFromCache<T>(
		config: AxiosRequestConfig<T>,
		options: AxiosPlusOptions,
		dispatch?: (action: AxiosPlusAction<T>) => void
	): AxiosResponse<T> | void {
		if (!cache || !options.useCache) {
			return;
		}

		const cacheKey = createCacheKey(config);
		const response = cache.get(cacheKey);

		if (response && dispatch) {
			dispatch({ type: actions.REQUEST_END, payload: response });
		}

		return response;
	}

	async function executeRequest<T>(
		config: AxiosRequestConfig<T>,
		dispatch: (action: AxiosPlusAction<T>) => void
	): Promise<AxiosResponse<T>> {
		try {
			dispatch({ type: actions.REQUEST_START });

			const response = await axiosInstance(config);

			tryStoreInCache(config, response);

			dispatch({ type: actions.REQUEST_END, payload: response });

			return response;
		} catch (err) {
			if (!isCancel(err)) {
				dispatch({ type: actions.REQUEST_END, payload: err as AxiosError<T>, error: true });
			} else if (isCancel(err)) {
				dispatch({ type: actions.REQUEST_CANCEL });
			}
			throw err;
		}
	}

	async function request<T>(
		config: AxiosRequestConfig<T>,
		options: AxiosPlusOptions,
		dispatch: (action: AxiosPlusAction<T>) => void
	): Promise<AxiosResponse<T>> {
		return tryGetFromCache(config, options, dispatch) || executeRequest(config, dispatch);
	}

	async function load<T>(
		_config: AxiosRequestConfig<T> | string,
		_options?: AxiosPlusLoadOptions
	): Promise<
		[{ data: T | undefined; error: AxiosError<T> | null; response?: AxiosResponse<T> | undefined }]
	> {
		const config = configToObject(_config);
		const options = { ...defaultLoadOptions, ..._options };
		const cachedResponse = tryGetFromCache(config, options);
		if (options.useCache && cachedResponse) {
			return [{ data: cachedResponse.data, error: null, response: cachedResponse }];
		}
		try {
			const response = await axiosInstance(config);
			if (options.useCache) {
				tryStoreInCache(config, response);
			}
			return [{ data: response.data, error: null, response: response }];
		} catch (err) {
			return [{ data: undefined, error: err as AxiosError<T> }];
		}
	}

	function svelteAxiosPlus<T>(
		_config: AxiosRequestConfig<T> | string,
		_options?: AxiosPlusOptions
	): [
		{
			loading: Readable<boolean>;
			data?: Readable<T>;
			error: Readable<AxiosError<T> | null>;
			response?: Readable<AxiosResponse<T> | undefined>;
		},
		(
			configOverride?: AxiosRequestConfig<T>,
			options?: AxiosPlusOptions
		) => Promise<AxiosResponse<T>>,
		() => void
	] {
		const config = configToObject(_config);
		const options = { ...defaultOptions, ..._options };
		let abortController: AbortController;

		const [state, dispatch] = useReducer<AxiosPlusState<any>, AxiosPlusAction<any>>(
			reducer,
			createInitialState(config, options)
		);

		const cancelOutstandingRequest = (): void => {
			if (abortController) {
				abortController.abort();
			}
		};

		const withAbortSignal = (config: AxiosRequestConfig<T>): AxiosRequestConfig<T> => {
			if (options.autoCancel) {
				cancelOutstandingRequest();
			}
			abortController = new AbortController();
			config.signal = abortController.signal;
			return config;
		};

		useEffect(
			() => {
				if (!options.manual) {
					request(withAbortSignal(config), options, dispatch).catch(() => {});
				}

				return () => {
					if (options.autoCancel) {
						cancelOutstandingRequest();
					}
				};
			},
			() => [config, options]
		);

		const refetch = (
			configOverride?: AxiosRequestConfig<T>,
			options?: AxiosPlusOptions
		): Promise<AxiosResponse<T>> => {
			configOverride = configToObject(configOverride as AxiosRequestConfig<T> | string);
			return request(
				withAbortSignal({
					...config,
					...(isEvent(configOverride) ? null : configOverride)
				}),
				{ useCache: false, ...options },
				dispatch
			);
		};

		return [
			{
				loading: derived(state, ($data) => $data.loading),
				data: derived(state, ($data) => $data.data),
				error: derived(state, ($data) => $data.error),
				response: derived(state, ($data) => $data.response)
			},
			refetch,
			cancelOutstandingRequest
		];
	}
}

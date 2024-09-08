import StaticAxios, {
	type AxiosPromise,
	isCancel,
	type AxiosStatic,
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

interface ResponseValues<TResponse = any, TBody = any, TError = any> {
	loading: boolean;
	data?: TResponse;
	error: AxiosError<TError, TBody> | null;
	response?: AxiosResponse<TResponse, TBody>;
}

export interface Options {
	manual?: boolean;
	useCache?: boolean;
	autoCancel?: boolean;
}

export interface RefetchOptions {
	useCache?: boolean;
}

export interface ConfigureOptions {
	axios?: AxiosInstance | AxiosStatic | any;
	cache?: LRUCache<any, any> | false;
	defaultOptions?: Options;
	defaultLoadOptions?: RefetchOptions;
}

export interface RefetchFunction<TBody, TResponse> {
	(
		configOverride?: AxiosRequestConfig<TBody> | string,
		options?: RefetchOptions
	): AxiosPromise<TResponse>;
}

export type AxiosPlusResult<TResponse = any, TBody = any, TError = any> = [
	{
		loading: Readable<boolean>;
		data: Readable<TResponse | undefined>;
		error: Readable<AxiosError<TError, TBody> | null>;
		response: Readable<AxiosResponse<TResponse, TBody> | undefined>;
	},
	RefetchFunction<TBody, TResponse>,
	() => void,
	() => void
];

export interface AxiosPlus {
	<TResponse = any, TBody = any, TError = any>(
		config: AxiosRequestConfig<TBody> | string,
		options?: Options
	): AxiosPlusResult<TResponse, TBody, TError>;
	load<TResponse = any, TBody = any, TError = any>(
		config: AxiosRequestConfig<TBody> | string,
		options?: RefetchOptions
	): Promise<Omit<ResponseValues<TResponse, TBody, TError>, 'loading'>>;
	configure(options: ConfigureOptions): void;
	resetConfigure(): void;
	clearCache(): void;
}

interface Action<TResponse = any, TBody = any, TError = any> {
	type: string;
	payload?: AxiosResponse<TResponse, TBody> | AxiosError<TError, TBody>;
	error?: boolean;
}

const DEFAULT_OPTIONS: Options = {
	manual: false,
	useCache: true,
	autoCancel: true
};

const DEFAULT_LOAD_OPTIONS: RefetchOptions = {
	useCache: true
};

const actions: Record<string, string> = {
	REQUEST_START: 'REQUEST_START',
	REQUEST_END: 'REQUEST_END',
	REQUEST_CANCEL: 'REQUEST_END_CANCEL',
	RESET: 'RESET'
};

const axiosPlus: AxiosPlus = makeAxiosPlus();

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

function createCacheKey(config: AxiosRequestConfig): string {
	const cleanedConfig = { ...config };
	delete cleanedConfig.cancelToken;

	return JSON.stringify(cleanedConfig);
}

function configToObject(config: string | AxiosRequestConfig): AxiosRequestConfig {
	if (typeof config === 'string') {
		return {
			url: config
		};
	}

	return Object.assign({}, config);
}

export function makeAxiosPlus(configureOptions?: ConfigureOptions): AxiosPlus {
	let cache: LRUCache<any, any>;
	let axiosInstance: AxiosInstance;
	let defaultOptions: Options;
	let defaultLoadOptions: RefetchOptions;

	function resetConfigure(): void {
		cache = new LRUCache({ max: 500, ttl: 1000 * 60 });
		axiosInstance = StaticAxios;
		defaultOptions = DEFAULT_OPTIONS;
		defaultLoadOptions = DEFAULT_LOAD_OPTIONS;
	}

	function configure(options: ConfigureOptions = {}): void {
		if (options.axios !== undefined) {
			axiosInstance = options.axios;
		}

		if (options.cache !== undefined && typeof options.cache !== 'boolean') {
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

	function tryStoreInCache(config: AxiosRequestConfig, response: AxiosResponse): void {
		if (!cache) {
			return;
		}

		const cacheKey = createCacheKey(config);

		const { config: responseConfig, request, ...responseForCache } = response;

		cache.set(cacheKey, responseForCache);
	}

	function createInitialState(config: AxiosRequestConfig, options: Options): ResponseValues {
		const response =
			!options.manual && (tryGetFromCache(config, options) as AxiosResponse | undefined);

		return {
			loading: !options.manual && !response,
			error: null,
			...(response ? { data: response.data, response } : null)
		};
	}

	function reducer(state: ResponseValues, action: Action): ResponseValues {
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
					...(action.error ? {} : { data: (action.payload as AxiosResponse).data, error: null }),
					[action.error ? 'error' : 'response']: action.payload
				};
			case actions.REQUEST_CANCEL:
				return {
					...state,
					loading: false
				};
			case actions.RESET:
				return {
					data: undefined,
					loading: false,
					error: null
				};
			default:
				return state;
		}
	}

	function tryGetFromCache(
		config: AxiosRequestConfig,
		options: Options,
		dispatch?: (action: Action) => void
	): AxiosResponse | void {
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

	async function executeRequest(
		config: AxiosRequestConfig,
		dispatch: (action: Action) => void
	): Promise<AxiosResponse> {
		try {
			dispatch({ type: actions.REQUEST_START });

			const response = await axiosInstance(config);

			tryStoreInCache(config, response);

			dispatch({ type: actions.REQUEST_END, payload: response });

			return response;
		} catch (err) {
			if (!isCancel(err)) {
				dispatch({
					type: actions.REQUEST_END,
					payload: err as AxiosError,
					error: true
				});
			} else if (isCancel(err)) {
				dispatch({ type: actions.REQUEST_CANCEL });
			}
			throw err;
		}
	}

	async function request(
		config: AxiosRequestConfig,
		options: Options,
		dispatch: (action: Action) => void
	): Promise<AxiosResponse> {
		return tryGetFromCache(config, options, dispatch) || executeRequest(config, dispatch);
	}

	async function load<TResponse, TBody, TError>(
		_config: AxiosRequestConfig<TBody> | string,
		_options?: RefetchOptions
	): Promise<{
		data?: TResponse;
		error: AxiosError<TError, TBody> | null;
		response?: AxiosResponse<TResponse, TBody>;
	}> {
		const config = configToObject(_config);
		const options = { ...defaultLoadOptions, ..._options };
		const cachedResponse = tryGetFromCache(config, options);
		if (options.useCache && cachedResponse) {
			return { data: cachedResponse.data, error: null, response: cachedResponse };
		}
		try {
			const response = await axiosInstance(config);
			if (options.useCache) {
				tryStoreInCache(config, response);
			}
			return { data: response.data, error: null, response: response };
		} catch (err) {
			return { data: undefined, error: err as AxiosError<TError, TBody> };
		}
	}

	function svelteAxiosPlus<TResponse, TBody, TError>(
		_config: AxiosRequestConfig<TBody> | string,
		_options?: Options
	): AxiosPlusResult<TResponse, TBody, TError> {
		const config = configToObject(_config);
		const options = { ...defaultOptions, ..._options };
		let abortController: AbortController;

		const [state, dispatch] = useReducer<ResponseValues<TResponse, TBody, TError>, Action>(
			reducer,
			createInitialState(config, options)
		);

		const cancelOutstandingRequest = (): void => {
			if (abortController) {
				abortController.abort();
			}
		};

		const withAbortSignal = (config: AxiosRequestConfig<TBody>): AxiosRequestConfig<TBody> => {
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
			configOverride?: AxiosRequestConfig<TBody> | string,
			options?: RefetchOptions
		): AxiosPromise<TResponse> => {
			configOverride = configToObject(configOverride as AxiosRequestConfig<TBody> | string);
			return request(
				withAbortSignal({
					...config,
					...(isEvent(configOverride) ? null : configOverride)
				}),
				{ useCache: false, ...options },
				dispatch
			);
		};

		const resetState = (): void => {
			dispatch({ type: actions.RESET });
		};

		return [
			{
				loading: derived(state, ($data) => $data.loading),
				data: derived(state, ($data) => $data.data),
				error: derived(state, ($data) => $data.error),
				response: derived(state, ($data) => $data.response)
			},
			refetch,
			cancelOutstandingRequest,
			resetState
		];
	}
}

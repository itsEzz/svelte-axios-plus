import StaticAxios, {
	type AxiosError,
	type AxiosInstance,
	type AxiosPromise,
	type AxiosRequestConfig,
	type AxiosResponse,
	type AxiosStatic,
	isCancel
} from 'axios';
import { LRUCache } from 'lru-cache';

interface RequestState<TResponse = any, TBody = any, TError = any> {
	loading: boolean;
	data?: TResponse;
	error: AxiosError<TError, TBody> | null;
	response?: AxiosResponse<TResponse, TBody>;
}

export interface AxiosPlusOptions {
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
	defaultOptions?: AxiosPlusOptions;
	defaultLoadOptions?: RefetchOptions;
}

export interface RefetchFunction<TBody, TResponse> {
	(
		configOverride?: AxiosRequestConfig<TBody> | string,
		options?: RefetchOptions
	): AxiosPromise<TResponse>;
}

export type AxiosPlusResult<TResponse = any, TBody = any, TError = any> = {
	req: Readonly<RequestState>;
	refetch: RefetchFunction<TBody, TResponse>;
	cancel: () => void;
	reset: (force?: boolean) => void;
};

export interface AxiosPlus {
	<TResponse = any, TBody = any, TError = any>(
		config: AxiosRequestConfig<TBody> | string,
		options?: AxiosPlusOptions
	): AxiosPlusResult<TResponse, TBody, TError>;
	load<TResponse = any, TBody = any, TError = any>(
		config: AxiosRequestConfig<TBody> | string,
		options?: RefetchOptions
	): Promise<Omit<RequestState<TResponse, TBody, TError>, 'loading'>>;
	configure(options: ConfigureOptions): void;
	resetConfigure(): void;
	clearCache(): void;
	getConfig(): AxiosPlusConfig;
}

export interface AxiosPlusConfig {
	readonly axios: AxiosInstance | AxiosStatic | any;
	readonly cache: LRUCache<any, any> | false;
	readonly defaultOptions: AxiosPlusOptions;
	readonly defaultLoadOptions: RefetchOptions;
}

interface Action<TResponse = any, TBody = any, TError = any> {
	type: string;
	payload?: AxiosResponse<TResponse, TBody> | AxiosError<TError, TBody>;
	error?: boolean;
}

const DEFAULT_OPTIONS: AxiosPlusOptions = {
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

export const { resetConfigure, configure, clearCache, load, getConfig } = axiosPlus;

function isEvent(obj: any) {
	return obj instanceof Event;
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
	let cache: LRUCache<any, any> | false;
	let axiosInstance: AxiosInstance;
	let defaultOptions: AxiosPlusOptions;
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
		if (!cache) {
			return;
		}
		cache.clear();
	}

	function getConfig(): AxiosPlusConfig {
		return Object.freeze({
			axios: axiosInstance,
			cache: cache,
			defaultOptions: Object.freeze({ ...defaultOptions }),
			defaultLoadOptions: Object.freeze({ ...defaultLoadOptions })
		});
	}

	return Object.assign(svelteAxiosPlus, {
		resetConfigure,
		configure,
		clearCache,
		load,
		getConfig
	});

	function tryStoreInCache(config: AxiosRequestConfig, response: AxiosResponse): void {
		if (!cache) {
			return;
		}

		const cacheKey = createCacheKey(config);

		const { config: responseConfig, request, ...responseForCache } = response;

		cache.set(cacheKey, responseForCache);
	}

	function createInitialState(config: AxiosRequestConfig, options: AxiosPlusOptions): RequestState {
		const response =
			!options.manual && (tryGetFromCache(config, options) as AxiosResponse | undefined);

		return {
			loading: !options.manual && !response,
			error: null,
			...(response ? { data: response.data, response } : null)
		};
	}

	function updateState(state: RequestState, action: Action): void {
		switch (action.type) {
			case actions.REQUEST_START:
				state.loading = true;
				state.error = null;
				break;
			case actions.REQUEST_END:
				if (!action.error) {
					state.data = (action.payload as AxiosResponse).data;
					state.error = null;
					state.response = action.payload as AxiosResponse;
				} else {
					state.error = action.payload as AxiosError;
				}
				state.loading = false;
				break;
			case actions.REQUEST_CANCEL:
				state.loading = false;
				break;
			case actions.RESET:
				state.data = undefined;
				state.error = null;
				state.loading = false;
				state.response = undefined;
				break;
		}
	}

	function tryGetFromCache(
		config: AxiosRequestConfig,
		options: AxiosPlusOptions,
		state?: RequestState
	): AxiosResponse | void {
		if (!cache || !options.useCache) {
			return;
		}

		const cacheKey = createCacheKey(config);
		const response = cache.get(cacheKey);

		if (response && state) {
			updateState(state, { type: actions.REQUEST_END, payload: response });
		}

		return response;
	}

	async function executeRequest(
		config: AxiosRequestConfig,
		state: RequestState
	): Promise<AxiosResponse> {
		try {
			updateState(state, { type: actions.REQUEST_START });

			const response = await axiosInstance(config);

			tryStoreInCache(config, response);

			updateState(state, { type: actions.REQUEST_END, payload: response });

			return response;
		} catch (err) {
			if (!isCancel(err)) {
				updateState(state, {
					type: actions.REQUEST_END,
					payload: err as AxiosError,
					error: true
				});
			} else if (isCancel(err)) {
				updateState(state, { type: actions.REQUEST_CANCEL });
			}
			throw err;
		}
	}

	async function request(
		config: AxiosRequestConfig,
		options: AxiosPlusOptions,
		state: RequestState
	): Promise<AxiosResponse> {
		return tryGetFromCache(config, options, state) || executeRequest(config, state);
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
			return { data: undefined, error: err as AxiosError<TError, TBody>, response: undefined };
		}
	}

	function svelteAxiosPlus<TResponse, TBody, TError>(
		_config: AxiosRequestConfig<TBody> | string,
		_options?: AxiosPlusOptions
	): AxiosPlusResult<TResponse, TBody, TError> {
		const config = configToObject(_config);
		const options = { ...defaultOptions, ..._options };
		let abortController: AbortController;

		let state = $state<RequestState<TResponse, TBody, TError>>(createInitialState(config, options));

		function cancelOutstandingRequest(): void {
			if (abortController) {
				abortController.abort();
			}
		}

		function withAbortSignal(config: AxiosRequestConfig<TBody>): AxiosRequestConfig<TBody> {
			if (options.autoCancel) {
				cancelOutstandingRequest();
			}
			abortController = new AbortController();
			config.signal = abortController.signal;
			return config;
		}

		$effect(() => {
			if (!options.manual) {
				request(withAbortSignal(config), options, state).catch(() => {});
			}

			return () => {
				if (options.autoCancel) {
					cancelOutstandingRequest();
				}
			};
		});

		function refetch(
			configOverride?: AxiosRequestConfig<TBody> | string,
			options?: RefetchOptions
		): AxiosPromise<TResponse> {
			configOverride = configToObject(configOverride as AxiosRequestConfig<TBody> | string);
			return request(
				withAbortSignal({
					...config,
					...(isEvent(configOverride) ? null : configOverride)
				}),
				{ useCache: false, ...options },
				state
			);
		}

		function resetState(force: boolean = false): void {
			if (state.loading && !force) return;
			else if (state.loading) cancelOutstandingRequest();
			updateState(state, { type: actions.RESET });
		}

		return {
			req: {
				get loading() {
					return state.loading;
				},
				get data() {
					return state.data;
				},
				get error() {
					return state.error;
				},
				get response() {
					return state.response;
				}
			},
			refetch: refetch,
			cancel: cancelOutstandingRequest,
			reset: resetState
		};
	}
}

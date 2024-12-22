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

export type LoadResult<TResponse = any, TBody = any, TError = any> = Omit<
	RequestState<TResponse, TBody, TError>,
	'loading'
>;

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
	req: Readonly<RequestState<TResponse, TBody, TError>>;
	refetch: RefetchFunction<TBody, TResponse>;
	cancel: () => void;
	reset: (force?: boolean) => void;
};

export interface AxiosPlus {
	<TResponse = any, TBody = any, TError = any>(
		config: AxiosRequestConfig<TBody> | string | (() => AxiosRequestConfig<TBody> | string),
		options?: AxiosPlusOptions | (() => AxiosPlusOptions)
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

function isEvent(obj: any): boolean {
	return obj instanceof Event;
}

function createCacheKey(config: AxiosRequestConfig): string {
	const cleanedConfig = { ...config };
	delete cleanedConfig.cancelToken;

	return JSON.stringify(cleanedConfig);
}

function configToObject(
	config: string | AxiosRequestConfig | (() => AxiosRequestConfig | string)
): AxiosRequestConfig {
	const _config = typeof config === 'function' ? config() : config;
	if (typeof _config === 'string') {
		return {
			url: _config
		};
	}
	return Object.assign({}, _config);
}

function optionsToObject(
	defaultOptions: AxiosPlusOptions,
	options?: AxiosPlusOptions | (() => AxiosPlusOptions)
): AxiosPlusOptions {
	const _options = typeof options === 'function' ? options() : options;
	return Object.assign({}, { ...defaultOptions, ..._options });
}

/**
 * Creates a new axios-plus instance with optional initial configuration
 *
 * @param {ConfigureOptions} [configureOptions] - Initial configuration options
 * @param {(AxiosInstance | AxiosStatic | any)} [configureOptions.axios] - Custom Axios instance or Axios-like client
 * @param {(LRUCache<any, any> | false)} [configureOptions.cache] - LRU cache instance or false to disable caching
 * @param {AxiosPlusOptions} [configureOptions.defaultOptions] - Default options for all requests
 * @param {boolean} [configureOptions.defaultOptions.manual] - If true, requests won't fire automatically
 * @param {boolean} [configureOptions.defaultOptions.useCache] - If true, enables response caching
 * @param {boolean} [configureOptions.defaultOptions.autoCancel] - If true, cancels pending requests
 * @param {RefetchOptions} [configureOptions.defaultLoadOptions] - Default options for load function
 * @param {boolean} [configureOptions.defaultLoadOptions.useCache] - If true, enables caching for load calls
 * @returns {AxiosPlus} Configured axios-plus instance with methods:
 *   - configure: Update instance configuration
 *   - resetConfigure: Reset to default configuration
 *   - clearCache: Clear the response cache
 *   - load: Make one-time requests
 *   - getConfig: Get current configuration
 *
 * @example
 * // Create with default config
 * const instance = makeAxiosPlus()
 *
 * // Create with custom config
 * const instance = makeAxiosPlus({
 *   axios: customAxiosInstance,
 *   cache: new LRUCache({ max: 100 })
 * })
 */
export function makeAxiosPlus(configureOptions?: ConfigureOptions): AxiosPlus {
	let cache: LRUCache<any, any> | false;
	let axiosInstance: AxiosInstance;
	let defaultOptions: AxiosPlusOptions;
	let defaultLoadOptions: RefetchOptions;

	/**
	 * Resets all configuration options back to default values
	 *
	 * Default values:
	 * - cache: new LRUCache({ max: 500, ttl: 1000 * 60 })
	 * - axios: StaticAxios instance
	 * - defaultOptions: { manual: false, useCache: true, autoCancel: true }
	 * - defaultLoadOptions: { useCache: true }
	 *
	 * @returns {void}
	 *
	 * @example
	 * // Reset to default configuration
	 * resetConfigure()
	 */
	function resetConfigure(): void {
		cache = new LRUCache({ max: 500, ttl: 1000 * 60 });
		axiosInstance = StaticAxios;
		defaultOptions = DEFAULT_OPTIONS;
		defaultLoadOptions = DEFAULT_LOAD_OPTIONS;
	}

	/**
	 * Configures the axios-plus instance with custom options
	 *
	 * @param {ConfigureOptions} [options] - Configuration options object
	 * @param {(AxiosInstance | AxiosStatic | any)} [options.axios] - Custom Axios instance or Axios-like client
	 * @param {(LRUCache<any, any> | false)} [options.cache] - LRU cache instance or false to disable caching
	 * @param {AxiosPlusOptions} [options.defaultOptions] - Default options for all requests
	 * @param {boolean} [options.defaultOptions.manual] - If true, requests won't fire automatically
	 * @param {boolean} [options.defaultOptions.useCache] - If true, enables response caching
	 * @param {boolean} [options.defaultOptions.autoCancel] - If true, cancels pending requests
	 * @param {RefetchOptions} [options.defaultLoadOptions] - Default options for load function
	 * @param {boolean} [options.defaultLoadOptions.useCache] - If true, enables caching for load calls
	 * @returns {void}
	 *
	 * @example
	 * // Configure custom axios instance
	 * configure({ axios: customAxiosInstance })
	 *
	 * // Disable caching
	 * configure({ cache: false })
	 *
	 * // Set default options
	 * configure({
	 *   defaultOptions: {
	 *     manual: true,
	 *     useCache: false,
	 *     autoCancel: true
	 *   }
	 * })
	 *
	 * // Set default load options
	 * configure({
	 *   defaultLoadOptions: {
	 *     useCache: false
	 *   }
	 * })
	 */
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

	/**
	 * Clears the current LRU cache if caching is enabled
	 *
	 * @returns {void}
	 *
	 * @example
	 * // Clear all cached responses
	 * clearCache()
	 */
	function clearCache(): void {
		if (!cache) {
			return;
		}
		cache.clear();
	}

	/**
	 * Returns the current configured options
	 *
	 * @returns {AxiosPlusConfig} Frozen object containing:
	 *   - axios: Current Axios instance
	 *   - cache: Current LRU cache instance or false if disabled
	 *   - defaultOptions: Default options configuration
	 *   - defaultLoadOptions: Default load options configuration
	 *
	 * @example
	 * // Get current config
	 * const config = getConfig()
	 * console.log(config.defaultOptions)
	 */
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

	/**
	 * Performs a one-time request with optional caching
	 *
	 * @param {(AxiosRequestConfig<TBody> | string)} config - Request configuration or URL
	 * @param {RefetchOptions} [options] - Configuration options object
	 * @param {boolean} [options.useCache] - If true, enables response caching
	 * @returns {Promise<LoadResult<TResponse, TBody, TError>>} Object containing:
	 *   - data: Response data if request succeeded
	 *   - error: Error object if request failed
	 *   - response: Full axios response object if request succeeded
	 *
	 * @example
	 * // Basic GET request
	 * const result = await load('.../api/data')
	 *
	 * // GET request with caching disabled
	 * const result = await load('/api/data', { useCache: false })
	 *
	 * // POST request with config
	 * const result = await load({
	 *   url: '.../api/data',
	 *   method: 'POST',
	 *   data: { id: 1 }
	 * })
	 */
	async function load<TResponse, TBody, TError>(
		_config: AxiosRequestConfig<TBody> | string,
		_options?: RefetchOptions
	): Promise<LoadResult<TResponse, TBody, TError>> {
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

	/**
	 * Creates a reactive request handler with state management
	 *
	 * @param {(AxiosRequestConfig<TBody> | string | (() => AxiosRequestConfig<TBody> | string))} _config - Request configuration
	 * @param {(AxiosPlusOptions | (() => AxiosPlusOptions))} [_options] - Request options
	 * @param {boolean} [_options.manual] - If true, requests won't fire automatically
	 * @param {boolean} [_options.useCache] - If true, enables response caching
	 * @param {boolean} [_options.autoCancel] - If true, cancels pending requests
	 * @returns {AxiosPlusResult<TResponse, TBody, TError>} Object containing:
	 *   - req: Current request state (loading, data, error, response)
	 *   - refetch: Function to re-execute the request
	 *   - cancel: Function to cancel current request
	 *   - reset: Function to reset request state
	 *
	 * @example
	 * // Basic GET request
	 * const { req, refetch, cancel, reset } = svelteAxiosPlus('/api/data')
	 *
	 * // POST with manual trigger
	 * const { req, refetch, cancel, reset } = svelteAxiosPlus({
	 *   url: '/api/data',
	 *   method: 'POST'
	 * }, { manual: true })
	 */
	function svelteAxiosPlus<TResponse, TBody, TError>(
		_config: AxiosRequestConfig<TBody> | string | (() => AxiosRequestConfig<TBody> | string),
		_options?: AxiosPlusOptions | (() => AxiosPlusOptions)
	): AxiosPlusResult<TResponse, TBody, TError> {
		let abortController: AbortController;

		function getConfig(): AxiosRequestConfig<TBody> {
			return configToObject(_config);
		}

		function getOptions(): AxiosPlusOptions {
			return optionsToObject(defaultOptions, _options);
		}

		let state = $state<RequestState<TResponse, TBody, TError>>(
			createInitialState(getConfig(), getOptions())
		);

		function cancelOutstandingRequest(): void {
			if (abortController) {
				abortController.abort();
			}
		}

		function withAbortSignal(config: AxiosRequestConfig<TBody>): AxiosRequestConfig<TBody> {
			const options = getOptions();
			if (options.autoCancel) {
				cancelOutstandingRequest();
			}
			abortController = new AbortController();
			config.signal = abortController.signal;
			return config;
		}

		$effect(() => {
			const options = getOptions();
			if (!options.manual) {
				request(withAbortSignal(getConfig()), options, state).catch(() => {});
			}

			return () => {
				if (options.autoCancel) {
					cancelOutstandingRequest();
				}
			};
		});

		function refetch(
			_configOverride?: AxiosRequestConfig<TBody> | string,
			_options?: RefetchOptions
		): AxiosPromise<TResponse> {
			const configOverride = configToObject(_configOverride || {});
			return request(
				withAbortSignal({
					...getConfig(),
					...(isEvent(configOverride) ? null : configOverride)
				}),
				{ useCache: false, ..._options },
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

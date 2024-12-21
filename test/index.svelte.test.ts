import StaticAxios from 'axios';
import { LRUCache } from 'lru-cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosPlus, {
	clearCache,
	configure,
	getConfig,
	load,
	makeAxiosPlus,
	resetConfigure
} from '../src/lib/index.svelte.js';
import { flushSync } from 'svelte';

const defaultConfig = {
	axios: StaticAxios,
	cache: new LRUCache({ max: 500, ttl: 1000 * 60 }),
	defaultOptions: { manual: false, useCache: true, autoCancel: true },
	defaultLoadOptions: { useCache: true }
};

let testConfig = {
	axios: vi.fn().mockResolvedValueOnce({ data: 'whatever' }),
	cache: new LRUCache({ max: 5, ttl: 1000 * 60 }),
	defaultOptions: { manual: true, useCache: false, autoCancel: false },
	defaultLoadOptions: { useCache: false }
};

beforeEach(() => {
	resetConfigure();
	testConfig = {
		axios: vi.fn().mockResolvedValueOnce({ data: 'whatever' }),
		cache: new LRUCache({ max: 5, ttl: 1000 * 60 }),
		defaultOptions: { manual: true, useCache: false, autoCancel: false },
		defaultLoadOptions: { useCache: false }
	};
});

describe('makeAxiosPlus', () => {
	it('should be a function', () => {
		expect(makeAxiosPlus).toBeInstanceOf(Function);
	});

	it('should not throw', () => {
		expect(makeAxiosPlus).not.toThrowError();
	});

	it('should accept own axios instance', () => {
		const mockAxios = vi.fn().mockResolvedValueOnce({ data: 'whatever' });

		const axiosPlusTest = makeAxiosPlus({ axios: mockAxios });

		const config = axiosPlusTest.getConfig();

		expect(config.axios).toEqual(mockAxios);
	});

	it('should accept own lru cache instance', () => {
		const testCache = new LRUCache({ max: 500, ttl: 1000 * 60 });

		const axiosPlusTest = makeAxiosPlus({ cache: testCache });

		const config = axiosPlusTest.getConfig();

		expect(config.cache).toEqual(testCache);
	});

	it('should accept default options', () => {
		const defaultOptions = { manual: true, useCache: false, autoCancel: false };

		const axiosPlusTest = makeAxiosPlus({
			defaultOptions: defaultOptions
		});

		const config = axiosPlusTest.getConfig();

		expect(config.defaultOptions).toEqual(defaultOptions);
	});

	it('should accept default load options', () => {
		const defaultLoadOptions = { useCache: false };

		const axiosPlusTest = makeAxiosPlus({
			defaultLoadOptions: defaultLoadOptions
		});

		const config = axiosPlusTest.getConfig();

		expect(config.defaultLoadOptions).toEqual(defaultLoadOptions);
	});
});

describe('configure', () => {
	it('should be a function', () => {
		expect(configure).toBeInstanceOf(Function);
	});

	it('should not throw', () => {
		expect(configure).not.toThrowError();
	});

	it('should overwrite the config', () => {
		configure(defaultConfig);

		expect(getConfig()).toEqual(defaultConfig);

		configure(testConfig);

		expect(getConfig()).toEqual(testConfig);
	});
});

describe('resetConfigure', () => {
	it('should be a function', () => {
		expect(resetConfigure).toBeInstanceOf(Function);
	});

	it('should not throw', () => {
		expect(resetConfigure).not.toThrowError();
	});

	it('should reset the config', () => {
		configure(testConfig);

		expect(getConfig()).toEqual(testConfig);

		resetConfigure();

		const config = getConfig();

		expect(config.axios).not.toEqual(testConfig.axios);
		expect(config.cache).not.toEqual(testConfig.cache);
		expect(config.defaultOptions).toEqual(defaultConfig.defaultOptions);
		expect(config.defaultLoadOptions).toEqual(defaultConfig.defaultLoadOptions);
	});
});

describe('clearCache', () => {
	it('should be a function', () => {
		expect(clearCache).toBeInstanceOf(Function);
	});

	it('should not throw', () => {
		expect(clearCache).not.toThrowError();
	});

	it('should clear cache', async () => {
		const testCache = new LRUCache({ max: 5, ttl: 1000 * 60 });

		expect(testCache.size).toEqual(0);

		configure({ axios: testConfig.axios, cache: testCache });

		await load('test');

		expect(testCache.size).toEqual(1);

		clearCache();

		expect(testCache.size).toEqual(0);
	});
});

describe('getConfig', () => {
	it('should be a function', () => {
		expect(getConfig).toBeInstanceOf(Function);
	});

	it('should not throw', () => {
		expect(getConfig).not.toThrowError();
	});

	it('should return correct config', () => {
		configure(testConfig);

		const config = getConfig();

		expect(config).toEqual(testConfig);
	});
});

describe('load', () => {
	it('should be a function', () => {
		expect(load).toBeInstanceOf(Function);
	});

	it('should not throw', () => {
		expect(load).not.toThrowError();
	});

	describe('cache enabled', () => {
		it('should return cached data', async () => {
			const mockAxios = vi.fn().mockResolvedValueOnce({ data: 'whatever' });
			configure({ axios: mockAxios });

			await load('test');
			await load('test');

			expect(mockAxios).toHaveBeenCalledTimes(1);
		});

		it('should not return cached data after expiration', async () => {
			const mockAxios = vi.fn().mockResolvedValueOnce({ data: 'whatever' });
			configure({
				axios: mockAxios,
				cache: new LRUCache({ max: 5, ttl: 50 })
			});

			await load('test');
			await new Promise((r) => setTimeout(r, 55));
			await load('test');

			expect(mockAxios).toHaveBeenCalledTimes(2);
		});
	});

	describe('cache disabled', () => {
		beforeEach(() => {
			configure({ cache: false });
		});

		it('should return data and response and no error', async () => {
			const mockAxios = vi
				.fn()
				.mockResolvedValueOnce({ data: 'whatever', status: 200, headers: {}, config: {} });
			configure({ axios: mockAxios });

			const { data, error, response } = await load('test');

			expect(data).toEqual('whatever');
			expect(error).toBeNull();
			expect(response).toBeDefined();
			expect(response).toHaveProperty('status');
			expect(response).toHaveProperty('data');
			expect(response).toHaveProperty('headers');
			expect(response).toHaveProperty('config');
		});

		it('should not cache data', async () => {
			const mockAxios = vi
				.fn()
				.mockResolvedValueOnce({ data: 'whatever', status: 200, headers: {}, config: {} });
			configure({ axios: mockAxios });

			await load('test');
			await load('test');

			expect(mockAxios).toBeCalledTimes(2);
		});

		it('should return error and no response and no data', async () => {
			const mockAxios = vi.fn().mockImplementation(() => {
				throw {
					isAxiosError: true,
					response: {
						status: 404,
						statusText: 'Not Found',
						data: { message: 'Resource not found' }
					},
					message: 'Request failed with status code 404'
				};
			});
			configure({ axios: mockAxios });

			const { data, error, response } = await load('test');

			expect(data).toBeUndefined();
			expect(error).toBeDefined();
			expect(error).toHaveProperty('isAxiosError');
			expect(error).toHaveProperty('response');
			expect(error).toHaveProperty('response.status');
			expect(error).toHaveProperty('response.statusText');
			expect(error).toHaveProperty('response.data');
			expect(response).toBeUndefined();
		});
	});
});

describe('axiosPlus', () => {
	beforeEach(() => {
		configure({
			axios: vi.fn().mockResolvedValueOnce({ data: 'whatever' }),
			cache: false
		});
	});

	it('should be a function', () => {
		expect(axiosPlus).toBeInstanceOf(Function);
	});

	it('should not throw', () => {
		const cleanup = $effect.root(() => {
			expect(axiosPlus).not.toThrowError();
		});
		cleanup();
	});

	it('should return expected data after init', () => {
		const cleanup = $effect.root(() => {
			const { req, refetch, cancel, reset } = axiosPlus('test', {
				manual: true
			});

			flushSync();

			expect(req.loading).toBeTypeOf('boolean');
			expect(req.data).toBeUndefined();
			expect(req.error).toBeNull();
			expect(req.response).toBeUndefined();
			expect(refetch).toBeInstanceOf(Function);
			expect(cancel).toBeInstanceOf(Function);
			expect(reset).toBeInstanceOf(Function);
		});
		cleanup();
	});
});
